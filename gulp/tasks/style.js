import { join } from 'upath';
import gulp from 'gulp';
import concatCss from '@fomantic/gulp-concat-css';
import cleanCss from 'gulp-clean-css';
import { app, tmp } from '../paths.js';
import { getLazyApps, getPreloadedApps, sass } from '../helpers/helpers.js';

const concatName = 'style.css';
const cssDest = join(tmp, 'css');
const concatCssPaths = getPreloadedApps().reduce((acc, item) => [
	...acc,
	join(tmp, 'apps', item, 'style', '*.css')
], [
	join(tmp, 'css', 'style.css')
]);

const concatAllCss = () => gulp
	.src(concatCssPaths)
	.pipe(concatCss(concatName))
	.pipe(gulp.dest(cssDest));

const minifyCss = () => gulp
	.src(join(cssDest, concatName))
	.pipe(cleanCss())
	.pipe(gulp.dest(cssDest));

/**
 * Minifies each Lazy App's own stylesheets (`style/*.css`, the files its `css`
 * list makes the loader fetch at launch). r.js has already inlined their
 * `@import`s, so vendor CSS that only one App uses (bootstrap-tour in
 * callflows) is in that App's `app.css`, ahead of the App's own rules.
 */
const minifyCssLazyApps = () => gulp
	.src(getLazyApps().map(item => join(tmp, 'apps', item, 'style', '*.css')), {
		base: tmp
	})
	.pipe(cleanCss())
	.pipe(gulp.dest(tmp));

/**
 * concatAllCss
 * minifyCss
 * minifyCssLazyApps
 *
 * Concatenates the framework's and the Preloaded Apps' CSS into style.css and
 * minifies it, then minifies each Lazy App's stylesheets in place
 */
export const css = gulp.series(
	concatAllCss,
	minifyCss,
	minifyCssLazyApps
);

/**
 * Uglifies app.css
 */
export const minifyCssApp = () => gulp
	.src(join(app, 'style', 'app.css'))
	.pipe(cleanCss())
	.pipe(gulp.dest(join(app, 'style')));

/**
 * Compiles all .scss files into .css and moves them to dist folder
 */
export const compileSass = () => gulp
	.src(join(tmp, '**', '*.scss'))
	.pipe(sass().on('error', sass.logError))
	.pipe(gulp.dest(tmp));
