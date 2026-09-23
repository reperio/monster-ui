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

**Voicemails**:
The App for bulk-managing the **Voicemail Messages** inside an account's **Voicemail Boxes** —
listing a box's messages over a date range, playing and downloading their audio, inspecting a
message's **CDR**, and applying bulk actions (change **Message Folder**, delete, or move messages
to another box). The App's identity in code and on disk is `voicemails`; *Voicemails* is its
display label. It is a 2600Hz App shipping no declared license. It manages the *contents* of
Voicemail Boxes; creating and configuring the boxes themselves belongs to the **voip** App's
`vmboxes` **Submodule** — the same division of labor **Callcenter** has against `callflows`.
_Avoid_: "Voicemails" for a single **Voicemail Message** or for the **Voicemail Box** that holds
them; using this App's name for the box-configuration UI in voip

**PBX Connector**:
The user-facing display label of the **pbxs** App — the interface for SIP-trunking a customer's
existing non-KAZOO PBX to the platform, registering it as a **Trunkstore Server** and managing the
numbers routed to it. The App's identity in code and on disk is `pbxs`; *PBX Connector* is only
the label shown in the **Apploader** and **App Store**, the same split **SmartPBX** has against
`voip`. Its own in-app header reads *SIP Trunking*, an upstream inconsistency vendored as-is; the
label of record is *PBX Connector*.
_Avoid_: using "PBX Connector" as the App's code identity, or "pbxs" in user-facing copy; "SIP
Trunking" as the App's name

**Numbers**:
The App for managing an **Account**'s **Phone Numbers** — buying and porting them in, deleting
them, assigning them, and editing their per-number features — across three views: **Spare
Numbers**, **Used Numbers**, and **Caller ID Numbers**. The App's identity in code and on disk is
`numbers`, and unusually its display label *Numbers* does not diverge from it, unlike
**SmartPBX**/`voip` or **PBX Connector**/`pbxs`. It is a 2600Hz App licensed MPL-1.1, vendored
in-tree. It owns almost no code: it is a shell that mounts the `common` App's numbers **Common
Control**, which implements everything the user sees. What distinguishes it from the **voip**
App's numbers tab is *breadth* — Numbers manages an Account's numbers **and those of its direct
child Accounts**, where voip manages only the Account's own.
_Avoid_: "Number Manager" (upstream's name for it, and the DOM id it renders into — but it reads
as a tool name and collides with the label); using "Numbers" for the numbers Common Control that
implements it, or for a **Phone Number** itself

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

**Storage Plan**:
An Account's configuration for where Kazoo physically stores its attachments — per data type
(voicemail media as `mailbox_message`, faxes, call recordings), pointing either at Kazoo's own
storage or at an external provider. A server-side document on the Crossbar `storage` endpoint; an
Account may have none at all, which is why storage UI appears conditionally. Edited through the
`storagePlanManager` **Common Control**.
_Avoid_: storage (bare), storage settings, attachment config, using "Storage Plan" for the Common
Control that edits it

### Call handling

**Callflow**:
A Kazoo document describing the chain of actions a call traverses — menus/IVRs, ring
groups, voicemail, time-of-day routing, feature codes, and the like — keyed to the numbers
and extensions that trigger it. The routed flow itself, a server-side entity. Distinct from
the `callflows` App, which is the UI that builds and edits Callflows — and which also
administers **Resources**, so the App is not only a Callflow editor.
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

**Trunkstore Server**:
A customer's own PBX — an on-premise Avaya, Cisco, FreePBX, Asterisk, Mitel or similar system —
registered with KAZOO so that calls can be trunked to and from it over SIP. A server-side Kazoo
entity (the `connectivity` document, named for the legacy *Trunkstore* subsystem), carrying its
own authentication (SIP registration or a static IP), its signalling and media settings (codecs,
DTMF mode, caller-ID header, T.38 faxing, REFER transfer), and the numbers routed to it. The
domain the `pbxs` App administers. Distinct from a **Callflow**, which routes a call *within*
KAZOO: a Trunkstore Server is the far end of a trunk to equipment KAZOO does not operate.
_Avoid_: "Server" or "Endpoint" (the App's own code terms — both are overloaded, *Endpoint*
especially so against KAZOO devices); "connectivity" (the API spelling) as the domain term; "PBX
Connector" or "SIP Trunking" (the App's label and header) for the entity the App manages

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

**Voicemail Box**:
The Kazoo mailbox a caller leaves a **Voicemail Message** in — a server-side document (the
Crossbar `vmboxes` endpoint) with its own number or extension, greeting, PIN, and owner. The
container, not its contents: the messages inside it are separate entities with their own
lifecycle. Configured by the **voip** App's `vmboxes` **Submodule**; its contents are managed by
the **Voicemails** App.
_Avoid_: mailbox, vmbox (the endpoint and code spelling) as the domain term, voicemail (the
message)

**Voicemail Message**:
One recorded message sitting in a **Voicemail Box** — its audio plus the metadata describing the
call that left it (caller ID, from and to, timestamp, length, `call_id`, and the **Message
Folder** it currently occupies). Addressed by a `media_id`, with its audio fetched from the box's
`messages/{id}/raw` endpoint.
_Avoid_: voicemail (ambiguous with the box and with the feature), recording (a call **Recording**
is a different entity), message (ambiguous with chat and SMS)

**Message Folder**:
The state a **Voicemail Message** occupies — `new`, `saved`, or `deleted` — and the thing bulk
actions move messages between. Persisted and filtered on as Kazoo's `folder` field; playing a new
message moves it to `saved`. The **Voicemails** App displays it under the heading "Status", but
the domain term is Message Folder.
_Avoid_: status (the App's display copy), folder (bare — reads as a filesystem folder), mailbox
(that is the **Voicemail Box**)

**CDR**:
A Call Detail Record — Kazoo's per-call record of what happened on a leg (endpoints, timestamps,
duration, disposition, hangup cause), read from the Crossbar `cdrs` endpoint and addressed by a
**MODB ID**. The authoritative account of a call after the fact; distinct from the **Voicemail
Message** or recording a call may have produced.
_Avoid_: call log (the voip App's call-history view, built on CDRs but not the record itself),
call record, cdrs (the endpoint) as the domain term

**MODB ID**:
An identifier that names both the month-partitioned account database (Kazoo's monthly account
database, MODB) a document lives in and the document itself. Because per-call data is stored per
month, a bare `call_id` is not addressable on its own — the framework's `monster.util.getModbID`
composes a `call_id` and a timestamp into the MODB ID needed to fetch, for example, the **CDR**
behind a **Voicemail Message**. Kazoo migrates legacy voicemail messages into this format, which
changes their ids.
_Avoid_: call id (only one half of it), modb (the database, not the id), doc id

**Resource**:
A Kazoo document describing a carrier connection calls can be routed out through — the rules
(number patterns) it matches, its flags and weighting, and the **Resource Gateways** that carry
the traffic. A server-side entity on the Crossbar `resources` endpoint, scoped either
platform-wide (**Global Resource**) or to one **Account** (**Local Resource**). Administered in
the `callflows` App. Distinct from the `resources[]` Callflow action, which routes a call *to*
whichever Resources apply rather than describing one, and from the `resource:` key in a **Kazoo
SDK** call, which names an SDK method.
_Avoid_: bare "resource" for anything but this document; carrier (the company, not its config);
trunk; gateway (that is the sub-entity)

**Global Resource**:
A **Resource** owned by the platform rather than by any **Account** — held at the Crossbar
`resources` endpoint with no account in its path, and available to every Account that has no
**Local Resource** taking precedence. Superduper-admin territory: the `callflows` App offers its
tab only to a superduper admin of a reseller account.
_Avoid_: system resource, master resource, carrier (the company)

**Local Resource**:
A **Resource** owned by a single **Account** — held at `accounts/{accountId}/resources` — letting
that Account route calls out through its own carrier connection instead of the platform's
**Global Resources**.
_Avoid_: account resource, private resource, local carrier

**Resource Gateway**:
One SIP endpoint inside a **Resource** — its server, port, realm, credentials or IP
authentication, codecs, and prefix/suffix rules. A Resource carries one or more, and they are
what a call actually egresses through; the Resource is the routing policy around them. The
upstream App that this UI came from was labelled *Resource Gateways* after them.
_Avoid_: trunk, gateway bare (ambiguous with a **Trunkstore Server**), endpoint (a device-side
term)

### Numbering

**Phone Number**:
A telephone number an **Account** holds on the platform — a server-side Kazoo entity on the
Crossbar `phone_numbers` endpoint, carrying its own state, carrier module, and per-number
features (caller ID, E911 address, failover, CNAM, prepend). Held by exactly one Account at a
time, and classified by how the Account uses it: **Spare Number**, or **Used Number**. Distinct
from an extension, which is internal to a **Callflow** and is neither bought nor ported. A Phone
Number normally enters an Account by purchase or by port; an Account whose logged-in user carries
`wnm_allow_additions` may also import one directly — the UI calls that "Add External Numbers",
which is a misnomer: the result is an ordinary Phone Number and has nothing to do with a **Caller
ID Number**.
_Avoid_: DID; "number" bare (ambiguous with extensions and with the **Numbers** App);
`phone_numbers` (the endpoint) as the domain term

**Spare Number**:
A **Phone Number** an Account holds but has not attached to anything — sitting in the Account's
pool, ready to assign to a **Callflow**, a device, a user, or a **Trunkstore Server**. One of the
**Numbers** App's three views. A number the Account does not hold at all is not spare; it is
simply not the Account's.
_Avoid_: unassigned, unused (both also describe numbers nobody holds); available (reads as
purchasable from a carrier)

**Used Number**:
A **Phone Number** an Account holds *and* has attached to something that routes it — a
**Callflow**, a device, a user, or a **Trunkstore Server**. Kazoo records the attachment on the
number's `used_by` field, which is what separates it from a **Spare Number**. One of the
**Numbers** App's three views.
_Avoid_: assigned (ambiguous with assigning a number to a child **Account**); active; "in use"
bare

**Caller ID Number**:
A telephone number an Account may present as its outbound caller ID *without holding it* on the
platform — proven to be the Account's by a PIN callback rather than bought or ported. A separate
server-side entity on the Crossbar `external_numbers` endpoint, not `phone_numbers`, and
therefore never a **Phone Number**: it is not spare, not used, and cannot be routed to. Gated on
the `caller_id.external_numbers` capability. One of the **Numbers** App's three views, where it
is labelled *Caller ID Numbers*.
_Avoid_: **External Number** — the code, the SDK namespace and the view file all say "external",
but that word names two unrelated things here (this entity, and the `wnm_allow_additions` import
that produces ordinary **Phone Numbers**), so it is not usable as a domain term; foreign number;
BYON; using "Caller ID Number" for a number that was ported in (that becomes a Phone Number)
