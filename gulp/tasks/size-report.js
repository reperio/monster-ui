import { dirname, join, relative } from 'upath';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { gzipSync } from 'zlib';
import { parse } from 'acorn';
import { dist, src } from '../paths.js';
import { env } from '../helpers/helpers.js';
import { INITIAL_LOAD_FILES } from '../helpers/size-budget.js';
import { parseBuildTxt } from '../helpers/app-bundles.js';
import { brotli } from '../helpers/precompress.js';
import { shouldTranspile, transpileToEs5 } from '../helpers/transpile.js';
import nodeSass from 'node-sass';
import tildeImporter from 'node-sass-tilde-importer';

/**
 * Size report for the output of `gulp build-prod`.
 *
 * Breaks the three initial-load files down by contributor:
 *   - `js/main.js`      per App, framework core and vendor library
 *   - `js/templates.js` per App (and per submodule)
 *   - `css/style.css`   per Preloaded App vs framework/vendor CSS
 * and lists what ships outside them: each Lazy App's own bundle, each lazy
 * Submodule chunk, what `common` still fetches at login, loose submodule JS,
 * i18n.
 *
 * Usage: `gulp build-prod && gulp size-report [--json <file>] [--top <n>]`
 *
 * The JSON has `initialLoad` (each trio file's emitted raw and gzip size, and
 * their total) and `apps` (each Lazy App's `app.js` + `style/*.css`), which `gulp size-budget`
 * compares to `size-budget.json`, plus the per-contributor breakdown below.
 *
 * Method, per file:
 *   - main.js: r.js's `build.txt` lists every module in the layer. Each one is
 *     read from `src/`, run through the same ES5 transpile (`onBuildRead`) and
 *     the same uglify-js/clean-css versions the build uses, then measured on
 *     its own. The rows are therefore *standalone* sizes, and gzip rows do not
 *     add up exactly to the gzip of the whole file. The "attributed" total
 *     next to the actual size shows how close the sum gets.
 *   - templates.js: the minified file is parsed, and each
 *     `this.monster.cache.templates.<app>.<sub>.<view> = Handlebars.template(…)`
 *     assignment is measured exactly as it appears in the real output.
 *   - style.css: per Preloaded App (`preloadedApps` in build-config.json),
 *     each `apps/<name>/style/*.css` (after r.js has inlined its `@import`s)
 *     goes through clean-css. For the framework, each
 *     file that `css/style.css` imports goes through clean-css too.
 *
 * gzip is zlib level 6 (the zlib/Node default), applied to each piece alone:
 * what an unconfigured server sends, and what `size-budget.json` caps.
 * Brotli is quality 11, as in the `.br` copies the build writes for
 * `brotli_static` (docs/deployment.md). It is reported, never budgeted.
 */

const resolveFrom = (pkg, from) => require(require.resolve(pkg, {
	paths: [dirname(require.resolve(from))]
}));

// The exact minifiers the build pipeline uses (gulp-uglify 2 pins uglify-js 2).
const uglify = resolveFrom('uglify-js', 'gulp-uglify');
const CleanCss = resolveFrom('clean-css', 'gulp-clean-css');

// uglify-js 2 prints "Output exceeds 32000 characters" for every long line,
// to stdout, which would corrupt the Markdown report.
uglify.AST_Node.warn_function = () => {};

const gzipSize = text => gzipSync(Buffer.from(text), { level: 6 }).length;
const brotliSize = text => brotli(Buffer.from(text)).length;
const sizes = text => ({ raw: Buffer.byteLength(text), gzip: gzipSize(text), brotli: brotliSize(text) });
const NO_SIZE = { raw: 0, gzip: 0, brotli: 0 };
const sumSizes = rows => rows.reduce((acc, { raw, gzip, brotli }) => ({
	raw: acc.raw + raw,
	gzip: acc.gzip + gzip,
	brotli: acc.brotli + brotli
}), NO_SIZE);

const minifyJs = (code, file) => {
	const transpiled = shouldTranspile(join(src, file), src)
		? transpileToEs5(code, file)
		: code;
	return uglify.minify(transpiled, { fromString: true }).code;
};

const minifyCss = code => new CleanCss().minify(code).styles;

/**
 * Reads a stylesheet the build compiled from `src/`: `dist/` keeps neither
 * the framework's compiled CSS nor its `.scss`-only sources, so compile the
 * `.scss` sibling the same way `compileSass` does when no `.css` exists.
 * @param  {String} file Path relative to `src/`, as listed in build.txt
 * @return {String}
 */
const readCompiledCss = file => {
	const full = join(src, file);
	if (existsSync(full)) {
		return readFileSync(full, 'utf8');
	}
	return nodeSass.renderSync({
		file: full.replace(/\.css$/, '.scss'),
		importer: tildeImporter
	}).css.toString();
};

/**
 * Classifies a main.js layer input.
 * @param  {String} file Path relative to `src/`
 * @return {{ group: String, name: String }}
 */
const classifyJs = file => {
	const app = file.match(/^apps\/([^/]+)\//);
	if (app) {
		return { group: 'app', name: app[1] };
	}
	if (/^js\/lib\/(monster[^/]*|kazoo\/kazoo|jquery\.kazoosdk)\.js$/.test(file) || file === 'js/main.js') {
		return { group: 'framework', name: file };
	}
	return { group: 'vendor', name: file };
};

const groupRows = rows => Object.values(rows.reduce((acc, row) => {
	const key = `${row.group}:${row.name}`;
	acc[key] = acc[key] || Object.assign({ group: row.group, name: row.name, files: [] }, NO_SIZE);
	acc[key].files.push(row.file);
	acc[key].raw += row.raw;
	acc[key].gzip += row.gzip;
	acc[key].brotli += row.brotli;
	return acc;
}, {})).sort((a, b) => b.raw - a.raw);

const measureMain = layers => {
	const inputs = layers['js/main.js'];
	if (!inputs) {
		throw new Error('build.txt has no js/main.js layer; run `gulp build-prod` first');
	}
	const rows = inputs.map(file => {
		const minified = minifyJs(readFileSync(join(src, file), 'utf8'), file);
		return Object.assign({ file }, classifyJs(file), sizes(minified));
	});
	return { rows, grouped: groupRows(rows) };
};

/**
 * Turns the source of a `this.monster.cache.templates…` member chain into
 * its path segments, accepting both `.name` and `["name"]` access.
 */
const templatePath = text => {
	const prefix = 'this.monster.cache.templates';
	if (!text.startsWith(prefix)) {
		return null;
	}
	const segments = [];
	const re = /\.([\w$]+)|\["([^"]+)"\]/g;
	const rest = text.slice(prefix.length);
	let match;
	let consumed = 0;
	while ((match = re.exec(rest)) && match.index === consumed) {
		segments.push(match[1] || match[2]);
		consumed = re.lastIndex;
	}
	return consumed === rest.length ? segments : null;
};

const walk = (node, visit) => {
	if (!node || typeof node.type !== 'string') {
		return;
	}
	if (visit(node) === false) {
		return;
	}
	Object.keys(node).forEach(key => {
		const child = node[key];
		if (Array.isArray(child)) {
			child.forEach(item => walk(item, visit));
		} else if (child && typeof child.type === 'string') {
			walk(child, visit);
		}
	});
};

const measureTemplates = () => {
	const code = readFileSync(join(dist, 'js', 'templates.js'), 'utf8');
	const ast = parse(code, { ecmaVersion: 5 });
	const views = [];
	walk(ast, node => {
		if (node.type !== 'AssignmentExpression'
			|| node.right.type !== 'CallExpression'
			|| code.slice(node.right.callee.start, node.right.callee.end) !== 'Handlebars.template') {
			return true;
		}
		const path = templatePath(code.slice(node.left.start, node.left.end));
		if (path && path.length === 3) {
			const [app, sub, view] = path;
			views.push(Object.assign({
				group: 'app',
				name: app,
				submodule: sub.replace(/^_/, ''),
				file: `${app}/${sub.replace(/^_/, '')}/${view}`
			}, sizes(code.slice(node.start, node.end))));
		}
		return false;
	});
	const attributed = sumSizes(views);
	const total = sizes(code);
	const bySub = groupRows(views.map(row => Object.assign({}, row, {
		name: `${row.name}/${row.submodule}`
	})));
	return {
		rows: views,
		grouped: groupRows(views),
		bySubmodule: bySub,
		// Handlebars.getTemplate & co. from src/js/templates.js, namespace
		// initialisers, separators.
		runtimeRaw: total.raw - attributed.raw
	};
};

const listFiles = (dir, pattern) => existsSync(dir)
	? readdirSync(dir).reduce((acc, entry) => {
		const full = join(dir, entry);
		return statSync(full).isDirectory()
			? acc.concat(listFiles(full, pattern))
			: pattern.test(entry) ? acc.concat(full) : acc;
	}, [])
	: [];

const appNames = () => readdirSync(join(dist, 'apps'))
	.filter(name => statSync(join(dist, 'apps', name)).isDirectory());

/**
 * Top-level stylesheets in an App's `style/` folder: the files its `css`
 * list makes the loader fetch, or that style.css concatenates.
 * @param  {String} app
 * @return {String[]}  Absolute paths
 */
const appStylesheets = app => listFiles(join(dist, 'apps', app, 'style'), /\.css$/)
	.filter(full => dirname(full) === join(dist, 'apps', app, 'style'))
	.sort();

const preloadedApps = () => JSON.parse(readFileSync(join(dist, 'build-config.json'), 'utf8'))
	.preloadedApps || [];

const measureStyle = layers => {
	const framework = (layers['css/style.css'] || [])
		.filter(file => file !== 'css/style.css')
		.map(file => {
			const group = /^css\/lib\/sds\.css$/.test(file)
				? 'sds'
				: file.startsWith('css/lib/') ? 'framework' : 'vendor';
			return Object.assign({ file, group, name: file }, sizes(minifyCss(readCompiledCss(file))));
		});
	const apps = preloadedApps().reduce((acc, app) => acc.concat(
		appStylesheets(app)
			.map(full => Object.assign({
				file: relative(dist, full),
				group: 'app',
				name: app
			}, sizes(minifyCss(readFileSync(full, 'utf8')))))
	), []);
	const rows = framework.concat(apps);
	return { rows, grouped: groupRows(rows) };
};

const measureLoose = () => appNames().map(app => {
	const base = join(dist, 'apps', app);
	const js = listFiles(join(base, 'submodules'), /\.js$/);
	const i18n = join(base, 'i18n', 'en-US.json');
	const jsSizes = sumSizes(js.map(file => sizes(readFileSync(file, 'utf8'))));
	return {
		name: app,
		submoduleFiles: js.length,
		submoduleJs: jsSizes,
		i18nEnUs: existsSync(i18n) ? sizes(readFileSync(i18n, 'utf8')) : NO_SIZE
	};
}).sort((a, b) => b.submoduleJs.raw - a.submoduleJs.raw);

const actual = file => sizes(readFileSync(join(dist, file), 'utf8'));

const lazySubModules = () => JSON.parse(readFileSync(join(dist, 'build-config.json'), 'utf8'))
	.lazySubModules || {};

/**
 * What a Preloaded App fetches at login outside the trio: its default i18n and
 * every Submodule file that is neither in main.js nor a lazy chunk loaded on
 * first publish (`lazySubModules` in build-config.json). Reported, not
 * budgeted.
 * @param  {String} app
 * @return {Object}  `{ raw, gzip, files: { [file]: { raw, gzip } } }`
 */
const measureLoginFetches = app => {
	const lazy = Object.values(lazySubModules()[app] || {});
	const i18n = join('apps', app, 'i18n', 'en-US.json');
	const files = listFiles(join(dist, 'apps', app, 'submodules'), /\.js$/)
		.map(full => relative(dist, full))
		.filter(file => !lazy.some(submodule => file === join('apps', app, 'submodules', submodule, `${submodule}.js`)))
		.concat(existsSync(join(dist, i18n)) ? [i18n] : [])
		.sort()
		.reduce((sized, file) => Object.assign(sized, { [file]: actual(file) }), {});
	return Object.assign(sumSizes(Object.values(files)), { files });
};

/**
 * Each lazy Submodule chunk's emitted size, views and bundled libraries
 * included.
 * @return {Object}  `{ [app/submodule]: { raw, gzip } }`
 */
const measureLazySubmodules = () => {
	const byApp = lazySubModules();
	return Object.keys(byApp).sort().reduce((acc, app) => Array.from(new Set(Object.values(byApp[app])))
		.sort()
		.reduce((chunks, submodule) => Object.assign(chunks, {
			[`${app}/${submodule}`]: actual(join('apps', app, 'submodules', submodule, `${submodule}.js`))
		}), acc), {});
};

/**
 * Emitted size of each Lazy App's own bundle, for the per-App caps in
 * `size-budget.json`: its `app.js` (an r.js layer, Submodules and views
 * included) plus every `style/*.css` it loads at launch.
 * @param  {Object} layers  Parsed build.txt
 * @return {Object} `{ [app]: { raw, gzip, files: { [file]: { raw, gzip } } } }`
 */
const measureLazyApps = layers => Object.keys(layers)
	.map(output => output.match(/^apps\/([^/]+)\/app\.js$/))
	.filter(Boolean)
	.map(match => match[1])
	.sort()
	.reduce((acc, app) => {
		const files = [join('apps', app, 'app.js')]
			.concat(appStylesheets(app).map(full => relative(dist, full)))
			.reduce((sized, file) => Object.assign(sized, { [file]: actual(file) }), {});
		return Object.assign(acc, {
			[app]: Object.assign(sumSizes(Object.values(files)), { files })
		});
	}, {});

const kb = n => `${(n / 1024).toFixed(1)}`;
const pct = (n, of) => `${((n / of) * 100).toFixed(1)}%`;

const table = (headers, rows) => [
	`| ${headers.join(' | ')} |`,
	`| ${headers.map((h, i) => i === 0 ? '---' : '---:').join(' | ')} |`,
	...rows.map(row => `| ${row.join(' | ')} |`)
].join('\n');

const sizeTable = (label, grouped, total, top) => table(
	[label, 'raw KB', 'gzip KB', 'brotli KB', '% raw'],
	grouped.slice(0, top).map(row => [
		`${row.group === 'app' ? '' : `${row.group}: `}${row.name}`,
		kb(row.raw),
		kb(row.gzip),
		kb(row.brotli),
		pct(row.raw, total.raw)
	])
);

const groupTotals = (grouped, total) => table(
	['group', 'raw KB', 'gzip KB (standalone sum)', 'brotli KB (standalone sum)', '% raw'],
	Object.entries(grouped.reduce((acc, row) => {
		acc[row.group] = acc[row.group] || Object.assign({}, NO_SIZE);
		acc[row.group].raw += row.raw;
		acc[row.group].gzip += row.gzip;
		acc[row.group].brotli += row.brotli;
		return acc;
	}, {})).sort((a, b) => b[1].raw - a[1].raw).map(([group, s]) => [
		group, kb(s.raw), kb(s.gzip), kb(s.brotli), pct(s.raw, total.raw)
	])
);

const summary = (file, total, attributed) => `\`${file}\`: **${kb(total.raw)} KB raw / ${kb(total.gzip)} KB gzip / ${kb(total.brotli)} KB brotli** (attributed: ${kb(attributed.raw)} KB raw = ${pct(attributed.raw, total.raw)}, ${kb(attributed.gzip)} KB gzip standalone)`;

const toMarkdown = (report, top) => {
	const { main, templates, style, apps, lazySubmodules, commonAtLogin, loose, totals } = report;
	const initial = sumSizes(Object.values(totals));
	return [
		'# Production bundle size report',
		'',
		`Initial-load trio (main.js + templates.js + style.css): **${kb(initial.raw)} KB raw / ${kb(initial.gzip)} KB gzip / ${kb(initial.brotli)} KB brotli**.`,
		'',
		table(['file', 'raw KB', 'gzip KB', 'brotli KB'], Object.entries(totals).map(([file, s]) => [file, kb(s.raw), kb(s.gzip), kb(s.brotli)])),
		'',
		'## js/main.js',
		'',
		summary('js/main.js', totals['js/main.js'], sumSizes(main.rows)),
		'',
		groupTotals(main.grouped, totals['js/main.js']),
		'',
		sizeTable('module', main.grouped, totals['js/main.js'], top),
		'',
		'## js/templates.js',
		'',
		summary('js/templates.js', totals['js/templates.js'], sumSizes(templates.rows)),
		`Runtime/namespace overhead (unattributed): ${kb(templates.runtimeRaw)} KB raw. ${templates.rows.length} views.`,
		'',
		sizeTable('App', templates.grouped, totals['js/templates.js'], top),
		'',
		'Largest submodules:',
		'',
		sizeTable('App/submodule', templates.bySubmodule, totals['js/templates.js'], top),
		'',
		'## css/style.css',
		'',
		summary('css/style.css', totals['css/style.css'], sumSizes(style.rows)),
		'',
		groupTotals(style.grouped, totals['css/style.css']),
		'',
		sizeTable('source', style.grouped, totals['css/style.css'], top),
		'',
		'## Lazy Apps (each fetched on first launch)',
		'',
		table(
			['App', 'files', 'raw KB', 'gzip KB', 'brotli KB'],
			Object.entries(apps)
				.sort((a, b) => b[1].raw - a[1].raw)
				.map(([name, s]) => [
					name,
					Object.keys(s.files).map(file => file.replace(`apps/${name}/`, '')).join(', '),
					kb(s.raw),
					kb(s.gzip),
					kb(s.brotli)
				])
		),
		'',
		'## Lazy Submodule chunks (each fetched on first publish)',
		'',
		`\`common\` fetches at login outside the trio: **${kb(commonAtLogin.raw)} KB raw / ${kb(commonAtLogin.gzip)} KB gzip / ${kb(commonAtLogin.brotli)} KB brotli** (${Object.keys(commonAtLogin.files).map(file => file.replace('apps/common/', '')).join(', ') || 'nothing'}). Reported, not budgeted.`,
		'',
		table(
			['chunk', 'raw KB', 'gzip KB', 'brotli KB'],
			Object.entries(lazySubmodules)
				.sort((a, b) => b[1].raw - a[1].raw)
				.map(([name, s]) => [name, kb(s.raw), kb(s.gzip), kb(s.brotli)])
		),
		'',
		'## Other files outside the trio (loaded on demand)',
		'',
		table(
			['App', 'submodule .js files', 'submodule JS raw KB', 'gzip KB', 'brotli KB', 'i18n en-US raw KB', 'gzip KB', 'brotli KB'],
			loose.map(row => [
				row.name,
				row.submoduleFiles,
				kb(row.submoduleJs.raw),
				kb(row.submoduleJs.gzip),
				kb(row.submoduleJs.brotli),
				kb(row.i18nEnUs.raw),
				kb(row.i18nEnUs.gzip),
				kb(row.i18nEnUs.brotli)
			])
		),
		''
	].join('\n');
};

/**
 * Prints the Markdown report; `--json <file>` also writes the raw numbers.
 */
const sizeReport = done => {
	const layers = parseBuildTxt(readFileSync(join(dist, 'build.txt'), 'utf8'));
	const totals = INITIAL_LOAD_FILES.reduce((acc, file) => Object.assign(acc, {
		[file]: actual(file)
	}), {});
	const report = {
		// What `gulp size-budget` checks: emitted sizes, never the row sums.
		initialLoad: {
			files: totals,
			total: sumSizes(Object.values(totals))
		},
		apps: measureLazyApps(layers),
		lazySubmodules: measureLazySubmodules(),
		// Reported, not budgeted (#40).
		commonAtLogin: measureLoginFetches('common'),
		totals,
		main: measureMain(layers),
		templates: measureTemplates(),
		style: measureStyle(layers),
		loose: measureLoose()
	};
	const top = Number(env.top) || 25;
	process.stdout.write(toMarkdown(report, top));
	if (typeof env.json === 'string') {
		writeFileSync(env.json, JSON.stringify(report, null, 2));
	}
	done();
};

export default sizeReport;
