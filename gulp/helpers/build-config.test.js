import assert from 'assert';
import fs from 'fs';
import { join } from 'upath';
import { frameworkConfig } from './build-config.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

/**
 * Keys `monster.loadBuildConfig` keeps from build-config.json; any other key is
 * dropped before the loader sees it.
 * @return {String[]}
 */
const keysTheLoaderReads = () => {
	const source = fs.readFileSync(join(__dirname, '../../src/js/lib/monster.js'), 'utf8');
	const match = source.match(/getBuildConfig\s*=\s*_\.partial\(_\.pick,\s*_,\s*\[([^\]]*)\]/);
	assert.ok(match, 'could not find the getBuildConfig key list in src/js/lib/monster.js');
	return match[1].match(/'[^']+'/g).map(key => key.slice(1, -1));
};

const lazySubModules = { common: { 'common.portWizard.render': 'portWizard' } };

test('a prod build lists the Preloaded Apps under preloadedApps and the lazy Submodule topics under lazySubModules', () => {
	const config = frameworkConfig('prod', ['auth', 'core', 'voip'], lazySubModules);
	assert.deepStrictEqual(config, {
		type: 'production',
		preloadedApps: ['auth', 'core', 'voip'],
		lazySubModules
	});
});

test('a dev build preloads nothing but loads Submodules on first publish too', () => {
	assert.deepStrictEqual(frameworkConfig('dev', ['auth', 'core'], lazySubModules), {
		type: 'development',
		lazySubModules
	});
});

test('the loader reads every key a prod build writes', () => {
	const readKeys = keysTheLoaderReads();
	Object.keys(frameworkConfig('prod', ['core'], lazySubModules)).forEach(key => {
		assert.ok(readKeys.includes(key), `build-config.json key "${key}" is not read by monster.loadBuildConfig (reads: ${readKeys.join(', ')})`);
	});
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
