title: Deployment

# Deployment

What a web server needs to know to serve the output of [`gulp build-prod`](building.md#build-prod) (`/dist`) with the right caching. How to set up the server is up to you. This page only says which files may be cached and why.

## Cache headers

| Requests | Cache | Why |
| --- | --- | --- |
| `index.html`, `build-config.json`, `VERSION` | **no-cache** (revalidate every load) | Their URLs never change. `index.html` holds the keys for the **Initial Load** files, and `build-config.json` is the cache root for everything after it: it holds the key of every App and lazily required file. A stale copy of either pins the browser to the previous release. |
| Any URL whose `v` query parameter is a 10-character hex hash (`?v=0123abcdef`) | Long-lived (e.g. `Cache-Control: public, max-age=31536000, immutable`) | The build writes these keys, and they change whenever the content does (see below). This covers `js/main.js`, `css/style.css`, `js/templates.js`, each App's `app.js`, `style/*.css` and i18n, and every other file RequireJS fetches after boot. |
| Everything else | **no-cache** | These URLs don't change with their content. |

`no-cache` still lets the browser keep a copy and revalidate it with a `304`. It does not mean `no-store`.

"Everything else" is more than those three files. The key **must** be a hash, not just any `v`. Not keyed by content:

- `js/config.js`, which you edit after the build. Per-App `VERSION` and `app-build-config.json`, and data files fetched over XHR. Their URLs are fixed.
- Images and fonts referenced from CSS, and `js/vendor/require-*.min.js`.
- An App missing from the manifest: one deployed on its own after the framework build (`gulp build-app`), or one served from another source (`source_url`). The loader keys its CSS and i18n with `v=<App version>` from its `VERSION` file (e.g. `v=4.3.0`, or a timestamp when there is none) and fetches its `app.js` with no key. Serve such Apps' folders no-cache, or rebuild the framework so the App joins the manifest.

On nginx, for example: `map $arg_v $static_cache { ~^[0-9a-f]{10}$ "public, max-age=31536000, immutable"; default "no-cache"; }` and then `add_header Cache-Control $static_cache;`.

## Compression

As its last step, `build-prod` writes a Brotli (`.br`, quality 11) and a gzip (`.gz`, level 9) copy next to each `.js`, `.css`, `.json`, `.html`, `.svg` and `.properties` file in `/dist`. `build-app` does the same for `/dist/apps/<name>`. Neither build writes a copy for:

- `js/config.js`, which you edit after the build. A build-time copy would go stale.
- Images, `.xlsx` and `.bcmap` files. They are already compressed, or only the PDF viewer fetches them.
- A format whose copy would be less than 10% smaller than the file. Small files may end up with only one copy, or none.

Each run also deletes every `.br` / `.gz` file under its output folder that it didn't write.

Serve the copies as they are, so each response needs no compression on the fly and Brotli can run at its highest level:

```nginx
gzip_static on;
brotli_static on;   # needs the third-party ngx_brotli module

# Still compresses files that have no copy, such as js/config.js.
gzip on;
gzip_vary on;
gzip_types text/css application/javascript application/json image/svg+xml text/plain;
```

Without `ngx_brotli`, nginx doesn't know `brotli_static` and ignores the `.br` files. Leave that line out and the `.gz` copies still work.

**Deploy by replacing a folder, never by copying over an old deploy.** `gzip_static` and `brotli_static` serve `main.js.gz` for `main.js` without checking that the two match. If you copy a new build over an old one, a copy left over from the old build shadows the new file whenever the new build didn't write that copy. Replace the whole `dist` (or, after `gulp build-app`, the whole `apps/<name>` folder) instead. This matters most when you redeploy one App on its own.

## How the URLs are keyed

`build-prod` runs a `cacheBust` step over the finished output, in this order:

1. **The manifest.** Each App gets a 10-character SHA-256 of all of its shipped files (`app.js`, `style/*.css`, `i18n/*.json` and the rest of `apps/<name>/`, without `tests/` and `.scss` sources). Each lazily required RequireJS module gets a hash of its file: the libraries no bundle carries (`libsToExcludeFromWhole` and `libsSharedByApps` in `gulp/tasks/require.js`) and the Preloaded Apps' Submodules, which stay loose files. Both go into `build-config.json` as `cacheKeys`:

    ```json
    "cacheKeys": {
      "apps": { "voip": "8def07103d", "core": "6efbb2c925", … },
      "requirePaths": { "datatables.net": "js/vendor/datatables/jquery.dataTables.min.js?v=d40a73d26b", … }
    }
    ```

2. **`js/templates.js`** is hashed, and the built `js/main.js`'s RequireJS config gets `paths: { templates: 'js/templates.js?v=<templates hash>' }` (a path with a query gets no `.js` added, so it is written out). The source's global `urlArgs` timestamp bust is **removed**: every other file now carries its own key.
3. **`js/main.js`** (after step 2) and **`css/style.css`** are hashed.
4. **`index.html`** is rewritten to load `js/main.js?v=<main hash>` and `css/style.css?v=<style hash>`.

At boot the loader reads `build-config.json` (with `cache: false`) and passes `requirePaths` to `require.config`. When it loads an App listed in `apps`, it uses the hash as the App's version, so `monster.util.cacheUrl` adds `v=<hash>` to its CSS and i18n, and points RequireJS at `apps/<name>/app.js?v=<hash>`. It fetches no `VERSION` file for these Apps, Preloaded or Lazy.

An App that didn't change keeps its key, so a release only re-downloads the Apps it changed. The build is deterministic: the same sources give the same bytes and keys.

The step fails the build if it can't find the boot `require.config({ paths })` call or its `templates` path in `js/main.js`, a lazily required module's file, or exactly one reference to `js/main.js` and to `css/style.css` in `index.html`.

## Development builds

`gulp build-dev` / `gulp serve-dev` skip this step. `src/js/main.js` keeps `urlArgs: 'bust=' + (new Date()).getTime()`, so dev re-fetches everything on every load.
