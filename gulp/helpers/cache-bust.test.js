import assert from 'assert';
import fs from 'fs';
import os from 'os';
import { join } from 'upath';
import { cacheManifest, hashContent, hashTree, injectRequireConfig, lazyChunks, rewriteIndexHtml } from './cache-bust.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// Shape of the require.config call in a minified build-prod main.js.
const minifiedMain = 'define("monster",[],function(){return{}}),require.config({paths:{jquery:"js/vendor/jquery",templates:"js/templates"},shim:{},urlArgs:"bust="+(new Date).getTime()}),require(["jquery","monster"],function(e,t){t.initConfig()});';

test('the built main.js drops the global urlArgs bust and loads templates.js by its own hash, spelling out the .js RequireJS skips for a path with a query', () => {
	const out = injectRequireConfig(minifiedMain, { templatesHash: 't9f8e7' });
	assert.strictEqual(out, 'define("monster",[],function(){return{}}),require.config({paths:{jquery:"js/vendor/jquery",templates:"js/templates.js?v=t9f8e7"},shim:{}}),require(["jquery","monster"],function(e,t){t.initConfig()});');
});

test('urlArgs is dropped wherever it sits in the config', () => {
	assert.strictEqual(
		injectRequireConfig('require.config({urlArgs:"bust="+(new Date).getTime(),paths:{templates:"js/templates"}});', { templatesHash: 't' }),
		'require.config({paths:{templates:"js/templates.js?v=t"}});'
	);
});

test('a main.js with no boot require.config fails the build', () => {
	assert.throws(
		() => injectRequireConfig('require.config({urlArgs:"bust=1"});', { templatesHash: 't' }),
		/require\.config\(\{ paths \}\)/
	);
});

test('a main.js that already has no urlArgs only gets its templates key', () => {
	assert.strictEqual(
		injectRequireConfig('require.config({paths:{templates:"js/templates"}});', { templatesHash: 't' }),
		'require.config({paths:{templates:"js/templates.js?v=t"}});'
	);
});

test('a main.js with no templates path fails the build', () => {
	assert.throws(
		() => injectRequireConfig('require.config({paths:{},urlArgs:"bust="+(new Date).getTime()});', { templatesHash: 't' }),
		/templates/
	);
});

const indexHtml = [
	'<link rel="stylesheet" href="//fonts.googleapis.com/css?family=Source+Sans+Pro:300,400">',
	'<link rel="stylesheet" href="css/style.css">',
	'<script src="js/vendor/require-2.1.5.min.js"></script>',
	'<script src="js/main.js"></script>'
].join('\n');

test('index.html loads main.js and style.css by their content hashes', () => {
	assert.strictEqual(rewriteIndexHtml(indexHtml, { mainHash: 'm123', styleHash: 's456' }), [
		'<link rel="stylesheet" href="//fonts.googleapis.com/css?family=Source+Sans+Pro:300,400">',
		'<link rel="stylesheet" href="css/style.css?v=s456">',
		'<script src="js/vendor/require-2.1.5.min.js"></script>',
		'<script src="js/main.js?v=m123"></script>'
	].join('\n'));
});

test('an index.html that no longer references main.js fails the build', () => {
	assert.throws(
		() => rewriteIndexHtml('<link rel="stylesheet" href="css/style.css">', { mainHash: 'm', styleHash: 's' }),
		/js\/main\.js/
	);
});

const buildTree = files => {
	const dir = fs.mkdtempSync(join(os.tmpdir(), 'cache-bust-'));
	Object.keys(files).forEach(file => {
		fs.mkdirSync(join(dir, file, '..'), { recursive: true });
		fs.writeFileSync(join(dir, file), files[file]);
	});
	return dir;
};

test('a tree\'s hash changes when any file in it changes, and only then', () => {
	const files = { 'js/main.js': 'main', 'apps/voip/app.js': 'voip', 'apps/voip/submodules/a/a.js': 'a' };
	const hash = hashTree(buildTree(files));

	assert.match(hash, /^[0-9a-f]{10}$/);
	assert.strictEqual(hashTree(buildTree(files)), hash);
	assert.notStrictEqual(hashTree(buildTree(Object.assign({}, files, { 'apps/voip/submodules/a/a.js': 'a2' }))), hash);
	assert.notStrictEqual(hashTree(buildTree({ 'js/main.js': 'main', 'apps/voip/app.js': 'voip', 'apps/voip/submodules/b/a.js': 'a' })), hash);
});

const builtMain = 'require.config({paths:{templates:"js/templates","datatables.net":"js/vendor/datatables/jquery.dataTables.min","pdfjs-dist":"js/vendor/pdfjs"},urlArgs:"bust="+(new Date).getTime()});';

const appFiles = {
	'js/main.js': builtMain,
	'apps/voip/app.js': 'voip',
	'apps/voip/style/app.css': '.voip{}',
	'apps/voip/i18n/en-US.json': '{"voip":1}',
	'apps/numbers/app.js': 'numbers',
	'apps/numbers/i18n/en-US.json': '{}'
};

test('each App gets a key that changes when any of its shipped files does, and only then', () => {
	const options = { apps: ['voip', 'numbers'], chunks: [] };
	const { apps } = cacheManifest(buildTree(appFiles), options);

	assert.match(apps.voip, /^[0-9a-f]{10}$/);
	assert.notStrictEqual(apps.voip, apps.numbers);

	const changed = name => cacheManifest(buildTree(Object.assign({}, appFiles, { [name]: 'changed' })), options).apps;
	const voipI18nChanged = changed('apps/voip/i18n/en-US.json');
	assert.notStrictEqual(voipI18nChanged.voip, apps.voip);
	assert.strictEqual(voipI18nChanged.numbers, apps.numbers);
	assert.notStrictEqual(changed('apps/voip/style/app.css').voip, apps.voip);
	assert.strictEqual(changed('apps/numbers/app.js').voip, apps.voip);
	assert.strictEqual(changed('js/vendor/other.js').voip, apps.voip);
});

test('an App\'s key ignores the tests and Sass sources that never reach dist', () => {
	const options = { apps: ['voip'], chunks: [] };
	const before = cacheManifest(buildTree(appFiles), options).apps.voip;
	const after = cacheManifest(buildTree(Object.assign({}, appFiles, {
		'apps/voip/tests/a.test.js': 'test',
		'apps/voip/style/app.scss': '$a: 1;'
	})), options).apps.voip;

	assert.strictEqual(after, before);
});

const chunkFiles = Object.assign({}, appFiles, {
	'js/vendor/datatables/jquery.dataTables.min.js': 'datatables',
	'js/vendor/pdfjs/build/pdf.js': 'pdf',
	'apps/common/submodules/appSelector/appSelector.js': 'appSelector'
});
const chunks = ['datatables.net', 'pdfjs-dist/build/pdf', 'apps/common/submodules/appSelector/appSelector'];

test('each lazy chunk gets a RequireJS path to its file, resolved like RequireJS does and keyed to its content', () => {
	const { requirePaths } = cacheManifest(buildTree(chunkFiles), { apps: [], chunks });
	const key = file => `v=${hashContent(chunkFiles[file])}`;

	assert.deepStrictEqual(requirePaths, {
		'datatables.net': `js/vendor/datatables/jquery.dataTables.min.js?${key('js/vendor/datatables/jquery.dataTables.min.js')}`,
		'pdfjs-dist/build/pdf': `js/vendor/pdfjs/build/pdf.js?${key('js/vendor/pdfjs/build/pdf.js')}`,
		'apps/common/submodules/appSelector/appSelector': `apps/common/submodules/appSelector/appSelector.js?${key('apps/common/submodules/appSelector/appSelector.js')}`
	});
});

test('a chunk whose file the build no longer has fails the build', () => {
	assert.throws(
		() => cacheManifest(buildTree(appFiles), { apps: [], chunks: ['datatables.net'] }),
		/datatables\.net/
	);
});

test('the lazily required modules are the separate libraries, each loose Preloaded-App Submodule and each lazy Submodule chunk, but not the eager core bundled into main.js', () => {
	const chunks = lazyChunks({
		libs: ['jsoneditor', 'datatables.net'],
		preloadedApps: ['common', 'core'],
		proApps: ['core'],
		submodulesOf: app => ({
			common: ['numbers', 'portWizard', 'webphone'],
			core: ['alerts', 'pro']
		}[app]),
		eagerSubmodulesOf: app => ({ common: ['webphone'] }[app] || [])
	});
	assert.deepStrictEqual(chunks, [
		'jsoneditor',
		'datatables.net',
		'apps/common/submodules/numbers/numbers',
		'apps/common/submodules/portWizard/portWizard',
		'apps/core/submodules/alerts/alerts'
	]);
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
