import { join } from 'upath';
import { readFileSync, writeFileSync } from 'fs';
import { tmp } from '../paths.js';
import {
	getAppsToInclude,
	getPreloadedApps,
	getProApps,
	listSubmodules
} from '../helpers/helpers.js';
import { libsSharedByApps, libsToExcludeFromWhole } from './require.js';
import {
	cacheManifest,
	hashContent,
	injectRequireConfig,
	rewriteIndexHtml
} from '../helpers/cache-bust.js';

/**
 * Every module RequireJS fetches on its own after boot, outside an App's
 * app.js: the libraries no bundle carries, and the Preloaded Apps' Submodules,
 * which stay loose files (a Lazy App's are bundled into its app.js, and a
 * Preloaded pro App's `pro` into main.js).
 * @return {String[]}
 */
const lazyChunks = () => [
	...libsToExcludeFromWhole,
	...libsSharedByApps,
	...getPreloadedApps().reduce((acc, app) => acc.concat(listSubmodules(tmp, app)
		.filter(submodule => !(submodule === 'pro' && getProApps().includes(app)))
		.map(submodule => `apps/${app}/submodules/${submodule}/${submodule}`)), [])
];

/**
 * Keys the production build's URLs to their content, so everything but
 * index.html, build-config.json and VERSION can be cached long
 * (docs/deployment.md). Runs on the finished tmp/ tree, in this order:
 *
 *   1. hash each App and each lazy chunk into build-config.json's `cacheKeys`
 *   2. hash js/templates.js; in js/main.js, key `templates` to it and drop
 *      the global `urlArgs` bust
 *   3. hash the rewritten js/main.js and css/style.css
 *   4. rewrite index.html to `js/main.js?v=…` and `css/style.css?v=…`
 */
const cacheBust = done => {
	const file = path => join(tmp, path);
	const read = path => readFileSync(file(path));

	const cacheKeys = cacheManifest(tmp, { apps: getAppsToInclude(), chunks: lazyChunks() });
	const buildConfig = JSON.parse(read('build-config.json'));
	writeFileSync(file('build-config.json'), JSON.stringify(Object.assign(buildConfig, { cacheKeys })));

	const templatesHash = hashContent(read('js/templates.js'));
	const main = injectRequireConfig(read('js/main.js').toString('utf8'), { templatesHash });
	writeFileSync(file('js/main.js'), main);

	const index = rewriteIndexHtml(read('index.html').toString('utf8'), {
		mainHash: hashContent(main),
		styleHash: hashContent(read('css/style.css'))
	});
	writeFileSync(file('index.html'), index);

	console.log(`Keyed ${Object.keys(cacheKeys.apps).length} Apps, ${Object.keys(cacheKeys.requirePaths).length} lazy chunks; templates.js?v=${templatesHash}`);
	done();
};

export default cacheBust;
