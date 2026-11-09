/**
 * The framework's build-config.json for a build type, read at boot by
 * `monster.loadBuildConfig` (src/js/lib/monster.js).
 *
 * `preloadedApps` must name exactly the Apps whose code, views and CSS are
 * already in the Initial Load trio (main.js, templates.js, style.css): the
 * loader never fetches a listed App's `app.css` or `VERSION`, so listing an App
 * that is not in the trio leaves it unstyled, and leaving out one that is makes
 * it re-fetch assets it already has.
 *
 * @param  {String} buildType  `dev` or `prod`
 * @param  {String[]} preloadedApps  Apps already in the Initial Load trio
 * @return {Object}  Contents of build-config.json
 */
export const frameworkConfig = (buildType, preloadedApps) => ({
	dev: {
		type: 'development'
	},
	prod: {
		type: 'production',
		preloadedApps
	}
}[buildType]);
