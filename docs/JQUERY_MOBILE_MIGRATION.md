# jQuery Mobile migration

Migrate jQuery Mobile applications route by route to ordinary server documents, semantic HTML,
responsive CSS, jQuery 4, and bounded jQStar enhancement. Do not load jQuery Mobile in a modern
jQStar document and do not replace its page framework with another client router by default.

jQStar is an independent project. It is not affiliated with, sponsored by, endorsed by, or an
official successor to the jQuery project or the OpenJS Foundation. This guide attributes useful
jQuery Mobile design lessons while rejecting source, API, theme, widget, event, and runtime
compatibility claims.

The machine authority is
[`quality/jquery-mobile-migration.json`](../quality/jquery-mobile-migration.json). Its closed schema
is [`schema/jquery-mobile-migration.schema.json`](../schema/jquery-mobile-migration.schema.json).

## Status and exact evidence

jQuery Mobile is an archived migration source, not a current runtime dependency. The decision was
reviewed on 4 September 2026 against these primary sources:

- [jQuery Mobile deprecation notice](https://blog.jquerymobile.com/2021/10/07/jquery-maintainers-continue-modernization-initiative-with-deprecation-of-jquery-mobile/):
  the project was fully deprecated in 2021, Mobile 1.4 is incompatible with new jQuery Core, and its
  latest stable release dates to October 2014.
- [OpenJS project status](https://github.com/openjs-foundation/cross-project-council): jQuery Mobile
  is listed under Archived Projects.
- [Official archived repository](https://github.com/jquery-archive/jquery-mobile): the repository is
  read-only, states that the project is no longer maintained, and records the historical jQuery
  range for Mobile 1.4.x.
- [jQuery Mobile 1.4 API](https://api.jquerymobile.com/1.4/category/all/),
  [data attributes](https://api.jquerymobile.com/1.4/data-attribute/), and
  [1.4.5 demos](https://demos.jquerymobile.com/1.4.5/): the sources for the frozen feature,
  attribute, transition, navigation, forms, responsive, theme, and touch inventory.
- [Official transition demo](https://demos.jquerymobile.com/1.4.5/transitions/): the source for the
  ten named historical transitions.
- [jQuery Mobile 1.4 upgrade guide](https://jquerymobile.com/upgrade-guide/1.4/),
  [jQuery 4 upgrade guide](https://jquery.com/upgrade-guide/4.0/), and
  [jQuery Migrate README](https://github.com/jquery/jquery-migrate/blob/main/README.md): the staged
  upgrade sources.

The historical package identity is
[`jquery-mobile@1.4.1`](https://registry.npmjs.org/jquery-mobile/-/jquery-mobile-1.4.1.tgz), SHA-512
`5CIKR+jQ34GMNz8vGpiNIxQ2zfmEXpbCI0hFfyHYi/MDhdkJLpk2lFl2txjPxkAbHSvJLntNJgS//OrA1nBIkg==` and SHA-1
`4c5eaf3d20f99973d1481ed4c9c8921d016fe198`. Those values identify the old release only. The package
is not installed, downloaded in CI, executed, bundled, or included in the lockfile.

The modern reference app uses the existing `jquery@4.0.0` peer and built jQStar UMD asset. Package
quality checks the packed jQStar artifact, clean consumer install, package paths, production source,
and entry graphs for absence of jQuery Mobile.

## Inventory coverage

The authority freezes 95 unique official API entries: 27 widgets, 34 events, 16 methods, 10 path
methods, 4 CSS framework entries, 2 references, 1 icon entry, and 1 property. It separately stores
60 unique `data-*` names across 21 reference sections and all 122 section assignments. Popup opener
and popup element contexts remain distinct where the same attribute name appears twice.

It also records the ten historical transition names and behavior that a single API page does not
own: multipage documents, Ajax link and form interception, page injection and discard, history,
cache, prefetch, loaders, automatic enhancement, global defaults, swatches, third-party plugins, and
downloaded themes.

Every API entry, data attribute, transition, and extra behavior maps to exactly one primary owner:

| Modern owner              | Boundary                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Native HTML               | Documents, links, forms, controls, validation, dialog/details, tables, and file input.     |
| Native CSS                | Responsive layout, media/container queries, coarse-pointer targets, icons, and motion.     |
| jQStar component          | An explicitly adopted semantic component with source-owned markup and a new API.           |
| Application code          | Route-specific filtering, gesture, pending, conflict, and orchestration behavior.          |
| Datastar SDK              | A named partial server update generated only with the official SDK.                        |
| Optional Turbo bridge     | Turbo owns navigation and uses the completed explicit jQStar lifecycle bridge.             |
| Optional htmx bridge      | htmx owns swaps and uses the completed explicit jQStar lifecycle bridge.                   |
| Full document navigation  | The default owner for routes, history, head, focus, scroll, errors, reload, and new tabs.  |
| Intentionally unsupported | Page containers, virtual input aliases, swatches, transitions, auto-init, and plugin APIs. |

The detailed rows in the authority include the legacy need, modern target, markup/API change,
accessibility and no-JavaScript fallback, server/security ownership, unsupported difference,
example, and test ID. Similar words such as “dialog,” “tabs,” or “button” never mean drop-in
compatibility.

## Migration worksheet

Start with observed application behavior, not a global search-and-replace. Fill one row per route or
independently releasable semantic region.

| Field                   | Record                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Route and entry paths   | Direct URL, multipage fragment IDs, inbound links, bookmarks, redirects, and server owner.  |
| Mobile markup           | Every role, data attribute, generated wrapper, cached node, and theme or icon class.        |
| Events and methods      | Page lifecycle, virtual input, orientation/scroll handlers, plugin calls, and global hooks. |
| Forms and writes        | Method, URL, names, submitters, encoding, files, validation, CSRF/auth, redirect, conflict. |
| Navigation behavior     | Interception, history, title/head, focus, scroll, cache, prefetch, loader, error handling.  |
| Responsive behavior     | Breakpoints, tables/lists, panel/nav, pointer targets, orientation, zoom, and text scale.   |
| Extensions and themes   | Exact package/source, methods, events, swatches, downloaded assets, and removal owner.      |
| Baseline evidence       | JavaScript-off path, keyboard, screen reader, touch, network failure, and current defects.  |
| Migration unit/rollback | New owner, server release boundary, feature switch, old template/assets, and rollback test. |

Do not report a percentage from the official inventory alone. One custom signature widget or
write-retry hook can cost more than many standard widgets. Estimate each application row from its
own code, server behavior, accessibility debt, and release boundary.

## Separate the jQuery Core upgrade

Treat the Core/Migrate upgrade and the UI/navigation rewrite as separate changes:

1. Create an isolated upgrade branch on the legacy application's supported stack.
2. Follow the official jQuery Core and Migrate guides one supported version step at a time.
3. Use the matching uncompressed Migrate build in development, capture warnings, fix each owned call
   site or plugin, remove Migrate, and retest before the next step.
4. Do not assume reaching jQuery 4 makes jQuery Mobile compatible. Mobile 1.4's documented range is
   historical and the archived runtime does not belong in the modern route.
5. Keep legacy routes on their compatible pinned stack until their migration unit is ready. Never
   load jQuery Mobile and jQuery 4 in the same modern document.

Doctor output and Migrate warnings can identify declared versions and deprecated Core use. They do
not rewrite roles, page lifecycle handlers, virtual events, custom plugins, themes, or application
JavaScript.

## Establish direct server routes

Turn each screen that users can enter, bookmark, reload, share, or open in a new tab into a normal
server URL. Return a complete document with the right title, heading, navigation, content, status,
and error handling. Replace internal multipage fragments and client route tables with server route
names before adding optional enhancement.

Use ordinary anchors for navigation and GET forms for searches and filters. Let the browser own
reload, back/forward, new tabs, origin policy, head changes, default focus, and scroll restoration.
The server owns redirects and error documents. A full document is the default, not the degraded
mode.

Do not recreate page injection, discard rules, an active-page global, automatic prefetch, or a
shared page cache in jQStar application code. If measured latency later justifies enhanced
navigation, choose one host with an explicit ownership contract.

## Reference routes

The synthetic project tracker proves six public documents:

- `/jquery-mobile-migration/`
- `/jquery-mobile-migration/projects`
- `/jquery-mobile-migration/projects/alpha`
- `/jquery-mobile-migration/projects/alpha/edit`
- `/jquery-mobile-migration/projects/new`
- `/jquery-mobile-migration/help`

Its server also owns the Datastar status endpoint, slow response, error document, and health route.
The list GET search works on the server. JavaScript adds only a removable current-page filter and
does not prevent submission. The detail route uses source-owned jQStar dialog and tabs markup. The
edit and create routes remain native documents and forms.

## Components and source markup

Prefer the native element first:

- Use headings, sections, lists, tables, buttons, links, labels, inputs, selects, ranges, details,
  dialog, and file controls for their actual semantics.
- Use responsive CSS for layout, column changes, coarse-pointer targets, forced colors, icons, and
  reduced motion.
- Adopt a jQStar component only when its documented behavior is needed. The application owns copied
  markup with `data-jqs` roots and `data-part` slots.
- Keep route orchestration in an application-owned registry block or server template. Put behavior
  in `src/` only after it has a reusable, independently reviewed contract.

Do not translate a Mobile role or option bag into a similarly named `data-jqs` value. Author the new
semantic structure and test its native fallback. Collapsibles normally become `details`; responsive
navigation can also use `details`; native dialog plus the jQStar dialog controller owns modal focus;
jQStar tabs are appropriate only for same-document panels, not route navigation.

## Forms and writes

Keep native form semantics through every stage:

- Preserve the form action, method, control names, current/default values, checked/selected state,
  constraint validation, clicked submitter name/value, and submitter `formaction`/`formmethod`.
- Preserve `application/x-www-form-urlencoded`, multipart, and file input behavior. Do not convert a
  file write into JSON.
- The server authenticates, authorizes, checks CSRF, parses with a size limit, validates again,
  escapes output, enforces versions, and returns deliberate 303, 403, 409, 422, or 5xx responses.
- A pending enhancement may disable its own submit control and show status, but it must not alter
  which successful controls submit or hide server errors.
- Never replay an indeterminate write automatically after disconnect or reconnect. Ask the user to
  verify the outcome before submitting again.

The fixture's edit form exercises browser validation, a preview submitter override, server conflict,
and post/redirect/get success. Its create form submits a required text file as native multipart
data. Both work with JavaScript disabled.

## Pointer input and responsive layout

Replace `vclick` and virtual mouse aliases with native `click`, pointer events, or input events only
where the user task requires them. Do not synthesize a click after a touch event.

For a bounded gesture:

1. Keep a labelled native button or link for keyboard and assistive-technology use.
2. Track one pointer ID from `pointerdown`; use pointer capture when available.
3. Let vertical movement cancel the gesture so page scrolling wins.
4. Handle `pointercancel`, release retained state, and produce at most one activation.
5. Use `touch-action` only on the bounded surface and keep coarse-pointer targets at least 44 CSS
   pixels in the fixture.

Use responsive layout instead of orientation events when CSS can express the change. Verify portrait
and landscape, fine and coarse pointers, 200% text, 200–400% effective zoom/reflow, reduced motion,
forced colors, keyboard focus, and screen-reader semantics.

## Lists tables themes and icons

Server-render the complete list and table semantics. Use application code for a removable local
filter only when the normal GET form remains available. Put a wide table in a labelled scroll region
or choose a source-owned responsive presentation. Do not revive automatic list enhancement,
generated dividers, count bubbles, or split-button markup as a generic runtime.

Replace swatches and downloaded themes per route. Map colors to semantic application tokens, not
lettered theme names. Replace sprite icons with text or application-owned SVG that has a stable
accessible name. Keep borders and focus visible in forced colors. Decorative transitions are not
part of the migration contract; state changes complete immediately when motion is reduced or CSS is
unavailable.

## Server updates and navigation choices

The reference detail page has one enhanced status button. jQStar sends the request; the server
returns a named element patch produced by `ServerSentEventGenerator` from
`@starfederation/datastar-sdk`. No handwritten SSE fields are allowed. Removing the button's request
attribute leaves the detail document and edit link intact.

Normal document navigation is the default. Datastar owns only the named partial update. Turbo and
htmx are optional alternatives when an application has measured need and accepts that host's
request, DOM mutation, history, focus, scroll, redirect, error, and form rules. Use jQStar's
completed explicit lifecycle bridge for that one host. Do not combine the hosts or wrap them in a
generic Mobile-style Ajax navigation abstraction.

Native jQStar navigation is not an approved option while ticket 0023 remains planned.

## Application-specific extensions

Inventory each third-party or private Mobile plugin separately. Record its source, version,
generated DOM, retained data, events, pointer model, accessibility behavior, server coupling, theme
assets, and cleanup path. The official 95-entry map cannot prove compatibility for an extension.

The project-tracker worksheet has six route/region units and three high-risk items: a custom swipe
action, workflow state encoded as a swatch, and a page lifecycle refresh handler. The field-service
worksheet has seven units and four high-risk items: a signature widget, virtual-input drawing,
cached multipage content, and automatic write replay. These are sizing examples, not universal
conversion estimates.

## Incremental release and rollback

Use route boundaries so legacy and modern documents never share incompatible runtimes:

1. Inventory one route and freeze its behavioral/server/accessibility baseline.
2. Establish its direct modern URL and native links/forms.
3. Complete the isolated Core/Migrate work needed by surrounding legacy code.
4. Replace the route's swatches and grid with semantic, responsive CSS.
5. Migrate one widget or semantic region to native HTML or source-owned jQStar markup.
6. Keep full documents, or choose one approved bridge only after measuring a concrete need.
7. Remove the old initializer, roles, lifecycle handlers, assets, theme, and dependency for that
   route. Run its tests and release.
8. Repeat for the next route.

Keep the prior route template, server handler, pinned legacy assets, and feature switch deployable
until the modern route passes production checks. Rollback switches the whole route to the old
compatible stack. It does not insert legacy assets into the modern document. Do not automatically
retry an uncertain write during rollback.

Before removing the switch, verify direct load, reload, bookmarks, new tabs, back/forward,
head/title, focus, scroll, links, GET and write forms, files, redirects, conflicts, errors, offline
messaging, keyboard, screen reader, touch, zoom, responsive layout, reduced motion, forced colors,
and JavaScript-disabled use.

## Measurements and unsupported behavior

The reference app records physical authored lines and uncompressed served asset bytes. Counts are
maintenance evidence, not a code-quality score.

| Measurement             |         Value |
| ----------------------- | ------------: |
| Server fixture          |     483 lines |
| Application enhancement |     103 lines |
| Responsive styles       |     214 lines |
| Browser specification   |     274 lines |
| jQuery asset            | 255,967 bytes |
| jQStar UMD asset        | 464,183 bytes |
| Application asset       |   3,680 bytes |
| Style asset             |   3,393 bytes |
| Modern runtime packages |             2 |
| Historical runtimes     |             0 |
| Server routes           |            10 |
| Browser executions      |            16 |

The migration intentionally does not support the jQuery Mobile runtime or CSS, pagecontainer/Ajax
route abstraction, virtual mouse aliases, theme swatches, transition catalog, automatic role
enhancement, third-party plugin compatibility, or automatic replay of indeterminate writes. A team
that still needs one of those contracts must keep its legacy route isolated or design a new
application-specific replacement. jQStar ships no compatibility layer.

## Verification

`test/jquery-mobile-migration-contract.test.ts` validates the schema, ecosystem digest, package
identities, all 95 API entries, 60 attributes and 122 contexts, ten transitions, owner assignments,
bridge outcomes, application worksheets, exact measurements, runtime absence, and package-quality
checks. The property suite permutes assignments and rejects missing, duplicate, and unknown values.

`e2e/jquery-mobile-migration.spec.ts` runs four shared scenarios in Chromium, Firefox, and WebKit,
plus mobile/zoom, reduced-motion, forced-colors, and JavaScript-disabled scenarios. It covers direct
documents, search, dialog/tabs, official-SDK patching, forms/files/conflicts/redirects, history,
focus, scroll, pointer cancellation and single activation, touch targets, orientation, text scale,
slow/error/offline behavior, and axe. Package quality proves the archived runtime never reaches the
tarball, clean consumer, or entry graphs.
