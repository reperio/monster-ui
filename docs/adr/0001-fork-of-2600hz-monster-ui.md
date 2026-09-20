# Fork of 2600hz/monster-ui, tracked in reperio

This repository is a fork of the upstream [`2600hz/monster-ui`](https://github.com/2600hz/monster-ui)
framework. Issues, specs, and agent work are tracked in **`reperio/monster-ui`** (via the `gh`
CLI), not upstream, so that Reperio-specific changes and planning stay separate from the 2600Hz
project. A future reader should expect `origin` to point at `reperio` while `package.json`
still references the 2600Hz homepage and bug tracker — that mismatch is intentional, a
consequence of the fork rather than a mistake to "fix."

## Consequences

- Changes intended for upstream must be contributed to `2600hz/monster-ui` separately; there is
  no automatic sync.
- The `2600hz` links in `package.json` and `README.md` describe the upstream project, not where
  this fork's work is coordinated.
