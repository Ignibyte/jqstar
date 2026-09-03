---
id: 0039
title: Publish the jQuery UI coexistence and migration path
status: planned
created: 2026-08-30
updated: 2026-09-01
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

- [ ] [AC-01] Activation pins current primary sources, exact jQuery/UI fixture packages/checksums,
      ticket-0038 non-fork/naming policy, complete catalog/API inventory, and adapter scorecard/
      thresholds fixed in advance; Plan validation passes before fixture or migration code.
- [ ] [AC-02] A schema-valid migration matrix covers every official interaction, widget, Position/
      utility, effect group, Widget Factory behavior, ThemeRoller contract, and extension point with
      one exact class, counterpart/gap, markup/API/accessibility/fallback notes, example, and test
      ID.
- [ ] [AC-03] The exact installed fixture runs pinned jQuery 4, jQuery UI 1.14.2/theme, and jQStar
      in Chromium, Firefox, and WebKit without
      namespace/data/event/CSS/focus/keyboard/overlay/z-index/
      ARIA/form/pointer/positioning/lifecycle/disposal collision.
- [ ] [AC-04] jQuery UI is fixture-only. Production dependency/lock classification, package
      contents, source/site asset, license, consumer install, and root/core/UI/optional graph scans
      prove no UI JavaScript/CSS/theme/source/runtime entered jQStar.
- [ ] [AC-05] Repeated jQStar enhancement/disposal and server DOM patches do not duplicate jQStar
      behavior, mutate surviving UI instances, adopt UI data, patch Widget Factory, auto-initialize
      legacy markup, or skip the application's explicit destroy path for removed UI regions.
- [ ] [AC-06] The representative legacy slice and each incremental migration step preserve native
      content/forms, validation/submitter/values, server interaction, keyboard/screen-reader/focus,
      responsive/touch, reduced-motion/forced-color, direct-load/history, and JavaScript-disabled
      behavior, with unsupported differences explicit.
- [ ] [AC-07] Per-step measurements record exact package/bundle/CSS/dependency/source/markup/style/
      initialization/destruction/test/accessibility/server deltas and limitations, allowing direct
      native migration, coexistence, and any adapter hypothesis to be compared on the same fixture.
- [ ] [AC-08] Public guidance says jQStar native semantic components are recommended for new work,
      catalog counterpart is not Widget Factory/API/theme/effect/extension compatibility, and
      coexistence is a temporary feature-by-feature migration tool rather than architecture.
- [ ] [AC-09] The incremental guide covers inventory, supported jQuery/UI/Migrate upgrade, CSS/data/
      event ownership, parallel install, one-region migration, test/release/rollback, explicit
      legacy destruction/removal, and application-specific third-party plugin handling.
- [ ] [AC-10] The adapter decision applies frozen thresholds and records demand, two application
      slices, code/bundle/accessibility/ownership/maintenance/deprecation costs, and go/no-go. Go
      creates a separate bounded ticket with exact widgets/methods/options/events; no adapter code
      or broad compatibility promise ships here.
- [ ] [AC-11] Every generic interaction proposal names at least two native jQStar consumers,
      specifies standalone semantic/pointer/keyboard/touch/accessibility/ownership needs, and
      receives a separate decision ticket rather than copying jQuery UI API by default.
- [ ] [AC-12] Website/README/package/migration wording makes no official-successor/drop-in claim,
      attributes jQuery UI appropriately, and uses the independent jQStar naming record.
- [ ] [AC-13] Exact-tarball package/API/type/graph/size, unit/property, three-browser,
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

- Versioned jQuery UI migration-map schema/data, official inventory source manifest, and adapter
  decision report.
- Isolated same-page/coexistence and representative incremental server fixture with pinned test-only
  jQuery UI assets.
- Ownership/data/event/CSS/focus/overlay/pointer/server-patch/no-JavaScript/accessibility browser
  tests plus forbidden-runtime/package graph checks.
- Public jQuery UI migration guide and website matrix/examples; ecosystem/architecture/testing docs
  and this ticket.

## Code

### Changed-file ledger

| File       | Purpose                         |
| ---------- | ------------------------------- |
| _None yet_ | Implementation has not started. |

### Design changes

None recorded.

## Test

| Command   | Result  | Evidence                                 |
| --------- | ------- | ---------------------------------------- |
| _Not run_ | Planned | Verification commands are defined above. |

## Document

### Documentation changed

Pending.

### Acceptance evidence

Pending implementation.

### Completion audit

Pending.
