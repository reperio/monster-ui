# Monster UI PBX Connector

The `pbxs` App (display label **PBX Connector**) is the account-level UI for **SIP trunking to
non-KAZOO PBXs**. It registers a customer's existing on-premise PBX — Avaya, Cisco, FreePBX,
Asterisk, Mitel and a couple of dozen other brands ship as selectable logos — as a **Trunkstore
Server**, and manages the phone numbers routed to it. It is vendored in-tree under
`src/apps/pbxs/` and built directly by the monster-ui gulp workflow — there is no separate clone
or install step.

Adding a PBX runs a three-step wizard: pick the brand, choose authentication (SIP registration or
a static IP), then configure signalling and media for that server — supported codecs, DTMF mode
(RFC 2833 or in-band), which header carries caller-ID (P-Asserted-Identity, Remote-Party-ID or
From), T.38 faxing, call transfer via REFER, registration interval and NAT-keepalive pings. An
interactive connectivity test then walks an operator through placing a real call to verify
registration, two-way audio, caller-ID, HD codecs, DTMF, transfer and fax. Numbers are assigned
to a server from the account's **Spare Numbers** pool, bought inline, or ported in.

Each PBX is stored as a Kazoo `connectivity` document, which this App reads and writes through
`connectivity.list` / `connectivity.get` / `connectivity.create` / `connectivity.update`. See the
`PBX Connector` and `Trunkstore Server` glossary entries in `CONTEXT.md` — the concept carries
four different names across the label, the UI copy, the code and the API, and `Trunkstore Server`
is the canonical one.

This App carries no framework-level third-party dependencies: it builds only against the shared
modules (`jquery`, `lodash`, `monster`) and framework helpers already present
(`monster.ui.codecSelector` / `paintNumberFeaturesIcon` / `protectField` / `valid` / `validate` /
`tooltips` / `toast` / `confirm` / `alert` / `getFormData`). Nothing was added to the shared
vendor set to vendor it. For number work it delegates to three of the `common` App's Common
Controls — `common.buyNumbers`, `common.numberFeaturesMenu` and `common.portWizard`.

It is a 2600Hz App, licensed **MPL-1.1** — the same license this repository already carries, so
no separate `LICENSE` file is vendored with it.

## Notes on this vendored copy

**The Apploader label and the in-app header disagree.** `metadata/app.json` labels the App
**PBX Connector**, which is what the Apploader and App Store show, while `i18n/*.json`'s
`pbx_connector` string renders the in-app header as **SIP Trunking**. That contradiction is
upstream's and was vendored as-is rather than papered over by editing display copy. `PBX
Connector` is the App's label of record.

**Its number views overlap `common/submodules/numbers`.** The App ships its own number listing
and assignment UI (`listAllNumbers`, `listNumbersByPbx`, `listAvailableNumbers`, and the
`pbxsUnassignedNumbers.html` spare-numbers panel) covering ground the `common` App's number
manager also covers. This is vendored as-is: per ADR-0007, an App is never refactored onto a
shared Common Control as part of vendoring.

**`updateOldTrunkstore` is not legacy-migration code.** Despite the name it is an ordinary
`connectivity.update` call — "old Trunkstore" is just what the author called the existing
document being edited.

See `docs/adr/0007-vendor-apps-in-tree.md` for the policy and `docs/vendored-apps.md` for this
App's entry (source commit, `api_url` scrub, license handling, and the upstream-choice note).
