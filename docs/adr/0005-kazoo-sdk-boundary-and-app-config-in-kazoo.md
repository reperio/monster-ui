# Kazoo SDK as the only API boundary; App registration lives in Kazoo

All server communication goes through the **Kazoo SDK** (`jquery.kazoosdk.js`), invoked from
Apps as `self.callApi` against declarative Requests, rather than through ad-hoc HTTP calls. The
SDK is the single seam between the UI and the Crossbar API: it owns auth-token handling,
`ui_metadata` injection, charge acceptance (402 handling), and request lifecycle hooks. Just as
importantly, **which Apps exist and who may use them is data owned by Kazoo, not the repo** — an
App is registered by an App Document in the master account's `apps_store` view (name, `api_url`,
icon, i18n, permissions). The repo ships an App's code; Kazoo decides whether it is installed and
visible.

## Consequences

- Never bypass the SDK with raw `$.ajax`/`fetch`; auth, metadata, and charge handling would be lost.
- An App present in `src/apps/` may still be absent from a running system if no App Document
  registers it; installation is a server-side (`sup crossbar_maintenance init_app`) or database step.
- The `api_url` and permissions a running App sees come from its App Document, not from repo config.
