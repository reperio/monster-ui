import { extname, join } from 'upath';
import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'fs';
import { brotliCompressSync, constants, gzipSync } from 'zlib';

const EXTENSIONS = ['.js', '.css', '.json', '.html', '.svg', '.properties'];

// Edited by the operator after the build: a build-time copy would go stale.
const EXCLUDED = ['js/config.js'];

const qualifies = file => EXTENSIONS.includes(extname(file)) && !EXCLUDED.includes(file);

// A copy has to be at least this much smaller than the original to be kept.
const MIN_SAVING = 0.1;

const worthKeeping = (original, copy) => copy.length <= original.length * (1 - MIN_SAVING);

/**
 * Brotli at quality 11, as the `.br` copies are written. `gulp size-report`
 * measures with it too.
 * @param  {Buffer} content
 * @return {Buffer}
 */
export const brotli = content => brotliCompressSync(content, {
	params: {
		[constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
		[constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
		[constants.BROTLI_PARAM_SIZE_HINT]: content.length
	}
});

const FORMATS = [
	{
		ext: '.br',
		compress: brotli
	},
	{
		ext: '.gz',
		compress: content => gzipSync(content, { level: 9 })
	}
];

const listFiles = (root, dir = root) => readdirSync(dir).reduce((acc, entry) => {
	const full = join(dir, entry);
	return statSync(full).isDirectory()
		? acc.concat(listFiles(root, full))
		: acc.concat(full.slice(root.length + 1));
}, []);

const isCopy = file => FORMATS.some(({ ext }) => file.endsWith(ext));

/**
 * Writes a Brotli (`.br`, quality 11) and a gzip (`.gz`, level 9) copy next
 * to each qualifying file under `root`, for nginx's `brotli_static` /
 * `gzip_static` (docs/deployment.md):
 *   - allowlisted extensions only (`.js`, `.css`, `.json`, `.html`, `.svg`,
 *     `.properties`), and never `js/config.js` at the root;
 *   - a copy is kept only when it is at least 10% smaller than the
 *     original, decided per format.
 * Then deletes every `.br` / `.gz` under `root` that this run did not write,
 * so no stale copy can shadow a newer file.
 * @param  {String} root  Build output folder (`dist`, or `dist/apps/<name>`)
 * @return {{ written: String[], removed: String[] }}  Paths relative to `root`
 */
export const precompressTree = root => {
	const files = listFiles(root);
	const written = [].concat(...files
		.filter(file => !isCopy(file) && qualifies(file))
		.map(file => {
			const content = readFileSync(join(root, file));
			return FORMATS
				.map(({ ext, compress }) => ({ path: file + ext, copy: compress(content) }))
				.filter(({ copy }) => worthKeeping(content, copy))
				.map(({ path, copy }) => {
					writeFileSync(join(root, path), copy);
					return path;
				});
		}));
	const kept = new Set(written);
	const removed = files.filter(file => isCopy(file) && !kept.has(file));
	removed.forEach(file => unlinkSync(join(root, file)));
	return { written, removed };
};
