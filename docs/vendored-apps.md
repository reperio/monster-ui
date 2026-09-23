# Vendored Apps register

Every App vendored into this repository under the policy in
[ADR-0007](adr/0007-vendor-apps-in-tree.md), with the source repository and commit it was copied
from, and the changes made to the copy. Upstream git history is not preserved; this register is
the record.

Each entry notes the departures from a byte-faithful copy — dropped standalone-repo
infrastructure, the `api_url` scrub, license handling, any growth of the shared vendor set, and
any inline fix or faithful-copy oddity deliberately left in place. Add a new App to the end of
the list when it is vendored.

Most entries are Apps vendored under `src/apps/<name>/`. One is not: under the second path added
to ADR-0007's vendoring rules, an upstream App that is really a fork of an App already vendored
here may instead be *imported* into that App as submodules, which requires its own ADR. Such
entries are recorded in this same list and marked as imports.

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
  and config example) that powers the email-a-recording feature. Per ADR-0007, installing an App
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
- **`voicemails`** (display label **Voicemails**) —
  `2600hz/monster-ui-voicemails@ce49c7007cdd12a8e329c474c9cbc36ef550b698` (`master` tip, archived
  read-only, 2025-12-11). A 2600Hz App: the account-level UI for bulk-managing the **Voicemail
  Messages** inside an account's **Voicemail Boxes** — listing a box's messages over a date range,
  playing and downloading their audio, showing per-message **CDR** detail, and applying bulk
  **Message Folder** changes, deletions, and moves to another box. It manages box *contents*; the
  boxes themselves remain the `voip` App's `vmboxes` submodule. Like `apiexplorer`/`recordings`/
  `switchboard`/`parkinglot`/`webhooks`, upstream ships its source at the *repo root* (no `src/apps/`
  nesting), so the root contents were copied into `src/apps/voicemails/`. Its `app.json` `name` is
  already the clean `voicemails` and its label is `Voicemails`, so no App-identity rename sweep was
  required and the display label matches the code identity. `api_url` was scrubbed
  `http://10.26.0.41:8000/v2` → `http://localhost:8000/v2` — the sole byte changed anywhere in the
  vendored tree (verified by `diff -r` against upstream). It carries **no framework-level third-party
  dependency**: it builds only against the shared set (`jquery`, `lodash`, `monster`) plus framework
  helpers already present (`monster.ui.footable`/`tooltips`/`renderJSON`/`initRangeDatepicker`/
  `generateAppLayout`/`chosen`/`dialog`/`alert`, and `monster.util.getModbID`/`friendlyTimer`/
  `getFormatPhoneNumber`/`getDefaultRangeDates`/`dateToBeginningOfGregorianDay`/
  `dateToEndOfGregorianDay`), so the shared vendor set was left unchanged; audio playback is a plain
  `<audio>` element on the message's `/raw?auth_token=` URL, with no player library. Every Crossbar
  resource it calls (`voicemail.{list,get,listMessages,updateMessages,deleteMessages,update}`,
  `storage.get`, `cdrs.get`) was already defined in `src/js/lib/jquery.kazoosdk.js`. It is **already
  ES5** (`node --check` passes; no arrow functions, `let`/`const`, or template literals), so no
  conversion was needed — unlike `switchboard`. Its stylesheet is `style/app.scss` (SCSS source, as
  with `webhooks`), compiled by the gulp build like any core App stylesheet; it `@import`s
  `../../../css/partials/base`, a path that only resolves once the App sits at `src/apps/voicemails/`.
  Its second tab renders only when the account has a storage plan, embedding the `common` App's
  `storagePlanManager` Common Control scoped with `forceTypes: ['mailbox_message']`. Standalone-repo
  infra dropped: `.circleci/`, `.shipyard.yml`, `.base_branch`, and `.gitattributes`; the README
  (a single blank line upstream) was rewritten to the vendored form. Three further notes:
  - **License left as the placeholder `"-"`.** Unlike `switchboard`/`parkinglot`/`webhooks` — where a
    root `LICENSE` byte-identical to this repository's MPL-1.1 justified dropping the file and
    normalizing `app.json` `license` to `"MPL-1.1"` — this repository ships **no license at all**:
    `git log --all -- LICENSE` shows no such file has ever existed in its history, and the GitHub API
    reports `license: null`. Normalizing here would mean inferring a license from sibling 2600Hz
    repositories rather than reading one, so `"-"` was left in place and the absence recorded, the
    same call made for `recordings` and `callcenter`.
  - **No inline fix was needed, and one apparent bug was verified *not* to be one.**
    `moveVoicemailMessages()` POSTs to the box currently being viewed and passes the *target* box as
    `source_id`, which reads like an inverted move. It is correct: `source_id` is a misnomer in
    Kazoo's own API. Kazoo's `applications/crossbar/doc/voicemail.md` states "**Move messages to
    another voicemail box:** set the **destination** voicemail box ID in payload like
    `{"data": {"source_id": "{NEW_VM_BOX_ID}"}}`", and `cb_vmboxes.erl` confirms it at the source:
    `post(Context, OldBoxId, ?MESSAGES_RESOURCE)` binds the URL's box to `OldBoxId` and `source_id`
    to `NewBoxId`, then calls `kvm_messages:move_to_vmbox(AccountId, MsgIds, OldBoxId, NewBoxId, …)`
    (a string value moves; an array copies, via `copy_to_vmboxes`). This is recorded here and in the
    App's `README.md` specifically so a future reader does not "fix" it into a backwards move.
  - **Two faithful-copy oddities left as-is and flagged** (as with `callcenter`'s orphaned
    `en-NZ.json` and `webhooks`'s orphan view), no build-blocker so no source edit: `storageBindEvents`
    is an empty function, and `storageFormatData` is the identity function — both vestigial hooks on
    the storage tab. Unlike `webhooks`, its i18n needed no repair: both shipped locales (`de-DE`,
    `en-US`) parse cleanly, both are already LF, and `app.js`'s i18n map matches the files on disk
    exactly (no orphaned locale).
- **`pbxs`** (display label **PBX Connector**) —
  `kazoo-classic/monster-ui-pbxs@5904b19bab7c72c79c9893ba6290632578202829` (`main` tip,
  2020-08-05). A 2600Hz App: the account-level UI for **SIP trunking to non-KAZOO PBXs**. It
  registers a customer's existing on-premise PBX (Avaya, Cisco, FreePBX, Asterisk, Mitel, …) as a
  **Trunkstore Server** — a Kazoo `connectivity` document — through a three-step wizard (brand,
  authentication by SIP registration or static IP, then per-server signalling and media: codecs,
  DTMF mode, caller-ID header, T.38 faxing, REFER transfer, registration interval, NAT pings),
  runs an interactive connectivity test, and assigns phone numbers to each server from the
  account's spare pool. Like `apiexplorer`/`recordings`/`switchboard`/`parkinglot`/`webhooks`/
  `voicemails`, upstream ships its source at the *repo root* (no `src/apps/` nesting), so the root
  contents were copied into `src/apps/pbxs/`. Its `app.json` `name` is already the clean `pbxs`,
  so no App-identity rename sweep was required; only the display label `PBX Connector` diverges
  from the code identity, as with `voip`/SmartPBX. It carries **no framework-level third-party
  dependency**: it builds only against the shared set (`jquery`, `lodash`, `monster`) plus
  framework helpers already present (`monster.ui.codecSelector`/`paintNumberFeaturesIcon`/
  `protectField`/`valid`/`validate`/`tooltips`/`toast`/`confirm`/`alert`/`getFormData`), so the
  shared vendor set was left unchanged; every Crossbar resource it calls
  (`connectivity.{list,get,create,update}`, `numbers.{list,get,create,update,delete,activate}`,
  `account.get`, `callflow.list`) was already defined in `src/js/lib/jquery.kazoosdk.js`, and the
  three Common Controls it publishes to (`common.buyNumbers`, `common.numberFeaturesMenu`,
  `common.portWizard`) already exist under `src/apps/common/submodules/`. It is **already ES5**
  (`node --check` passes; no arrow functions, `let`/`const`, or template literals), so no
  conversion was needed — unlike `switchboard`. Its i18n needed no repair, unlike `webhooks`: all
  four shipped locales (`en-US`, `es-ES`, `fr-FR`, `ru-RU`) parse cleanly, all four are already
  LF, and `app.js`'s i18n map matches the files on disk exactly (no orphaned locale, unlike
  `callcenter`). Standalone-repo infra dropped: `.circleci/`, `.shipyard.yml`, `.base_branch`,
  `.gitattributes`, and the redundant root `LICENSE`; `design/` was dropped per ADR-0007's
  standing rule (it held a single unreferenced `Test Plan/TestPlan.xlsx`); the README (empty
  upstream) was rewritten to the vendored form. `api_url` scrubbed `http://10.26.0.41:8000/v2` →
  `http://localhost:8000/v2`, and `metadata/app.json` `license` **normalized** from the upstream
  placeholder `"-"` to `"MPL-1.1"` — the upstream root `LICENSE` is byte-identical to this
  repository's own root `LICENSE` (MPL-1.1), the `switchboard`/`parkinglot`/`webhooks` case rather
  than the `recordings`/`callcenter`/`voicemails` one. **Those two lines are the only bytes
  changed anywhere in the vendored tree** (verified by `diff -r` against upstream). Three further
  notes:
  - **On the choice of upstream.** This App was taken from `kazoo-classic`, whose tip is five
    years older than `2600hz/monster-ui-pbxs@304ab5a3` (2025-12-11) — but the **App source is
    byte-identical** between them. The only difference across the two trees is a trailing newline
    in `README.md`, which is rewritten here anyway, and all 11 commits `2600hz` carries beyond the
    shared point touch only `.shipyard.yml`, `.circleci/` and rockylinux/CentOS packaging — files
    this policy drops. Recorded so a future reader who notices the newer `2600hz` tip does not
    conclude five years of work was missed. Note this inverts `callflows`, where the
    `kazoo-classic` fork was genuinely *ahead* of the 2600Hz original.
  - **A label/copy contradiction left as-is and flagged** (as with `switchboard`'s stale header
    prose): `metadata/app.json` labels the App **PBX Connector**, which is what the Apploader and
    App Store show, while the `pbx_connector` i18n string renders the in-app header as **SIP
    Trunking**. Upstream's contradiction, not a vendoring artifact; no display copy was edited.
    `PBX Connector` is the label of record, and `CONTEXT.md` records **Trunkstore Server** as the
    canonical term for the managed entity precisely because the concept carries four names across
    the label, the UI copy, the code (`editServer`, `listServers`, `saveEndpoint`) and the API.
  - **It duplicates a Common Control, and was vendored that way deliberately.** Its own number
    listing and assignment UI (`listAllNumbers`, `listNumbersByPbx`, `listAvailableNumbers`, and
    the `pbxsUnassignedNumbers.html` spare-numbers panel) overlaps `common/submodules/numbers`,
    even though the App already consumes three other Common Controls. Per ADR-0007's standing
    rule, the duplicate ships; consolidating it is a refactor, not part of vendoring.
- **`numbers`** (display label **Numbers**) —
  `2600hz/monster-ui-numbers@db1ee86be3e5a3f3f4c7c5b6baaaccea4a425cd5` (`master` tip, archived
  read-only, 2025-12-11). A 2600Hz App, and the thinnest yet vendored: `app.js` is 60 lines that
  render `views/app.html` (a bare `<div id="number_manager"></div>`), publish
  `common.numbers.render` into it, and append the result. All three of its i18n files (`en-US`,
  `fr-FR`, `ru-RU`) are literally `{}`; its stylesheet is five lines. Like
  `apiexplorer`/`recordings`/`switchboard`/`parkinglot`/`webhooks`/`voicemails`/`pbxs`, upstream
  ships its source at the *repo root* (no `src/apps/` nesting), so the root contents were copied
  into `src/apps/numbers/`. Its `app.json` `name` is already the clean `numbers`, so no
  App-identity rename sweep was required, and — unusually — the display label `Numbers` does not
  diverge from the code identity either, so there is no label/identity split to record as there is
  for `voip`/SmartPBX or `pbxs`/PBX Connector. It carries **no framework-level third-party
  dependency**: it builds only against the shared set (`jquery`, `monster`), so the shared vendor
  set was left unchanged. It is **already ES5** (`node --check` passes; no arrow functions,
  `let`/`const`, or template literals), so no conversion was needed — unlike `switchboard`. Its
  i18n needed no repair: all three shipped locales parse cleanly, all three are already LF, and
  `app.js`'s i18n map matches the files on disk exactly (no orphaned locale, unlike `callcenter`).
  Standalone-repo infra dropped: `.base_branch`, `.circleci/`, `.shipyard.yml`, and the redundant
  root `LICENSE`; `design/` was dropped per ADR-0007's standing rule (it held a single
  unreferenced `Test Plan/TestPlan.xlsx`, exactly the `pbxs` case); the README (empty upstream)
  was rewritten to the vendored form. `api_url` scrubbed `http://10.26.0.41:8000/v2` →
  `http://localhost:8000/v2`, and `metadata/app.json` `license` **normalized** from the upstream
  placeholder `"-"` to `"MPL-1.1"` — the upstream root `LICENSE` is byte-identical to this
  repository's own root `LICENSE` (MPL-1.1), the `pbxs`/`switchboard`/`parkinglot`/`webhooks` case
  rather than the `recordings`/`callcenter`/`voicemails` one. **Those two lines are the only bytes
  changed anywhere in the vendored tree** (verified by `diff -r` against upstream). Four further
  notes:
  - **What vendoring this App actually buys is not the App.** `common/submodules/numbers` was
    already in this tree and already used by `voip`. That Common Control takes a `viewType`, and
    the only publisher in this repository was `voip/submodules/numbers`, passing `'pbx'`. The
    default — `'manager'`, the parent-account view that lists the account's direct child Accounts
    (`account.listChildren`) and fetches the `full` number list — had **no consumer at all**.
    Vendoring `numbers` is its only activation path, and switches on a dormant slice of that
    Common Control: the account sections in `layout.html`, plus `spareAccount.html`,
    `usedAccount.html`, `externalAccount.html` and the accountBrowser integration. The App is a
    60-line shell; the reason it earns a place in the tree is that it is the key to that door.
  - **On the choice of upstream — this inverts `pbxs`.** Taken from `2600hz` rather than
    `kazoo-classic`, whose tip (`6de2a8fc`, 2019-10-10) is six years older. The two trees differ
    in exactly two files: `README.md` (rewritten here anyway) and
    `metadata/screenshots/numbers1.png` — and that PNG is a genuine source commit, `1f7f015`
    (2021-09-16, "Update screenshot with cid numbers tab"), which `kazoo-classic` never received.
    Every `2600hz` commit after it touches only `.circleci/` and `.shipyard.yml`. Recorded because
    `pbxs` went the other way for the mirror-image reason (there `kazoo-classic` was older but
    byte-identical on source); a reader who remembers that note should not read this as a
    flip-flop. Note it also inverts `callflows`, where the `kazoo-classic` fork was genuinely
    *ahead*. The lesson is that neither upstream is reliably newer — compare the trees each time.
  - **It makes a dangling selector in `common` load-bearing — see issue #22.**
    `common/submodules/numbers/numbers.js:452` re-renders after adding an external number by
    reaching for a hardcoded global id, `self.numbersRender({ container: $('#number_manager') })`.
    That id is supplied by exactly one thing in this repository: this App's `views/app.html`.
    Before this App was vendored the selector matched nothing and the handler silently failed to
    refresh (`$().empty().append(...)` is a no-op on an empty set); it is reachable only from the
    manager view, since `views/spare.html:46` gates the `.account-header` block behind
    `{{#compare ../viewType '!==' 'pbx'}}`. So it now works by accident of this App's choice of
    id. Filed as **#22** rather than fixed here: the edit lands in `common`, not in the vendored
    App, and mixing an unrelated `common` fix into a vendoring change destroys the
    auditable-diff guarantee just as surely as editing the App would. Flagged loudly because
    anyone tidying that global selector out of `common` would break this App with nothing in the
    diff to explain why.
  - **Verification is partial, and the gaps are real.** Static audit of the manager-only code
    paths came back clean: all 17 Crossbar resources `common/submodules/numbers` calls resolve
    under their own namespace in `src/js/lib/jquery.kazoosdk.js`; all 71 i18n references in its
    views resolve (the five bare `cancel`/`close`/`delete` keys come from `core`'s i18n, merged
    into every App at `monster.apps.js:665`); and all five custom Handlebars helpers its views use
    (`compare`, `formatVariableToDisplay`, `monsterNumberWrapper`, `numberFeatures`, `select`) are
    registered in `monster.ui.js`. `gulp build-dev` completes and emits the App correctly,
    including `dist/css/assets/appIcons/numbers.png` from the icon pipeline, confirming
    ADR-0007's claim that `getAppsToInclude()` needs no build wiring. But two things could **not**
    be verified, and should not be read as covered:
    - **`gulp build-prod` does not complete on `master` at all** — a pre-existing, repo-wide
      breakage unrelated to this App, filed as **#23**: r.js's bundled esprima cannot parse the
      optional chaining in `recordings/app.js`, and `gulp-uglify` cannot parse the template
      literals present across a dozen source files. With the `recordings` blocker neutralized
      locally (not committed), the `buildRequire`/esprima stage — the one that would catch a
      `callcenter`-class parse error — **passes with this App present**, which is the part
      relevant here.
    - **One lint error is left in place, faithfully.** `npx gulp lint` flags
      `src/apps/numbers/app.js:60` for a trailing blank line (`no-multiple-empty-lines`). It is
      neither a build-blocker nor a bug, so per ADR-0007 it was not fixed — and `switchboard` and
      `callflows` already carry the identical error, so leaving it matches precedent rather than
      setting one. This keeps the two-changed-lines guarantee above exact. (Lint is not a gate
      here in any case: `master` reports 2,757 problems across the tree.)
    - **The manager view has never been rendered against a live backend.** A no-backend browser
      load cannot reach it: `auth` gates the UI at a login screen, so the App's `render()` never
      runs. Worse, its two most interesting actions are feature-gated —
      `monster.config.whitelabel.hideBuyNumbers` and `monster.util.canAddExternalNumbers()` (which
      matches `wnm_allow_additions: true` on the **logged-in** account, not the viewed one) — so
      even an authenticated session on a default account exercises neither the buy path nor the
      add-external path, *including the `#number_manager` re-render #22 is about*. This code has
      had no exercise path in this repository for its entire life here. Treat first deployment as
      the real test, and check those two paths specifically.
- **`resources` → imported into `callflows`, not vendored as an App** (upstream display label
  **Resource Gateways**) — `kazoo-classic/monster-ui-resources@55c693ec3081c546196aa8644854d371696a33ac`
  (`main` tip, 2021-08-23; a GitHub fork of the author's own `baloeng/monster-ui-resources` at the
  identical SHA — 7 commits total, sole author Emmanuel Balogun). This is the **first entry in this
  register that is not a vendored App**. Per **ADR-0008**, its two working submodules were imported
  into the already-vendored `callflows` App as two submodules — since collapsed into the single
  `src/apps/callflows/submodules/resourcemanager/` (see the twins note below) — and the rest of the
  upstream repository was discarded. The reason is that
  the upstream "App" is a fork of `callflows` — its `app.json` says so (`"author": "Emmanuel Balogun
  Edited From Callfow App"`) — whose working code is written against callflows' own seams. It
  manages Kazoo **Resources** (carrier gateways) over the Crossbar `resources` endpoints; all ten
  SDK resources it calls (`globalResources.*`, `localResources.*`) already existed in
  `src/js/lib/jquery.kazoosdk.js`, and it carries **no framework-level third-party dependency** (its
  one extra `require`, `bootstraptour`, is already in the shared vendor set and was never used by
  this code anyway), so the shared vendor set was left unchanged. It is **already ES5**
  (`node --check` passes), so no conversion was needed, unlike `switchboard`.
  - **What was imported** (pre-collapse layout) — `globalresource.js` + `localresource.js` and their two views each
    (`general_edit.html`, and `global_resource.html` / `local_resource.html`, selected dynamically
    by `name: data.data.resource_type`); the `resources` i18n subtree (93 keys), added as a new
    top-level key in `callflows/i18n/en-US.json` (no collision — callflows' own carrier strings live
    at `callflows.resource.*`, and the views reference only `i18n.resources.*`, so no view was
    edited); and the trailing 98-line `.callflows-port .media_tabs` block from upstream `style/app.css`,
    appended to `callflows/style/app.css`. Two lines were added to callflows' `appSubmodules` array.
  - **What was discarded (~3.3 MB of 3.4 MB)** — the App shell (`app.js`, a reduced copy of callflows'
    own), `metadata/` (including `app.json` with its `api_url` of `http://10.26.0.41:8000/v2`, which
    therefore needed no scrub), `README.md`, `LICENSE`, `.gitattributes`, 9 dead callflows-fork views
    (`callflow-manager.html`, `callflowList.html`, `node.html`, `rowNumber.html`, …), all 43 images
    (every one already present in `callflows/style/static/images/`), and `style/icons.css`
    (byte-identical to callflows'). Upstream's `views/entity-list.html` is likewise byte-identical to
    callflows', and its `oldResources`, `node` and `callflowsApp` i18n subtrees are exact subsets of
    (or identical to) callflows' own — so nothing of them was imported. Because the sole
    `oldResources` reference sat inside the stripped node half, no i18n repointing was needed.
  - **Licensing: the MIT notice was deliberately dropped.** Upstream ships a real `LICENSE` (MIT,
    Copyright (c) 2021 Emmanuel Balogun) — unlike every other entry here, which was either
    byte-identical to this repository's MPL-1.1 `LICENSE` (`switchboard`, `parkinglot`, `webhooks`)
    or absent entirely (`recordings`, `callcenter`). No `LICENSE` file and no per-file MIT header
    were carried into this repository; the upstream license is recorded here as provenance only.
    Recorded loudly because MIT's one substantive term is that its notice travel with copies, and a
    reader should be able to find that this was a deliberate call rather than an oversight.
  - **The callflow-node half of each submodule was stripped.** Each submodule registered *two* things
    through `callflows.fetchActions`: an entity-manager tab (the `listEntities` / `editEntity`
    contract that `callflows/app.js:379` consumes) and a callflow action node
    (`globalresource[id=*]` / `localresource[id=*]`). The node half is broken as shipped — its `edit`
    renders `getTemplate({ name: 'callflowEdit', submodule: 'globalresource' })` and **no such file
    exists in the upstream repository**, its `tip` key is `undefined` in upstream i18n, and
    `module: 'globalresource'` is not a callflow module anything here speaks (callflows' own
    `resource` submodule uses `offnet` and `resources`). Per ADR-0008 it was removed rather than
    repaired: the node properties (`icon`, `category`, `tip`, `data`, `rules`, `isUsable`, `weight`,
    `caption`, `edit`), the `*PopupEdit` handler, its `callflows.resource.popupEdit` subscription
    (which nothing in this repository publishes), and the `*List` helper that only the node path
    called. Each file went 638 → ~500 lines. Dropping `category` is the framework's own mechanism:
    `callflows/app.js:2142` builds the editor palette from entries having a `category` and `:1335`
    gates child actions on `isUsable`, so these entries are invisible to the callflow editor while
    the entity manager still lists them. The registry keys were left in upstream's node syntax
    (`'globalresource[id=*]'`) rather than renamed — they are inert, and keeping them keeps the diff
    against upstream readable.
  - **One publish that was dead upstream is now live.** Both submodules publish
    `callflows.user.popupEdit` (line 332 upstream). Nothing subscribed to it while the App stood
    alone; inside callflows, `submodules/user/user.js:12` does, and six sibling submodules (`misc`,
    `faxbox`, `conference`, `vmbox`, `callcenter`, `device`) publish it identically. This is the
    clearest evidence the code was written to live here.
  - **The Global Resource gate deviates from upstream, deliberately.** Upstream hid the tab behind
    `currentAccount.is_reseller && currentAccount.superduper_admin && currentUser.priv_level ===
    'admin' && currentUser.enabled`, evaluated in its own `app.js`/`layout.html` (whose else-branch
    rendered a hardcoded, un-i18n'd English "Local Resource" tab). That shell was discarded, so the
    gate was reimplemented inside `globalResourceDefineActions` as
    `monster.util.isReseller() && monster.util.isSuperDuper() && monster.util.isAdmin()` — the helpers
    two sibling callflows submodules already use (`timeofday.js:484`, `temporalset.js:254`). These
    read `originalAccount`, not `currentAccount`, so **the tab now survives masquerading** where
    upstream's did not. `localresource` registers unconditionally, as upstream intended. Keeping the
    gate inside the submodule leaves `callflows/app.js` and `views/layout.html` untouched.
  - **The twins were imported as twins, then collapsed in a follow-up.** `globalresource.js` and
    `localresource.js` were imported unchanged — 1,009 lines that a normalizing diff
    (`sed 's/global/local/g'`) proved identical apart from the gate, with all four views
    byte-identical in pairs. They were imported that way deliberately: collapsing them in the same
    change would have been a blind refactor against no live backend and would have erased the
    line-for-line traceability this entry depends on, the same reasoning ADR-0007 applies to Common
    Control consolidation. The collapse landed separately, once that traceability had served its
    purpose: the two submodules became one, `submodules/resourcemanager/` (529 lines, one
    `general_edit.html` and one `resource.html`), parameterized by a `scopes` map holding each
    scope's `module`, `resourceType`, `sdk` namespace, `i18nKey` and `editTopic`. It still registers
    two entity-manager entries under the same `module` names and subscribes to both
    `callflows.<global|local>resource.edit` topics, so nothing downstream of it changed. Three
    notes: the shared `resourceCleanFormData` / `resourceFixArrays` helpers were *already* collapsed
    by accident — both twins defined them under identical unprefixed names, and
    `monster.apps.js:777` merges every submodule flat onto the App with `$.extend(true, app, module)`,
    so one silently overwrote the other; the two `resource_type` guards became
    `['global_resource', 'local_resource']` membership tests, equivalent per scope since each caller
    only ever passes its own type; and the dynamic template lookup (`name: data.data.resource_type`)
    became a fixed `name: 'resource'`, the two type-named views having been byte-identical. One
    further simplification: each twin's `listEntities` wrapped its single list request in a
    `monster.parallel({ … }, fn)` of one key, which the collapsed version calls directly — same
    request, same callback payload, one less indirection.
  - **40 upstream lint errors were left in place, faithfully** (quotes, `key-spacing`, `eqeqeq`,
    trailing spaces, a missing semicolon, …). None is a build-blocker or a bug, so per ADR-0007 they
    were not fixed; `master` reports 2,757 problems and this branch 2,797, the entire delta inside
    the two imported files.
  - **Verification is partial, and the gaps are real.** Static audit came back clean: `node --check`
    passes on both files; all ten SDK resources resolve in `jquery.kazoosdk.js`; all 108 `i18n.resources.*`
    references across the imported JS and views resolve against the merged i18n; every Handlebars
    helper the views use is registered (`ifInArray` at `monster.ui.js:142`); and every template the
    code requests now exists (`callflowEdit`, the one that did not, went out with the node half).
    `gulp build-dev` completes and emits both submodules and the merged i18n to `dist/`. What could
    **not** be verified:
    - **Nothing has been rendered against a live backend.** `auth` gates the UI at a login screen, so
      neither the entity-manager tabs nor the resource editor has ever run in this repository. Treat
      first deployment as the real test.
    - **The gate has never been observed firing for either user class** — neither a superduper-admin
      reseller (tab present) nor anyone else (tab absent), and the masquerading behavior change above
      is likewise unexercised.
    - **`gulp build-prod` does not complete on `master` at all** — the pre-existing, repo-wide
      breakage filed as **#23**, unrelated to this change.
- **`whitelabel`** (display label **Whitelabel**) —
  `kazoo-classic/monster-ui-whitelabel@8a4e576e5f5c931c0cc947ff865f8ebe608bb1a1` (`master` tip,
  2019-03-18). The reseller-facing editor for an Account's **Whitelabel Document** (branding,
  feature toggles, logo/icon/welcome uploads, branded domains and their DNS records) and its
  **Notification Templates**. Provenance is one step deeper than the URL suggests: the
  kazoo-classic repo is a **fork** of `OpenTelecom/monster-ui-whitelabel` sitting at the identical
  commit with zero divergence, and the code's actual authors are **SIPLABS LLC / Converba Limited**
  (per `metadata/app.json`), not 2600Hz or kazoo-classic. The only other copy on GitHub
  (`valolen/monster-ui-whitelabel-src`, 2019-06) has a byte-identical `app.js` and adds only a
  `.gitignore`, so the tip vendored here is the state of the art everywhere. Like `voip`/`callflows`/
  `callcenter` it nests its source under `src/apps/whitelabel/` upstream, so that directory was
  copied across. Its `app.json` `name` is already the clean `whitelabel` and the display label
  `Whitelabel` matches it, so no identity rename sweep and no label/identity split.
  - **This is by years the oldest source vendored here** — a 2019-03-18 tip, against 2025-2026 for
    every other App in this register. It drives write endpoints (`whitelabel.update`, `create`,
    `delete`, `updateLogo`, `updateIcon`, `updateNotification{,Text,Html}`) whose Crossbar schemas
    may have moved since. Per ADR-0007 the copy was vendored faithfully rather than modernized;
    **its request payloads should be verified against a live Kazoo before it is relied on.** This is
    the same standing caveat `callcenter`'s Bootstrap-3-vs-2.3.1 skew carries.
  - **No declared license**, the `recordings`/`callcenter` situation rather than the
    `switchboard`/`parkinglot`/`webhooks` one: `metadata/app.json` `license` is the placeholder
    `"-"` and upstream ships no `LICENSE` file at all. Nothing was normalized — writing `MPL-1.1`
    here would assert a grant the authors never made. The `author` string
    (`"(C) 2017-2018 SIPLABS LLC (C) 2019 CONVERBA LIMITED"`) was likewise kept verbatim.
  - **`metadata/app.json` was copied byte-for-byte unchanged** — a first for this register. No
    `api_url` scrub was needed (it is the empty string `""` upstream), and the unresolved
    `urls.documentation` / `urls.howto` template tokens (`{documentation_url}`,
    `{howto_video_url}`) were left in place as the inert placeholders they are, the same call made
    for `recordings`' `CHANGE-ME` webhook fields.
  - **It required no SDK change and no growth of the shared vendor set.** All 18 `whitelabel.*`
    resources it calls already exist in `src/js/lib/jquery.kazoosdk.js`, and its four AMD
    dependencies (`jquery`, `monster`, `toastr`, `fileupload`) plus every `monster.ui` helper it
    uses (`wysiwyg`, `alert`, `confirm`, `validate`, `valid`, `getFormData`, `tooltips`) were
    already present. Unlike `callflows`, `apiexplorer` and `callcenter`, nothing was added to
    `src/js/vendor/`, `src/css/vendor/`, or `src/js/main.js`.
  - **No ES5 conversion was needed** — like `parkinglot` and `webhooks` (and unlike `switchboard`),
    `app.js` is already ES5: `node --check` passes and it contains zero arrow functions, `let`/
    `const`, or template literals, so the ES5-only app-build minifier handles it as-is.
  - **Dropped the generated `style/app.css`, keeping `style/app.scss` as the source of truth** — the
    `webhooks`/`accounts` shape rather than the `callcenter` one, which tracks both. This is a
    deliberate departure from a byte-faithful copy, taken because the checked-in `.css` was verified
    to be nothing but the compiled `.scss`: rendering the scss with this repo's own `node-sass`
    8.0.0 and diffing rule-by-rule gives 50 selectors on each side, none unique to either, with the
    only five differences being cosmetic serialization (`opacity: .3` vs `0.3`, quote style,
    gradient-filter spacing). Tracking it would have meant tracking a generated file free to drift
    from its source; the gulp build compiles the scss for us (verified — the build emits
    `dist/apps/whitelabel/style/app.css`).
  - Standalone-repo infra dropped: `gulpfile-build-app.js` (the App's own three-task gulp pipeline
    for building itself into a `dist/`, exactly the distributed model ADR-0007 retires). The README
    — entirely manual-installation instructions for that retired model — was rewritten to the
    vendored form. There was no `.gitignore`, `.circleci/`, `.shipyard.yml`, `design/`, or
    `LICENSE` to drop.
  - **Two faithful-copy oddities left as-is and flagged** rather than "fixed", per ADR-0007's rule
    against refactoring while vendoring:
    - `app.js` registers two **global** Handlebars helpers at init, `inc` and `compare`. `compare`
      is a redundant re-registration of a helper the framework already provides
      (`monster.ui.js`'s `registerHelper({…})` block) — verified semantically identical, so the
      overwrite is a no-op rather than a cross-App hazard. `inc` is *not* a framework helper, which
      is why this is now its third in-tree copy alongside `callcenter` and
      `callflows/submodules/branchvariable`. Consolidating the three onto one framework helper is a
      legitimate follow-up refactor, not a vendoring change.
    - `app.js` aliases toastr as `assert` (`assert = require('toastr')`, then `assert.success(…)`),
      an upstream naming choice that reads as an assertion library. Left untouched.
  - It is the only vendored App to bring its own **non-English localization**: `i18n/ru-RU.json`
    alongside `en-US.json`, plus a matching `ru-RU` block in `app.json`'s i18n. Both were kept —
    `ru-RU` is a framework-supported language (`monster.js`, and `core` ships `ru-RU` strings), so
    the translation is live, not dead weight.
  - **Verification.** `node --check` passes on `app.js`; all three JSON files parse; every one of
    the 69 i18n references across `app.js` and the seven views resolves (61 against the App's own
    `en-US.json`, 8 against the core i18n the framework merges in at `monster.apps.js:665`); every
    Handlebars helper the views use (`monsterRadio`, `monsterText`, `monsterSwitch`,
    `monsterCheckbox`, `replaceVar`, `compare`) is registered by the framework; and
    `gulp build-app --app whitelabel` completes clean through `minifyJsApp` and `minifyCssApp` — the
    gate that caught `switchboard`'s ES6 and `callcenter`'s syntax error — as does the repo-wide
    `gulp build-dev`. What was **not** verified: nothing has been rendered against a live backend,
    so no screen, upload, or write path has ever executed. Given the 2019 vintage, treat first
    deployment as the real test.
