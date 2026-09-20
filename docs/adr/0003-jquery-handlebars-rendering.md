# jQuery + Handlebars for rendering

Apps render UI by compiling **Handlebars templates** (from each App's `views/`, reached through
`monster.template`/`getTemplate`) and manipulating the resulting DOM with **jQuery**, rather
than using a component framework (React, Vue, Angular). This is the framework's rendering model:
state lives in the App's JavaScript and the DOM, event wiring is manual jQuery binding, and there
is no virtual DOM or reactive data binding. A reader arriving from a modern component framework
should not expect one here, and should not introduce one piecemeal — it would not compose with
the existing App lifecycle and Common Control pub/sub model.

## Consequences

- UI logic is imperative: bind events, query the DOM, re-render templates by hand.
- Shared UI is delivered as Common Controls over pub/sub, not as importable components.
- The newer `@2600hz/sds-core` / `sds-themes` design system supplies styles and assets but does
  not change this rendering model.
