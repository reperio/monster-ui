import { join } from 'upath';
import fs from 'fs';
import parser from 'yargs-parser';
import { src } from '../paths.js';
import nodeSass from 'node-sass';
import gulpSass from 'gulp-sass';
import tildeImporter from 'node-sass-tilde-importer';

const getAppsToExclude = () => ['demo_done', 'skeleton'];

const getDirectories = pathToParse => fs
	.readdirSync(pathToParse)
	.filter(file => fs
		.statSync(join(pathToParse, file))
		.isDirectory());

export const env = parser(process.argv.slice(2));

export const listAllApps = () => getDirectories(join(src, 'apps'));

/**
 * Every App `build-prod` builds, preloaded or lazy.
 * @return {String[]}
 */
export const getAppsToInclude = () => listAllApps()
	.filter(app => !getAppsToExclude().includes(app));

/**
 * The Preloaded Apps: bundled into the Initial Load trio (main.js,
 * templates.js, style.css) and listed as `preloadedApps` in build-config.json.
 * This one list drives all four, which must agree.
 * @return {String[]}
 */
export const getPreloadedApps = () => ['apploader', 'auth', 'common', 'core']
	.filter(app => getAppsToInclude().includes(app));

/**
 * The Lazy Apps: every other App, each built as its own `apps/<name>/app.js`
 * and `style/*.css`, fetched the first time it is launched.
 * @return {String[]}
 */
export const getLazyApps = () => getAppsToInclude()
	.filter(app => !getPreloadedApps().includes(app));

/**
 * Names of the Submodules an App has on disk, e.g. `['devices', 'users']`.
 * @param  {String} root  Directory holding `apps/`
 * @param  {String} app
 * @return {String[]}
 */
export const listSubmodules = (root, app) => {
	const dir = join(root, 'apps', app, 'submodules');
	return fs.existsSync(dir)
		? getDirectories(dir).filter(sub => fs.existsSync(join(dir, sub, `${sub}.js`)))
		: [];
};

export const mode = env.app && env.app.length ? 'app' : 'whole';

export const getProApps = () => ({
		app: env.pro === true ? [env.app] : [],
		whole: env.pro && env.pro.length ? env.pro.split(',') : []
	}[mode]);

const compileSass = gulpSass(nodeSass);

export const sass = () => compileSass({
    importer: tildeImporter
});

sass.logError = compileSass.logError.bind(sass);
