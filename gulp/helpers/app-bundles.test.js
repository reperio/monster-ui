import assert from 'assert';
import { bundleModules, findLibsInSeveralApps } from './app-bundles.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const build = overrides => bundleModules(Object.assign({
	preloadedApps: ['auth', 'core'],
	lazyApps: ['voip', 'webhooks'],
	proApps: [],
	submodulesOf: app => ({ voip: ['devices', 'users'], core: ['alerts'] }[app] || []),
	loadedSeparately: ['config', 'templates', 'jsoneditor'],
	libsSharedByApps: ['datatables.net']
}, overrides));

test('main.js comes first and bundles only the Preloaded Apps', () => {
	const [main] = build();
	assert.deepStrictEqual(main, {
		name: 'js/main',
		exclude: ['config', 'templates', 'jsoneditor'],
		include: ['apps/auth/app', 'apps/core/app']
	});
});

test('each Lazy App gets its own bundle that leaves out main.js and the shared libraries', () => {
	const [, voip, webhooks] = build();
	assert.deepStrictEqual(voip, {
		name: 'apps/voip/app',
		exclude: ['js/main', 'config', 'templates', 'jsoneditor', 'datatables.net'],
		include: ['apps/voip/submodules/devices/devices', 'apps/voip/submodules/users/users']
	});
	assert.deepStrictEqual(webhooks, {
		name: 'apps/webhooks/app',
		exclude: ['js/main', 'config', 'templates', 'jsoneditor', 'datatables.net'],
		include: []
	});
	assert.strictEqual(build().length, 3);
});

test('a pro App bundles its pro Submodule, wherever it is built', () => {
	const [main, voip, webhooks] = build({ proApps: ['core', 'voip'] });
	assert.deepStrictEqual(main.include, ['apps/auth/app', 'apps/core/app', 'apps/core/submodules/pro/pro']);
	assert.deepStrictEqual(voip.include, [
		'apps/voip/submodules/devices/devices',
		'apps/voip/submodules/users/users',
		'apps/voip/submodules/pro/pro'
	]);
	assert.deepStrictEqual(webhooks.include, []);
});

test('libraries kept in main.js for the Preloaded Apps\' loose Submodules are bundled there, not into Lazy Apps', () => {
	const [main] = build({ libsInMain: ['isotope'] });
	assert.deepStrictEqual(main.include, ['isotope', 'apps/auth/app', 'apps/core/app']);
});

test('a Preloaded App\'s eager Submodules go into main.js and each lazy one gets its own chunk', () => {
	const modules = build({
		preloadedApps: ['common', 'core'],
		lazyApps: ['voip'],
		eagerSubmodulesOf: app => ({ common: ['webphone'] }[app] || []),
		lazySubmodulesOf: app => ({ common: ['numbers', 'portWizard'] }[app] || [])
	});
	assert.deepStrictEqual(modules.map(module => module.name), [
		'js/main',
		'apps/common/submodules/numbers/numbers',
		'apps/common/submodules/portWizard/portWizard',
		'apps/voip/app'
	]);
	const [main, numbers] = modules;
	assert.deepStrictEqual(main.include, [
		'apps/common/app',
		'apps/common/submodules/webphone/webphone',
		'apps/core/app'
	]);
	assert.deepStrictEqual(numbers, {
		name: 'apps/common/submodules/numbers/numbers',
		exclude: ['js/main', 'config', 'templates', 'jsoneditor', 'datatables.net']
	});
});

test('a pro Submodule on disk is bundled only for a pro App', () => {
	const [, voip] = build({ submodulesOf: () => ['devices', 'pro'] });
	assert.deepStrictEqual(voip.include, ['apps/voip/submodules/devices/devices']);
});

const buildTxt = [
	'css/style.css',
	'----------------',
	'css/vendor/jquery/jquery.dataTables.css',
	'css/style.css',
	'',
	'js/main.js',
	'----------------',
	'js/vendor/jquery-1.9.1.min.js',
	'js/main.js',
	'',
	'apps/addressbooks/app.js',
	'----------------',
	'js/vendor/datatables/jquery.dataTables.min.js',
	'js/vendor/papaparse-4.1.2.min.js',
	'apps/addressbooks/app.js',
	'',
	'apps/callcenter/app.js',
	'----------------',
	'js/vendor/datatables/jquery.dataTables.min.js',
	'js/vendor/papaparse-4.1.2.min.js',
	'apps/callcenter/submodules/queues/queues.js',
	'apps/callcenter/app.js',
	'',
	'apps/apiexplorer/app.js',
	'----------------',
	'js/vendor/highlight.pack.js',
	'js/vendor/papaparse-4.1.2.min.js',
	'apps/apiexplorer/app.js',
	''
].join('\n');

test('a library bundled into more than one App is reported with every App that carries it', () => {
	assert.deepStrictEqual(findLibsInSeveralApps(buildTxt), [
		{ file: 'js/vendor/datatables/jquery.dataTables.min.js', apps: ['addressbooks', 'callcenter'] },
		{ file: 'js/vendor/papaparse-4.1.2.min.js', apps: ['addressbooks', 'apiexplorer', 'callcenter'] }
	]);
});

test('libraries bundled into a single App, and main.js or CSS layers, are not reported', () => {
	const singles = buildTxt.replace(/^apps\/callcenter\/app\.js[\s\S]*?\n\n/m, '')
		.replace(/^apps\/apiexplorer\/app\.js[\s\S]*$/m, '');
	assert.deepStrictEqual(findLibsInSeveralApps(singles), []);
});

test('a library bundled into several lazy Submodule chunks, or a chunk and an App, is reported with each layer that carries it', () => {
	const chunks = [
		'apps/common/submodules/portWizard/portWizard.js',
		'----------------',
		'js/vendor/papaparse-4.1.2.min.js',
		'js/vendor/jszip.min.js',
		'apps/common/submodules/portWizard/portWizard.js',
		'',
		'apps/common/submodules/csvUploader/csvUploader.js',
		'----------------',
		'js/vendor/papaparse-4.1.2.min.js',
		'apps/common/submodules/csvUploader/csvUploader.js',
		'',
		'apps/voip/app.js',
		'----------------',
		'js/vendor/jszip.min.js',
		'apps/voip/app.js',
		''
	].join('\n');
	assert.deepStrictEqual(findLibsInSeveralApps(chunks), [
		{ file: 'js/vendor/jszip.min.js', apps: ['common/portWizard', 'voip'] },
		{ file: 'js/vendor/papaparse-4.1.2.min.js', apps: ['common/csvUploader', 'common/portWizard'] }
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
