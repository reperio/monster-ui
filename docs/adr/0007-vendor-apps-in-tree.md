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

## Vendoring rules

Rules followed as precedent across the first Apps, written down here so they are decisions
rather than habits inferred from reading the register:

- **Ship duplicated functionality as-is; never refactor onto a Common Control while vendoring.**
  Several Apps carry their own UI for something the `common` App already exposes as a **Common
  Control** — `pbxs`, for instance, consumes `common.buyNumbers`, `common.numberFeaturesMenu`,
  and `common.portWizard` while still shipping its own number-listing and assignment views that
  overlap `common/submodules/numbers`. Vendor the duplicate. Vendoring's contract is a faithful
  copy with a recorded diff — the value of being able to say "one `api_url` line is the only byte
  changed" is that the copy stays auditable against upstream. Consolidating an App onto a shared
  control is a legitimate follow-up, but it is a refactor carrying its own risk, and mixing it
  into a vendoring change destroys that guarantee. The same reasoning is why only build-blockers
  and outright bugs are fixed inline, each one recorded in the register.
- **Drop upstream `design/` folders.** They hold product-design and marketing collateral —
  specs, test-plan spreadsheets, mockups — that no part of the build references. The first App
  vendored (`accounts`) kept its `design/` and `webhooks` later dropped its; the `webhooks` call
  is the standing rule. `metadata/icon` and `metadata/screenshots` are a separate matter and are
  always kept: the **App Document** seeded from `metadata/app.json` refers to them.
- **Vendoring an App is the default, but not the only path.** Where an upstream "App" is in fact
  a fork of an App this repository already vendors, and its working code is written against that
  App's own seams, it may instead be *imported* into the existing App as submodules. That path is
  a deliberate departure from everything above — it edits the imported code and costs the host App
  its faithful-copy guarantee — so it requires its own ADR recording why, and it is not to be
  reached for merely because two Apps overlap. **ADR-0008** is the first and so far only instance
  (the `resources` App imported into `callflows`); the rules above continue to govern every App
  vendored as an App.

## Provenance

Provenance for each App vendored under this policy — source repository, commit, and every change
made to the copy — is recorded in the register at [`docs/vendored-apps.md`](../vendored-apps.md).
Apps imported into an existing App under the rule above are recorded in the same register, marked
as imports rather than vendored Apps.

It lives outside this file because it is a running log, not a decision: it grows by an entry on
every App vendored, while the decision recorded above was made once. Add new Apps to the register.
