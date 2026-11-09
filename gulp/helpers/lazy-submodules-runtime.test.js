import assert from 'assert';
import fs from 'fs';
import vm from 'vm';
import { join } from 'upath';

/**
 * Tests the browser module src/js/lib/monster.lazySubModules.js, loaded through
 * a stand-in `define`, against a synchronous pub/sub bus shaped like postal.
 */

const loadModule = () => {
	let exported;
	vm.runInNewContext(
		fs.readFileSync(join(__dirname, '../../src/js/lib/monster.lazySubModules.js'), 'utf8'),
		{ define: factory => { exported = factory(); } }
	);
	return exported;
};

const lazySubModules = loadModule();

const createBus = () => {
	const subscribers = [];
	return {
		subscribe: (topic, handler) => {
			const subscription = { topic, handler };
			subscribers.push(subscription);
			return subscription;
		},
		unsubscribe: subscription => {
			subscribers.splice(subscribers.indexOf(subscription), 1);
		},
		publish: (topic, data) => subscribers
			.filter(subscription => subscription.topic === topic)
			.forEach(subscription => subscription.handler(data)),
		count: topic => subscribers.filter(subscription => subscription.topic === topic).length
	};
};

/**
 * Stubs `topics` on a fresh bus. `load(submodule, done)` is recorded, not run:
 * `finishLoad(submodule)` plays the real loader by subscribing that
 * Submodule's handlers, which log what they receive.
 */
const setup = (topics = {
	'common.numbers.render': 'numbers',
	'common.numbers.dialogSpare': 'numbers',
	'common.portWizard.render': 'portWizard'
}) => {
	const bus = createBus();
	const received = [];
	const errors = [];
	const loads = [];
	lazySubModules.stubTopics({
		topics,
		subscribe: bus.subscribe,
		unsubscribe: bus.unsubscribe,
		publish: bus.publish,
		load: (submodule, done) => loads.push({ submodule, done }),
		onError: (error, submodule) => errors.push({ error, submodule })
	});
	const finishLoad = (submodule, error) => {
		const pending = loads.filter(load => load.submodule === submodule).pop();
		if (!error) {
			Object.keys(topics)
				.filter(topic => topics[topic] === submodule)
				.forEach(topic => bus.subscribe(topic, data => received.push({ topic, data })));
		}
		pending.done(error || null);
	};
	return { bus, received, errors, loads, finishLoad };
};

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('the first publish of a lazy topic loads its Submodule, then the real handler gets the payload', () => {
	const { bus, received, loads, finishLoad } = setup();
	const payload = { container: 'div' };

	bus.publish('common.numbers.render', payload);
	assert.deepStrictEqual(loads.map(load => load.submodule), ['numbers']);
	assert.deepStrictEqual(received, []);

	finishLoad('numbers');
	assert.strictEqual(received.length, 1);
	assert.strictEqual(received[0].topic, 'common.numbers.render');
	assert.strictEqual(received[0].data, payload);
});

test('once loaded, the stubs are gone and later publishes reach only the real handlers', () => {
	const { bus, received, loads, finishLoad } = setup();
	bus.publish('common.numbers.render', { n: 1 });
	finishLoad('numbers');

	assert.strictEqual(bus.count('common.numbers.render'), 1);
	assert.strictEqual(bus.count('common.numbers.dialogSpare'), 1);
	bus.publish('common.numbers.dialogSpare', { n: 2 });
	assert.deepStrictEqual(received.map(entry => entry.data.n), [1, 2]);
	assert.strictEqual(loads.length, 1);
});

test('publishes that arrive while the Submodule loads are queued and replayed in order, across its topics', () => {
	const { bus, received, loads, finishLoad } = setup();
	bus.publish('common.numbers.render', { n: 1 });
	bus.publish('common.numbers.dialogSpare', { n: 2 });
	bus.publish('common.numbers.render', { n: 3 });
	assert.strictEqual(loads.length, 1);

	finishLoad('numbers');
	assert.deepStrictEqual(received.map(entry => `${entry.topic}#${entry.data.n}`), [
		'common.numbers.render#1',
		'common.numbers.dialogSpare#2',
		'common.numbers.render#3'
	]);
});

test('each Submodule loads on its own: other Submodules keep their stubs', () => {
	const { bus, loads, finishLoad } = setup();
	bus.publish('common.numbers.render', {});
	finishLoad('numbers');

	assert.strictEqual(bus.count('common.portWizard.render'), 1);
	bus.publish('common.portWizard.render', {});
	assert.deepStrictEqual(loads.map(load => load.submodule), ['numbers', 'portWizard']);
});

test('a failed load reports the error, drops the queued publishes and lets the next publish try again', () => {
	const { bus, received, errors, loads, finishLoad } = setup();
	bus.publish('common.portWizard.render', { n: 1 });
	bus.publish('common.portWizard.render', { n: 2 });
	finishLoad('portWizard', new Error('script error'));

	assert.deepStrictEqual(errors.map(entry => [entry.submodule, entry.error.message]), [['portWizard', 'script error']]);
	assert.deepStrictEqual(received, []);

	bus.publish('common.portWizard.render', { n: 3 });
	assert.strictEqual(loads.length, 2);
	finishLoad('portWizard');
	assert.deepStrictEqual(received.map(entry => entry.data.n), [3]);
});

test('a loader that finishes synchronously still replays the first publish exactly once', () => {
	const bus = createBus();
	const received = [];
	lazySubModules.stubTopics({
		topics: { 'common.webphone.get': 'webphone' },
		subscribe: bus.subscribe,
		unsubscribe: bus.unsubscribe,
		publish: bus.publish,
		load: (submodule, done) => {
			bus.subscribe('common.webphone.get', data => received.push(data));
			done(null);
		}
	});
	bus.publish('common.webphone.get', { n: 1 });
	assert.deepStrictEqual(received, [{ n: 1 }]);
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
