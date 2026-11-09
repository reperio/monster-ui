/**
 * Stub subscribers for Submodules that load on their first publish
 * (docs/adr/0010-common-controls-load-on-first-publish.md).
 *
 * Each lazy topic gets a stub. The first publish of any of a Submodule's
 * topics loads that Submodule; the loader subscribes its real handlers. The
 * stubs then unsubscribe and every publish received meanwhile is published
 * again, in order, so the real handlers get it. Callers never change, and
 * `monster.pub` stays fire-and-forget: only the first use runs asynchronously.
 *
 * No dependencies, so that it can be tested outside a browser
 * (gulp/helpers/lazy-submodules-runtime.test.js).
 */
define(function() {
	/**
	 * @param  {Object} options
	 * @param  {Object} options.topics  Topic -> Submodule name, from
	 *                                  `lazySubModules` in build-config.json
	 * @param  {Function} options.subscribe  `(topic, handler) -> subscription`
	 * @param  {Function} options.unsubscribe  `(subscription)`
	 * @param  {Function} options.publish  `(topic, data)`
	 * @param  {Function} options.load  `(submodule, done)`: loads the Submodule,
	 *                                  subscribes its handlers, then calls
	 *                                  `done(error)`
	 * @param  {Function} [options.onError]  `(error, submodule)`, when a load
	 *                                       fails. The publishes queued for
	 *                                       it are dropped and the stubs stay,
	 *                                       so the next publish tries again.
	 */
	function stubTopics(options) {
		var topicsBySubmodule = {};

		Object.keys(options.topics).forEach(function(topic) {
			var submodule = options.topics[topic];

			(topicsBySubmodule[submodule] = topicsBySubmodule[submodule] || []).push(topic);
		});

		Object.keys(topicsBySubmodule).forEach(function(submodule) {
			var queue = [],
				loading = false,
				subscriptions;

			function onLoaded(error) {
				var queued = queue;

				loading = false;
				queue = [];

				if (error) {
					if (options.onError) {
						options.onError(error, submodule);
					}
					return;
				}

				// Unsubscribe first, so that the replay reaches only the real handlers.
				subscriptions.forEach(options.unsubscribe);
				subscriptions = [];

				queued.forEach(function(entry) {
					options.publish(entry.topic, entry.data);
				});
			}

			subscriptions = topicsBySubmodule[submodule].map(function(topic) {
				return options.subscribe(topic, function(data) {
					queue.push({ topic: topic, data: data });

					if (loading) {
						return;
					}
					loading = true;
					options.load(submodule, onLoaded);
				});
			});
		});
	}

	return {
		stubTopics: stubTopics
	};
});
