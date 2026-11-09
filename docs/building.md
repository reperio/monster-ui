title: Build Commands

# Build Commands

Monster UI's build system is powered by `gulp`. It provides build management commands for applications as well as for the framework as a whole.

- [`lint`](#lintdev)
- [`build-dev`](#build-dev)
- [`serve-dev`](#serve-dev)
- [`build-app`](#build-app)
- [`build-prod`](#build-prod)
- [`serve-prod`](#serve-prod)
- [`size-report`](#size-report)
- [`size-budget`](#size-budget)

## `lint`

Runs `eslint` for framework (including every app), or for a specific app by specifying the `--app` option.

##### Synopsis

```shell
gulp lint [options]
```

##### Options

```shell
--app name        Pick app to lint by name
```

##### Examples

```shell
gulp lint
gulp lint --app voip
```

## `build-dev`

Moves all files under `/dist` and runs the following tasks:

- compile SCSS into CSS
- generate build config for the framework and each app

##### Synopsis

```shell
gulp build-dev [options]
```

##### Options

```shell
--pro name        Pick apps by name to build in pro version
--require file    Specify a polyfill config
```

##### Examples

```shell
gulp build-dev
gulp build-dev --pro operator
gulp build-dev --pro operator,callqueues
```

## `serve-dev`

Runs the `build-dev` command and serves `/dist` at `http://localhost:3000/`.

##### Synopsis

```shell
gulp [serve-dev] [options]
```

##### Options

```shell
--pro name        Pick apps by name to build in pro version
--require file    Specify a polyfill config
```

##### Examples

```shell
gulp
gulp --pro operator
gulp --pro operator,callqueues
gulp serve-dev
gulp serve-dev --pro operator
gulp serve-dev --pro operator,callqueues
```

## `build-app`

Runs a production build for a specific app, including the following tasks:

- compile SCSS into CSS
- compile templates into JS
- resolve modules dependencies
- minify JS/CSS
- generate build config

The output of the build is located at `/dist/apps/<name>`.

##### Synopsis

```shell
gulp build-app [options]
```

##### Options

```shell
--app name        Pick app to build by name
--pro             Build app with pro version by name
--require file    Specify a polyfill config
```

##### Examples

```shell
gulp build-app --app voip
gulp build-app --app voip --pro
```

## `build-prod`

Runs a production build for the framework, including the following tasks:

- compile SCSS into CSS
- compile templates into JS
- resolve modules dependencies, transpiling bundled first-party sources to ES5 ([ADR-0009](adr/0009-transpile-bundled-sources-to-es5.md))
- minify JS/CSS
- generate build config

The **Initial Load** (`js/main.js`, `js/templates.js`, `css/style.css`) carries the framework and the **Preloaded Apps** only (`auth`, `core`, `apploader`, `common`; `getPreloadedApps()` in `gulp/helpers/helpers.js`, which also writes `preloadedApps` in `build-config.json`). Every **Lazy App** is built as its own bundle, fetched the first time it is launched:

- `apps/<name>/app.js`: one r.js layer, minified and transpiled, holding the App, all its Submodules (plus `submodules/pro` under `--pro`) and all its views. It leaves out everything `js/main.js` already has.
- `apps/<name>/style/*.css`: minified, each with its `@import`s inlined, so vendor CSS that only one App uses (bootstrap-tour in `callflows`) travels with that App. It loads after `style.css`, so it wins cascade ties.

A library that several Lazy Apps use but `js/main.js` doesn't carry (today: DataTables) goes in `libsSharedByApps` in `gulp/tasks/require.js`. It then loads once, as its own file. The build prints a warning naming any library it finds bundled into more than one App. A library that a Preloaded App's Submodule requires (today: isotope, for `common`'s `appSelector`) goes in `libsInMain`, because r.js can't trace Submodules into `js/main.js`.
- key every URL to its content: `index.html` loads `js/main.js?v=<hash>` and `css/style.css?v=<hash>`, `templates.js` gets its own hash, and RequireJS fetches carry `v=<release id>`

The output of the build is located at `/dist`. Cache a URL long only when its `v` key is one of these hashes, and serve the rest (`index.html`, `build-config.json` and `VERSION` included) no-cache. See [Deployment](deployment.md).

##### Synopsis

```shell
gulp build-prod [options]
```

##### Options

```shell
--require file    Specify a polyfill config
```

##### Examples

```shell
gulp build-prod
```

## `serve-prod`

Runs the `build-prod` command and serves `/dist`  at `http://localhost:3000/`

##### Synopsis

```shell
gulp serve-prod [options]
```

##### Options

```shell
--require file    Specify a polyfill config
```

##### Examples

```shell
gulp serve-prod
```

## `size-report`

Reports what makes up the output of `build-prod`. It breaks `js/main.js` down per App, framework module and vendor library. It breaks `js/templates.js` down per App and submodule, and `css/style.css` per Preloaded App and per framework/vendor stylesheet. It also lists each Lazy App's own bundle (`app.js` plus its `style/*.css`) and the submodule JS and i18n that ship outside those three files. Every row has a raw and a gzip size.

Rows are measured standalone, using the same transpile step and minifiers as the build, so their gzip sizes don't add up exactly to the gzip of the whole file. The report prints the attributed total next to the actual size. Run `build-prod` first.

##### Synopsis

```shell
gulp size-report [options]
```

##### Options

```shell
--json file    Also write the raw numbers to a JSON file
--top n        Rows per table (default: 25)
```

The JSON holds `initialLoad`, which `size-budget` checks: the emitted raw and gzip (zlib level 6) size of each **Initial Load** file and their total. It also holds `apps`: for each Lazy App, the emitted `app.js` plus every `style/*.css` it loads, with a per-file breakdown. It also holds the per-row breakdown. Sizes are in bytes.

##### Examples

```shell
gulp build-prod && gulp size-report --silent --top 100
```

## `size-budget`

Checks a `size-report --json` report against `size-budget.json` at the repo root. The `build-prod` CI job runs it after every production build.

- It **fails** when any **Initial Load** file (`js/main.js`, `js/templates.js`, `css/style.css`) or the trio's total is over its raw or gzip budget.
- It **warns** when an App bundled as its own `app.js` is over its cap in `apps`. Per-App caps never fail the build. An App with a cap but no bundle of its own isn't checked.
- It flags any entry 20 KB gzip or more under its budget with "lower it".

In GitHub Actions the results become annotations and the measured-vs-budget table goes to the job summary. Locally both are printed.

##### Synopsis

```shell
gulp size-budget --report file [options]
```

##### Options

```shell
--report file    The JSON written by `size-report --json` (required)
--budget file    Budget to check against (default: size-budget.json)
```

##### Examples

```shell
gulp build-prod
gulp size-report --silent --json size-report.json
gulp size-budget --report size-report.json
```

##### The ratchet

`size-budget.json` holds sizes in KB (1024 bytes), per **Initial Load** file and for the total, raw and gzip. The `apps` map holds the per-App caps.

- **Lower it** whenever a PR shrinks the output: set the entry to the new measured size, rounded **up** to the next 10 KB gzip / 50 KB raw. Do it in the same PR. CI doesn't force this, but it flags any entry 20 KB gzip or more under its budget.
- **Raise it** only in a PR that says why. Growth should be a decision, not drift.
- A Lazy App's cap is seeded from its first measured bundle plus ~10%.
