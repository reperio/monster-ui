import assert from 'assert';
import fs from 'fs';
import os from 'os';
import { join } from 'upath';
import { hashTree, injectRequireConfig, rewriteIndexHtml } from './cache-bust.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// Shape of the require.config call in a minified build-prod main.js.
const minifiedMain = 'define("monster",[],function(){return{}}),require.config({paths:{jquery:"js/vendor/jquery",templates:"js/templates"},shim:{},urlArgs:"bust="+(new Date).getTime()}),require(["jquery","monster"],function(e,t){t.initConfig()});';

test('the built main.js fetches by release and loads templates.js by its own hash, spelling out the .js RequireJS skips for a path with a query', () => {
	const out = injectRequireConfig(minifiedMain, { releaseId: 'r1a2b3', templatesHash: 't9f8e7' });
	assert.strictEqual(out, 'define("monster",[],function(){return{}}),require.config({paths:{jquery:"js/vendor/jquery",templates:"js/templates.js?v=t9f8e7"},shim:{},urlArgs:"v=r1a2b3"}),require(["jquery","monster"],function(e,t){t.initConfig()});');
});

test('a main.js whose require.config has no urlArgs fails the build instead of shipping unkeyed', () => {
	assert.throws(
		() => injectRequireConfig('require.config({paths:{templates:"js/templates"}});', { releaseId: 'r', templatesHash: 't' }),
		/urlArgs/
	);
});

test('a main.js with no templates path fails the build', () => {
	assert.throws(
		() => injectRequireConfig('require.config({paths:{},urlArgs:"bust="+(new Date).getTime()});', { releaseId: 'r', templatesHash: 't' }),
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

test('the release id changes when any file in the build changes, and only then', () => {
	const files = { 'js/main.js': 'main', 'apps/voip/app.js': 'voip', 'apps/voip/submodules/a/a.js': 'a' };
	const release = hashTree(buildTree(files));

	assert.match(release, /^[0-9a-f]{10}$/);
	assert.strictEqual(hashTree(buildTree(files)), release);
	assert.notStrictEqual(hashTree(buildTree(Object.assign({}, files, { 'apps/voip/submodules/a/a.js': 'a2' }))), release);
	assert.notStrictEqual(hashTree(buildTree({ 'js/main.js': 'main', 'apps/voip/app.js': 'voip', 'apps/voip/submodules/b/a.js': 'a' })), release);
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
