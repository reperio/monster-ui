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
