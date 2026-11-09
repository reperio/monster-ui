import { join } from 'upath';
import { readFileSync, writeFileSync } from 'fs';
import { tmp } from '../paths.js';
import {
	hashContent,
	hashTree,
	injectRequireConfig,
	rewriteIndexHtml
} from '../helpers/cache-bust.js';

/**
 * Keys the production build's URLs to its content, so everything but
 * index.html, build-config.json and VERSION can be cached long
 * (docs/deployment.md). Runs on the finished tmp/ tree, in this order:
 *
 *   1. release id  = hash of the whole build (RequireJS `urlArgs: 'v=<id>'`)
 *   2. hash js/templates.js, inject it and the release id into js/main.js
 *   3. hash the rewritten js/main.js and css/style.css
 *   4. rewrite index.html to `js/main.js?v=…` and `css/style.css?v=…`
 */
const cacheBust = done => {
	const file = path => join(tmp, path);
	const read = path => readFileSync(file(path));

	const releaseId = hashTree(tmp);
	const templatesHash = hashContent(read('js/templates.js'));
	const main = injectRequireConfig(read('js/main.js').toString('utf8'), { releaseId, templatesHash });
	writeFileSync(file('js/main.js'), main);

	const index = rewriteIndexHtml(read('index.html').toString('utf8'), {
		mainHash: hashContent(main),
		styleHash: hashContent(read('css/style.css'))
	});
	writeFileSync(file('index.html'), index);

	console.log(`Release ${releaseId}: templates.js?v=${templatesHash}`);
	done();
};

export default cacheBust;
