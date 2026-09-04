# jQuery ecosystem policy

This policy records how jQStar relates to jQuery Core, jQuery Migrate, jQuery UI, jQuery Mobile,
Sizzle, and QUnit. It was reviewed against primary project sources on 2026-09-03. The machine
contract is [`quality/jquery-ecosystem.json`](../quality/jquery-ecosystem.json).

jQStar is an independent HTML-first UI and application library for jQuery. It is not affiliated
with, sponsored by, endorsed by, or an official successor to the jQuery project or the OpenJS
Foundation.

## Current decisions

| Project        | Reviewed release   | Official status  | jQStar decision                                                                  |
| -------------- | ------------------ | ---------------- | -------------------------------------------------------------------------------- |
| jQuery Core    | 4.0.0              | OpenJS Impact    | Integrate as the real application-owned peer and foundation.                     |
| jQuery Migrate | 4.0.2              | jQuery companion | Use only as an application-owner, opt-in, temporary upgrade aid.                 |
| jQuery UI      | 1.14.2             | OpenJS Archived  | Support measured coexistence and migration, never use it as jQStar's foundation. |
| jQuery Mobile  | 1.4.1 last stable  | OpenJS Archived  | Preserve useful design lessons in a no-runtime, route-by-route migration.        |
| Sizzle         | 2.3.10 last stable | OpenJS Archived  | Ignore as a separate package. Use selector behavior from the real jQuery peer.   |
| QUnit          | 2.26.0             | OpenJS At-Large  | Support as an exact installed testing consumer, not a runtime dependency.        |

OpenJS lists
[jQuery as Impact, QUnit as At-Large, and UI, Mobile, and Sizzle as Archived](https://github.com/openjs-foundation/cross-project-council).
A recent maintenance release does not change an OpenJS status by itself.

## jQuery Core is the foundation

`jquery` is the sole package peer, with the tested range `>=4.0.0 <5` and exact current test version
4.0.0. The application owns that instance. jQStar does not vendor, fork, wrap, or replace it.

The expression boundary remains exact: `$ is real jQuery` and `$name` is the reactive signal named
`name`. Selector behavior, `$.fn`, events, Ajax, effects, and installed jQuery plugins remain the
peer's contracts.

The [jQuery 4.0.0 release](https://blog.jquery.com/2026/01/17/jquery-4-0-0/) and current
[support policy](https://jquery.com/support/) are reviewed separately from jQStar's peer range. A
new jQuery stable release must pass installed compatibility tests before this matrix presents it as
tested.

## jQuery Migrate is temporary application tooling

Follow the official [jQuery 4 upgrade guide](https://jquery.com/upgrade-guide/4.0/). Do not jump
across several major versions with one Migrate build:

1. For old 1.x or 2.x applications, first reach the latest release in that line with Migrate 1.x,
   resolve the reported warnings, remove Migrate, and retest.
2. Upgrade to the latest jQuery 3.x with Migrate 3.x, resolve warnings, remove Migrate, and retest.
3. Upgrade to jQuery 4.x with Migrate 4.x, resolve warnings, remove Migrate, and retest.

Use the uncompressed Migrate build during representative browser testing so its warnings remain
visible. A warning is evidence to investigate, not permission for an automatic rewrite. jQStar never
bundles, injects, loads, suppresses, or interprets Migrate warnings. Ticket 0032 may read only
declared dependency metadata or a bounded schema-valid summary that the application owner supplies.

## QUnit is a supported consumer

Package quality installs QUnit 2.26.0 beside the packed `jquery-star` tarball. Three QUnit cases run
the root extension surface, `jquery-star/testing` conformance, and the CSP entry. The testing entry
contains no QUnit import or runner branch, and its installed bundle graph rejects QUnit.

This consumer proof does not replace the repository's Vitest unit suites, recorded property tests,
static analysis, or Playwright browser matrix. QUnit remains a development-only consumer owned by
ticket 0014.

## jQuery UI is a migration source

[jQuery UI 1.14.2](https://blog.jqueryui.com/2026/01/jquery-ui-1-14-2-released/) supports jQuery
4.0.0 and receives compatibility, security, and important-regression maintenance. Its project blog
also says no significant new feature work is planned. OpenJS still lists it as Archived.

jQStar's native components are the new-code path. Similar names do not imply source, API, styling,
or instance compatibility. The [jQuery UI migration guide](JQUERY_UI_MIGRATION.md) publishes the
exact installed coexistence fixture, representative migration, full API map, and evidence-scored
no-adapter decision.

The policy-level capability map covers every official widget and interaction plus the contracts that
catalog comparisons often hide:

| Legacy area                                                                           | jQStar boundary                                                                                 |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Accordion, inputs, date picker, dialog, menu, progress, select, slider, tabs, tooltip | Native semantic registry counterparts exist, with different markup, actions, events, and state. |
| Resizable and sortable                                                                | Bounded source-owned recipes exist. They are not generic arbitrary-element interaction APIs.    |
| Draggable, droppable, selectable, Mouse                                               | No generic equivalent. Component-specific pointer behavior does not create one.                 |
| Widget Factory and Widget Plugin Bridge                                               | No compatible inheritance, instance, option, method-dispatch, data-key, or extension contract.  |
| Position                                                                              | Components share internal placement, but no public Position-compatible utility ships.           |
| Effects and easings                                                                   | No effects catalog or overloaded jQuery animation API ships.                                    |
| ThemeRoller and UI classes                                                            | jQStar uses its own CSS variables and source-owned semantic markup.                             |
| Third-party Widget Factory extensions                                                 | Application-owned coexistence only. Compatibility is assessed per application.                  |

The policy-level 28-entry capability list and official links remain in the ecosystem matrix. The
downstream migration authority expands the official 1.14 catalog to 72 unique API URLs, each mapped
exactly once to a detailed migration row. A counterpart means the same user need has a migration
destination. It never means drop-in Widget Factory compatibility.

## jQuery Mobile contributes lessons, not runtime

The [official archived repository](https://github.com/jquery-archive/jquery-mobile) is read-only,
states that jQuery Mobile is no longer maintained, and documents an old 1.4.x jQuery range. jQStar
does not load, wrap, fork, emulate, or recommend new use of that runtime.

Ticket 0040 preserves these needs in a modern reference application:

- semantic content before enhancement
- direct server URLs and ordinary document navigation
- native links, form submission, validation, and no-JavaScript fallback
- responsive layouts, touch targets, keyboard use, screen readers, and reduced motion
- progressive enhancement and graceful degradation

The Mobile router, page container, virtual mouse, transition catalog, themes, widgets, and data-role
auto-initializer do not enter jQStar. Migration keeps legacy and modern routes isolated until each
route is released on its compatible stack.

## Sizzle stays separate

OpenJS lists standalone Sizzle as Archived. jQStar imports no `sizzle` package, exposes no selector
engine swap, and claims no Sizzle API or extension compatibility. `@types/jquery` currently brings
`@types/sizzle` into the development lockfile as a transitive declaration package. That does not add
Sizzle runtime code or change selector ownership.

## Naming, marks, and attribution

The names are fixed:

- product: jQStar
- npm package: `jquery-star`
- CLI and repository shorthand: `jqstar`
- markup prefix: `data-jqs`
- intended site: `jqstar.com`
- legacy local checkout name: `jqdatastar`

The [OpenJS trademark policy](https://trademark-policy.openjsf.org/) permits factual references but
does not grant trademark rights through an open-source license or allow an endorsement implication.
jQuery and related project names are trademarks of the OpenJS Foundation or their respective owners
and are used here only for factual compatibility and migration statements.

Package metadata, README and website copy, social images, repository metadata, examples, migration
guides, and release wording must not call jQStar “jQuery UI 2,” “the new jQuery UI,” an official
successor, or an OpenJS/jQuery-sponsored or endorsed project. jQStar does not copy official logos or
site trade dress.

An official stewardship or successor proposal requires all of the following before any public claim
or contact: shipped migration evidence, sustained independent adoption, upstream participation, a
concrete governance/security/maintenance/funding plan, community consultation, and explicit written
agreement from the jQuery project and OpenJS Foundation.

## Review and change process

The current evidence expires on 2027-03-03. Review earlier before a stable jQStar major release, or
when a project status, stable release, support statement, or OpenJS trademark policy changes. The
expiry test fails closed rather than leaving an undated active/archived claim in release evidence.

Changes require a ticket that rechecks primary sources, updates the matrix and downstream digest,
and reruns static, package, and delivery gates. Historical ticket evidence remains dated.
