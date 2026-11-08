# How r.js can emit per-App bundles alongside a slim `main.js`

Research for [#35](https://github.com/reperio/monster-ui/issues/35), part of map
[#32](https://github.com/reperio/monster-ui/issues/32) (shrink and split the production build).

**Question.** Using the RequireJS optimizer (r.js 2.3.x), what is the supported way to produce
one slim `js/main.js` plus one bundle per App in a single `optimize` run, with shared libraries
excluded from App bundles and not duplicated? How do `exclude`/`excludeShallow`/`include`, the
runtime `bundles` config and `insertRequire` interact with `removeCombined: true`,
`skipDirOptimize: true` and the `onBuildRead` hook (ADR-0009), and what happens to the
dynamically required submodules?

## Short answer

Use one `modules` array: `js/main` **first**, then one entry per App named `apps/<name>/app`,
each with `exclude: ['js/main', ...]`. This is r.js's documented "common layer" pattern. Because
every App bundle is written to the path of its own entry module ID (`apps/<name>/app.js`), the
existing loader (`require(['apps/<name>/app'])`) fetches the bundle with **no runtime `bundles`
config and no `insertRequire`**. Shared libraries that main does not already contain (today:
DataTables, used by `addressbooks` and `callcenter`) have to be excluded explicitly too.
Otherwise they are duplicated into every App bundle that uses them. Submodules are loaded through
a computed module ID, so r.js never traces them. They stay loose files unless each App entry
lists them in `include`.

`bundles` / `bundlesConfigOutFile` is only needed if you add a layer whose file path is not an
entry module ID (e.g. a shared-vendor layer). It also needs a runtime upgrade: `index.html` loads
**RequireJS 2.1.5**, and `bundles` was introduced in 2.1.10.

## Versions in play

| Piece | Version | Source |
|---|---|---|
| Optimizer (`r.js`) | **2.3.6** | `node_modules/requirejs/package.json` |
| Runtime loader | **2.1.5** | `src/index.html` loads `js/vendor/require-2.1.5.min.js`; its banner reads `RequireJS 2.1.5` |

All r.js line numbers below refer to `node_modules/requirejs/bin/r.js` (2.3.6).

## Findings

### 1. Multi-`modules` with `exclude` is the supported mechanism

- `exclude` drops a module **and its dependencies** from a layer. `excludeShallow` drops only
  that module and keeps its nested dependencies in the layer
  ([example.build.js](https://github.com/requirejs/r.js/blob/master/build/example.build.js),
  `modules` section). Both take module IDs, not file paths
  ([optimization.html §Basics](https://requirejs.org/docs/optimization.html)).
- The docs' multi-page example is "a project that has multiple pages, but shares a common
  configuration and a common optimized build layer"
  ([optimization.html §Optimizing a multi-page project](https://requirejs.org/docs/optimization.html)).
  It is the pattern used here, where each page layer excludes the common layer.
- **How excluding another layer works (source).** For each name in `exclude`, r.js first calls
  `build.findBuildModule(exclude, modules)`, which matches against the `name` of the other
  entries in `modules` (r.js L29640). On a match it reuses **that module's layer**. Otherwise it
  traces the name as a standalone module (L28531–L28552). It then removes every file in the
  excluded layer's `buildFilePaths` from this layer (L28555–L28573, `removeModulePath` L29658).
  So `exclude: ['js/main']` subtracts everything main bundles. The core libs and `monster-*`
  modules come with it, because `findNestedDependencies: true` traces main's nested
  `require([...])` calls.
- **Gotcha: ordering.** Exclusions are applied while the layers are flattened, serially, in
  `modules` order (L28555), and `removeModulePath` mutates the layer in place. List `js/main`
  **first**. Its own exclusions are then already removed when the App entries subtract its layer.
  Libraries main excludes (`config`, `templates`, pdf.js, pdfmake, vfs_fonts) are not in its
  layer, so each App entry has to exclude them itself, or they get bundled into every App that
  uses them.
- **Gotcha: duplication of libs main does not contain.** `exclude` only subtracts what you name.
  A library that two Apps use and main does not is copied into both App bundles. I ran 2.3.6 on
  a scratch copy of `src/` with all 21 Apps as separate entries, each with
  `exclude: ['js/main', ...main's excludes]`. The App layers contained only App code, plus:
  - `datatables.net*` (5 files) in **both** `addressbooks` and `callcenter`, which is duplicated.
  - `hljs` in `apiexplorer`, `isotope` in `appstore` and `qrcode` in `auth`. These are
    single-use, so bundling them into their App is fine.
  - `apps/storagemgmt/storages.js` in `storagemgmt`.

  The remedy is to add multi-App libraries to every App entry's `exclude`. The existing
  `libsToExcludeFromApp` list in `gulp/tasks/require.js` already does this by hand. The list can
  also be derived: trace each App, then exclude any non-App file that turns up in two or more
  App layers.
- `include` adds modules that static tracing misses ("You can add modules the static analysis
  misses by using the include option", optimization.html intro). That is how submodules get in;
  see §5.

### 2. `removeCombined: true`

- Source (L28643–L28666): once each layer is written, r.js deletes every file in that layer's
  `buildFilePaths` unless the file is itself a layer target (`isLayer`) or sits outside `dir`.
  It then removes empty directories (L28691).
- Exclusions are removed from `buildFilePaths` before this step. So a file that only appears as
  an exclusion is **not** deleted and stays on disk to be loaded at runtime. In the experiment,
  `js/config.js`, `js/templates.js` and the pdf libraries survived.
- A file that is in any layer is deleted. In the experiment `js/vendor/datatables/` disappeared
  completely, since it lived inside the addressbooks and callcenter bundles. This is safe only
  if nothing ever requests that file by URL: either every consumer carries its own copy, or the
  `bundles` config redirects the request.
- `apps/<name>/app.js` is a layer target, so it is overwritten by the bundle rather than deleted.
- Included submodules are deleted (`apps/common/submodules/buyNumbers/buyNumbers.js` was gone
  after it was put in `include`). Untraced submodules stay (e.g.
  `apps/callflows/submodules/device/device.js`).

### 3. `skipDirOptimize: true` and `onBuildRead` (ADR-0009)

- `onBuildRead` runs whenever a traced file is read. It runs in the tracing pass (L27680) and
  again when the layer is flattened (L30059). The raw text is cached across layers
  (`_cachedRawText`); the transformed contents are cached in `_cachedFileContents`, which is
  reset only between top-level `optimize()` calls (L27486). In a multi-module run, Babel
  therefore runs at least twice per bundled file. In the experiment, 92 files went through it
  and only 5 were read more than twice. **Correctness is unaffected; build time grows a little
  per layer.**
- In the directory pass (L28720–L28790), `onBuildRead` is applied only to files that are **not**
  layers, and only when `!skipDirOptimize`. With `skipDirOptimize: true`, non-layer files are not
  read at all. The layers themselves (now including every `apps/<name>/app.js`) go to
  `optimize.jsFile`, which is a no-op with `optimize: 'none'`. They are not transpiled a second
  time.
- Consequence for ADR-0009: whatever a layer bundles gets transpiled. **Untraced submodules ship
  verbatim and untranspiled, today and under this design.** Pulling submodules into App bundles
  with `include` (§5) is what brings them under Babel. Doing so will also surface any ES2015+
  syntax in them that the browser targets cannot run.

### 4. The runtime `bundles` config and `bundlesConfigOutFile`

- `bundles` "allows configuring multiple module IDs to be found in another script". It was
  "Introduced in RequireJS 2.1.10". Keys and values are "absolute module IDs, not a module ID
  prefix". It "does not automatically bind those modules to the bundle's module ID", and "is
  useful if doing a build and that build target was not an existing module ID"
  ([api.html#config-bundles](https://requirejs.org/docs/api.html#config-bundles)).
- r.js 2.2.0+ can generate it with `bundlesConfigOutFile`
  ([api.html#config-bundles](https://requirejs.org/docs/api.html#config-bundles);
  example.build.js). The option requires `dir` (L29374). After layers are written, r.js re-parses
  each layer with `parse.getAllNamedDefines` and writes `bundles[<layer name>] = [ids…]` into
  the `requirejs.config()` call in the target file (L28627–L28686). I confirmed it writes into
  `js/main.js` correctly.
- **Not needed for the per-App design.** Every App bundle's file is `apps/<name>/app.js`, the
  same URL the loader already requests for the module ID `apps/<name>/app`. Inner modules
  (submodules, single-use libs) are named `define`s that register when the script finishes
  loading. A later `require(['apps/<name>/submodules/<sub>/<sub>'])` from `requireSubModule`
  then resolves from the registry without a network request.
- **Gotchas if you do turn it on:**
  1. The runtime is 2.1.5 and silently ignores `bundles`. You would have to upgrade
     `require-2.1.5.min.js` (the 2.3.6 `require.js` ships in `node_modules/requirejs/`).
  2. `bundlesConfigOutFile` writes an entry for **every** layer, `js/main` included. A request
     for any ID listed under `js/main` that is not yet defined would load `js/main.js` again and
     re-run the boot. Under the layout above it is redundant at best. If you need `bundles`, only
     for a shared vendor layer, write it yourself from `onModuleBundleComplete` (L28667).
  3. A module duplicated into two layers appears under two keys, and whichever key is written
     last wins. In the experiment `datatables.net` was listed under `apps/addressbooks/app`, so
     `callcenter` asking for it would have downloaded the addressbooks bundle. Fix the
     duplication (§1) before you rely on `bundles`.

### 5. `insertRequire`

- It appends `require(["id", …]);` to the end of a layer (L30178–L30182). example.build.js:
  "If the target module only calls define and does not call require() at the top level, and this
  build output is used with an AMD shim loader like almond…".
- **Not wanted here.** `js/main.js` already ends with a top-level `require([...])`. App bundles
  are pulled in by the loader, and eagerly executing an App on script load would bypass
  `_loadApp`'s waterfall (version, build config, submodules, `monsterizeApp`).

### 6. Dynamically required submodules (`apps/<name>/submodules/<sub>/<sub>`)

- `requireSubModule` in `src/js/lib/monster.apps.js` builds the ID at runtime
  (`appRoot + '/submodules/' + subModule + '/' + subModule`) from the App's `subModules` array.
  The optimizer "will not find modules that are loaded via a variable name"
  ([optimization.html intro](https://requirejs.org/docs/optimization.html)). `findNestedDependencies`
  only helps with string-literal arrays. Callflows, voip and storagemgmt build `subModules` from
  a variable, and common, core, accounts and myaccount use a literal array on the returned
  object. None of them is a `require()` call, so r.js does not trace any of it.
- **Today**, in both `whole` and `env.app` mode, each submodule is therefore its own HTTP request
  and is not transpiled (only `pro` is ever `include`d). Common has 34 submodules
  and callflows has 32.
- **To bundle them**, put every `apps/<name>/submodules/<sub>/<sub>` that exists into that App
  entry's `include`, globbed on disk in gulp. The App's `exclude` list still applies to the
  submodules' dependencies.
  - Include only what is on disk. Leave `pro` gated by the existing `getProApps()` check: the
    loader adds `'pro'` only when `app-build-config.json` says so, and an included but unused
    submodule only costs bytes.
  - Once included, `removeCombined` deletes the loose file. The submodule has to be included in
    the bundle of the App that requests it. Today every `requireSubModule` call uses the
    requesting App's own `appRoot`, so this holds.
  - Apps loaded from an external `source_url` get a `paths` entry for `apps/<name>`. The
    bundle's named defines are still `apps/<name>/...`, so they continue to match.
  - Submodule CSS is not handled by r.js (see Related below).

## Recommended config sketch

This replaces the `whole` branch of `modules` in `gulp/tasks/require.js`. Everything else in
`getConfigRequire` stays as it is, including `removeCombined`, `skipDirOptimize`, `onBuildRead`
and `optimize: 'none'`.

```js
// Loaded at runtime as separate files; nobody may bundle them.
const runtimeSeparate = ['config', 'templates', ...libsToExcludeFromWhole];
// Libraries used by >1 App and not already in main. Keep as loose files
// (or move into main's `include`). Derive or maintain; today: DataTables.
const sharedAppLibs = [
	'datatables.net', 'datatables.net-bs', 'datatables.net-buttons',
	'datatables.net-buttons-html5', 'datatables.net-buttons-bootstrap'
];

const listSubmodules = app => {
	const dir = join(tmp, 'apps', app, 'submodules');
	return fs.existsSync(dir)
		? fs.readdirSync(dir)
			.filter(sub => sub !== 'pro'
				&& fs.existsSync(join(dir, sub, `${sub}.js`)))
			.map(sub => join('apps', app, 'submodules', sub, sub))
		: [];
};

modules: [
	// Must be first: App entries subtract its (already-excluded) layer.
	{ name: 'js/main', exclude: runtimeSeparate },
	...getAppsToInclude().map(app => ({
		name: join('apps', app, 'app'),          // bundle lands on the URL the loader requests
		exclude: ['js/main', ...runtimeSeparate, ...sharedAppLibs],
		include: [
			...listSubmodules(app),
			...(getProApps().includes(app)
				? [join('apps', app, 'submodules', 'pro', 'pro')]
				: [])
		]
	}))
]
// No bundlesConfigOutFile, no insertRequire.
```

Follow-ups this implies for the gulp pipeline (outside r.js, for the build tickets under #32):

- `minifyJs` uglifies only `js/main.js` and `js/templates.js`. App bundles would need the same
  treatment (`apps/*/app.js`). `minifyJsApp` already does this for one App.
- `preloadedApps` / `VERSION`: see the bug below. If App code is no longer inside `main.js`,
  "preloaded" stops meaning "inside main.js", so the flag's semantics need to be revisited
  either way.

## Related finding (bug, not r.js)

`gulp/tasks/write-config.js` writes **`preloadApps`** to `build-config.json`. `monster.js`
(`loadBuildConfig`, `_.pick(..., ['type', 'preloadedApps', 'proApps'])`) and `monster.apps.js`
(`_addAppCss`, `loadVersion`) read **`preloadedApps`**. In production the list is therefore
always empty. Every App's CSS loads again on top of the concatenated `css/style.css`, and every
App fetches its own `VERSION`. `proApps` is read but never written. This is worth a separate
issue.

## Sources

- r.js 2.3.6 source: `node_modules/requirejs/bin/r.js` (line refs inline).
- [r.js `build/example.build.js`](https://github.com/requirejs/r.js/blob/master/build/example.build.js):
  `modules`/`exclude`/`excludeShallow`/`include`/`insertRequire`, `removeCombined`,
  `skipDirOptimize`, `onBuildRead`, `bundlesConfigOutFile`.
- [RequireJS optimizer docs](https://requirejs.org/docs/optimization.html): basics, multi-page
  project, dynamic-ID limitation.
- [RequireJS API, `bundles` config](https://requirejs.org/docs/api.html#config-bundles).
- Local: `gulp/tasks/require.js`, `gulp/helpers/transpile.js`, `gulp/tasks/write-config.js`,
  `gulp/tasks/javascript.js`, `src/js/lib/monster.apps.js` (`_loadApp`, `requireSubModule`,
  `_addAppCss`), `src/js/main.js`, `src/index.html`, ADR-0002, ADR-0009.
- Experiment: r.js 2.3.6 with the sketch's shape (main plus 21 App entries, `removeCombined`,
  `skipDirOptimize`, the ADR-0009 Babel `onBuildRead`, `bundlesConfigOutFile`) on a scratch
  copy of `src/`. The build succeeded. Layer contents and deletions are as reported above.
