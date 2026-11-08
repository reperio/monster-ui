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

The output of the build is located at `/dist`.

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

Reports what makes up the output of `build-prod`. It breaks `js/main.js` down per App, framework module and vendor library. It breaks `js/templates.js` down per App and submodule, and `css/style.css` per App and per framework/vendor stylesheet. It also lists the submodule JS and i18n that ship outside those three files. Every row has a raw and a gzip size.

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

##### Examples

```shell
gulp build-prod && gulp size-report --silent --top 100
```
