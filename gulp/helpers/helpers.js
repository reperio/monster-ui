import { join } from 'upath';
import fs from 'fs';
import parser from 'yargs-parser';
import { src } from '../paths.js';
import nodeSass from 'node-sass';
import gulpSass from 'gulp-sass';
import tildeImporter from 'node-sass-tilde-importer';
import { lazyTopicMap } from './lazy-submodules.js';

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

/**
 * Apps whose Submodules load on their first publish, each with its eager core:
 * the Submodules bundled into main.js and loaded at start. A Submodule is
 * eager when the framework or a Preloaded App publishes it, or when a caller
 * does DOM work right after `pub` and so needs it to render synchronously
 * (docs/adr/0010-common-controls-load-on-first-publish.md). Every other
 * Submodule of these Apps is lazy: its own chunk, loaded through a stub
 * subscriber. Other Apps load all their Submodules at start.
 */
const eagerCores = {
	common: [
		'accountBrowser', // core's account switcher
		'cidNumber', // monster.ui.cidNumberSelector
		'numberFeaturesMenu', // voip groups/users call tooltips right after pub
		'webphone' // monster.webphone
	]
};

/**
 * @param  {String} app
 * @return {String[]}  The App's eager core; empty for an App that loads all
 *                     its Submodules at start
 */
export const getEagerSubmodules = app => eagerCores[app] || [];

/**
 * @param  {String} root  Directory holding `apps/`
 * @param  {String} app
 * @return {String[]}  Submodules of `app` that load on first publish
 */
export const getLazySubmodules = (root, app) => eagerCores.hasOwnProperty(app)
	? listSubmodules(root, app).filter(submodule => !eagerCores[app].includes(submodule))
	: [];

/**
 * `lazySubModules` for build-config.json: per App with lazy Submodules, each
 * topic -> the Submodule whose stub loads on it, read from the sources.
 * @param  {String} root  Directory holding `apps/`
 * @return {Object}
 */
export const getLazySubmoduleTopics = root => Object.keys(eagerCores)
	.filter(app => getAppsToInclude().includes(app))
	.reduce((acc, app) => {
		const read = names => names.reduce((sources, submodule) => Object.assign(sources, {
			[submodule]: fs.readFileSync(join(root, 'apps', app, 'submodules', submodule, `${submodule}.js`), 'utf8')
		}), {});
		return Object.assign(acc, {
			[app]: lazyTopicMap({
				app,
				sources: read(getLazySubmodules(root, app)),
				eagerSources: read(getEagerSubmodules(app).filter(submodule => listSubmodules(root, app).includes(submodule)))
			})
		});
	}, {});

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
