import { join } from 'upath';
import gulp from 'gulp';
import rjs from 'requirejs';
import del from 'del';
import vinylPaths from 'vinyl-paths';
import { require, tmp } from '../paths.js';
import {
	env,
	getEagerSubmodules,
	getLazyApps,
	getLazySubmodules,
	getPreloadedApps,
	getProApps,
	listSubmodules
} from '../helpers/helpers.js';
import { cleanTmp } from './clean-move.js';
import { onBuildRead } from '../helpers/transpile.js';
import { bundleModules, findLibsInSeveralApps } from '../helpers/app-bundles.js';

const standardFilesToExclude = [
	'config',
	'templates'
];

/**
 * Loaded on their first `require()` instead of bundled into main.js. Every
 * module here is only required lazily (`require([...], callback)`), which
 * `findNestedDependencies` would otherwise pull into the bundle.
 * @type {Array}
 */
export const libsToExcludeFromWhole = [
	'jsoneditor',
	'pdfjs-dist/build/pdf',
	'pdfjs-dist/build/pdf.worker',
	'pdfmake',
	'simplemde',
	'vfs_fonts'
];

/**
 * Libraries that several Lazy Apps or lazy Submodule chunks use and main.js
 * does not contain. Every App bundle and chunk leaves them out, so each loads
 * once, as its own file, on its first `require()`. `build-prod` warns about
 * any library it finds bundled into more than one of them: add it here.
 * @type {Array}
 */
export const libsSharedByApps = [
	'datatables.net',
	'datatables.net-bs',
	'datatables.net-buttons',
	'datatables.net-buttons-bootstrap',
	'datatables.net-buttons-html5',
	'papaparse' // common's csvUploader and portWizard
];

/**
 * Libraries a Preloaded App's loose Submodule or lazy Submodule chunk requires.
 * Submodules are loaded by a computed ID, so r.js never traces them into
 * main.js; without this a Lazy App that also uses the library would bundle it
 * and `removeCombined` would delete the file the Submodule fetches. Today:
 * isotope, for common's appSelector.
 * @type {Array}
 */
const libsInMain = [
	'isotope'
];

/**
 * Left out of the bundle `build-app` makes for a single App. `build-prod`
 * excludes `js/main` from each App bundle instead.
 * @type {Array}
 */
const libsToExcludeFromApp = [
	'async',
	'bootstrap',
	'braintree-client',
	'braintree-hosted-fields',
	'braintree-us-bank-account',
	'braintree-vault-manager',
	'chart',
	'chosen',
	'clipboard',
	'config',
	'cookies',
	'crossroads',
	'date-holidays',
	'ddslick',
	'disableAutoFill',
	'drop',
	'duo',
	'file-saver',
	'fileupload',
	'footable',
	'form2object',
	'handlebars',
	'hasher',
	'hotkeys',
	'image-select',
	'introJs',
	'isotope',
	'jquery',
	'jqueryui',
	'jsoneditor',
	'jstz',
	'jszip',
	'kazoo',
	'kazoosdk',
	'libphonenumber',
	'lodash',
	'mask',
	'md5',
	'modernizr',
	'moment',
	'moment-timezone',
	'monster',
	'monster-apps',
	'monster-lazy-submodules',
	'monster-routing',
	'monster-socket',
	'monster-timezone',
	'monster-ua',
	'monster-ui',
	'monster-util',
	'monster-webphone',
	'monthpicker',
	'mousetrap',
	'papaparse',
	'pdfjs-dist/build/pdf',
	'pdfjs-dist/build/pdf.worker',
	'pdfmake',
	'popup-redirect',
	'postal',
	'qrcode',
	'randomColor',
	'renderjson',
	'signals',
	'simplemde',
	'sugar-date',
	'templates',
	'tether',
	'timepicker',
	'toastr',
	'touch-punch',
	'validate',
	'validate-addons',
	'vfs_fonts',
	'wysiwyg'
];

const getConfigRequire = () => ({
	dir: require, // direction
	appDir: tmp, // origin
	baseUrl:'.',
	mainConfigFile: join(tmp, 'js', 'main.js'),
	fileExclusionRegExp: /^doc*|.*\.md|^\..*|^monster-ui\.build\.js$/,
	findNestedDependencies:true,
	preserveLicenseComments:false,
	removeCombined:true,
	/**
	 * Prevent optimization because we don't want to minify config.js and there
	 * is no way to single it out, we should optimize with gulp later.
	 * @type {String}
	 */
	optimize: 'none',
	/**
	 * Down-level first-party sources to ES5 before r.js's esprima parses them
	 * and before gulp-uglify minifies the bundle; neither understands ES2015+.
	 * @type {Function}
	 */
	onBuildRead: onBuildRead(require),
	/**
	 * With `optimize: 'none'` the per-file pass over the whole directory is a
	 * no-op, except that it would also feed every non-bundled `.js` file (e.g.
	 * JSON data fetched over XHR) through `onBuildRead`. Skip it so only
	 * bundled modules are transpiled; everything else is copied verbatim.
	 * @type {Boolean}
	 */
	skipDirOptimize: true,
	modules: env.hasOwnProperty('app')
		? [
			{
				name: join('js', 'main'),
				exclude: standardFilesToExclude
			},
			{
				name: join('apps', env.app, 'app'),
				exclude: libsToExcludeFromApp,
				include: env.hasOwnProperty('pro')
					? [join('apps', env.app, 'submodules', 'pro',  'pro')]
					: []
			}
		]
		: bundleModules({
			preloadedApps: getPreloadedApps(),
			lazyApps: getLazyApps(),
			proApps: getProApps(),
			submodulesOf: app => listSubmodules(tmp, app),
			loadedSeparately: [
				...standardFilesToExclude,
				...libsToExcludeFromWhole
			],
			libsSharedByApps,
			libsInMain,
			eagerSubmodulesOf: getEagerSubmodules,
			lazySubmodulesOf: app => getLazySubmodules(tmp, app)
		})
});

/**
 * Warns (never fails) about libraries that ended up in several App bundles.
 * @param  {String} buildResponse  r.js's build.txt
 */
const warnLibsInSeveralApps = buildResponse => findLibsInSeveralApps(buildResponse)
	.forEach(({ file, apps }) => {
		console.warn(`warning: ${file} is bundled into ${apps.length} App bundles or Submodule chunks (${apps.join(', ')}); add it to libsSharedByApps in gulp/tasks/require.js so it loads once`);
	});

const buildRequire = done => {
	rjs.optimize(getConfigRequire(), function(buildResponse){
		if (!env.hasOwnProperty('app')) {
			warnLibsInSeveralApps(buildResponse);
		}
		done();
	}, done);
};

const moveRequire = () => gulp
	.src(join(require , '**', '*'))
	.pipe(gulp.dest(tmp));

const cleanRequire = () => gulp
	.src(require, {
		allowEmpty: true,
		read: false
	})
	.pipe(vinylPaths(del));

/**
 * buildRequire
 * cleanTmp
 * moveRequire
 * cleanRequire
 *
 * For `whole`: from dist, run the optimizer and output it into dist
 *
 * For `app`: require whole directory, skipping all the optimizing of the core
 * modules, but focusing on the specific app
 */
export default gulp.series(
	buildRequire,
	cleanTmp,
	moveRequire,
	cleanRequire
);
