/**
 * How `build-prod` splits the code into r.js layers: one `js/main.js` that
 * bundles the framework and the Preloaded Apps, and one `apps/<name>/app.js`
 * per Lazy App. Each App bundle lands on the URL the loader already requests,
 * so the runtime needs no `bundles` config (see #35/#36).
 */

const appModule = app => `apps/${app}/app`;

const submoduleModule = (app, submodule) => `apps/${app}/submodules/${submodule}/${submodule}`;

/**
 * r.js `modules` for a whole build. `js/main` must come first: each App entry
 * excludes main's layer, and r.js applies exclusions in `modules` order.
 * @param  {Object} options
 * @param  {String[]} options.preloadedApps  Apps bundled into main.js
 * @param  {String[]} options.lazyApps  Apps bundled on their own
 * @param  {String[]} options.proApps  Apps built with their `pro` Submodule
 * @param  {Function} options.submodulesOf  App name -> Submodule names on disk
 * @param  {String[]} options.loadedSeparately  Modules no layer may bundle
 * @param  {String[]} options.libsSharedByApps  Libraries several Lazy Apps
 *                                              use; each loads once, as its own file
 * @param  {String[]} [options.libsInMain]  Libraries main.js must carry although
 *                                          r.js can't trace them there: a Preloaded
 *                                          App's loose Submodule requires them
 * @return {Object[]}
 */
export const bundleModules = ({
	preloadedApps,
	lazyApps,
	proApps,
	submodulesOf,
	loadedSeparately,
	libsSharedByApps,
	libsInMain = []
}) => {
	const proSubmodule = app => proApps.includes(app) ? [submoduleModule(app, 'pro')] : [];
	return [
		{
			name: 'js/main',
			exclude: loadedSeparately,
			include: preloadedApps.reduce((acc, app) => acc.concat(appModule(app), proSubmodule(app)), libsInMain)
		},
		...lazyApps.map(app => ({
			name: appModule(app),
			exclude: ['js/main', ...loadedSeparately, ...libsSharedByApps],
			include: submodulesOf(app)
				.filter(submodule => submodule !== 'pro')
				.map(submodule => submoduleModule(app, submodule))
				.concat(proSubmodule(app))
		}))
	];
};

/**
 * Parses r.js's `build.txt` into `{ [outputFile]: [inputFile, …] }`.
 * @param  {String} text
 * @return {Object}
 */
export const parseBuildTxt = text => text
	.split(/\n\s*\n/)
	.map(block => block.trim().split('\n'))
	.filter(lines => lines.length > 2 && /^-+$/.test(lines[1]))
	.reduce((acc, [output, , ...inputs]) => Object.assign(acc, {
		[output]: inputs
	}), {});

const APP_LAYER = /^apps\/([^/]+)\/app\.js$/;

/**
 * Files outside main.js that r.js bundled into more than one App layer, so
 * that every one of those Apps downloads its own copy. Each belongs in
 * `libsSharedByApps`.
 * @param  {String} buildTxt  r.js's `build.txt`
 * @return {Array<{file: String, apps: String[]}>}  Sorted by file, Apps sorted
 */
export const findLibsInSeveralApps = buildTxt => {
	const layers = parseBuildTxt(buildTxt);
	const appsByFile = Object.keys(layers)
		.filter(output => APP_LAYER.test(output))
		.reduce((acc, output) => {
			const app = output.match(APP_LAYER)[1];
			layers[output]
				.filter(file => !file.startsWith(`apps/${app}/`))
				.forEach(file => {
					acc[file] = (acc[file] || []).concat(app);
				});
			return acc;
		}, {});
	return Object.keys(appsByFile)
		.filter(file => appsByFile[file].length > 1)
		.sort()
		.map(file => ({ file, apps: appsByFile[file].slice().sort() }));
};
