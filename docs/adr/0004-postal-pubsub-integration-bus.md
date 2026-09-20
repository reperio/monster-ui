# postal.js pub/sub as the inter-App integration bus

Apps and Common Controls communicate through a **`postal.js` local message bus**, wrapped by
`monster.pub`/`monster.sub`, rather than by importing each other directly. An App exposes and
consumes behavior by publishing and subscribing to topics named `{appName}.{commonControl}.{function}`;
this is how Common Controls (number pickers, wizards, uploaders, etc.) are invoked across App
boundaries without hard dependencies. The decoupling is deliberate — Apps are loaded on demand
and must not statically depend on one another — but it is invisible in the code: there is no
call graph to follow, only topic strings. A reader must know that a `monster.pub('common.numbers.render', ...)`
reaches the `common` App's Common Control, and that topic naming is the contract.

## Consequences

- Cross-App wiring is discovered by grepping topic strings, not by following imports.
- Renaming a topic is a breaking change to every subscriber; topics are effectively a public API.
- The `subscribe` map in an App's `app.js` is the registry of what that App responds to.
