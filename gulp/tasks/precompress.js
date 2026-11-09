import { join } from 'upath';
import { dist } from '../paths.js';
import { env } from '../helpers/helpers.js';
import { precompressTree } from '../helpers/precompress.js';

const precompressFolder = (root, done) => {
	const { written, removed } = precompressTree(root);
	console.log(`Precompressed ${root}: wrote ${written.length} .br/.gz copies, removed ${removed.length} stale ones`);
	done();
};

/**
 * Last step of `build-prod`: `.br` / `.gz` copies over the final `/dist`,
 * after `cacheBust` has rewritten `js/main.js` and `index.html`.
 */
export const precompressDist = done => precompressFolder(dist, done);

/**
 * Last step of `build-app`: copies for `/dist/apps/<name>` only.
 */
export const precompressApp = done => precompressFolder(join(dist, 'apps', env.app), done);
