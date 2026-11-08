import { relative, normalize } from 'upath';
import { transformSync } from '@babel/core';

/**
 * Third-party code shipped prebuilt; it is already ES5 and too large to be
 * worth re-parsing on every build.
 */
const vendorDirs = [
	'js/vendor/',
	'js/lib/kazoo/dependencies/'
];

/**
 * Whether a file read by r.js is first-party source that may contain ES2015+
 * syntax (vendored Apps in particular are not guaranteed to be ES5).
 * @param  {String} filePath Absolute path of the file being read
 * @param  {String} baseDir  Directory r.js is building from
 * @return {Boolean}
 */
export const shouldTranspile = (filePath, baseDir) => {
	const rel = relative(baseDir, normalize(filePath));

	return /\.js$/.test(rel)
		&& !rel.startsWith('..')
		&& !vendorDirs.some(dir => rel.startsWith(dir));
};

/**
 * Down-levels `contents` to ES5 so that r.js's bundled esprima and the
 * ES5-only gulp-uglify can parse the production bundle.
 *
 * Sources are AMD scripts, not ES modules: `sourceType: 'script'` keeps Babel
 * from parsing them in strict mode or injecting "use strict", and the
 * project's Babel 6 `.babelrc` (which only configures the gulpfile) is ignored.
 * @param  {String} contents Source text
 * @param  {String} filePath Path, used for error messages
 * @return {String}
 */
export const transpileToEs5 = (contents, filePath) => transformSync(contents, {
	filename: filePath,
	babelrc: false,
	configFile: false,
	sourceType: 'script',
	compact: false,
	retainLines: true,
	presets: [
		['@babel/preset-env', {
			targets: { ie: '11' },
			modules: false,
			// `typeof x` would otherwise be routed through an injected helper
			// in every file; nothing here relies on Symbol typeof semantics.
			exclude: ['transform-typeof-symbol']
		}]
	]
}).code;

/**
 * r.js `onBuildRead` hook.
 * @param  {String} baseDir Directory r.js is building from
 * @return {Function}
 */
export const onBuildRead = baseDir => (moduleName, filePath, contents) => shouldTranspile(filePath, baseDir)
	? transpileToEs5(contents, filePath)
	: contents;
