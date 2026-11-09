import { join, normalize, sep } from 'upath';
import gulp from 'gulp';
import handlebars from 'gulp-handlebars';
import wrap from 'gulp-wrap';
import declare from 'gulp-declare';
import concat from 'gulp-concat';
import del from 'del';
import vinylPaths from 'vinyl-paths';
import { app, tmp } from '../paths.js';
import { getLazyApps, getPreloadedApps, mode } from '../helpers/helpers.js';
import { sortByPath } from '../helpers/sort-by-path.js';

const viewsOf = appDir => [
	join(appDir, 'views', '*.html'),
	join(appDir, 'submodules', '*', 'views', '*.html')
];

/**
 * Where each build's views come from and where they are compiled to. In a
 * whole build, `templates.js` carries only the Preloaded Apps' views; each
 * Lazy App's are folded into its own `app.js` (see `templatesLazyApps`).
 */
const pathsTemplates = {
	whole: {
		src: getPreloadedApps().reduce((acc, item) => acc.concat(
			viewsOf(join(tmp, 'apps', item))
		), []),
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
	.pipe(sortByPath())
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
 * For one Lazy App: compiles its views and Submodule views, appends them to
 * its `app.js` (as `build-app` does), and deletes the loose `.html` files, so
 * the App never fetches a view over XHR. Runs before r.js, so the views are
 * minified with the App's bundle.
 * @param  {String} name
 * @return {Function}  gulp task
 */
const templatesLazyApp = name => {
	const appDir = join(tmp, 'apps', name);
	const compiledName = 'templates-compiled.js';
	const compiled = join(appDir, 'views', compiledName);
	const compile = () => compileViews(viewsOf(appDir), join(appDir, 'views'), compiledName);
	const append = () => gulp
		.src([join(appDir, 'app.js'), compiled], { allowEmpty: true })
		.pipe(concat('app.js'))
		.pipe(gulp.dest(appDir));
	const clean = () => gulp
		.src([...viewsOf(appDir), compiled], { allowEmpty: true, read: false })
		.pipe(vinylPaths(del));
	return gulp.series(compile, append, clean);
};

/**
 * Folds every Lazy App's views into its own `app.js`.
 */
const templatesLazyApps = getLazyApps().length
	? gulp.parallel(...getLazyApps().map(templatesLazyApp))
	: done => done();

/**
 * compileTemplates
 * concatTemplatesWhole
 * cleanTemplates
 *
 * Pre-compiles the Preloaded Apps' views with handlebars and appends them to
 * templates.js, then folds each Lazy App's views into its own app.js
 */
export const templates = gulp.series(
	compileTemplates,
	concatTemplatesWhole,
	cleanTemplates,
	templatesLazyApps
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
