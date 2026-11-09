import { parse } from 'acorn';

/**
 * The topic → Submodule map behind the stub subscribers of an App whose
 * Submodules load on first publish (docs/adr/0010-common-controls-load-on-first-publish.md).
 * Generated at build time from each Submodule's own `subscribe` keys, so no
 * list is kept by hand. build-config.json carries it as `lazySubModules`.
 */

const keyName = property => property.key.type === 'Identifier'
	? property.key.name
	: property.key.value;

const walk = (node, visit) => {
	if (!node || typeof node.type !== 'string') {
		return;
	}
	visit(node);
	Object.keys(node).forEach(key => {
		const child = node[key];
		if (Array.isArray(child)) {
			child.forEach(item => walk(item, visit));
		} else if (child && typeof child.type === 'string') {
			walk(child, visit);
		}
	});
};

/**
 * The keys of every `subscribe: { … }` object a Submodule source declares.
 * @param  {String} source
 * @return {String[]}
 */
export const subscribedTopics = source => {
	const topics = [];
	walk(parse(source, { ecmaVersion: 'latest', sourceType: 'script' }), node => {
		if (node.type === 'Property'
			&& keyName(node) === 'subscribe'
			&& node.value.type === 'ObjectExpression') {
			node.value.properties
				.filter(property => property.type === 'Property')
				.forEach(property => topics.push(keyName(property)));
		}
	});
	return topics;
};

/**
 * Maps every `<app>.*` topic a lazy Submodule subscribes to that Submodule.
 * Topics outside the App's namespace (e.g. `socket.connected`) are left out:
 * the Submodule subscribes them itself once it is loaded.
 * @param  {Object} options
 * @param  {String} options.app
 * @param  {Object} options.sources  Lazy Submodule name -> its source
 * @param  {Object} [options.eagerSources]  Eager Submodule name -> its source,
 *                                          checked for clashes only
 * @return {Object}  Topic -> Submodule name, sorted by topic
 */
export const lazyTopicMap = ({ app, sources, eagerSources = {} }) => {
	const prefix = `${app}.`;
	const owners = {};
	const claim = (topic, submodule) => {
		if (owners[topic]) {
			throw new Error(`${topic} is subscribed by both ${owners[topic]} and ${submodule}; a stub can load only one Submodule per topic`);
		}
		owners[topic] = submodule;
	};
	Object.keys(eagerSources).sort().forEach(submodule => subscribedTopics(eagerSources[submodule])
		.filter(topic => topic.startsWith(prefix))
		.forEach(topic => claim(topic, submodule)));
	const lazy = {};
	Object.keys(sources).sort().forEach(submodule => {
		const topics = subscribedTopics(sources[submodule]).filter(topic => topic.startsWith(prefix));
		if (!topics.length) {
			throw new Error(`${submodule} subscribes to no ${prefix}* topic, so nothing could ever load it; make it eager`);
		}
		topics.forEach(topic => {
			claim(topic, submodule);
			lazy[topic] = submodule;
		});
	});
	return Object.keys(lazy).sort().reduce((acc, topic) => Object.assign(acc, { [topic]: lazy[topic] }), {});
};
