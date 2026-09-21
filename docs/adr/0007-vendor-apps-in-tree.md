# Vendor Apps in-tree; retire the distributed multi-repo model

Historically many Monster UI **Apps** lived in their own GitHub repositories (e.g.
`2600hz/monster-ui-accounts`) and were dropped into `src/apps/<name>/` at build time — the
`serve.sh` script looped over `src/apps/` and `git pull`ed any directory whose git remote was
not this repository. This distributed layout made little sense: an App is not a standalone
program. Every App builds against the framework's shared modules (`monster`, `jquery`,
`lodash`, the Kazoo SDK, …), is bundled by this repo's gulp pipeline, and cannot be built,
served, or meaningfully versioned on its own. The separate-repo boundary bought nothing and
cost coordination.

We therefore **vendor Apps directly into this repository** under `src/apps/<name>/` and treat
them as first-class source. The distributed multi-repo model is retired.

The `accounts` App is the first App migrated this way. It was copied from
`2600hz/monster-ui-accounts` at `master` HEAD **`91d09a06f0344d299876c9edd612c2185cfbb879`**
(2026-08-31), the archived (read-only) tip of that now-frozen upstream. Only the App source
was kept (`app.js`, `i18n/`, `views/`, `style/`, `submodules/`, `metadata/`, `design/`,
`tests/`, a trimmed `README.md`); standalone-repo infrastructure — `.circleci/`,
`.shipyard.yml`, `.base_branch`, `.gitattributes`, and its redundant `LICENSE` — was dropped.
Its `metadata/app.json` carried a hardcoded internal `api_url` (`http://10.26.0.41:8000/v2`),
scrubbed to `http://localhost:8000/v2`.

No build wiring was needed: `getAppsToInclude()` (`gulp/helpers/helpers.js`) already discovers
every directory under `src/apps/` automatically. The former gate was `.gitignore`, which
ignored `src/apps/*` and whitelisted core Apps by name — an artifact of the distributed model,
where per-app clones under `src/apps/` were untracked working copies. With Apps vendored as
first-class source there is nothing to ignore, so that entire block was removed; every
directory under `src/apps/` is now tracked.

## Consequences

- Vendored Apps are tracked, reviewed, and versioned as part of this repository. Their upstream
  git history is not preserved; provenance (source repo + commit) is recorded here instead.
- The `serve.sh` per-app `git pull` loop (and its `no-update` flag) is removed, since there is
  no longer a separate per-app remote to pull. The README's description of that behavior was
  updated to match.
- Adding a new App means adding its source under `src/apps/<name>/` — not standing up a new
  repository, and not touching `.gitignore` (the old `src/apps/*` ignore block was removed with
  this change, so every directory under `src/apps/` is tracked automatically).
- This change is code-and-build only. It does not install a vendored App server-side: for it to
  appear in a user's Apploader, Kazoo still needs an **App Document** (seeded from
  `metadata/app.json`), which remains a deploy-time concern outside this repository.

## Provenance

Each App vendored under this policy, with the source repo and commit it was copied from. Upstream
git history is not preserved; this list is the record.

- **`accounts`** — `2600hz/monster-ui-accounts@91d09a06f0344d299876c9edd612c2185cfbb879`
  (`master` tip, archived read-only, 2026-08-31). `api_url` scrubbed `http://10.26.0.41:8000/v2`
  → `http://localhost:8000/v2`.
- **`voip`** (display label **SmartPBX**) —
  `kazoo-classic/monster-ui-voip@8b0395f263ad60ee0d8f2dea2a5ae03af6da2395` (`main` tip). Same
  standalone-repo infra dropped (`.circleci/`, `.shipyard.yml`, `.base_branch`, `.gitattributes`,
  `.gitignore`, `LICENSE`); `api_url` scrubbed `http://10.26.0.41:8000/v2` →
  `http://localhost:8000/v2`.
- **`callflows`** — `kazoo-classic/monster-ui-callflows-ng@e231afb16b6131f48f12c05498fe3656df764379`
  (`master` tip, 2025-11-25). App source taken from that repo's `src/apps/callflows/`; standalone-repo
  infra dropped (root `LICENSE` + `.editorconfig`, in-app `LICENSE` + `.gitattributes`); `api_url`
  scrubbed `http://10.26.0.41:8000/v2` → `http://localhost:8000/v2`. Unlike the Apps above, this App
  carries a framework-level third-party dependency, `bootstrap-tour` (v0.12.0, used by its guide
  tour). Vendoring it therefore also *grew the shared vendor set*: `bootstrap-tour.min.js` was added
  to `src/js/vendor/` and registered in `src/js/main.js` (`'bootstraptour'` path), and
  `bootstrap-tour.css` was added to `src/css/vendor/` and imported from `src/css/style.css`. This is
  consistent with the framework model — Apps consume from the parent's shared vendor set — but where
  `accounts` and `voip` found their dependencies already present, `callflows` had to add one.
- **`apiexplorer`** (display label **API Explorer**) —
  `kazoo-classic/monster-ui-apiexplorer@2f03c516bfc6e9fb7c3bfd27f027bdb1d5b138df` (`master` tip,
  2025-11-24). Unlike the Apps above, upstream ships its source at the *repo root* (no `src/apps/`
  nesting), so the root contents were copied into `src/apps/apiexplorer/`. Standalone-repo infra
  dropped: only a redundant root `LICENSE` was present. No `api_url` scrub was needed — it is the
  empty string `""` upstream (no hardcoded IP anywhere). Like `callflows`, this App carries a
  framework-level third-party dependency, `highlight.js` (used to syntax-highlight JSON responses),
  which was not in the shared vendor set; its engine was therefore *added* to the set as
  `src/js/vendor/highlight.pack.js` and registered in `src/js/main.js` (`'hljs'` path). Unlike
  `bootstrap-tour`, no shared CSS wiring was needed: the `xcode` highlight theme is loaded
  app-locally through the App's own `css: ['app','xcode']` array (`style/xcode.css`). Its other
  library, `clipboard.js`, was already in the shared set (v1.5.15, API-compatible with the v1.5.9
  the App bundled — both use the `new Clipboard()` constructor). The App shipped its own copies of
  `highlight.pack.js` and `clipboard.min.js` under `lib/`; both became redundant once resolved
  against the shared set and were dropped, leaving only the live `lib/kazoo.methods.js` (loaded at
  runtime via `$.ajax`).
- **`recordings`** (display label **Recordings**) —
  `bpbp-boop/monster-ui-recordings-community@f10fb724c4f97a69743d2de31048cba028f713ab`
  (`main` tip, 2026-09-10). Unlike the Apps above this is a **community App** (author Boden
  Garman), not a 2600Hz/kazoo-classic upstream, and it ships **no declared license** — its
  `metadata/app.json` `license` is `"-"` and the repo carries no `LICENSE` file. Like
  `apiexplorer`, upstream ships its source at the *repo root* (no `src/apps/` nesting), so the
  root contents were copied into `src/apps/recordings/`. Standalone-repo infra dropped:
  `.gitignore` and `app-build-config.json`; the README was rewritten to the vendored form. No
  `api_url` scrub was needed — it is the empty string `""` upstream. It carries **no
  framework-level third-party dependency**: it builds only against the shared set (`jquery`,
  `lodash`, `monster`) and the `monster.ui.footable` helper, so the shared vendor set was left
  unchanged. Two deliberate departures from a byte-faithful copy:
  - **Renamed the App identity** from upstream `recordings-community` to `recordings`. The
    directory, the `name` (`app.js` + `app.json`), the derived `#<name>_app_container` selector,
    the request-key namespace (`recordings-community.*` → `recordings.*`), and the email-webhook
    identifier (`recordings-community-email` → `recordings-email`) were all swept accordingly.
    Only the user-facing display label diverges from a pure shortening: it was set to
    **`Recordings`** (upstream `Recordings (Community)`).
  - **Fixed one inline bug**: the recordings-list request selected the key `recordings.list`
    (undefined) on the no-user branch; corrected to the defined `recordings.recordings.list`.
  The `emailWebhook` config left its upstream `CHANGE-ME` placeholders (`receiverUri`, `token`)
  in place — they are already safe placeholders, analogous to the `api_url` scrub.
- **`recordings` `receiver/` scope call** — this App is the first vendored one to carry
  *server-side* code: `receiver/` is a standalone Python webhook service (plus a systemd unit
  and config example) that powers the email-a-recording feature. Per this ADR, installing an App
  server-side is a deploy-time concern outside this repository, so this is **out-of-band
  infrastructure, not part of the monster-ui build** — nothing in the gulp bundle references it
  and `getAppsToInclude()` does not sweep it into the build. It is vendored in place under
  `src/apps/recordings/receiver/` regardless, because this repo is now its sole home and the
  App's email feature is inert without it; dropping it would silently discard the only copy of a
  working feature's backend. It is marked as such in the App's `README.md`.
- **`callcenter`** (display label **Callcenter**) —
  `kazoo-classic/monster-ui-callcenter@b52966a9c423bbbc3887c967cb99169e068f468c` (default-branch
  tip, 2025-08-09). This App administers Kazoo's **ACDC** call center (queues, agents, live-call
  eavesdrop). Like `voip`/`callflows` it nests its source under `src/apps/callcenter/` upstream,
  so that directory was copied across. Standalone-repo infra dropped: root `README.md` (rewritten
  to the vendored form), root `LICENSE`, and an empty stray `monster-ui-callcenter/` directory; one
  junk download artifact (`style/static/images/icons/icons_24x24_red.261.delayed`, a mislabeled
  1024×768 PNG referenced by nothing) was also dropped. `api_url` scrubbed
  `https://broadbounds.com:8443/v2` → `http://localhost:8000/v2`. Like `recordings`, this is a
  community App carrying **no declared license** (`metadata/app.json` `license` is `"-"`); its
  `metadata/app.json` was copied faithfully, including its `author: "2600Hz"` string. Like
  `callflows` and `apiexplorer`, it carries framework-level third-party dependencies not previously
  in the shared set: the **DataTables** engine (v1.10.15) plus its Bootstrap integration and Buttons
  plugins. Upstream wires these via root symlinks mapping npm-style module IDs to differently-named
  files; in this repo that maps onto five RequireJS `paths` in `src/js/main.js` —
  `datatables.net` → `js/vendor/datatables/jquery.dataTables.min`, `datatables.net-bs` →
  `dataTables.bootstrap.min`, `datatables.net-buttons` → `dataTables.buttons.min`,
  `datatables.net-buttons-html5` → `buttons.html5.min`, `datatables.net-buttons-bootstrap` →
  `buttons.bootstrap.min` — with the five files added under `src/js/vendor/datatables/`. DataTables
  1.10 is proper AMD (`define(['jquery', …])`), so no shim `exports`/deps were needed. Its stylesheet
  was added as `src/css/vendor/jquery/jquery.dataTables.css` and `@import`ed from `src/css/style.css`
  (the `bootstrap-tour` model; the App's `css: ['app','icons']` array does not load it app-locally).
  Its other library, `toastr`, was already in the shared set (as was `jszip`, unused here — the sole
  DataTable is configured `buttons: []`, so no HTML5 export is invoked and no JSZip/pdfmake is
  pulled). Two faithful-copy oddities left as-is and flagged rather than "fixed": the `app.js` i18n
  map omits `en-NZ` although an `en-NZ.json` ships on disk (orphaned string file); and
  `dataTables.bootstrap` 1.10.15 targets Bootstrap 3 while monster-ui vendors Bootstrap 2.3.1, the
  same version-skew caveat `bootstrap-tour` carries — its table styling should be verified against a
  live backend. One **inline bug was fixed** (as with `recordings`): the tip commit
  ("Fixed error when agents status is queried and there are no agents") added an `error:` handler to
  `get_agents_status` but omitted the comma after the preceding `success` property — a hard
  `SyntaxError` that made `app.js` unparseable and blocked the build; the missing comma was added.
- **`switchboard`** (display label **Switchboard Lite**) —
  `ruhnet/monster-ui-switchboard-lite@a16aa5bcd6daf6cca4ac642baf43cd0861594ba0` (`master` tip,
  2026-09-20). A community App by **RuhNet**: a real-time operator panel listing an account's
  registered devices (with user/extension and hotdesk-extension labels) and their live call
  status over a **Blackhole** websocket. Like `apiexplorer`/`recordings`, upstream ships its
  source at the *repo root* (no `src/apps/` nesting), so the root contents were copied into
  `src/apps/switchboard/`. No `api_url` scrub was needed — it is the empty string `""` upstream.
  Its `app.json` `name` is already the clean `switchboard`, so — unlike `recordings` — no App-identity
  rename sweep was required; only the display label `Switchboard Lite` diverges from the code
  identity. It carries **no framework-level third-party dependency**: it builds only against the
  shared set (`jquery`, `lodash`, `monster`) plus the framework's `monster.ui.highlight` helper
  (the DOM element-flash helper, *not* highlight.js), so the shared vendor set was left unchanged.
  One **build-blocker was fixed** (as with `recordings`/`callcenter`, but larger): upstream `app.js`
  is written in ES6 (≈25 arrow functions plus `let`/`const`), which the app-build minifier
  (`gulp-uglify`, pinned to UglifyJS 2.8.10 — ES5-only) cannot parse, so `minifyJsApp` failed with
  `Unexpected token: punc ())` even though `node --check` passed. Rather than change the shared build
  pipeline (which would touch all apps), the App's `app.js` was hand-converted to ES5 —
  arrow-functions → `function` expressions (none relied on lexical `this`; they close over the
  captured `self`/params) and `let`/`const` → `var` — matching the repo's uniform ES5-app convention.
  This is the switchboard equivalent of the inline build-fixes the other community Apps needed; the
  author's comments (including commented-out ES6) were left untouched. Two license notes make this
  App the first vendored one to ship an actual declared license:
  - Its tip commit is a relicense to **MPL-1.1** ("to avoid any incompatibilities with other
    MonsterUI apps when packaged together"), and its root `LICENSE` is byte-identical to this
    repository's own root `LICENSE` (also MPL-1.1). Because the license is therefore *redundant*
    with the parent — not absent as with `recordings`/`callcenter`, and not divergent — the root
    `LICENSE` was **dropped**, consistent with every other vendored App. `metadata/app.json`
    `license` was **normalized** from the upstream placeholder `"-"` to `"MPL-1.1"` to reflect the
    actual (and parent) license.
  - One **faithful-copy contradiction left as-is and flagged** rather than edited: `app.js`'s
    header still carries pre-relicense proprietary prose ("Copyright 2022-2026 RuhNet - All Rights
    Reserved… You may use this software with a valid license from RuhNet") and a RuhNet trademark
    notice, which the MPL-1.1 relicense superseded but never swept out of the source comment. The
    author's code comments were not rewritten; the governing license is recorded here and via the
    `MPL-1.1` `app.json` field. Standalone-repo infra dropped: `.gitignore` (`*.swp`),
    `app-build-config.json`, and the redundant root `LICENSE`; the README was rewritten to the
    vendored form.
- **`parkinglot`** (display label **Parking Lot**) —
  `ruhnet/monster-ui-parkinglot@6531b934e87a028273f10e2f7a44008b68f7ae23` (`master` tip,
  2026-09-20). Another community App by **RuhNet**, a near-twin of `switchboard`: an operator view
  of an account's **Parked Calls** that lists the calls held in parking slots, retrieves one on
  click (dialing a parking feature code), and can call back the device that parked a call. It polls
  the Crossbar `parked_calls` endpoint (the SDK's built-in `parkedCalls.list` resource) every 30
  seconds rather than using a **Blackhole** websocket. Like `apiexplorer`/`recordings`/`switchboard`,
  upstream ships its source at the *repo root* (no `src/apps/` nesting), so the root contents were
  copied into `src/apps/parkinglot/`. Its `app.json` `name` is already the clean `parkinglot`, so no
  App-identity rename sweep was required; only the display label `Parking Lot` diverges from the code
  identity. No `api_url` scrub was needed — it is the empty string `""` upstream. It carries **no
  framework-level third-party dependency**: it builds only against the shared set (`jquery`,
  `lodash`, `monster`) plus the framework's `monster.ui.dialog`/`monster.ui.alert` helpers, so the
  shared vendor set was left unchanged. Standalone-repo infra dropped: `app-build-config.json` and
  the redundant root `LICENSE`; the README was rewritten to the vendored form. License handling
  mirrors `switchboard` exactly: its tip commit is the same MPL-1.1 relicense ("to avoid any
  incompatibilities with other MonsterUI apps when packaged together"), its root `LICENSE` is
  byte-identical to this repository's own root `LICENSE`, so it was **dropped**, and `metadata/app.json`
  `license` was **normalized** from the upstream placeholder `"-"` to `"MPL-1.1"`. Two departures
  from `switchboard` are worth recording: (1) **no ES5 conversion was needed** — unlike
  `switchboard`'s ES6 `app.js`, this App's `app.js` is already ES5 (`node --check` passes; no arrow
  functions, `let`/`const`, or template literals), so the app-build minifier handles it as-is; and
  (2) **no proprietary-prose header contradiction** — `app.js` carries no pre-relicense "All Rights
  Reserved"/RuhNet-trademark comment block, so there was nothing to flag as `switchboard` had.
- **`webhooks`** (display label **Webhooks**) —
  `2600hz/monster-ui-webhooks@65bd25a986323a4568eb0145bd59a133d8283634` (`master` tip, archived
  read-only, 2025-12-11). A 2600Hz App: the account-level UI for configuring and debugging Kazoo
  **Webhooks** (account-configured HTTP callbacks that fire on a chosen event), including per-Webhook
  delivery **Attempts** for debugging. Unlike the 2600Hz/kazoo-classic Apps above (`voip`/`callflows`/
  `callcenter`) but like `apiexplorer`/`recordings`/`switchboard`/`parkinglot`, upstream ships its
  source at the *repo root* (no `src/apps/` nesting), so the root contents were copied into
  `src/apps/webhooks/`. Its `app.json` `name` is already the clean `webhooks`, so no App-identity
  rename sweep was required; the display label `Webhooks` matches the code identity. `api_url` was
  scrubbed `http://10.26.0.41:8000/v2` → `http://localhost:8000/v2`. It carries **no framework-level
  third-party dependency**: it builds only against the shared set (`jquery`, `lodash`, `monster`) plus
  the framework's `monster.ui.footable` helper (already present in the shared set — `recordings` uses
  it too), so the shared vendor set was left unchanged. It is **already ES5** (`node --check` passes;
  no arrow functions, `let`/`const`, or template literals), so no conversion was needed. Its stylesheet
  is `style/app.scss` (SCSS source, not the `style/app.css` most vendored Apps ship); this is **not a
  departure** — the gulp build (`gulp/tasks/style.js` `compileSass`, and the serve-time `scssWatcher`)
  compiles app `.scss` → `.css` natively, exactly as the core Apps (`accounts`, `callcenter`, `auth`,
  …) that also ship `style/app.scss`. Standalone-repo infra dropped: `.circleci/`, `circle.yml`,
  `.shipyard.yml`, `.base_branch`, `.gitattributes`, and the redundant root `LICENSE`; the README was
  rewritten to the vendored form. License handling mirrors `switchboard`/`parkinglot`: the upstream
  root `LICENSE` is byte-identical to this repository's own root `LICENSE` (MPL-1.1), so it was
  **dropped**, and `metadata/app.json` `license` was **normalized** from the upstream placeholder `"-"`
  to `"MPL-1.1"`. Four further notes:
  - **Dropped the upstream `design/` folder** (≈472K — `Specs/spec.md`, `Test Plan/TestPlan.xlsx`,
    `Mockups/Webhooks.jpg` + `webhooks_wireframe.png`, and several empty `.placeholder`-only dirs).
    Unlike `accounts` — the first vendored App, whose `design/` was kept as "App source" — this is
    product-design/marketing collateral that no part of the build references, so it was not vendored;
    this matches the leaner community-App pattern (`recordings`/`switchboard`/`parkinglot` shipped no
    such folder).
  - **Fixed three malformed i18n files** (an inline correctness fix, as with `recordings`'s wrong
    request key and `callcenter`'s missing comma): `i18n/de-DE.json`, `i18n/es-ES.json`, and
    `i18n/ru-RU.json` each carried a trailing comma (`"post": "POST",` before `}` in the
    `webhookEdition.request` block), inherited byte-for-byte from upstream. Monster loads locales via
    `$.ajax({ dataType: 'json' })` (`monster.apps.js` `loadLocale`), which uses strict `JSON.parse`;
    the parse error routes to the `error` handler, so each of these three locales silently loaded as
    `{}` and fell back to English at runtime (en-US, the default, was already well-formed). The single
    trailing comma in each file was removed; only that character changed (verified against upstream).
  - **Normalized the i18n line endings CRLF → LF.** All four upstream `i18n/*.json` files ship with
    CRLF; every other i18n file in this repo (core and vendored) uses LF, so the four were converted
    to LF for consistency with the repo convention. No content changed beyond line endings (verified
    against upstream).
  - **Two faithful-copy oddities left as-is and flagged** (as with `callcenter`'s orphaned `en-NZ.json`
    and `switchboard`'s stale header prose), no build-blocker so no source edit: (1) the `app.js`
    header comment ("Webhook History API needs to be fixed… the request and util are commented out")
    is **stale** — the attempts-history feature (`renderAttemptsHistory`, the `.history` click handler)
    is in fact live in the current code; and (2) `views/webhooks-history.html` appears to be an
    **orphan** view — nothing in `app.js` renders it (the live feature uses `webhooks-attempts*.html`).
