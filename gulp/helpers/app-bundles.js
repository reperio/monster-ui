/**
 * How `build-prod` splits the code into r.js layers: one `js/main.js` that
 * bundles the framework, the Preloaded Apps and their eager Submodules, one
 * `apps/<name>/app.js` per Lazy App, and one chunk per lazy Submodule of a
 * Preloaded App (docs/adr/0010-common-controls-load-on-first-publish.md). Each
 * layer lands on the URL the loader already requests, so the runtime needs no
 * `bundles` config (see #35/#36).
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
 *                                          App's loose Submodule or lazy chunk
 *                                          requires them
 * @param  {Function} [options.eagerSubmodulesOf]  Preloaded App -> Submodules
 *                                                 bundled into main.js
 * @param  {Function} [options.lazySubmodulesOf]  Preloaded App -> Submodules
 *                                                each built as its own chunk,
 *                                                loaded on first publish
 * @return {Object[]}
 */
export const bundleModules = ({
	preloadedApps,
	lazyApps,
	proApps,
	submodulesOf,
	loadedSeparately,
	libsSharedByApps,
	libsInMain = [],
	eagerSubmodulesOf = () => [],
	lazySubmodulesOf = () => []
}) => {
	const proSubmodule = app => proApps.includes(app) ? [submoduleModule(app, 'pro')] : [];
	const outsideMain = ['js/main', ...loadedSeparately, ...libsSharedByApps];
	return [
		{
			name: 'js/main',
			exclude: loadedSeparately,
			include: preloadedApps.reduce((acc, app) => acc.concat(
				appModule(app),
				eagerSubmodulesOf(app).map(submodule => submoduleModule(app, submodule)),
				proSubmodule(app)
			), libsInMain)
		},
		...preloadedApps.reduce((acc, app) => acc.concat(lazySubmodulesOf(app).map(submodule => ({
			name: submoduleModule(app, submodule),
			exclude: outsideMain
		}))), []),
		...lazyApps.map(app => ({
			name: appModule(app),
			exclude: outsideMain,
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
const CHUNK_LAYER = /^apps\/([^/]+)\/submodules\/([^/]+)\/\2\.js$/;

/**
 * The layer's owner and the folder its own files live in, for an App bundle
 * (`voip`) or a lazy Submodule chunk (`common/portWizard`); null for any other
 * layer.
 * @param  {String} output
 * @return {{name: String, root: String}|null}
 */
const layerOwner = output => {
	const app = output.match(APP_LAYER);
	if (app) {
		return { name: app[1], root: `apps/${app[1]}/` };
	}
	const chunk = output.match(CHUNK_LAYER);
	return chunk
		? { name: `${chunk[1]}/${chunk[2]}`, root: `apps/${chunk[1]}/submodules/${chunk[2]}/` }
		: null;
};

/**
 * Files outside main.js that r.js bundled into more than one App bundle or
 * lazy Submodule chunk, so that each of them downloads its own copy. Each
 * belongs in `libsSharedByApps`.
 * @param  {String} buildTxt  r.js's `build.txt`
 * @return {Array<{file: String, apps: String[]}>}  Sorted by file; `apps` are
 *         the layers (`voip`, `common/portWizard`), sorted
 */
export const findLibsInSeveralApps = buildTxt => {
	const layers = parseBuildTxt(buildTxt);
	const appsByFile = Object.keys(layers)
		.filter(output => layerOwner(output))
		.reduce((acc, output) => {
			const { name, root } = layerOwner(output);
			layers[output]
				.filter(file => !file.startsWith(root))
				.forEach(file => {
					acc[file] = (acc[file] || []).concat(name);
				});
			return acc;
		}, {});
	return Object.keys(appsByFile)
		.filter(file => appsByFile[file].length > 1)
		.sort()
		.map(file => ({ file, apps: appsByFile[file].slice().sort() }));
};
