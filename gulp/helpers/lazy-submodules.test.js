import assert from 'assert';
import { lazyTopicMap } from './lazy-submodules.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

const submodule = subscribe => `define(function(require) {
	var $ = require('jquery');

	var control = {
		requests: {},

		subscribe: ${subscribe},

		render: function() {}
	};

	return control;
});`;

test('each lazy Submodule\'s published topics map to that Submodule', () => {
	const map = lazyTopicMap({
		app: 'common',
		sources: {
			portWizard: submodule(`{ 'common.portWizard.render': 'portWizardRender' }`),
			numbers: submodule(`{
				'common.numbers.render': 'numbersRender',
				"common.numbers.dialogSpare": 'numbersDialogSpare'
			}`)
		}
	});
	assert.deepStrictEqual(map, {
		'common.numbers.dialogSpare': 'numbers',
		'common.numbers.render': 'numbers',
		'common.portWizard.render': 'portWizard'
	});
});

test('topics outside the App\'s namespace get no stub: the Submodule subscribes them once it loads', () => {
	const map = lazyTopicMap({
		app: 'common',
		sources: {
			conferenceViewer: submodule(`{
				'common.conferenceViewer.get': 'conferenceViewerGet',
				'socket.connected': 'conferenceViewerSocketReconnected'
			}`)
		}
	});
	assert.deepStrictEqual(map, { 'common.conferenceViewer.get': 'conferenceViewer' });
});

test('a Submodule ES2015+ source still parses', () => {
	const map = lazyTopicMap({
		app: 'common',
		sources: {
			modern: `define(require => {
				const control = {
					subscribe: { 'common.modern.render': 'render' },
					render(args = {}) { return { ...args }; }
				};
				return control;
			});`
		}
	});
	assert.deepStrictEqual(map, { 'common.modern.render': 'modern' });
});

test('two lazy Submodules claiming one topic fail the build', () => {
	assert.throws(() => lazyTopicMap({
		app: 'common',
		sources: {
			a: submodule(`{ 'common.shared.render': 'aRender' }`),
			b: submodule(`{ 'common.shared.render': 'bRender' }`)
		}
	}), /common\.shared\.render is subscribed by both a and b/);
});

test('a lazy Submodule claiming an eager Submodule\'s topic fails the build', () => {
	assert.throws(() => lazyTopicMap({
		app: 'common',
		sources: {
			lazy: submodule(`{ 'common.webphone.getUserDevices': 'x' }`)
		},
		eagerSources: {
			webphone: submodule(`{ 'common.webphone.getUserDevices': 'webphoneGetUserDevices' }`)
		}
	}), /common\.webphone\.getUserDevices is subscribed by both webphone and lazy/);
});

test('a lazy Submodule with no subscribe block fails the build: nothing could ever load it', () => {
	assert.throws(() => lazyTopicMap({
		app: 'common',
		sources: { silent: 'define(function() { return { render: function() {} }; });' }
	}), /silent subscribes to no common\.\* topic/);
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
