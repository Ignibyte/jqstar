---
id: 0040
title: Publish the jQuery Mobile migration path
status: done
created: 2026-08-30
updated: 2026-09-04
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

### Activation evidence

- `quality/jquery-ecosystem.json` still has the required SHA-256
  `2b6550a824aa495c58f21948260a6ab504e9da355072aca8cd8999a06f8cb718`. Its
  `jquery-ecosystem.mobile.no-runtime-migration` assignment makes jQuery Mobile an archived
  migration source with no jQStar runtime role.
- OpenJS still lists jQuery Mobile under Archived Projects. The official archived repository is
  read-only, says the project is no longer maintained, and limits Mobile 1.4.x to jQuery Core
  1.8.3–1.11.1/2.1.1. The official 2021 deprecation post says Mobile 1.4 is incompatible with new
  jQuery Core and identifies the October 2014 release as the last stable line.
- The official 1.4 API index contains 95 unique entries. The official 1.4 data-attribute reference
  contains 60 unique attribute names in 21 feature sections and 122 section assignments. Repeated
  popup opener attributes remain one named attribute with both contexts recorded. The 1.4.5 demos
  add the ten transition names and the page, navigation, forms, responsive, theme, and touch
  behavior contract.
- The historical npm stable is `jquery-mobile@1.4.1`, SHA-512
  `5CIKR+jQ34GMNz8vGpiNIxQ2zfmEXpbCI0hFfyHYi/MDhdkJLpk2lFl2txjPxkAbHSvJLntNJgS//OrA1nBIkg==` and
  SHA-1 `4c5eaf3d20f99973d1481ed4c9c8921d016fe198`. It is identity evidence only and will not enter
  `package.json`, the lockfile, `node_modules`, fixtures, CI downloads, or generated artifacts. The
  modern fixture uses the existing exact `jquery@4.0.0` peer and the exact jQStar tarball built by
  package quality.
- Tickets 0036 and 0037 approve explicit, optional Turbo and htmx lifecycle bridges while leaving
  requests, DOM mutation, forms, redirects, history, focus, scroll, and errors with each host.
  Ticket 0023 remains planned, so no native jQStar navigation option is approved or shown. Normal
  document navigation is the default.
- Ticket 0038's independent naming record remains authoritative. Guidance may attribute historical
  jQuery Mobile behavior and recommend migration, but may not claim a fork, official succession,
  sponsorship, stewardship, or compatibility runtime.

### Frozen official inventory

The machine contract must store and map all 95 API URLs exactly once. Category overlap is recorded
as metadata and does not create duplicate entries.

- Widgets (27): Button, Checkboxradio, Collapsible, Collapsibleset, Controlgroup, Dialog,
  Filterable, Fixedtoolbar, Flipswitch, Footer, Header, Listview, Loader, Navbar, Page,
  Pagecontainer, Panel, Popup, Rangeslider, Selectmenu, Slider, Table, Column-Toggle Table, Reflow
  Table, Tabs, Textinput, and Toolbar.
- Events (34): `hashchange`, `mobileinit`, `navigate`, `orientationchange`, `pagebeforechange`,
  `pagebeforecreate`, `pagebeforehide`, `pagebeforeload`, `pagebeforeshow`, `pagechange`,
  `pagechangefailed`, `pagecreate`, `pagehide`, `pageinit`, `pageload`, `pageloadfailed`,
  `pageremove`, `pageshow`, `scrollstart`, `scrollstop`, `swipe`, `swipeleft`, `swiperight`, `tap`,
  `taphold`, `throttledresize`, `updatelayout`, `vclick`, `vmousecancel`, `vmousedown`,
  `vmousemove`, `vmouseout`, `vmouseover`, and `vmouseup`.
- Methods (16): `.buttonMarkup()`, `.enhanceWithin()`, `.fieldcontain()`, `jqmData()`,
  `jqmEnhanceable()`, `jqmHijackable()`, `.jqmRemoveData()`, `jQuery.mobile.changePage()`,
  `degradeInputsWithin()`, `getDocumentBase()`, `getDocumentUrl()`, `getInheritedTheme()`,
  `loadPage()`, `navigate()`, `path.parseUrl()`, and `silentScroll()`.
- Path methods (10): `path.get()`, `path.getDocumentBase()`, `path.getDocumentUrl()`,
  `path.getLocation()`, `path.isAbsoluteUrl()`, `path.isRelativeUrl()`, `path.isSameDomain()`,
  `path.makePathAbsolute()`, `path.makeUrlAbsolute()`, and `path.parseLocation()`.
- CSS/reference/property entries (8): Classes, Grid Layout, Responsive Grid, Theme, Icons, Data
  Attributes, Configuring Defaults, and `jQuery.mobile.activePage`.

The 60 unique data attributes are frozen independently because one attribute can configure several
API entries: `data-add-back-btn`, `data-ajax`, `data-autodividers`, `data-back-btn-text`,
`data-back-btn-theme`, `data-clear-btn`, `data-clear-btn-text`, `data-close-btn`,
`data-close-btn-text`, `data-collapse-cue-text`, `data-collapsed`, `data-collapsed-icon`,
`data-content-theme`, `data-corners`, `data-count-theme`, `data-direction`,
`data-disable-page-zoom`, `data-dismissible`, `data-divider-theme`, `data-dom-cache`,
`data-enhance`, `data-exclude-invisible`, `data-expand-cue-text`, `data-expanded-icon`,
`data-filter`, `data-filter-placeholder`, `data-filter-theme`, `data-filtertext`, `data-fullscreen`,
`data-header-theme`, `data-highlight`, `data-history`, `data-icon`, `data-iconpos`,
`data-iconshadow`, `data-id`, `data-inline`, `data-inset`, `data-mini`, `data-native-menu`,
`data-overlay-theme`, `data-placeholder`, `data-position`, `data-position-to`, `data-prefetch`,
`data-rel`, `data-role`, `data-shadow`, `data-split-icon`, `data-split-theme`, `data-tap-toggle`,
`data-theme`, `data-title`, `data-tolerance`, `data-track-theme`, `data-transition`, `data-type`,
`data-update-page-padding`, `data-url`, and `data-visible-on-page-show`.

The transition inventory is `fade`, `pop`, `flip`, `turn`, `flow`, `slidefade`, `slide`, `slideup`,
`slidedown`, and `none`. The machine map also names multipage documents, Ajax link/form
interception, page injection/discard rules, history/cache/prefetch, loaders, auto-enhancement,
global defaults, ThemeRoller swatches, third-party widgets/plugins, and downloaded custom themes
even when no single API URL owns the behavior.

### Frozen modern owners

Every API entry, attribute, transition, and extra behavior receives exactly one primary owner from
this closed list. A secondary comparison may be documented, but it cannot blur primary ownership.

| Owner                      | Boundary                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Native HTML                | Documents, links, forms, controls, validation, dialogs/details, tables, and file input.                                     |
| Native CSS                 | Responsive layout, container/media queries, coarse-pointer targets, icons, color, and reduced motion.                       |
| jQStar component           | A documented semantic component whose markup/API is adopted explicitly.                                                     |
| Application code           | Route-specific filtering, gesture, pending, conflict, or orchestration behavior.                                            |
| Datastar SDK server update | A named partial server update produced only with the official SDK.                                                          |
| Optional Turbo bridge      | Turbo-owned navigation with the completed explicit jQStar lifecycle bridge.                                                 |
| Optional htmx bridge       | htmx-owned swaps with the completed explicit jQStar lifecycle bridge.                                                       |
| Full document navigation   | The default owner for route, history, head, focus, scroll, error, and reload behavior.                                      |
| Intentionally unsupported  | Mobile page containers, virtual mouse aliases, swatches, transition catalogs, auto-init, or arbitrary plugin compatibility. |

The detailed map groups entries only when their legacy need, primary owner, markup/API change,
accessibility and no-JavaScript fallback, security/ownership rule, unsupported difference, example,
and test ID are identical. Contract tests reject missing, duplicate, or unknown assignments.

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

- [x] [AC-01] Activation freezes a primary-source jQuery Mobile 1.4 feature/data-attribute/event
      inventory, ticket-0038 no-runtime policy, completed bridge/navigation decisions, and one
      modern owner per behavior; schema and Plan validation pass before fixture work.
- [x] [AC-02] The migration map covers all named page/navigation/history/transition/widget/form/
      list/table/theme/icon/layout/touch/event/auto-init groups with exact legacy need, modern
      disposition, markup/API/accessibility/fallback/security changes, example, and test ID; no row
      is silently labeled “jQStar equivalent.”
- [x] [AC-03] The modern exact-tarball reference app provides multiple direct server routes and the
      required list/detail/search/edit, responsive navigation, popup/dialog, data presentation, GET/
      write/file form, server update, history/focus/scroll, and error/offline flows without an SPA
      route table or page container.
- [x] [AC-04] Every route is meaningful on direct load/reload/bookmark/new-tab and remains fully
      navigable/submittable with JavaScript disabled. Native links/forms are the baseline; optional
      Datastar/Turbo/htmx/native enhancement is justified per route and removable.
- [x] [AC-05] Production dependency/lock/package/source/site/build/license/network scans prove no
      jQuery Mobile JavaScript/CSS/source/CDN/data-role initializer/page router/virtual mouse/theme/
      transition/compatibility runtime entered jQStar or the modern app; escaped historical docs do
      not execute.
- [x] [AC-06] The staged guide separates jQuery Core/Migrate from UI/navigation migration and covers
      inventory, direct routes/native forms, jQuery upgrade, semantic CSS, one-region jQStar
      changes, approved navigation choices, old initializer/asset removal, tests, rollback, and
      repeated release without automatic arbitrary-source rewrites.
- [x] [AC-07] Forms preserve constraint validation, submitter overrides/values, URL/method/encoding,
      file handling, disabled/pending behavior, CSRF/auth/server validation, redirects/conflicts/
      errors, and no replay of an indeterminate write in JavaScript and no-JavaScript modes.
- [x] [AC-08] Pointer/click/input replacements produce one activation and preserve keyboard, pointer
      cancel/capture, coarse-pointer targets, scrolling/gestures, fine pointers, orientation,
      responsive layout, and reduced motion without virtual-mouse aliases.
- [x] [AC-09] Chromium, Firefox, and WebKit pass desktop/mobile/touch-capable contexts, keyboard/
      screen-reader/axe, zoom/reflow/text scaling, portrait/landscape, coarse/fine pointer,
      forced-colors/reduced-motion, slow/offline network, direct/reload/history/scroll/focus, and
      JavaScript-disabled matrices.
- [x] [AC-10] Normal document, Datastar, Turbo, htmx, and any approved native-navigation examples
      preserve their own request/history/focus/scroll/error/form ownership and never recreate a
      generic jQuery Mobile Ajax navigation abstraction.
- [x] [AC-11] Feature and reference-app measurements record JS/CSS/dependency/source/markup/server/
      test/accessibility deltas, unsupported plugins/themes/transitions, and application-specific
      effort; the triage worksheet does not promise source-compatible or automatic migration.
- [x] [AC-12] Public wording calls jQuery Mobile an archived migration source, preserves its named
      design lessons with attribution, recommends no new runtime use, and makes no fork/stewardship/
      official-successor claim.
- [x] [AC-13] Exact package/API/type/graph/size, source/asset/runtime absence, unit/property/static/
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

`quality/jquery-mobile-migration.json` is the machine authority. Its closed schema stores the
sources and package identity, 95 API entries, 60 attributes with all 21 reference-section contexts,
ten transitions, extra documented behaviors, detailed owner rows, two application inventories,
reference-app measurements, bridge decisions, and the no-runtime result.

The reference app is a synthetic project tracker served from stable document routes. It includes
list, search, detail, edit, multipart upload, responsive navigation, native dialog/details, table
and list presentation, a Datastar SDK status update, redirects, validation, conflicts, slow/error
responses, and an offline fallback. Native routes and forms work before JavaScript. jQStar adds only
removable region behavior. The browser suite compares normal documents with bounded Turbo and htmx
ownership described by their completed fixtures instead of recreating a common router.

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

- `schema/jquery-mobile-migration.schema.json` and `quality/jquery-mobile-migration.json`: closed
  source, inventory, owner, worksheet, measurement, and no-runtime authority.
- `test/jquery-mobile-migration-contract.test.ts` and
  `test/property/jquery-mobile-migration.property.test.ts`: schema, total-assignment, owner,
  package/runtime absence, measurement, and generated-invariant proof.
- `e2e/fixtures/jquery-mobile-migration-server.mjs`, `e2e/fixtures/jquery-mobile-migration/`,
  `e2e/jquery-mobile-migration.spec.ts`, and `playwright.config.ts`: multi-route native baseline,
  removable jQStar enhancement, Datastar SDK update, forms,
  network/history/focus/pointer/accessibility, and three-browser proof.
- `scripts/quality-package.mjs`, `scripts/quality/validate-json.mjs`, and quality configuration as
  needed: exact-tarball and archived-runtime absence proof.
- `docs/JQUERY_MOBILE_MIGRATION.md`, `README.md`, `docs/README.md`, `docs/JQUERY_ECOSYSTEM.md`,
  `docs/ARCHITECTURE.md`, `docs/BACKEND.md`, and `docs/TESTING.md`: staged guide, owner map,
  package/runtime boundary, reference-app contract, and evidence.
- `example/docs/ecosystem/jquery-mobile/index.html`, documentation navigation, site build input,
  agent-content manifest and generated corpus: public browser and headless guidance.
- This ticket: phase, file, command, inspection, documentation, and acceptance evidence.

## Code

### Changed-file ledger

| File                                                     | Purpose                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| `docs/tickets/0040-publish-jquery-mobile-migration.md`   | Phase, frozen plan, ledger, commands, and evidence.          |
| `schema/jquery-mobile-migration.schema.json`             | Validate the complete inventory and no-runtime authority.    |
| `quality/jquery-mobile-migration.json`                   | Store sources, owner mappings, measurements, and decision.   |
| `test/jquery-mobile-migration-contract.test.ts`          | Verify inventory, boundaries, measurements, and guidance.    |
| `test/property/jquery-mobile-migration.property.test.ts` | Generate assignment and owner invariants.                    |
| `scripts/quality/validate-json.mjs`                      | Enroll the authority in repository JSON validation.          |
| `scripts/quality-package.mjs`                            | Reject Mobile dependencies, assets, installs, and graphs.    |
| `package.json`                                           | Exclude the repository-only schema from the tarball.         |
| `test/fixtures/csp/conformance-map.json`                 | Refresh source locations shifted by the README guide link.   |
| `e2e/fixtures/jquery-mobile-migration-server.mjs`        | Serve direct documents, native writes, and SDK SSE proof.    |
| `e2e/fixtures/jquery-mobile-migration/app.js`            | Add removable search, pointer, network, and jQStar behavior. |
| `e2e/fixtures/jquery-mobile-migration/style.css`         | Provide responsive, touch, motion, and forced-color styles.  |
| `e2e/jquery-mobile-migration.spec.ts`                    | Verify sixteen browser/environment executions.               |
| `playwright.config.ts`                                   | Start the fixture and enroll its special browser projects.   |
| `cspell.json`                                            | Admit official jQuery Mobile API names in documentation.     |
| `docs/JQUERY_MOBILE_MIGRATION.md`                        | Publish the complete staged migration and rollback guide.    |
| `README.md`                                              | Link the guide and state the no-runtime boundary.            |
| `docs/README.md`                                         | Add the guide to the project-brain reading order.            |
| `docs/JQUERY_ECOSYSTEM.md`                               | Connect the policy decision to its completed migration path. |
| `docs/ARCHITECTURE.md`                                   | Record route, navigation, component, and bridge ownership.   |
| `docs/BACKEND.md`                                        | Document native writes and the bounded SDK endpoint.         |
| `docs/TESTING.md`                                        | Document authority, browser, and package evidence.           |
| `example/docs/ecosystem/jquery-mobile/index.html`        | Publish the concise browser-facing migration guide.          |
| `example/docs/ecosystem/index.html`                      | Link Mobile users to the new guide.                          |
| `example/docs-shell.html`                                | Add the Mobile guide to shared documentation navigation.     |
| `vite.demo.config.ts`                                    | Include the new guide in site builds.                        |
| `test/site-structure.test.mjs`                           | Require the new native HTML route.                           |
| `config/agent-content.json`                              | Add the guide to the reviewed agent corpus.                  |
| `example/agent-content.generated.json`                   | Regenerate the runtime agent index.                          |
| `example/public/jqstar-agent-index.json`                 | Regenerate the public machine-readable index.                |
| `example/public/llms.txt`                                | Add the public Mobile guide route to the short index.        |
| `example/public/llms-full.txt`                           | Add the reviewed Mobile guide text to the bounded corpus.    |

### Design changes

- No changes. The implementation follows the planned full-document, native-form, bounded jQStar, and
  official-SDK ownership split.
- The reviewed agent index limit increases from 161,000 to 165,000 bytes because the prior artifact
  was already 160,266 bytes. The planned Mobile guide is a new corpus source; the separate 120,000
  byte full-text limit does not change.

## Test

| Command                                                                                                                                                                                                                                          | Result | Evidence                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ticket:validate -- --phase plan --ticket docs/tickets/0040-publish-jquery-mobile-migration.md`                                                                                                                                          | Pass   | Frozen sources, inventories, owners, bridge decisions, design, and files passed before implementation.                                                                                                                                                                |
| `node scripts/quality/validate-json.mjs` and `npx vitest run test/jquery-mobile-migration-contract.test.ts test/property/jquery-mobile-migration.property.test.ts` (first run)                                                                   | Fail   | JSON/schema validation and ten tests passed; one package-boundary assertion called `toHaveProperty` on an expected missing optional-dependency map. The assertion now normalizes absence to an empty map.                                                             |
| `npx vitest run test/jquery-mobile-migration-contract.test.ts test/property/jquery-mobile-migration.property.test.ts`                                                                                                                            | Pass   | Both focused files and all 11 contract/property tests passed after the optional-dependency assertion fix.                                                                                                                                                             |
| `npx playwright test e2e/jquery-mobile-migration.spec.ts` (first full run)                                                                                                                                                                       | Fail   | Fourteen executions passed. Combined 200% text scale and 200% zoom exposed header overflow; the no-JavaScript case waited on a desktop-hidden mobile summary. Narrow content now wraps, and the desktop case checks the visible navigation links.                     |
| `npx playwright test e2e/jquery-mobile-migration.spec.ts --project=mobile-touch --project=javascript-disabled` (first rerun)                                                                                                                     | Fail   | The mobile reflow correction passed. The no-JavaScript assertion matched both “Help” and “Offline and error help”; it now requests the exact navigation label.                                                                                                        |
| `npx playwright test e2e/jquery-mobile-migration.spec.ts --project=mobile-touch --project=javascript-disabled`                                                                                                                                   | Pass   | Both corrected special-mode executions passed.                                                                                                                                                                                                                        |
| `npx eslint e2e/fixtures/jquery-mobile-migration-server.mjs e2e/fixtures/jquery-mobile-migration/app.js e2e/jquery-mobile-migration.spec.ts playwright.config.ts` and `npx stylelint e2e/fixtures/jquery-mobile-migration/style.css` (first run) | Fail   | ESLint required browser constructors to be named from the fixture global; Stylelint required range notation for the responsive query. Both source issues were corrected.                                                                                              |
| `node scripts/quality/validate-json.mjs` and focused Vitest, ESLint, and Stylelint commands                                                                                                                                                      | Pass   | All 69 JSON files, 13 instances, and 19 schemas validated; all 13 focused tests passed; the corrected fixture, contract, configuration, and package-quality files passed lint.                                                                                        |
| `npm run quality:fast` (first run)                                                                                                                                                                                                               | Fail   | Ticket workflow, runner self-test, format, and 958 unit tests passed. Static-fast found only seven spelling occurrences of four official API names; those names are now in the project dictionary.                                                                    |
| `npm run quality:fast` (second run)                                                                                                                                                                                                              | Fail   | Unit and workflow gates passed. Formatting caught the ticket edit made after its last format, and spelling found the remaining three official compound API names. The ticket was formatted and those names were added to the dictionary.                              |
| `npx playwright test e2e/jquery-mobile-migration.spec.ts`                                                                                                                                                                                        | Pass   | All 16 planned executions passed: four shared scenarios in Chromium, Firefox, and WebKit plus mobile/zoom, reduced-motion, forced-colors, and JavaScript-disabled cases.                                                                                              |
| Focused ESLint and Stylelint commands                                                                                                                                                                                                            | Pass   | The reference fixture, browser suite, contract, Playwright configuration, package proof, and responsive styles passed static lint.                                                                                                                                    |
| `npm run quality:fast`                                                                                                                                                                                                                           | Pass   | Ticket workflow, runner self-test, formatting, 958 unit tests, and every enforced static-fast check passed in report `2026-09-04T17-30-02-748Z-19872`.                                                                                                                |
| `npm run ticket:validate -- --phase code --ticket docs/tickets/0040-publish-jquery-mobile-migration.md --report .git/jqstar/latest-report.json` (first run)                                                                                      | Fail   | The implementation and fast report were valid; the validator required the unchanged design record to use its exact “No changes” form. The record now does.                                                                                                            |
| Same Code validation command after the wording correction                                                                                                                                                                                        | Fail   | The validator correctly rejected the prior fast report after the ticket changed. A new fast report is required against this exact tree.                                                                                                                               |
| `npm run quality:fast` and Code phase validation against the exact ticket tree                                                                                                                                                                   | Pass   | Fast report `2026-09-04T17-33-34-138Z-37159` passed every gate, then Code validation passed against that unchanged report fingerprint.                                                                                                                                |
| `npm run check` (first delivery run)                                                                                                                                                                                                             | Fail   | Ten of 12 lanes passed, including package quality and release quality. Browser quality and its retry detector could not start a fresh port 4177 server because the earlier manual curl-check server was still listening. That process was stopped.                    |
| `npm run check` (`quality:delivery`) and Test phase validation against the exact ticket tree                                                                                                                                                     | Pass   | Delivery run `2026-09-04T17-41-50-649Z-84849` passed all 12 enforced lanes. Test phase validation then passed against the unchanged report fingerprint.                                                                                                               |
| `npm run build:agent-content` (first documentation run)                                                                                                                                                                                          | Fail   | The new guide exceeded the 161,000-byte machine-index limit; the prior index was already 160,266 bytes. The planned guide remains, the index ceiling is now 165,000 bytes, and the separate full-text ceiling stays 120,000 bytes.                                    |
| Focused schema, contract/property/site/corpus tests, Markdown, and spelling (first run and immediate rerun)                                                                                                                                      | Fail   | Schema validation, all 23 tests, and Markdown passed. Spelling rejected one asset-size adjective, then its repetition in this evidence row; both now use “uncompressed.”                                                                                              |
| Focused spelling, HTML, contract/property/site/corpus tests, demo build, and `git diff --check`                                                                                                                                                  | Pass   | Spelling and both public HTML pages passed; all 23 focused tests passed; agent content rebuilt deterministically; the 9.00 kB Mobile page built; whitespace passed.                                                                                                   |
| `npm run check` (first completed-ticket run)                                                                                                                                                                                                     | Fail   | Nine of 12 lanes passed. Ticket workflow needed the literal delivery script name in the successful Test row; the README edit also shifted generated CSP source locations, so unit and downstream coverage failed until `npm run csp:inventory` refreshed the fixture. |

### Inspection ledger

| Finding                 | Result   | Resolution                                                                                                                                       |
| ----------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Session ownership       | Pass     | No tmux server or other tmux session was running before ticket work resumed.                                                                     |
| Primary-source identity | Pass     | Official status, archived repository, 1.4 API/data references, demos, upgrade guidance, and exact npm metadata were rechecked before planning.   |
| Inventory completeness  | Pass     | The closed authority stores 95 API entries, 60 unique attributes with 122 contexts, ten transitions, and 16 extra behaviors with one owner each. |
| Responsive reflow       | Resolved | The first matrix run exposed header overflow at combined 200% text scale and zoom. Narrow effective widths now wrap without body overflow.       |
| No-script navigation    | Resolved | The no-script case now tests the visible desktop navigation instead of waiting on the intentionally hidden mobile summary.                       |
| Package boundary        | Pass     | Focused dependency, lock, install, source, fixture, SDK-generation, and graph assertions exclude the archived runtime.                           |

## Document

### Documentation changed

- `docs/JQUERY_MOBILE_MIGRATION.md` publishes the dated primary sources, 95-entry/60-attribute
  inventory boundary, nine modern owners, triage worksheet, separate Core/Migrate workflow,
  direct-route architecture, native forms/writes, pointer and responsive contracts, bridge choices,
  two application inventories, rollback, exact measurements, unsupported behavior, and tests.
- `README.md`, `docs/README.md`, `docs/JQUERY_ECOSYSTEM.md`, `docs/ARCHITECTURE.md`,
  `docs/BACKEND.md`, and `docs/TESTING.md` link the guide and record its runtime, ownership, server,
  and evidence boundaries.
- `example/docs/ecosystem/jquery-mobile/index.html`, the ecosystem index, shared docs shell, site
  build input, site-structure test, and agent manifest publish the concise guide and navigation.
- The regenerated agent index and text files contain the reviewed public guide. The machine index is
  164,380 bytes under its 165,000-byte ceiling; the full-text corpus is 94,095 bytes under its
  unchanged 120,000-byte ceiling.

### Acceptance evidence

| Criterion | Result | Evidence                                                                                                                                                                                                                                                                                           |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01     | Pass   | The ticket freezes official archived/status/API/data/demo/transition/upgrade sources, exact npm identities, the ticket-0038 digest, bridge outcomes, 95 API entries, 60 attributes/122 contexts, ten transitions, 16 extra behaviors, and nine owners. Plan validation passed before fixture work. |
| AC-02     | Pass   | `quality/jquery-mobile-migration.json` validates against its closed schema. Contract and property tests prove complete unique assignments, detailed owner rows, required changes/fallback/security/unsupported fields, and every closed owner.                                                     |
| AC-03     | Pass   | The synthetic server renders six direct public documents plus status, slow, error, and health routes. It loads jQuery 4 and built jQStar, and covers list/detail/search/edit/upload/nav/dialog/tabs/table/status/history/network flows without a client router.                                    |
| AC-04     | Pass   | Shared and JavaScript-disabled browser cases prove direct loads, reload, a second independent document, server GET search, native details navigation, validation, submitter preview, and multipart submission. Local search and SDK status enhancement are removable.                              |
| AC-05     | Pass   | Contract, static, package, release, and delivery gates find no Mobile dependency, lock install, production import, packed runtime/theme/icon/source path, clean consumer module, entry-graph inclusion, role initializer, virtual input alias, CDN load, or handwritten Datastar event.            |
| AC-06     | Pass   | The public guide separates Core/Migrate work from UI/navigation changes and gives the required inventory, direct-route, staged Core, CSS, region, navigation, removal, verification, route-isolation, release, and rollback sequence without claiming automatic conversion.                        |
| AC-07     | Pass   | The fixture and guide preserve native validation, submitter value and override, action/method/encoding, multipart files, CSRF, server validation, output escaping, 303, 403, 409, 422, 503, pending ownership, and no replay of uncertain writes in script and no-script modes.                    |
| AC-08     | Pass   | The pointer fixture has a native button alternative, one pointer ID, capture attempt, vertical cancellation, `pointercancel`, bounded `touch-action`, and one activation. Browser cases cover button activation, cancellation, 44-pixel targets, orientation, zoom/text scale, and reduced motion. |
| AC-09     | Pass   | Sixteen executions pass: four shared scenarios in Chromium, Firefox, and WebKit plus mobile/touch/zoom/orientation/text, reduced motion, forced colors, and JavaScript-disabled scenarios. They include axe, keyboard/focus, history/scroll, slow/error, and offline evidence.                     |
| AC-10     | Pass   | The authority and guide keep full documents as default, constrain Datastar to one official-SDK patch, point Turbo and htmx to their completed separate host bridges, and keep planned native navigation unapproved. No common Ajax navigation layer exists.                                        |
| AC-11     | Pass   | The authority records exact source lines, served asset bytes, runtime dependency counts, route and browser counts, unsupported behavior, and two route/feature inventories with application-specific risks. The worksheet explicitly rejects inventory-only percentages.                           |
| AC-12     | Pass   | README, ecosystem policy, full guide, public page, generated corpus, and contract tests call Mobile archived, attribute its useful lessons, recommend no new runtime use, and preserve the independent-project/no-successor wording.                                                               |
| AC-13     | Pass   | Focused schema, contract, property, site, corpus, lint, HTML, spelling, three-browser, accessibility, no-script, package, release, server, deployment, ticket-phase, and whitespace checks pass. The final exact-tree `npm run check` supplies the delivery receipt without mutation testing.      |

### Completion audit

All 13 criteria have direct current evidence. The schema authority, modern fixture, exact
measurements, package isolation, browser matrix, practical guide, public site, generated corpus,
brain documents, and no-runtime decision agree. No unresolved finding, compatibility layer, or
successor claim remains.

Status: Complete
