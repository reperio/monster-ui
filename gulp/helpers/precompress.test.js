import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import { join } from 'upath';
import { brotliDecompressSync, gunzipSync } from 'zlib';
import { precompressTree } from './precompress.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// Compresses well in both formats.
const text = 'define("monster",[],function(){return{}});\n'.repeat(50);

const tree = files => {
	const root = fs.mkdtempSync(join(os.tmpdir(), 'precompress-'));
	Object.keys(files).forEach(file => {
		fs.mkdirSync(join(root, file, '..'), { recursive: true });
		fs.writeFileSync(join(root, file), files[file]);
	});
	return root;
};

const listTree = (root, dir = root) => fs.readdirSync(dir).reduce((acc, entry) => {
	const full = join(dir, entry);
	return fs.statSync(full).isDirectory()
		? acc.concat(listTree(root, full))
		: acc.concat(full.slice(root.length + 1));
}, []).sort();

test('each allowlisted text file gets a .br and a .gz copy that decompress to it byte for byte', () => {
	const files = ['index.html', 'js/main.js', 'css/style.css', 'build-config.json', 'img/logo.svg', 'apps/voip/i18n/en-US.properties'];
	const root = tree(files.reduce((acc, file) => Object.assign(acc, { [file]: text }), {}));
	precompressTree(root);
	files.forEach(file => {
		assert.strictEqual(brotliDecompressSync(fs.readFileSync(join(root, `${file}.br`))).toString(), text, file);
		assert.strictEqual(gunzipSync(fs.readFileSync(join(root, `${file}.gz`))).toString(), text, file);
	});
});

test('images, spreadsheets, PDF viewer cmaps and the operator-edited js/config.js get no copy', () => {
	const files = ['js/config.js', 'img/logo.png', 'img/photo.jpg', 'apps/voip/static/template.xlsx', 'js/vendor/pdfjs/cmaps/UniJIS-UCS2-H.bcmap', 'README.md'];
	const root = tree(files.reduce((acc, file) => Object.assign(acc, { [file]: text }), {}));
	precompressTree(root);
	assert.deepStrictEqual(listTree(root), files.slice().sort());
});

test('only js/config.js at the root is skipped; an App\'s own config.js is compressed', () => {
	const root = tree({ 'apps/voip/js/config.js': text });
	precompressTree(root);
	assert.deepStrictEqual(listTree(root), ['apps/voip/js/config.js', 'apps/voip/js/config.js.br', 'apps/voip/js/config.js.gz']);
});

test('a copy is kept only when it is at least 10% smaller, decided per format', () => {
	const root = tree({
		// 30 bytes: Brotli 26 (13% smaller), gzip 38 (larger).
		'css/brotli-only.css': 'body{color:red}body{color:red}',
		// Hash output doesn't compress.
		'js/random.js': Buffer.concat(Array.from({ length: 128 }, (_, i) => crypto.createHash('sha256').update(String(i)).digest())),
		'js/tiny.js': 'a'
	});
	precompressTree(root);
	assert.deepStrictEqual(listTree(root), ['css/brotli-only.css', 'css/brotli-only.css.br', 'js/random.js', 'js/tiny.js']);
});

test('copies the run did not write are removed: orphans, ones for skipped files, and ones that fell under the 10% rule', () => {
	const root = tree({
		'js/main.js': text,
		'js/main.js.gz': 'stale',
		'js/removed.js.br': 'orphan',
		'js/config.js.gz': 'stale',
		'img/logo.png.br': 'orphan',
		'js/tiny.js': 'a',
		'js/tiny.js.br': 'stale'
	});
	precompressTree(root);
	assert.deepStrictEqual(listTree(root), ['js/main.js', 'js/main.js.br', 'js/main.js.gz', 'js/tiny.js']);
	assert.strictEqual(gunzipSync(fs.readFileSync(join(root, 'js/main.js.gz'))).toString(), text);
});

test('the same input gives the same bytes, with a zero gzip mtime', () => {
	const copies = () => {
		const root = tree({ 'js/main.js': text });
		precompressTree(root);
		return ['js/main.js.br', 'js/main.js.gz'].map(file => fs.readFileSync(join(root, file)));
	};
	const [first, second] = [copies(), copies()];
	assert.ok(first[0].equals(second[0]));
	assert.ok(first[1].equals(second[1]));
	assert.strictEqual(first[1].readUInt32LE(4), 0);
});

let failed = 0;
tests.forEach(({ name, fn }) => {
	try {
		fn();
		console.log(`ok - ${name}`);
	} catch (error) {
		failed += 1;
		console.log(`not ok - ${name}\n${error.stack}`);
	}
});
if (failed) {
	process.exitCode = 1;
}
