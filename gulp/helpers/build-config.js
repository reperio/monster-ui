/**
 * The framework's build-config.json for a build type, read at boot by
 * `monster.loadBuildConfig` (src/js/lib/monster.js).
 *
 * `preloadedApps` must name exactly the Apps whose code, views and CSS are
 * already in the Initial Load trio (main.js, templates.js, style.css): the
 * loader never fetches a listed App's `app.css`, so listing an App
 * that is not in the trio leaves it unstyled, and leaving out one that is makes
 * it re-fetch assets it already has.
 *
 * `lazySubModules` maps, per App, each topic of a Submodule that loads on its
 * first publish to that Submodule (gulp/helpers/lazy-submodules.js). Dev and
 * prod both carry it, so dev takes the same lazy path.
 *
 * @param  {String} buildType  `dev` or `prod`
 * @param  {String[]} preloadedApps  Apps already in the Initial Load trio
 * @param  {Object} lazySubModules  App -> { topic: Submodule }
 * @return {Object}  Contents of build-config.json
 */
export const frameworkConfig = (buildType, preloadedApps, lazySubModules) => ({
	dev: {
		type: 'development',
		lazySubModules
	},
	prod: {
		type: 'production',
		preloadedApps,
		lazySubModules
	}
}[buildType]);
