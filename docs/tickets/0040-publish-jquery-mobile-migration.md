---
id: 0040
title: Publish the jQuery Mobile migration path
status: planned
created: 2026-08-30
updated: 2026-09-01
---

# 0040: Publish the jQuery Mobile migration path

## Plan

### Problem

jQuery Mobile solved real problems for server-rendered mobile sites, but its runtime predates
current jQuery, browser primitives, accessibility practice, and jQStar's ownership model. Reviving
its page router, Ajax navigation, virtual mouse/touch aliases, widget auto-initializer, transition
catalog, and theme swatches would create a second application framework inside jQStar and inherit an
archived support/security surface.

Existing jQuery Mobile applications still need a credible route to current semantic HTML, jQuery 4,
responsive CSS, and incremental jQStar enhancement. The route must preserve direct URLs, native
links and forms, server authority, mobile usability, and JavaScript-disabled operation rather than
replacing one page framework with another SPA.

### Current evidence

- Ticket 0038 records official evidence rechecked 2026-09-01: OpenJS lists jQuery Mobile Archived,
  jquery-archive/jquery-mobile is read-only and states it is unmaintained, and documented 1.4.x
  support ends at historical jQuery ranges rather than jQuery 4.
- Durable product lessons remain useful: meaningful HTML before enhancement, native links/forms,
  responsive layouts, touch and keyboard access, direct URLs, and graceful degradation.
- jQStar already has source-owned responsive components, native HTML/data-jqs conventions, generic/
  Datastar server requests, UI services, and planned Turbo/htmx bridges without a client route
  table.
- Tickets 0014, 0036, and 0037 provide installed testing and optional external navigation lifecycle
  paths. Ticket 0023 separately decides whether any native jQStar navigation is justified.
- No complete jQuery Mobile feature/data-attribute map, modern reference application, no-runtime
  package proof, or staged migration guide currently exists.

### Activation gate

Ticket 0038 supplies mapping `jquery-ecosystem.mobile.no-runtime-migration` in
`quality/jquery-ecosystem.json` at SHA-256
`2b6550a824aa495c58f21948260a6ab504e9da355072aca8cd8999a06f8cb718`. Activation must consume that
exact matrix or refresh its primary sources and every downstream digest first.

Before implementation, freeze a primary-source inventory of jQuery Mobile 1.4 pages/navigation/
widgets/forms/themes/touch/responsive behavior and every relevant data attribute/event. Import
ticket 0038's no-runtime/non-fork decision and final outcomes of Turbo/htmx/native-navigation
tickets. Define a representative legacy behavior contract from documentation and application-owned
tests without adding the archived runtime to production, package dependencies, CI downloads, or
modern fixtures. Plan-validate the complete feature inventory and route each behavior to one modern
owner.

### Scope

- Publish a versioned migration map covering page/multipage documents, Ajax navigation, links,
  history, transitions, dialogs, panels, popups, toolbars, buttons, collapsibles, control groups,
  filterable/list views, tables, forms/inputs/selects/sliders/flips, loaders, themes/swatches/icons,
  responsive grids/layout, touch/virtual-mouse/orientation/scroll events, auto-initialization, and
  relevant data-role/data-* contracts.
- Assign every row exactly one primary modern disposition: native HTML, native CSS/media/container
  query, jQStar component/block/application code, generic/official-SDK Datastar server update,
  optional supported Turbo bridge, optional supported htmx bridge, normal full document navigation,
  or intentionally unsupported. Record semantic/API/markup changes, accessibility/fallback,
  security/ownership notes, example, and test ID.
- Prefer normal server documents and native links/forms. A bridge/native-navigation option is shown
  only when its completed ticket proves a specific benefit and its ownership/history/focus/error
  semantics fit the use case. Do not recreate the jQuery Mobile page container or client route
  table.
- Build a modern, exact-tarball, server-rendered reference application with multiple direct routes,
  list/detail/search/edit flows, responsive navigation/panel, popup/dialog-like task, table/list,
  native validated GET and non-GET forms including submitters/files as relevant, a server update,
  history/back-forward, focus/scroll restoration, offline/error fallback messaging, and one optional
  external bridge comparison.
- Every route returns meaningful semantic content and works as a direct load, reload, bookmark, open
  in new tab, and JavaScript-disabled navigation. Enhancement uses native HTML first, data-jqs
  roots, data-part slots, documented state attributes, registry blocks for application
  orchestration, and src only for reusable generic behavior.
- Prove the modern app contains jQuery 4 and the exact jQStar modules it uses but no jQuery Mobile
  JavaScript/CSS, data-role auto-initializer, page container, virtual mouse aliases,
  transition/theme runtime, copied source, CDN reference, package/lock dependency, generated asset,
  or compatibility shim. Historical markup snippets in docs are escaped, labeled, and excluded from
  executable scans.
- Define an incremental application sequence: inventory routes/data roles/events/plugins/themes;
  establish direct server URLs/native forms; follow official staged jQuery Core/Migrate upgrade in
  an isolated branch; replace theme/layout with semantic CSS; migrate one widget/region to jQStar;
  replace navigation with normal documents or an approved bridge; remove old initializer/assets;
  verify and repeat. Include rollback boundaries and temporary legacy/new page separation.
- Keep jQuery Core migration distinct from UI/navigation migration. Doctor/Migrate can report
  declared versions and application-generated warning summaries, but no tool automatically rewrites
  arbitrary data-role markup, virtual events, page lifecycle handlers, plugin calls, or application
  JavaScript.
- Replace virtual mouse/touch aliases with pointer/click/native input semantics only where the
  modern browser contract supports them. Preserve keyboard equivalence, pointer
  cancellation/capture, coarse-pointer touch targets, scroll/gesture behavior,
  orientation/responsive layout, and reduced motion without synthesizing duplicate click/touch
  actions.
- Define exact form and write semantics: native constraint validation and submitter override,
  encodings/file handling, CSRF/auth/server validation, redirects, conflict/error rendering,
  disabled state, pending indication, and never automatic replay after indeterminate writes.
- Test mobile and desktop viewports in Chromium, Firefox, and WebKit, including touch-capable
  browser contexts where supported, real keyboard, screen-reader semantics/axe, 200–400%
  zoom/reflow, text scaling, landscape/portrait, coarse/fine pointers, reduced motion, forced
  colors, network delay/ offline, direct routes, history/scroll/focus, and JavaScript disabled.
- Record feature-by-feature code/asset/dependency and behavioral deltas, known unsupported legacy
  plugins/themes/transitions, and application-specific work. Publish a small triage worksheet so
  teams can estimate route/feature migration without implying source compatibility.

### Out of scope

- Loading, vendoring, patching, forking, republishing, or executing jQuery Mobile in the modern
  application, package, website, production dependencies, or CI browser matrix.
- A jQuery Mobile compatibility package/emulation layer, page container/router, Ajax navigation,
  virtual mouse, transition catalog, theme swatches, widget auto-initializer, or source codemod.
- Guaranteeing migration of undocumented/third-party plugins, exact visual themes, native app
  packaging, service workers/offline writes, or a new client route table.

### Dependencies

- Tickets 0014, 0036, 0037, and 0038. Import ticket 0023's navigation outcome if completed before
  this work; normal documents remain sufficient if native navigation is declined.

### Acceptance criteria

- [ ] [AC-01] Activation freezes a primary-source jQuery Mobile 1.4 feature/data-attribute/event
      inventory, ticket-0038 no-runtime policy, completed bridge/navigation decisions, and one
      modern owner per behavior; schema and Plan validation pass before fixture work.
- [ ] [AC-02] The migration map covers all named page/navigation/history/transition/widget/form/
      list/table/theme/icon/layout/touch/event/auto-init groups with exact legacy need, modern
      disposition, markup/API/accessibility/fallback/security changes, example, and test ID; no row
      is silently labeled “jQStar equivalent.”
- [ ] [AC-03] The modern exact-tarball reference app provides multiple direct server routes and the
      required list/detail/search/edit, responsive navigation, popup/dialog, data presentation, GET/
      write/file form, server update, history/focus/scroll, and error/offline flows without an SPA
      route table or page container.
- [ ] [AC-04] Every route is meaningful on direct load/reload/bookmark/new-tab and remains fully
      navigable/submittable with JavaScript disabled. Native links/forms are the baseline; optional
      Datastar/Turbo/htmx/native enhancement is justified per route and removable.
- [ ] [AC-05] Production dependency/lock/package/source/site/build/license/network scans prove no
      jQuery Mobile JavaScript/CSS/source/CDN/data-role initializer/page router/virtual mouse/theme/
      transition/compatibility runtime entered jQStar or the modern app; escaped historical docs do
      not execute.
- [ ] [AC-06] The staged guide separates jQuery Core/Migrate from UI/navigation migration and covers
      inventory, direct routes/native forms, jQuery upgrade, semantic CSS, one-region jQStar
      changes, approved navigation choices, old initializer/asset removal, tests, rollback, and
      repeated release without automatic arbitrary-source rewrites.
- [ ] [AC-07] Forms preserve constraint validation, submitter overrides/values, URL/method/encoding,
      file handling, disabled/pending behavior, CSRF/auth/server validation, redirects/conflicts/
      errors, and no replay of an indeterminate write in JavaScript and no-JavaScript modes.
- [ ] [AC-08] Pointer/click/input replacements produce one activation and preserve keyboard, pointer
      cancel/capture, coarse-pointer targets, scrolling/gestures, fine pointers, orientation,
      responsive layout, and reduced motion without virtual-mouse aliases.
- [ ] [AC-09] Chromium, Firefox, and WebKit pass desktop/mobile/touch-capable contexts, keyboard/
      screen-reader/axe, zoom/reflow/text scaling, portrait/landscape, coarse/fine pointer,
      forced-colors/reduced-motion, slow/offline network, direct/reload/history/scroll/focus, and
      JavaScript-disabled matrices.
- [ ] [AC-10] Normal document, Datastar, Turbo, htmx, and any approved native-navigation examples
      preserve their own request/history/focus/scroll/error/form ownership and never recreate a
      generic jQuery Mobile Ajax navigation abstraction.
- [ ] [AC-11] Feature and reference-app measurements record JS/CSS/dependency/source/markup/server/
      test/accessibility deltas, unsupported plugins/themes/transitions, and application-specific
      effort; the triage worksheet does not promise source-compatible or automatic migration.
- [ ] [AC-12] Public wording calls jQuery Mobile an archived migration source, preserves its named
      design lessons with attribution, recommends no new runtime use, and makes no fork/stewardship/
      official-successor claim.
- [ ] [AC-13] Exact package/API/type/graph/size, source/asset/runtime absence, unit/property/static/
      security, three-browser/accessibility/no-JavaScript, server/deployment, npm run check, ticket
      phase validation, and git diff --check pass without mutation testing.

### Design

The migration map starts from user needs, not legacy implementation reuse. The modern application is
ordinary server-rendered documents with stable URLs. jQStar enhances semantic regions; Datastar or
an external bridge is chosen per feature only when it materially improves the baseline.

The legacy contract is a documentation/application-test inventory, not an archived runtime fixture.
Each modern behavior has an executable route/test and a trace to the corresponding legacy need. This
avoids making an unsupported runtime part of normal CI while still requiring full feature
accounting.

Migration boundaries follow server routes. Teams can modernize one route/region, release it, and
keep legacy pages not yet migrated isolated on their compatible stack until removed. The guide does
not suggest running jQuery Mobile and jQuery 4 in the same modern document.

### Decisions

- Do not revive, fork, wrap, or emulate jQuery Mobile.
- Preserve its strongest progressive-enhancement ideas in jQStar's native architecture.
- Normal documents are the navigation default; optional server/bridge enhancement remains modular.
- Migrate route by route with legacy/new runtime isolation, not a risky all-at-once rewrite.
- No automatic arbitrary-source migration is credible; provide inventory, maps, tests, and examples.

### Security and accessibility

- Excluding the archived runtime avoids presenting unmaintained code as newly supported. Migration
  preserves server authorization, CSRF, validation, output handling, safe redirects, and write
  non-replay.
- Modern pointer support never removes keyboard activation or native control semantics. Touch
  target, motion, zoom, text scale, focus, screen-reader, and JavaScript-disabled evidence is
  required.
- Fixtures use synthetic content and redacted server traces; no production credentials/user data or
  legacy proprietary source enters reports.

### Risks

- Documentation may omit application-specific plugin behavior. Label it custom, inventory it
  explicitly, and avoid claiming a universal migration percentage.
- “Incremental” can imply incompatible runtimes on one page. Use route-level isolation and never
  pair jQuery Mobile with jQuery 4 in the modern document.
- Responsive screenshots can miss real touch/keyboard/history failures. Assert events, focus,
  scroll, form requests, hit targets, pointer modes, and no-JavaScript routes.
- Recreating transitions/themes can consume the roadmap without preserving core user value. Keep
  ornamental unsupported results explicit and prefer native CSS only when it meets accessibility/
  motion contracts.
- Archived source in docs can trigger false scans or accidental reuse. Keep snippets minimal,
  escaped, attributed, and segregated from executable fixtures.

### Verification plan

- Validate the complete primary-source inventory and downstream owner mapping before building.
- Build the modern server fixture from the exact jQStar tarball and prove direct/no-JavaScript
  routes before adding each optional enhancement.
- Run form/write, pointer/touch/keyboard, responsive/orientation, accessibility, network/error,
  history/focus/scroll, direct-load, and source/runtime absence matrices in three browsers.
- Review the staged guide against at least two representative application inventories and record
  gaps/effort rather than adding compatibility code.
- Run
  focused/fast/coverage/property/static/security/browser/package/release/server/deployment/check/
  ticket/diff gates without mutation testing.

### Planned files

- Versioned jQuery Mobile feature/data-attribute/event inventory and migration-map schema/data.
- Modern multi-route server reference app, optional enhancement variants, and synthetic migration
  inventory worksheets.
- Exact-package browser/accessibility/no-JavaScript/form/pointer/history/network tests and archived
  runtime/source/asset/dependency absence checks.
- Public jQuery Mobile staged migration guide and website examples/matrix; ecosystem/architecture/
  backend/testing/security docs and this ticket.

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
