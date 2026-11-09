import { env, getLazyApps, getLazySubmodules, getPreloadedApps, mode } from '../helpers/helpers.js';
import { join } from 'upath';
import gulp from 'gulp';
import uglify from 'gulp-uglify';
import eslint from 'gulp-eslint';
import { app, src, tmp } from '../paths.js';

const config = {
	app: {
		lint: [
			join(src, 'apps', env.app || '', 'app.js'),
			join(src, 'apps', env.app || '', 'submodules', '*', '*.js')
		]
	},
	whole: {
		lint: [
			join(src, '**', '*.js'),
			'!' + join(src, 'js', 'vendor', '**', '*.js'),
			'!' + join(src, 'js', 'lib', 'kazoo', 'dependencies', '**', '*.js')
		]
	}
};
const context = config[mode];

const handleUglifyError = error => {
	console.error(JSON.stringify(error, null, 4));
};

/**
 * Minifies js/main.js, js/templates.js, each Lazy App's bundle and each lazy
 * Submodule chunk; we don't use the optimizer from requirejs as we don't want
 * to minify config.js
 */
export const minifyJs = () => gulp
	.src([
		join(tmp, 'js', 'main.js'),
		join(tmp, 'js', 'templates.js'),
		...getLazyApps().map(item => join(tmp, 'apps', item, 'app.js')),
		...getPreloadedApps().reduce((acc, item) => acc.concat(getLazySubmodules(tmp, item)
			.map(submodule => join(tmp, 'apps', item, 'submodules', submodule, `${submodule}.js`))), [])
	], {
		base: tmp
	})
	.pipe(uglify().on('error', handleUglifyError))
	.pipe(gulp.dest(tmp));

/**
 * Minifies app.js
 */
export const minifyJsApp = () => gulp
	.src(join(app, 'app.js'))
	.pipe(uglify().on('error', handleUglifyError))
	.pipe(gulp.dest(app));

/**
 * Show linting error
 */
export const lint = () => gulp
	.src(context.lint)
	.pipe(eslint())
	.pipe(eslint.format());
