# Monster UI

The domain glossary for Monster UI — a JavaScript framework for building browser-based
administration and end-user interfaces on top of **Kazoo**, 2600Hz's open-source telephony
platform. This file is a glossary and nothing else: it defines the project's ubiquitous
language, not how any of it is implemented.

## Language

### Application model

**Monster UI**:
The framework itself — the loader, the global `monster` object, and the conventions every App
follows. Not any single App.
_Avoid_: Monster, the framework, MonsterUI

**App**:
A self-contained unit of functionality living in `src/apps/<name>/`, bundling its own
JavaScript, Handlebars views, i18n strings, and styles. The unit a user launches from the
Apploader.
_Avoid_: application, module, plugin

**Base App**:
An App that is always loaded, before any user-launched App — `auth` and `core`. Everything
else is loaded on demand.
_Avoid_: system app, built-in app

**Submodule**:
A reusable slice of functionality nested inside an App (declared in the App's `subModules`
array and living under `submodules/`), such as the number manager or port wizard. Belongs to
an App; not launchable on its own.
_Avoid_: subApp, subModule, module, component

**Common Control**:
A shared UI widget or workflow exposed to Apps through pub/sub topics (typically owned by the
`common` App), rather than imported directly.
_Avoid_: widget, shared component, control

**SmartPBX**:
The user-facing display label of the **voip** App — the hosted-PBX administration interface. The
App's identity in code and on disk is `voip` (its `name`, its `src/apps/voip/` directory, the key
the loader uses); *SmartPBX* is only the marketing label shown in the Apploader and App Store. Use
_voip_ when naming the App as a unit of code; use _SmartPBX_ only for what the end user sees.
_Avoid_: using "SmartPBX" as the App's code identity, or "voip" in user-facing copy

**API Explorer**:
The in-UI developer tool (the **apiexplorer** App) for issuing arbitrary **Crossbar API**
requests and inspecting their raw responses — a hands-on way to explore Kazoo's REST endpoints
from within the UI. The App's identity in code and on disk is `apiexplorer`; *API Explorer* is
its display label. Name the tool for what it *does* (explore the Crossbar API); it is not itself
the API, nor the **Kazoo SDK** that other Apps use to reach it.
_Avoid_: using "API Explorer" for the Crossbar API itself or the Kazoo SDK; "api explorer" as an App code identity

**Recordings**:
The App for viewing, playing, downloading, and deleting call recordings, and for enabling
per-user/-device recording and the optional email-a-recording feature. The App's identity in
code and on disk is `recordings`; *Recordings* is its display label. It is a community App
(third-party, not a 2600Hz/kazoo-classic upstream) vendored in-tree; the on-disk identity was
shortened from its upstream `recordings-community`. Its email feature depends on a separate
server-side **receiver** (see ADR-0007), which is deployment infrastructure, not part of the
build.
_Avoid_: "recordings-community" as the App's code identity; "Recordings" for the Callflow-level
call-recording action or the raw Crossbar recordings endpoint

**Callcenter**:
The App for administering Kazoo's **ACDC** call center — creating and configuring **Queues**,
assigning **Agents**, watching the queues/calls/agents dashboards, and eavesdropping on live
queue calls. The App's identity in code and on disk is `callcenter`; *Callcenter* is its display
label. It is a community App (third-party, no declared license) vendored in-tree. Distinct from
the `callflows` App: a Callflow routes an individual call, whereas Callcenter manages the queues
and agents that a Callflow can hand a call off to.
_Avoid_: "call center" as the App's code identity; using "Callcenter" for the ACDC subsystem
itself (that is **ACDC**) or for a single **Queue**

**Switchboard Lite**:
A real-time operator panel that lists an account's registered devices — with their user/extension
labels, including any hotdesk extensions logged into them — and shows each device's live call
status over a **Blackhole** websocket. The App's identity in code and on disk is `switchboard`;
*Switchboard Lite* is its display label. It is a community App by RuhNet, licensed MPL-1.1 (the
same license this repository carries); "Switchboard", "Switchboard Pro", and "Switchboard Lite"
are RuhNet trademarks. This is the free, view-only *Lite* edition; RuhNet's separate *Pro* edition
(not vendored here) adds answering, parking, transfer, and a retrievable parking lot.
_Avoid_: "switchboard-lite" as the App's code identity; using "Switchboard Lite" for the Pro
edition or for the underlying Blackhole event stream itself

**Parking Lot**:
The App for viewing an account's **Parked Calls** and retrieving them — it lists the calls
currently held in **Parking Slots**, retrieves one on click (dialing the parking feature code),
and can call back the device that parked a call. The App's identity in code and on disk is
`parkinglot`; *Parking Lot* is its display label. It is a community App by RuhNet, licensed
MPL-1.1 (the same license this repository carries), and it polls the Crossbar `parked_calls`
endpoint every 30 seconds rather than using a **Blackhole** websocket. This is a standalone, free
App: it is *not* the retrievable parking lot built into RuhNet's paid **Switchboard Pro** edition
(which is a feature of that separate, unvendored product), even though both surface the same
underlying **Parked Calls**.
_Avoid_: "parkinglot" as the display label or "Parking Lot" as the App's code identity; conflating
this App with Switchboard Pro's built-in parking lot; using "Parking Lot" for a single **Parking
Slot** or for the **Parked Call** concept itself

**Apploader**:
The launcher UI that lists the Apps a user may open and switches between them.
_Avoid_: app switcher, launchpad, dock

**App Store**:
The catalog of installable Apps, browsed and enabled through the `appstore` App.
_Avoid_: marketplace, catalog

**App Document**:
The record stored in Kazoo (the `apps_store` view of an account database) that registers an
App — its name, `api_url`, icon, i18n metadata, and permissions. The source of truth for
whether an App exists and who may use it.
_Avoid_: app config, app record, manifest

### Runtime

**monster object**:
The single global object that every App builds against, exposing the framework's core methods
(`request`, `pub`/`sub`, `template`, the async helpers) and the `ui` and `util` helper
namespaces.
_Avoid_: the framework object, global, Monster instance

**Request**:
A declarative binding from a named identifier to a Crossbar API endpoint, defined in an App's
`requests` map and invoked through the framework rather than by hand-writing a call.
_Avoid_: API definition, endpoint, route

**callApi**:
The App-scoped helper (`self.callApi`) used inside an App to invoke a Request through the
Kazoo SDK, automatically applying the App's flags (auth token, account, API URL).
_Avoid_: apiCall, doRequest, fetch

**Kazoo SDK**:
The jQuery-plugin client that wraps Kazoo's REST API and is the only sanctioned way for the UI
to reach the server.
_Avoid_: the SDK, kazooSdk, API client

**Crossbar API**:
The server-side REST API of Kazoo that the Kazoo SDK talks to. Names the endpoints, not the
client.
_Avoid_: the API, backend, REST layer

**Blackhole**:
Kazoo's WebSocket event service, which pushes real-time events to the UI. Reached over a
`ws://`/`wss://` URL configured as `config.api.socket` and managed through `monster.socket`.
Distinct from the webphone signalling socket.
_Avoid_: the socket, websocket server, event bus

**Webphone socket**:
The separate WebSocket used by `monster.webphone` for in-browser SIP calling, configured as
`config.api.socketWebphone`. Unrelated to Blackhole event delivery despite both being
WebSockets.
_Avoid_: the socket, phone websocket

**API root**:
The base URL every Request is resolved against (`config.api.default`, or an App's own
`apiUrl`), onto which a Request's path is appended. It always ends with the Crossbar API
version segment — `.../v2/` — so a Request resolves to a versioned Crossbar endpoint rather
than a bare, un-versioned path.
_Avoid_: base URL, api.default, host

**Flags**:
The per-App values and helpers exposed on `self` at runtime — `accountId`, `userId`,
`apiUrl`, `i18n`, and similar — that carry the current session's context into an App.
_Avoid_: app state, context, globals

**uiFlags**:
The helper on `self` for reading and writing UI-specific flags persisted onto a user or
account document (e.g. `self.uiFlags.user.set('isBetaUser', true)`), kept separate from the
document's own fields.
_Avoid_: user flags, preferences, settings

**i18n**:
The internationalization strings for an App, stored as per-language JSON and resolved to an
active language per session (user, then account, then browser, falling back to `en-US`).
_Avoid_: translations, locale strings, l10n

### Tenancy

**Account**:
A tenant in Kazoo's hierarchy — the entity a user belongs to and whose data an App reads and
writes. Identified by `accountId`.
_Avoid_: tenant, organization, company

**Masquerading**:
Acting within the UI on behalf of a descendant Account without logging in as it, so that
`accountId` points at the masqueraded Account while the logged-in `userId` is unchanged.
_Avoid_: impersonation, switching accounts, sudo

**Whitelabel**:
The per-reseller branding and feature configuration (application title, company name, logos,
feature toggles) that reshapes how the UI appears and behaves for that reseller's Accounts.
_Avoid_: branding, theme, customization

**Reseller**:
An Account that resells service to descendant Accounts and owns their Whitelabel configuration.
_Avoid_: partner, distributor, agency

### Call handling

**Callflow**:
A Kazoo document describing the chain of actions a call traverses — menus/IVRs, ring
groups, voicemail, time-of-day routing, feature codes, and the like — keyed to the numbers
and extensions that trigger it. The routed flow itself, a server-side entity. Distinct from
the `callflows` App, which is the UI that builds and edits Callflows.
_Avoid_: call flow, route, dialplan, using "callflows" (the App) for the flow it edits

**ACDC**:
Kazoo's Automatic Call Distribution Center — the server-side subsystem that holds callers in
**Queues** and distributes them to available **Agents**. The domain the `callcenter` App
administers. A call reaches ACDC because a **Callflow** routes it there; ACDC then handles the
queuing and agent assignment.
_Avoid_: call center (the concept vs. the App), ACD, using "ACDC" for the `callcenter` App

**Queue**:
An ACDC waiting line that holds inbound callers until an **Agent** is available, with its own
strategy, ring settings, and connection timers. A server-side entity keyed to the Callflow that
feeds it; configured through the `callcenter` App.
_Avoid_: ring group (a Callflow action, not an ACDC Queue), line, hold

**Agent**:
A user enrolled in one or more ACDC **Queues** to receive their calls, with a login/pause status
(available, busy, logged out) surfaced on the `callcenter` agents dashboard. An ACDC role a user
takes on, not a distinct kind of Account or User.
_Avoid_: operator, representative, using "Agent" for an arbitrary User or device

**Parked Call**:
A live call that a user has placed on hold into a shared **Parking Slot** so that it — or another
user — can retrieve it from any device. A server-side state in Kazoo, exposed to the UI through the
Crossbar `parked_calls` endpoint (the Kazoo SDK's `parkedCalls.list` **Request**) and retrieved by
dialing a parking feature code. The domain the `parkinglot` App surfaces. Distinct from an ordinary
hold, which pins a call to one device.
_Avoid_: parked_calls (the endpoint) as the domain term; "held call" for a Parked Call

**Parking Slot**:
The numbered position a **Parked Call** occupies while parked — the identifier a user dials (via a
parking feature code such as `*3<slot>`) to retrieve that call. The slot, not the call sitting in
it.
_Avoid_: park, extension, using "Parking Slot" for the **Parked Call** itself

**Webhook**:
An account-configured HTTP callback that Kazoo fires when a chosen event occurs, delivering a
notification to a URL the account owner defines. A server-side Kazoo document keyed to a **Hook**
(the event type) and an HTTP **Verb**, exposed to the UI through the Crossbar `webhooks` endpoint.
The domain the `webhooks` App configures and debugs. Distinct from the `webhooks` App itself, which
is the UI that manages Webhooks.
_Avoid_: callback, hook (the event type, not the Webhook), using "webhooks" (the App) for a Webhook

**Hook**:
The event type a **Webhook** binds to — the catalog entry naming what fires it (inbound/outbound
call, call answered/ended, bridged call, call parked, inbound/outbound fax, callflow-triggered,
object-triggered). The trigger a Webhook subscribes to, not the Webhook itself.
_Avoid_: event, trigger, using "Hook" as shorthand for the whole Webhook

**Webhook Attempt**:
One delivery try of a **Webhook** — a single fired-and-recorded notification with a success or error
outcome, listed per-Webhook in the App's attempts view for debugging. Read from the Crossbar
`webhooks/attempts` endpoint. The App's source calls this both "attempts" and "history"; the
canonical term is Webhook Attempt.
_Avoid_: history, delivery, log, using "attempt" for the Webhook's configuration

**Verb**:
The HTTP method a **Webhook** delivers with — `get`, or `post`/`put`, the two that carry a request
body in a configured format. A per-Webhook delivery setting, not the event that triggers it.
_Avoid_: method (ambiguous with SDK request methods), format (the body encoding, a separate setting)
