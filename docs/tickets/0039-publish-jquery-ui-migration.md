---
id: 0039
title: Publish the jQuery UI coexistence and migration path
status: done
created: 2026-08-30
updated: 2026-09-04
---

# 0039: Publish the jQuery UI coexistence and migration path

## Plan

### Problem

jQStar's component catalog is broader than jQuery UI's widget catalog, but the libraries use
different contracts. jQuery UI applications expect imperative plugins, Widget Factory options and
method dispatch, jQuery data instances, callback events, destroy, interaction primitives,
ThemeRoller classes, Position, and effects. jQStar uses semantic source-owned HTML, data-jqs roots,
data-part slots, documented state attributes, registry actions, public UI services, and safe
re-enhancement after server patches.

Calling jQStar a drop-in replacement would turn catalog similarity into a false API promise.
Ignoring existing jQuery UI users would undermine the goal of modernizing jQuery incrementally. The
right product is a measured coexistence and markup-first migration path, while new work uses
jQStar's native component system and the package never forks or embeds jQuery UI.

### Current evidence

- Ticket 0038 records the 2026-09-01 ecosystem decision: jQuery UI 1.14.2 supports jQuery 4.0.0 and
  receives compatibility/security/important-regression maintenance, while OpenJS lists the project
  Archived. jQStar treats it as an external coexistence/migration source, not an implementation
  base.
- The official jQuery UI demos/API cover interactions, widgets, effects, Position, and Widget
  Factory semantics. Third-party Widget Factory extensions can add behavior outside that catalog.
- jQStar has native counterparts for the widget catalog plus newer application patterns. It does not
  currently promise Widget Factory, ThemeRoller, effects, generic draggable/droppable/selectable/
  arbitrary resizable, Position API, imperative plugin signatures, or third-party extension support.
- Tickets 0013 and 0014 provide modular installed-package and external-plugin/DOM-replacement
  conformance. Tickets 0005/0006 define exact ownership and disposal.
- No installed same-page coexistence matrix, complete machine feature map, representative migration
  measurement, or adapter decision evidence currently exists.

### Activation gate

Ticket 0038 supplies mapping `jquery-ecosystem.ui.coexistence-migration` in
`quality/jquery-ecosystem.json` at SHA-256
`2b6550a824aa495c58f21948260a6ab504e9da355072aca8cd8999a06f8cb718`. Activation must consume that
exact matrix or refresh its primary sources and every downstream digest first.

Before Code, recheck official jQuery UI release/maintenance/API/catalog and jQuery peer facts, pin
the exact jQuery/jQuery UI packages and checksums used by the fixture, and import ticket 0038's
naming/non-fork policy. Freeze a complete catalog/API inventory and define the adapter scorecard in
advance: observed applications/demand, migration lines saved, semantic/accessibility preservation,
API surface, bundle size, ownership complexity, maintenance/security burden, deprecation path, and
native jQStar distortion. Plan-validate before building a fixture; no result may retroactively
change thresholds.

### Activation evidence

- `quality/jquery-ecosystem.json` still has the required SHA-256
  `2b6550a824aa495c58f21948260a6ab504e9da355072aca8cd8999a06f8cb718`. Its
  `jquery-ecosystem.ui.coexistence-migration` assignment requires exact-package coexistence,
  complete gap mapping, and absence of jQuery UI from shipped jQStar code and bundles.
- The official
  [jQuery UI 1.14.2 release](https://blog.jqueryui.com/2026/01/jquery-ui-1-14-2-released/) remains
  current. It was tested with jQuery 4.0.0 and restates maintenance for compatibility, security, and
  important regressions without significant new feature work. OpenJS still lists
  [jQuery UI as archived](https://github.com/openjs-foundation/cross-project-council#archived-projects).
- The official [jQuery UI API](https://api.jqueryui.com/) identifies the current documentation as
  1.14 and reports support for current jQuery 1.x through 4.x releases. The official
  [jQuery 4.0 release](https://blog.jquery.com/2026/01/17/jquery-4-0-0/) and
  [support policy](https://jquery.com/support/) identify 4.x as current. jQStar's required peer and
  fixture remain exact jQuery 4.0.0.
- The official [jQuery UI 1.14 upgrade guide](https://jqueryui.com/upgrade-guide/1.14/) records the
  disabled-by-default 1.11 compatibility layer, removed APIs, supported-browser reduction, and
  package-layout changes. The [jQuery 4 upgrade guide](https://jquery.com/upgrade-guide/4.0/) and
  [jQuery Migrate README](https://github.com/jquery/jquery-migrate/blob/main/README.md) define the
  staged upgrade and Migrate 4.x development-warning workflow used by the public guide.
- The exact fixture packages are `jquery@4.0.0` with SHA-512
  `TXCHVR3Lb6TZdtw1l3RTLf8RBWVGexdxL6AC8/e0xZKEpBflBsjh9/8LXw+dkNFuOyW9B7iB3O1sP7hS0Kiacg==` and
  SHA-1 `95c33ac29005ff72ec444c5ba1cf457e61404fbb`, plus `jquery-ui@1.14.2` with SHA-512
  `1gSl7PUjyipa2adSr780Ujk16faicrV7PjPPzPtvWk7tTqBnsqp67NNV9jZK2+BIxUPXWSnIUU/LBCgwgGZE+Q==` and
  SHA-1 `515288b5c730b720acca6e53a0366827ad834053`. The latter tarball contains `dist/jquery-ui.js`,
  the official base theme CSS, and its image assets, so no stale `jquery-ui-dist` package or
  third-party theme package is used.
- Ticket 0038's naming record remains authoritative: jQStar is independent, may describe factual
  coexistence and migration, and may not claim jQuery UI identity, sponsorship, succession, or
  drop-in compatibility.

### Frozen official API inventory

The 2026-09-04 crawl of the ten official 1.14 category pages contains 72 unique URLs. The migration
contract must store all 72 entries with their official categories and map each URL exactly once to
one detailed migration row. Category overlap does not create duplicate rows.

- Widgets (15): Accordion, Autocomplete, Button, Buttonset, Checkboxradio, Controlgroup, Datepicker,
  Dialog, Menu, Progressbar, Selectmenu, Slider, Spinner, Tabs, and Tooltip.
- Interactions (6): Draggable, Droppable, Mouse, Resizable, Selectable, and Sortable.
- Effects and effects core (34): `.addClass()`, Blind, Bounce, Clip, Color Animation, `.cssClip()`,
  Drop, Easings, `.effect()`, Explode, Fade, Fold, `.hide()`, Highlight,
  `jQuery.effects.clipToBox()`, `createPlaceholder()`, `define()`, `removePlaceholder()`,
  `restoreStyle()`, `saveStyle()`, `scaledDimensions()`, Puff, Pulsate, `.removeClass()`, Scale,
  Shake, `.show()`, Size, Slide, `.switchClass()`, `.toggle()`, `.toggleClass()`, `.transfer()`, and
  Transfer.
- Core, method, selector, and utility contracts not already counted above (14): `.labels()`,
  `.position()`, `.disableSelection()`, `.enableSelection()`, `.removeUniqueId()`,
  `.scrollParent()`, `.uniqueId()`, `:data`, `:focusable`, `:tabbable`, `jQuery.ui.keyCode`, Form
  Reset Mixin, Widget Factory, and Widget Plugin Bridge.
- Theming (3): CSS Framework, Icons, and Stacking Elements. ThemeRoller is the official theme
  authoring surface and maps to the same theme-contract row.
- Third-party Widget Factory extensions are the one named external extension boundary. They remain
  application-specific and cannot inherit compatibility from an official widget mapping.

The data contract may group entries only when the migration class, counterpart, API/markup change,
accessibility and fallback rule, coexistence rule, known gap, example, and test ID are identical.
The 28-row ticket-0038 capability map is an input, not proof of complete 72-entry coverage.

### Frozen adapter scorecard

An adapter receives a go only if every threshold passes. Any missing evidence is a no-go.

| Dimension                   | Required threshold                                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Independent demand          | The same facade is required by at least two independent application slices, each with two repeated state-changing operations.                                         |
| Migration code              | Per slice, migration-only authored HTML plus JavaScript drops by at least 25% and 20 physical lines versus direct semantic migration; tests/generated files excluded. |
| Semantics and accessibility | No baseline behavior is lost, no serious/critical axe finding is added, and keyboard, focus, form, touch, forced-color, reduced-motion, and no-JavaScript cases pass. |
| Public surface              | At most two widgets, three methods per widget, four options per widget, and four events per widget; no Widget Factory inheritance or unrestricted string dispatch.    |
| Shipped size                | At most 5 KiB minified/2 KiB gzip JavaScript and 1 KiB minified CSS, with no jQuery UI runtime, theme, or source in the graph.                                        |
| Ownership                   | One application-owned install/dispose boundary per root; no global patch, jQuery UI data adoption, observer cleanup, auto-init, or second component state model.      |
| Maintenance and security    | Exact types, 100% changed-line coverage, three-browser/package gates, one named owner, and no new runtime dependency or vendored code.                                |
| Deprecation                 | Experimental and removable before 1.0, or a documented deprecation of at least one minor release after 1.0; direct native migration remains available.                |
| Native jQStar distortion    | Native component markup, methods, events, state attributes, CSS, and accessibility behavior remain unchanged.                                                         |

The comparison uses two slices: the representative project editor required by this ticket and an
independent command-toolbar slice. The score records raw counts and the pass/fail calculation. A go
opens a new bounded ticket and names the exact facade. Ticket 0039 ships no adapter code.

### Scope

- Publish a versioned migration matrix that covers every official interaction, widget, utility/
  Position, effect category, Widget Factory contract, ThemeRoller/theme class contract, and named
  extension point. Each row records exact legacy semantics, jQStar counterpart if any, migration
  class, markup/API changes, accessibility/native fallback, coexistence status, known gaps, example,
  and test ID.
- Use four honest migration classes: direct semantic migration, counterpart with changed markup/API,
  supported external coexistence during migration, and no current equivalent. Catalog counterparts
  never imply Widget Factory method/option/event/data/theme/plugin compatibility.
- Build an isolated installed-package coexistence application with pinned jQuery 4, jQuery UI 1.14.2
  plus its official theme assets, and the exact jQStar tarball. jQuery UI remains a fixture-only
  dependency and must be absent from jQStar production dependencies, package contents, source,
  generated site assets, root/core/UI graphs, licenses, and consumer installs.
- Place legacy jQuery UI regions, native jQStar regions, and a partially migrated composite on the
  same page. Exercise namespace/data keys, delegated/document events, CSS layers/classes/custom
  properties, focus traps/return, keyboard shortcuts, overlays/portals/z-index, ARIA/IDs, form
  names/ values, selection/drag pointer capture, positioning, destruction, and multiple
  documents/kernels.
- Prove ownership under server DOM changes: outgoing jQStar roots dispose only through jQStar;
  surviving legacy UI instances remain owned by their application; removed legacy regions use the
  application's explicit UI destroy path. jQStar never calls private UI cleanup, adopts jQuery UI
  data, patches Widget Factory, or silently initializes legacy markup.
- Build one representative server-rendered application slice with at least a legacy dialog, tabs,
  autocomplete/date-like control, sortable/interaction, form validation/submission, server update,
  and responsive navigation where the inventory supports them. Establish legacy behavior as a
  bounded test fixture, then migrate one feature at a time to semantic native HTML plus jQStar.
- Preserve direct URLs/forms/content without JavaScript, native validation and submitter semantics,
  keyboard/screen-reader/focus behavior, user-entered values, server requests/responses, responsive/
  touch behavior, reduced motion, forced colors, and browser history where present. Do not call CSS
  restyling of unchanged legacy markup a migration.
- Record per-step measurements: legacy/jQStar/adapter JavaScript and CSS bytes, dependency count,
  application source/markup/style lines added/removed/changed, imperative initialization/destruction
  removed, accessibility defects, server changes, test changes, and unsupported behavior. Explain
  limitations of line counts instead of treating them as quality alone.
- Publish a practical incremental guide: inventory plugins/extensions/themes, upgrade jQuery/UI with
  official Migrate guidance, isolate ownership/CSS, add jQStar beside UI, migrate one semantic
  region, verify/release it, explicitly destroy/remove old UI, and repeat. Include rollback and
  unsupported third-party extension handling.
- Make an evidence-scored no-adapter/thin-adapter decision. Default is no adapter. A go requires
  repeated measured need across at least two independent application slices, materially less
  migration code than direct markup migration, preserved semantics/accessibility, and a frozen small
  list of widgets/methods/options/events with acceptable graph/size/maintenance cost.
- A go creates a new conditional implementation ticket. It cannot ship code in 0039, claim general
  Widget Factory compatibility, implement its extension model, own a second component state model,
  expose broad string method dispatch, or become required for native jQStar components. A no-go
  records native migration/coexistence as the supported path.
- Route reusable generic interaction needs to separate decision tickets only when at least two
  native jQStar components/application consumers require the primitive and native pointer/keyboard/
  accessibility semantics are specified independently of jQuery UI API.

### Out of scope

- Depending on, vendoring, forking, republishing, or branding jQStar as jQuery UI; implementing full
  Widget Factory, ThemeRoller, effects, Position, interactions, or arbitrary third-party plugins.
- Adding a compatibility adapter or generic interaction primitive in this ticket.
- Supporting untested jQuery UI versions/extensions or promising source/API/theme drop-in migration.
- Styling existing jQuery UI DOM with jQStar CSS and calling it migrated.

### Dependencies

- Tickets 0013, 0014, and 0038.

### Acceptance criteria

- [x] [AC-01] Activation pins current primary sources, exact jQuery/UI fixture packages/checksums,
      ticket-0038 non-fork/naming policy, complete catalog/API inventory, and adapter scorecard/
      thresholds fixed in advance; Plan validation passes before fixture or migration code.
- [x] [AC-02] A schema-valid migration matrix covers every official interaction, widget, Position/
      utility, effect group, Widget Factory behavior, ThemeRoller contract, and extension point with
      one exact class, counterpart/gap, markup/API/accessibility/fallback notes, example, and test
      ID.
- [x] [AC-03] The exact installed fixture runs pinned jQuery 4, jQuery UI 1.14.2/theme, and jQStar
      in Chromium, Firefox, and WebKit without
      namespace/data/event/CSS/focus/keyboard/overlay/z-index/
      ARIA/form/pointer/positioning/lifecycle/disposal collision.
- [x] [AC-04] jQuery UI is fixture-only. Production dependency/lock classification, package
      contents, source/site asset, license, consumer install, and root/core/UI/optional graph scans
      prove no UI JavaScript/CSS/theme/source/runtime entered jQStar.
- [x] [AC-05] Repeated jQStar enhancement/disposal and server DOM patches do not duplicate jQStar
      behavior, mutate surviving UI instances, adopt UI data, patch Widget Factory, auto-initialize
      legacy markup, or skip the application's explicit destroy path for removed UI regions.
- [x] [AC-06] The representative legacy slice and each incremental migration step preserve native
      content/forms, validation/submitter/values, server interaction, keyboard/screen-reader/focus,
      responsive/touch, reduced-motion/forced-color, direct-load/history, and JavaScript-disabled
      behavior, with unsupported differences explicit.
- [x] [AC-07] Per-step measurements record exact package/bundle/CSS/dependency/source/markup/style/
      initialization/destruction/test/accessibility/server deltas and limitations, allowing direct
      native migration, coexistence, and any adapter hypothesis to be compared on the same fixture.
- [x] [AC-08] Public guidance says jQStar native semantic components are recommended for new work,
      catalog counterpart is not Widget Factory/API/theme/effect/extension compatibility, and
      coexistence is a temporary feature-by-feature migration tool rather than architecture.
- [x] [AC-09] The incremental guide covers inventory, supported jQuery/UI/Migrate upgrade, CSS/data/
      event ownership, parallel install, one-region migration, test/release/rollback, explicit
      legacy destruction/removal, and application-specific third-party plugin handling.
- [x] [AC-10] The adapter decision applies frozen thresholds and records demand, two application
      slices, code/bundle/accessibility/ownership/maintenance/deprecation costs, and go/no-go. Go
      creates a separate bounded ticket with exact widgets/methods/options/events; no adapter code
      or broad compatibility promise ships here.
- [x] [AC-11] Every generic interaction proposal names at least two native jQStar consumers,
      specifies standalone semantic/pointer/keyboard/touch/accessibility/ownership needs, and
      receives a separate decision ticket rather than copying jQuery UI API by default.
- [x] [AC-12] Website/README/package/migration wording makes no official-successor/drop-in claim,
      attributes jQuery UI appropriately, and uses the independent jQStar naming record.
- [x] [AC-13] Exact-tarball package/API/type/graph/size, unit/property, three-browser,
      accessibility/ no-JavaScript, coexistence/migration, forbidden-runtime, npm run check, ticket
      phase validation, and git diff --check pass without mutation testing.

### Design

The fixture has three adjacent ownership islands: unchanged jQuery UI, native jQStar, and a
composite being migrated. A server route can replace each island independently. Public counters,
data contracts, focus/DOM fingerprints, and explicit legacy destroy spies prove ownership without
teaching jQStar jQuery UI internals.

The migration matrix is the product, not a compatibility facade. It maps a user need to native HTML,
jQStar, application code, continued temporary UI use, or no equivalent and provides a tested example
for each category. The representative slice validates the sequence and measures real costs.

`quality/jquery-ui-migration.json` is the machine authority. It stores primary-source and package
identity, all 72 official API entries, exact entry-to-matrix mapping, four migration classes, two
application-slice baselines, per-step measurements, the frozen scorecard, generic-interaction
dispositions, and the final adapter decision. Its schema rejects missing inventory entries, unmapped
rows, incomplete measurements, or an unfounded go result.

The browser fixture loads the exact package's `dist/jquery-ui.js` and base theme beside the
installed jQStar tarball. Project-editor and command-toolbar roots are separate ownership islands.
Server responses replace one named island at a time, and the application explicitly calls jQuery UI
`destroy` before removing a legacy island. Public counters and DOM/data/focus fingerprints verify
that neither library adopts the other's roots.

Adapter scoring happens after direct migration evidence. Any approved adapter translates a frozen
small facade at the application boundary; it cannot become a second component model or silently
expand jQStar's stable API.

### Decisions

- Do not fork or build on jQuery UI. jQStar native components remain primary.
- Support existing UI users through exact coexistence and incremental semantic migration.
- Catalog coverage is not Widget Factory/API/theme/effect/plugin compatibility.
- Default adapter disposition is no; measured repeated application value must overcome the burden.
- Generic interactions are independent product primitives only after native jQStar demand.

### Security and accessibility

- jQuery UI fixture code is pinned, isolated, test-only, and never copied into the distributed
  artifact. Existing application owners remain responsible for its maintenance/security exposure
  during migration.
- The migration preserves native server validation, CSRF/auth/output handling, form encodings,
  focus, keyboard/screen-reader, touch targets, reduced motion, forced colors, and no-JavaScript
  behavior.
- Test reports and screenshots use synthetic data and omit credentials, request bodies, user values,
  and private application content.

### Risks

- Visual similarity can hide API incompatibility. Assert data/event/method/ownership contracts and
  publish the matrix beside component screenshots.
- Same-page success can overstate third-party extension support. Pin official packages and label all
  other extensions application-specific.
- CSS and overlay collisions are stateful. Exercise resets/themes/dialog stacks/menus/tooltips/
  pointer interactions and computed hit targets, not screenshots alone.
- Adapter demand can be manufactured by the chosen fixture. Require a second independent slice and
  frozen thresholds.
- Line-count reductions can reward opaque code. Report accessibility, ownership, dependencies,
  tests, and maintenance alongside source deltas.

### Verification plan

- Validate the inventory and scorecard, then build exact installed package fixtures with pinned
  jQuery/UI and isolated asset checks.
- Run same-page ownership, CSS/data/event/focus/overlay/pointer/lifecycle/server-replacement and
  disposal cases in Chromium/Firefox/WebKit and accessibility modes.
- Establish the representative legacy contract, migrate feature by feature, record measurements and
  regressions, and apply the frozen adapter rubric.
- Schema/link/source/claim/forbidden-runtime validate the matrix and guide; inspect exact tarball
  and all entry graphs.
- Run focused/fast/coverage/property/static/browser/package/release/check/ticket/diff gates without
  mutation testing.

### Planned files

- `schema/jquery-ui-migration.schema.json` and `quality/jquery-ui-migration.json`: versioned source,
  package, 72-entry inventory, matrix, measurement, interaction, scorecard, and decision authority.
- `package.json` and `package-lock.json`: exact fixture-only `jquery-ui@1.14.2` package and
  integrity.
- `test/jquery-ui-migration-contract.test.ts` and
  `test/property/jquery-ui-migration.property.test.ts`: schema, total mapping, score calculation,
  forbidden-runtime, claim, measurement, and generated inventory/migration-class proof.
- `e2e/fixtures/jquery-ui-migration-server.mjs`, `e2e/fixtures/jquery-ui-migration/`, and
  `e2e/jquery-ui-migration.spec.ts`: installed same-page project-editor/command-toolbar baselines,
  stepwise migration, server replacement, ownership, accessibility, and three-browser proof.
- `scripts/quality-package.mjs`, package report schema/tests, public baseline, and quality
  scope/budget configuration as required to prove fixture-only isolation and measured asset limits.
- `docs/JQUERY_UI_MIGRATION.md`, `README.md`, `docs/JQUERY_ECOSYSTEM.md`, `docs/ARCHITECTURE.md`,
  and `docs/TESTING.md`: practical guide, matrix summary, decision, package boundary, and evidence.
- `example/docs/ecosystem/jquery-ui/index.html`, documentation navigation, agent-content manifest
  and generated corpus: public human and agent-readable guide.
- This ticket: phase, file, command, inspection, documentation, and acceptance evidence.

## Code

### Changed-file ledger

| File                                                 | Purpose                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------- |
| `docs/tickets/0039-publish-jquery-ui-migration.md`   | Phase, frozen plan, ledger, commands, and evidence.                    |
| `package.json`                                       | Pin the fixture-only jQuery UI package.                                |
| `package-lock.json`                                  | Record the exact jQuery UI tarball and integrity.                      |
| `schema/jquery-ui-migration.schema.json`             | Validate the migration authority and adapter decision.                 |
| `quality/jquery-ui-migration.json`                   | Store sources, complete API mapping, migration evidence, and decision. |
| `test/jquery-ui-migration-contract.test.ts`          | Verify the matrix, package boundary, documentation, and measurements.  |
| `test/property/jquery-ui-migration.property.test.ts` | Generate mapping and scorecard invariants.                             |
| `test/jquery-ecosystem-contract.test.ts`             | Permit exact fixture-only UI while retaining production exclusions.    |
| `scripts/quality/validate-json.mjs`                  | Validate the new migration authority in the static gate.               |
| `scripts/quality-package.mjs`                        | Prove the packed artifact and consumer exclude jQuery UI.              |
| `playwright.config.ts`                               | Run the installed coexistence fixture in required browser modes.       |
| `e2e/fixtures/jquery-ui-migration-server.mjs`        | Serve exact assets, isolated patches, and native form responses.       |
| `e2e/fixtures/jquery-ui-migration/app.js`            | Own explicit initialization, destruction, and patch instrumentation.   |
| `e2e/fixtures/jquery-ui-migration/style.css`         | Scope legacy/native layers and accessibility media behavior.           |
| `e2e/jquery-ui-migration.spec.ts`                    | Prove coexistence, migration behavior, accessibility, and no-JS paths. |
| `docs/JQUERY_UI_MIGRATION.md`                        | Publish the complete coexistence and incremental migration guide.      |
| `README.md`                                          | Route jQuery UI users to the supported migration path.                 |
| `docs/README.md`                                     | Add the migration guide to the project-brain reading order.            |
| `docs/JQUERY_ECOSYSTEM.md`                           | Link the policy record to completed downstream evidence.               |
| `docs/ARCHITECTURE.md`                               | Record external UI ownership and runtime/package boundaries.           |
| `docs/TESTING.md`                                    | Document matrix, fixture, accessibility, and package gates.            |
| `cspell.json`                                        | Recognize official jQuery UI widget names in the migration record.     |
| `knip.json`                                          | Classify the exact non-imported browser fixture dependency.            |
| `example/docs/ecosystem/jquery-ui/index.html`        | Publish the concise website migration guide.                           |
| `example/docs/ecosystem/index.html`                  | Link the ecosystem policy page to the detailed UI guide.               |
| `example/docs-shell.html`                            | Add the jQuery UI guide to documentation navigation.                   |
| `vite.demo.config.ts`                                | Include the new documentation route in site builds.                    |
| `config/agent-content.json`                          | Add the guide to the reviewed agent-content manifest.                  |
| `example/agent-content.generated.json`               | Regenerate the runtime agent corpus.                                   |
| `example/public/jqstar-agent-index.json`             | Regenerate the public agent index.                                     |
| `example/public/llms.txt`                            | Regenerate the compact agent index.                                    |
| `example/public/llms-full.txt`                       | Regenerate the full public corpus.                                     |
| `test/fixtures/csp/conformance-map.json`             | Refresh public-expression locations after README edits.                |

### Design changes

- The fixture HTML is rendered by `jquery-ui-migration-server.mjs` because server revision and
  fallback responses are part of the proof. The planned standalone fixture `index.html` is not
  needed.
- Legacy axe findings are retained as an explicit baseline. The native and partially migrated
  islands must add no serious or critical findings; the guide does not erase inherited debt.

## Test

| Command                                                                                                                                                                                                                                  | Result | Evidence                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ticket:validate -- --phase plan --ticket docs/tickets/0039-publish-jquery-ui-migration.md`                                                                                                                                      | Pass   | Frozen activation, inventory, scorecard, scope, and planned files passed before implementation.                                                                                               |
| `npx vitest run test/jquery-ui-migration-contract.test.ts test/property/jquery-ui-migration.property.test.ts test/jquery-ecosystem-contract.test.ts` and `node scripts/quality/validate-json.mjs`                                        | Pass   | Seventeen focused schema, package, inventory, mapping, scorecard, boundary, and property tests passed; 67 JSON files, 12 instances, and 18 schemas validated.                                 |
| `npx playwright test e2e/jquery-ui-migration.spec.ts --project=desktop-chromium --workers=1` (first run)                                                                                                                                 | Fail   | Found a moved-dialog close-handler bug, a missing retained dialog owner during destroy, and inherited UI tabs/menu axe findings. The fixture retained the dialog reference and baseline debt. |
| `npx playwright test e2e/jquery-ui-migration.spec.ts --project=desktop-chromium --workers=1` (corrected)                                                                                                                                 | Pass   | Four Chromium coexistence, ownership, form/document, and accessibility-baseline cases passed.                                                                                                 |
| `npx playwright test e2e/jquery-ui-migration.spec.ts --workers=1` (first matrix run)                                                                                                                                                     | Fail   | Fifteen cases passed; reduced-motion output used an equivalent normalized time unit. The assertion now compares seconds instead of serialized CSS text.                                       |
| `npx playwright test e2e/jquery-ui-migration.spec.ts --workers=1` (corrected)                                                                                                                                                            | Pass   | All 16 Chromium, Firefox, WebKit, mobile-touch, reduced-motion, forced-color, and JavaScript-disabled cases passed.                                                                           |
| `npx vitest run test/jquery-ui-migration-contract.test.ts test/property/jquery-ui-migration.property.test.ts test/jquery-ecosystem-contract.test.ts test/agent-content.test.mjs`, JSON validation, markdown lint, and `git diff --check` | Pass   | Twenty-two focused contract/corpus tests passed; schemas, Markdown, and whitespace passed.                                                                                                    |
| `npm run lint`, `npm run typecheck`, `npm run lint:css`, `npm run lint:html`, direct guide spelling, and `npm run build:demo`                                                                                                            | Pass   | Executable/static sources, types, CSS, public HTML, prose, deterministic corpus, and the new 10.19 kB site page passed.                                                                       |
| `npm run quality:static` (first run)                                                                                                                                                                                                     | Fail   | Twenty-one of 22 static gates passed; Knip could not infer a classic-script fixture dependency. `jquery-ui` is now classified with the existing exact browser host fixtures.                  |
| `npm run test:package:quality`                                                                                                                                                                                                           | Pass   | Thirteen package checks passed for `jquery-star-0.1.0.tgz`; the clean consumer excludes jQuery UI and every graph/runtime/path assertion passed.                                              |
| `npm run quality:fast` (first run)                                                                                                                                                                                                       | Fail   | Unit inventory caught shifted README expression locations; static spelling caught one obsolete term in the failure ledger. Both generated/wording issues were corrected.                      |
| `npm run quality:fast` (corrected)                                                                                                                                                                                                       | Pass   | Run `2026-09-04T15-27-31-561Z-11836`; ticket, runner self-test, format, unit, and 22 static lanes passed with a stable tree fingerprint.                                                      |
| `npm run check` (`quality:delivery`)                                                                                                                                                                                                     | Pass   | Run `2026-09-04T15-29-06-628Z-20442` passed all 12 enforced lanes, including package consumers, release proof, the full browser matrix, and detector self-tests.                              |
| `npm run check` (first completed-ticket run)                                                                                                                                                                                             | Fail   | Run `2026-09-04T15-42-09-018Z-62496` found ticket formatting and one unknown spelling term; the other ten lanes, including package, release, browser, and detector proof, passed.             |
| `npm run format:check` and `npx --no-install cspell docs/tickets/0039-publish-jquery-ui-migration.md` (corrected)                                                                                                                        | Pass   | Prettier accepted the full repository, and the focused ticket spelling check reported zero issues after the failure evidence was formatted and clarified.                                     |

### Inspection ledger

| Finding                      | Result   | Resolution                                                                                                                                         |
| ---------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session ownership            | Pass     | No tmux server or other tmux session was running before work resumed.                                                                              |
| Primary sources and packages | Pass     | Official status, release, API, upgrade sources, and exact npm metadata were rechecked on 2026-09-04 before code.                                   |
| API completeness             | Pass     | Ten official category pages produced 72 unique API URLs; the contract maps each exactly once.                                                      |
| Moved legacy dialog          | Resolved | The first browser run showed that descendant lookup loses moved dialog content. The application now retains and destroys the exact instance owner. |
| Accessibility baseline       | Resolved | Four serious/critical legacy axe rules across seven nodes remain explicit debt; native and partially migrated islands add none.                    |
| Package boundary             | Pass     | Exact-tarball quality found no UI runtime, theme, icon, source path, dependency, consumer install, or entry-graph inclusion.                       |
| Adapter threshold review     | Pass     | Seven frozen dimensions fail and two pass; the all-pass rule yields no-go and no adapter code exists.                                              |

## Document

### Documentation changed

- `docs/JQUERY_UI_MIGRATION.md` publishes the source-backed 72-entry inventory, four migration
  classes, exact package boundary, coexistence ownership rules, two measured slices, incremental
  workflow, rollback path, unsupported-extension handling, and no-adapter decision.
- `README.md`, `docs/README.md`, `docs/JQUERY_ECOSYSTEM.md`, `docs/ARCHITECTURE.md`, and
  `docs/TESTING.md` route users to the guide and record the product, ownership, package, and
  verification boundaries.
- `example/docs/ecosystem/jquery-ui/index.html`, the ecosystem index, shared documentation shell,
  and generated agent corpus publish the same recommendation and no-drop-in-compatibility wording
  for browser and headless users.

### Acceptance evidence

| Criterion | Result | Evidence                                                                                                                                                                                                                                                                                                                             |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-01     | Pass   | The ticket records refreshed official release, API, status, upgrade, support, and Migrate sources; exact jQuery 4.0.0 and jQuery UI 1.14.2 checksums; ticket-0038 naming policy; the frozen 72-entry inventory; and the nine-dimension adapter scorecard. Plan validation passed before implementation.                              |
| AC-02     | Pass   | `quality/jquery-ui-migration.json` validates against its closed schema. Contract and property tests prove 72 unique official URLs, exact one-row assignment, all four migration classes, required row fields, and the named third-party-extension boundary.                                                                          |
| AC-03     | Pass   | The installed-package fixture loads exact jQuery, jQuery UI runtime/base-theme assets, and packed jQStar. Sixteen targeted cases passed across Chromium, Firefox, WebKit, mobile touch, reduced motion, forced colors, and JavaScript-disabled modes.                                                                                |
| AC-04     | Pass   | The exact-tarball package gate passes 13 checks: runtime classifications, packed paths and strings, clean consumer install, production source, licenses, site assets, and root/core/testing/Turbo/htmx/Datastar graphs contain no jQuery UI runtime, theme, icons, or source.                                                        |
| AC-05     | Pass   | Browser counters, data/focus fingerprints, repeated enhancement, independent island replacement, and explicit legacy destroy spies prove that each owner cleans up only its own roots without Widget Factory patching, UI-data adoption, or duplicate jQStar behavior.                                                               |
| AC-06     | Pass   | The project-editor flow exercises dialog, tabs, autocomplete, date input, sortable work, native validation/submission, server replacement, direct links, responsive navigation, focus/keyboard behavior, preserved values, accessibility media modes, and no-JavaScript form fallback. Unsupported legacy debt is explicit.          |
| AC-07     | Pass   | The migration authority records exact package and asset bytes, one fixture dependency, physical authored line deltas excluding blank lines, initialization/destruction changes, accessibility findings, server/test changes, unsupported behavior, and the limits of line counts for both project-editor and command-toolbar slices. |
| AC-08     | Pass   | The repository and public guides recommend semantic jQStar components for new work, define coexistence as temporary application-owned migration infrastructure, and explicitly reject Widget Factory, imperative API, theme, effects, Position, and extension compatibility claims.                                                  |
| AC-09     | Pass   | The practical guide covers inventory, official jQuery/UI/Migrate upgrade order, CSS/data/event isolation, parallel installation, one-region migration, verification and release, rollback, explicit UI destruction/removal, and application-owned third-party extensions.                                                            |
| AC-10     | Pass   | The machine scorecard applies all nine frozen thresholds to two independent slices: seven dimensions fail and two pass, so the all-pass rule records no-go. No adapter code or follow-up facade ticket was created.                                                                                                                  |
| AC-11     | Pass   | Every interaction disposition in the authority names required native consumers or records that fewer than two exist, specifies independent semantic/input/accessibility/ownership requirements, and routes any future primitive through a separate decision ticket.                                                                  |
| AC-12     | Pass   | README, website, package, matrix, generated corpus, and guide checks preserve the independent jQStar naming record, factual jQuery UI attribution, and explicit no-successor/no-drop-in claims.                                                                                                                                      |
| AC-13     | Pass   | Schema, unit/property, static, exact-package, consumer, release, three-browser, accessibility, no-JavaScript, ticket phase, and whitespace gates pass. Delivery run `2026-09-04T15-29-06-628Z-20442` passed all 12 enforced lanes without mutation testing.                                                                          |

### Completion audit

All 13 criteria have current evidence. The matrix, schema, exact fixture, measured slices, browser
proof, package isolation, public guide, generated corpus, and no-adapter decision agree. No
unresolved finding or compatibility claim remains.

Status: Complete
