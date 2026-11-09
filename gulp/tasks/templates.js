import { join, normalize, sep } from 'upath';
import gulp from 'gulp';
import handlebars from 'gulp-handlebars';
import wrap from 'gulp-wrap';
import declare from 'gulp-declare';
import concat from 'gulp-concat';
import del from 'del';
import vinylPaths from 'vinyl-paths';
import { app, src, tmp } from '../paths.js';
import { getLazyApps, getLazySubmodules, getPreloadedApps, mode } from '../helpers/helpers.js';
import { sortByPath } from '../helpers/sort-by-path.js';

const viewsOf = appDir => [
	join(appDir, 'views', '*.html'),
	join(appDir, 'submodules', '*', 'views', '*.html')
];

const submoduleViews = (appDir, submodule) => join(appDir, 'submodules', submodule, 'views', '*.html');

/**
 * The lazy Submodules of each Preloaded App, read from `src/` because the task
 * list is built before `tmp/` exists (`tmp/` is a copy of it).
 * @return {Array<{app: String, submodule: String}>}
 */
const lazySubmodules = () => getPreloadedApps().reduce((acc, item) => acc.concat(
	getLazySubmodules(src, item).map(submodule => ({ app: item, submodule }))
), []);

/**
 * Where each build's views come from and where they are compiled to. In a
 * whole build, `templates.js` carries only the Preloaded Apps' views, less
 * those of their lazy Submodules; each Lazy App's views are folded into its own
 * `app.js` (see `templatesLazyApps`) and each lazy Submodule's into its chunk
 * (see `templatesLazySubmodules`).
 */
const pathsTemplates = {
	whole: {
		src: getPreloadedApps().reduce((acc, item) => acc.concat(
			viewsOf(join(tmp, 'apps', item))
		), []).concat(lazySubmodules().map(({ app: item, submodule }) => '!' + submoduleViews(join(tmp, 'apps', item), submodule))),
		dest: join(tmp, 'js'),
		concatName: 'templates-compiled.js'
	},
	app: {
		src: viewsOf(app),
		dest: join(app, 'views'),
		concatName: 'templates.js'
	}
};

/**
 * Compiles views into one file of `monster.cache.templates.<app>…`
 * assignments, the shape `monster.getTemplate` looks up before fetching.
 * @param  {String[]} src  View globs
 * @param  {String} dest
 * @param  {String} concatName
 * @return {Stream}
 */
const compileViews = (src, dest, concatName) => gulp
	.src(src)
	// Sort before `declare`: with `noRedeclare`, each namespace is initialised
	// only in the first file that uses it, so that file must come first.
	.pipe(sortByPath())
	.pipe(handlebars())
	.pipe(wrap('Handlebars.template(<%= contents %>)'))
	.pipe(declare({
		namespace: 'monster.cache.templates',
		noRedeclare: true,
		processName: filePath => {
			const splits = normalize(filePath).split(sep);
			const indexSub = splits.indexOf('submodules');
			let newName;
			if (indexSub >= 0) {
				newName = splits[splits.length - 5].concat(
					'._',
					splits[splits.length - 3],
					'.',
					splits[splits.length - 1]
				);
			} else {
				newName = splits[splits.length - 3].concat(
					'._main.',
					splits[splits.length - 1]
				);
			}
			return declare.processNameByPath(newName);
		}
	}))
	.pipe(concat(concatName))
	.pipe(gulp.dest(dest));

const compileTemplates = () => compileViews(
	pathsTemplates[mode].src,
	pathsTemplates[mode].dest,
	pathsTemplates[mode].concatName
);

const concatTemplatesApp = () => gulp
	.src([
		join(app, 'app.js'),
		join(pathsTemplates.app.dest, pathsTemplates.app.concatName)
	])
	.pipe(concat('app.js'))
	.pipe(gulp.dest(app));

const concatTemplatesWhole = () => gulp
	.src([
		join(pathsTemplates.whole.dest, 'templates.js'),
		join(pathsTemplates.whole.dest, pathsTemplates.whole.concatName)
	])
	.pipe(concat('templates.js'))
	.pipe(gulp.dest(pathsTemplates.whole.dest));

const cleanTemplates = () => gulp
	.src([
		...pathsTemplates[mode].src,
		join(pathsTemplates[mode].dest, pathsTemplates[mode].concatName)
	], {
		read: false
	})
	.pipe(vinylPaths(del));

/**
 * Compiles `views`, appends them to the module file `dir/<jsName>` (as
 * `build-app` does), and deletes the loose `.html` files, so the module never
 * fetches a view over XHR. Runs before r.js, so the views are minified with the
 * module's layer.
 * @param  {String} dir  Folder holding the module file and its `views/`
 * @param  {String[]} views  View globs
 * @param  {String} jsName  The module file
 * @return {Function}  gulp task
 */
const foldViews = (dir, views, jsName) => {
	const compiledName = 'templates-compiled.js';
	const compiled = join(dir, 'views', compiledName);
	const compile = () => compileViews(views, join(dir, 'views'), compiledName);
	const append = () => gulp
		.src([join(dir, jsName), compiled], { allowEmpty: true })
		.pipe(concat(jsName))
		.pipe(gulp.dest(dir));
	const clean = () => gulp
		.src([...views, compiled], { allowEmpty: true, read: false })
		.pipe(vinylPaths(del));
	return gulp.series(compile, append, clean);
};

/**
 * For one Lazy App: folds its views and Submodule views into its `app.js`.
 * @param  {String} name
 * @return {Function}  gulp task
 */
const templatesLazyApp = name => {
	const appDir = join(tmp, 'apps', name);
	return foldViews(appDir, viewsOf(appDir), 'app.js');
};

/**
 * For one lazy Submodule of a Preloaded App: folds its views into its chunk.
 * @param  {Object} lazySubmodule
 * @param  {String} lazySubmodule.app
 * @param  {String} lazySubmodule.submodule
 * @return {Function}  gulp task
 */
const templatesLazySubmodule = ({ app: name, submodule }) => {
	const appDir = join(tmp, 'apps', name);
	return foldViews(join(appDir, 'submodules', submodule), [submoduleViews(appDir, submodule)], `${submodule}.js`);
};

const parallelOrNothing = tasks => tasks.length
	? gulp.parallel(...tasks)
	: done => done();

/**
 * Folds every Lazy App's views into its own `app.js`.
 */
const templatesLazyApps = parallelOrNothing(getLazyApps().map(templatesLazyApp));

/**
 * Folds every lazy Submodule's views into its own chunk.
 */
const templatesLazySubmodules = parallelOrNothing(lazySubmodules().map(templatesLazySubmodule));

/**
 * compileTemplates
 * concatTemplatesWhole
 * cleanTemplates
 *
 * Pre-compiles the Preloaded Apps' views with handlebars and appends them to
 * templates.js, then folds each Lazy App's views into its own app.js and each
 * lazy Submodule's into its chunk
 */
export const templates = gulp.series(
	compileTemplates,
	concatTemplatesWhole,
	cleanTemplates,
	templatesLazyApps,
	templatesLazySubmodules
);

/**
 * compileTemplates
 * concatJsApp
 * cleamTemplates
 *
 * Gets all apps .html templates and pre-compile them with handlebars, then
 * append it to templates.js, also removes all the .html files from the folder
 */
export const templatesApp = gulp.series(
	compileTemplates,
	concatTemplatesApp,
	cleanTemplates
);
