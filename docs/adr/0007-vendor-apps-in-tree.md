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
