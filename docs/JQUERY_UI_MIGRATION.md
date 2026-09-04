# jQuery UI coexistence and migration

Use jQStar's native semantic components for new work. Existing applications can run an isolated
jQuery UI region beside an isolated jQStar region while they migrate one feature at a time. This is
a temporary application architecture, not a drop-in compatibility layer.

jQStar is an independent project. It is not affiliated with, sponsored by, endorsed by, or an
official successor to the jQuery project or the OpenJS Foundation. Similar component names describe
user needs, not Widget Factory, plugin, option, method, event, data, theme, Position, effect, or
extension compatibility.

The machine authority is [`quality/jquery-ui-migration.json`](../quality/jquery-ui-migration.json).
Its schema is [`schema/jquery-ui-migration.schema.json`](../schema/jquery-ui-migration.schema.json).

## Status and exact evidence

The fixture pins `jquery@4.0.0` and `jquery-ui@1.14.2`. It loads `dist/jquery-ui.js` and the base
theme from the installed package. It does not use the older `jquery-ui-dist` package or an
unversioned CDN asset.

The decision was reviewed on 4 September 2026 against these primary sources:

- [jQuery UI 1.14.2 release](https://blog.jqueryui.com/2026/01/jquery-ui-1-14-2-released/): tested
  with jQuery 4.0.0; maintenance is limited to compatibility, security, and important regressions.
- [jQuery UI 1.14 API](https://api.jqueryui.com/): the official catalog used for the 72-entry
  inventory.
- [OpenJS project status](https://github.com/openjs-foundation/cross-project-council): jQuery UI is
  listed as Archived.
- [jQuery UI 1.14 upgrade guide](https://jqueryui.com/upgrade-guide/1.14/): removed APIs, browser
  and package changes, and the disabled-by-default legacy compatibility layer.
- [jQuery 4 upgrade guide](https://jquery.com/upgrade-guide/4.0/) and
  [jQuery Migrate README](https://github.com/jquery/jquery-migrate/blob/main/README.md): the staged
  upgrade workflow.

The exact integrity and SHA-1 values are recorded in the machine authority and checked against the
lockfile. jQuery UI is a root development dependency only. Package quality rejects it from runtime
dependencies, package paths, installed consumer trees, and root, core, UI, CSP, testing, Datastar,
Turbo, and htmx graphs.

## The boundary

The complete inventory has 15 widgets, 6 interactions, 34 effect/effect-core entries, 7 methods, 3
selectors, 1 utility, 3 core contracts, and 3 theming entries. Each official API URL maps exactly
once to a detailed row. Third-party Widget Factory extensions are a separate, application-specific
boundary because their contracts are not defined by the official catalog.

Every row uses one of four classes:

| Class                | Meaning                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| Direct semantic      | A native HTML control or relationship already owns the user need.       |
| Changed contract     | jQStar has a counterpart, but markup, API, events, and state are new.   |
| External coexistence | Keep the application-owned UI feature temporarily while redesigning it. |
| No equivalent        | jQStar does not publish the legacy API or behavior.                     |

The migration matrix, not a compatibility facade, is the public contract. The compact destination
map is:

| Legacy area                                                                                                            | Destination                                                                               |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Button, checkboxradio, progressbar, labels, IDs, key codes, form reset                                                 | Native controls and relationships first.                                                  |
| Accordion, autocomplete, buttonset, controlgroup, datepicker, dialog, menu, selectmenu, slider, spinner, tabs, tooltip | A native or jQStar counterpart with different source markup and APIs.                     |
| Resizable and sortable                                                                                                 | Bounded jQStar recipes, not arbitrary-element interaction plugins.                        |
| Draggable and droppable                                                                                                | Temporary external coexistence until the application provides semantic move operations.   |
| Mouse, selectable, effects internals/catalog, Position, scrollParent, `:data`, Widget Factory                          | No compatible public equivalent.                                                          |
| `:focusable`, `:tabbable`, visibility methods, stacking                                                                | Component-owned behavior with a changed contract.                                         |
| ThemeRoller CSS, icons, and structural classes                                                                         | Replace per component with source-owned markup, jQStar variables, and application assets. |
| Third-party widgets                                                                                                    | Inventory, test, and migrate as application code.                                         |

## Before migration

1. Inventory each plugin name, exact version, option, method call, callback, delegated handler,
   jQuery data read, generated ID, theme class, icon, effect, Position call, and third-party
   extension.
2. Record native content, links, forms, names, values, validation, submitters, server requests,
   response behavior, focus return, keyboard commands, touch behavior, responsive layout, history,
   reduced motion, forced colors, and JavaScript-disabled behavior.
3. Upgrade jQuery and jQuery UI in supported stages. Run the matching uncompressed Migrate build in
   development, resolve each warning, remove Migrate, and retest before the next stage.
4. Pin the packages and integrity values. Do not migrate against an unknown CDN alias or a copied
   theme directory.
5. Establish the legacy baseline, including accessibility defects. A migration must not relabel
   inherited defects as new jQStar behavior or silently discard them.

## Coexistence ownership

Give every live element one owner. A legacy island owns its UI instances, generated wrappers,
portals, data keys, delegated events, and explicit `destroy` calls. A jQStar island owns its
`data-jqs` root, `data-part` slots, state attributes, actions, focus lifecycle, and disposal. Do not
initialize both systems on one element or place a legacy plugin root inside a jQStar application
root.

Scope the styles and stacking bands. The fixture uses ordered CSS layers for the official base
theme, jQStar CSS, and application rules. Legacy overlays keep their application-selected append
target and z-index band. Native `<dialog>` uses the top layer. Neither system searches the other
island for a portal, focus trap, or `ui-front` ancestor.

Store references when a legacy widget moves content. A jQuery UI dialog moves its content out of the
source island while open or closed, so a later descendant query is not enough to find the instance.
The application must retain the instance owner and destroy it before replacing the source island.

```js
const $legacyRoot = $("#legacy-project-editor");
const $legacyDialog = $legacyRoot.find("#project-dialog").dialog({ autoOpen: false });

async function replaceLegacyRegion() {
  const incoming = await fetch("/projects/editor").then((response) => response.text());
  $legacyDialog.dialog("destroy");
  $legacyRoot.find("#project-tabs").tabs("destroy");
  $legacyRoot.find("#project-order").sortable("destroy");
  $legacyRoot.replaceWith(incoming);
  initializeLegacyProjectEditor();
}
```

jQStar disposal stays separate:

```js
const $nativeRoot = $("#native-project-editor");
$nativeRoot.star();

async function replaceNativeRegion() {
  const incoming = await fetch("/projects/editor/native").then((response) => response.text());
  $nativeRoot.star("destroy");
  $nativeRoot[0].outerHTML = incoming;
  $("#native-project-editor").star();
}
```

For an external rendering library, use jQStar's public render adapter or its documented host bridge.
Do not call private jQuery UI cleanup, adopt UI data, patch `$.widget`, install a mutation observer
to guess removals, or silently auto-initialize legacy markup.

## Project editor sequence

The browser fixture keeps a legacy editor, a native editor, and a partially migrated composite on
one page. It exercises dialog, tabs, autocomplete/combobox, date input, sortable order, native form
submission, responsive navigation, and server replacement.

Migrate in this order:

1. Add the jQStar runtime and CSS without changing the legacy island. Verify jQuery remains 4.0.0,
   UI remains 1.14.2, UI data stays on legacy nodes, and jQStar instances stay on native roots.
2. Replace the datepicker with a labelled `input[type=date]` when its supported browser behavior is
   sufficient. Keep `name`, value, min/max, validation, and server parsing authoritative.
3. Replace autocomplete with a source-owned combobox. The input stays labelled and the application
   owns remote requests; UI source callbacks and event payloads do not carry forward.
4. Replace tabs with authored tab buttons and panels with stable IDs. Keep navigation as links when
   switching views changes the URL or server resource.
5. Replace sortable with the bounded recipe. Submit order through the form and expose move-up and
   move-down buttons so drag is never the only operation.
6. Replace the generated dialog wrapper with a native `<dialog>` and named jQStar actions. Verify
   initial focus, Tab containment, Escape, close reason, overlay behavior, and focus return.
7. Explicitly destroy the old instances and remove the legacy theme for this island only. Re-run
   direct-load, form, server-patch, keyboard, touch, reduced-motion, forced-color, and no-script
   cases before release.

## Command toolbar

The independent command-toolbar slice tests whether a small adapter would repeat across a second
application. It does not. Its native destination uses real buttons, a labelled toolbar, a menu
button, stable commands, and text or application-owned SVG icons. Tooltips supplement persistent
accessible names and never provide the only label.

Keep command buttons usable before menu enhancement. Use standard Arrow, Home, End, Enter, Space,
and Escape behavior for the selected pattern. Do not preserve jQuery UI menu callback payloads,
Position options, `ui-icon` sprite names, or Widget Plugin Bridge dispatch.

## Forms and server updates

Native controls own form state throughout the migration. Preserve `name`, current and default
values, checked/selected state, constraint validation, encoding, disabled-field exclusion, and the
clicked submitter. Server authorization, CSRF handling, output encoding, and validation do not move
into either UI library.

Replace one named island per response. Destroy the outgoing owner's runtime first, perform the DOM
change, then initialize only the incoming owner. A surviving sibling island must retain instance
identity, focus, user-entered values, event handlers, and data. Separate documents and iframes have
separate jQuery, UI, and jQStar owners.

## Accordion

Author headings, buttons, and content in source HTML. Expanded state belongs to the button and the
content remains readable without enhancement. Do not carry over the accordion option bag, methods,
callback payloads, header discovery, or animation names.

## Autocomplete

Use a labelled input and explicit listbox options. The application owns filtering and server
requests. Never attach jQuery UI autocomplete and jQStar combobox to the same input.

## Button

Keep a native button for commands and a link for navigation. Preserve disabled and form-submitter
semantics. Remove the legacy instance before applying jQStar presentation to the same element.

## Buttonset and controlgroup

Choose a semantic button group, pressed-control group, fieldset, or input group. Author every child
instead of relying on plugin discovery, refresh, option propagation, or generated corner classes.

## Checkboxradio

Keep the native checkbox or radio as the submitted and accessible control. Labels remain explicit.
Do not recreate the themeable-button plugin contract.

## Direct semantic migrations

Prefer native `<progress>`, `<select>`, `input[type=range]`, and `input[type=number]` when they meet
the task. Their values, constraints, keyboard behavior, validation, and submission survive without
JavaScript. jQStar recipes add bounded presentation and actions; they do not emulate UI methods or
events.

## Generic interactions

jQStar has no generic draggable, droppable, selectable, Mouse, or arbitrary-element resizable API.
The existing resizable and sortable recipes are bounded components with explicit handles, keyboard
controls, touch behavior, form/application state, and disposal.

A generic primitive needs at least two independent native jQStar consumers and a standalone
semantic, pointer, keyboard, touch, accessibility, focus, and ownership specification. Current
evidence has only one bounded consumer for resize and one for sort, so ticket 0039 opens no generic
interaction proposal.

## Effects

jQStar does not ship the named effects catalog, color/class animation overloads, easing catalog, or
effects-core utilities. Migrate the semantic state first with `hidden`, native dialog state, or a
documented component state attribute. Optional application CSS or the Web Animations API may animate
presentation. The final state must apply immediately when motion is reduced or animation is
unavailable.

## Core methods selectors and utilities

Use `HTMLElement.labels` and source-owned stable IDs instead of `.labels()`, `.uniqueId()`, and
`.removeUniqueId()`. Use `KeyboardEvent.key` instead of numeric `jQuery.ui.keyCode` constants. Limit
`user-select` changes to active handles instead of collection-wide selection methods.

jQStar publishes no compatible Position, `.scrollParent()`, or `:data` API. Floating components own
their placement, scroll boundary, and focus candidates internally. `:focusable` and `:tabbable`
migrations use native controls and the owning component's documented focus contract, not a global
selector substitute.

## Themes CSS and stacking

ThemeRoller output is not a jQStar theme. Remove `ui-*` structure, state, corner, helper, and icon
classes as each widget migrates. Replace sprite icons with visible text or application-owned SVG
that has a persistent accessible name. Test forced colors and missing images.

Keep legacy CSS scoped until the final legacy widget using it is gone. Audit reset rules, custom
properties, stacking contexts, overlays, menus, tooltips, and hit targets. A visual restyle of
unchanged generated UI markup is not a migration.

## Widget Factory and extensions

jQStar does not implement `$.widget`, `_super`, Widget Factory inheritance, protected hooks, option
bags, jQuery data instances, widget event payloads, or unrestricted string method dispatch. Registry
blocks own application orchestration. Generic behavior belongs in `src/` only when it has an
independent jQStar contract.

Treat every third-party widget as application code. Record its exact package, source, generated
markup, methods, events, theme, accessibility behavior, destroy path, and server coupling. Keep it
isolated, replace it with a maintained alternative, or rewrite the user task directly. An official
widget counterpart does not prove extension compatibility.

## Measurements

The authority records the project editor and command toolbar under the same counting rules. HTML
plus JavaScript counts are physical, nonblank authored lines. Tests, generated files, comments, and
shared runtime code are excluded. JavaScript and CSS bytes are the installed unminified jQuery UI
distribution assets: 522,385 and 35,137 bytes. Dependency counts cover migration-only runtime
packages. Line counts describe maintenance surface; they do not score code quality.

| Slice           | Legacy lines | Direct migration | Adapter sketch |  Adapter saving |
| --------------- | -----------: | ---------------: | -------------: | --------------: |
| Project editor  |          182 |              164 |            151 | 13 lines / 7.9% |
| Command toolbar |           96 |               91 |             84 |  7 lines / 7.7% |

The legacy fixture has four serious/critical axe rule findings across seven nodes:
`aria-required-children`, `aria-required-parent`, `listitem`, and `nested-interactive`. The detailed
slice baseline assigns the tabs finding to the project editor and the menu findings to the toolbar.
Native and partially migrated islands add none. The adapter sketch is not executable, so it receives
no accessibility credit.

## Adapter decision

Decision: no-go. Ticket 0039 ships no adapter.

The frozen scorecard required all nine dimensions to pass. The two slices need different facades;
the line savings miss both the 25% and 20-line thresholds; covering them would exceed two widgets;
and no implementation proves gzip size, exact types, coverage, three-browser behavior, ownership, or
accessibility. A facade would also preserve imperative lifecycle calls that direct migration
removes.

No missing evidence is treated as a pass. Direct semantic migration remains the supported path. A
future adapter proposal needs new observed demand and a separate bounded ticket with exact widgets,
methods, options, and events.

## Rollback and release

Release one migrated island at a time behind an application-owned switch. Keep the prior template,
initialization, theme assets, and server route deployable until production checks pass. Rollback
replaces only that island, disposes the current owner, restores the previous markup, and initializes
the previous owner. Do not run both owners on the rollback target.

Before removing the switch, verify direct URLs, native forms, server responses, history where used,
keyboard and focus, screen-reader output, touch, responsive layout, reduced motion, forced colors,
JavaScript-disabled content, explicit legacy destroy, and repeated replacement. Then remove the old
plugin import, options, callbacks, data access, CSS, images, dependency, and rollback path together.

## Verification

`test/jquery-ui-migration-contract.test.ts` validates the schema, exact matrix digest, lockfile,
installed asset sizes, 72-entry one-to-one mapping, counterpart paths, measurements, no-adapter
calculation, and production-source boundary. The property suite permutes all 72 entries and mutates
missing, duplicate, and unknown assignments.

`e2e/jquery-ui-migration.spec.ts` uses the exact installed packages in Chromium, Firefox, and
WebKit. It also covers mobile touch, reduced motion, forced colors, JavaScript-disabled navigation/
validation/submission, server replacement, explicit destroy, sibling identity, forms, native
counterparts, accessibility baseline, and independent documents. Package quality inspects the
tarball and a clean installed consumer so fixture-only jQuery UI cannot become shipped code.
