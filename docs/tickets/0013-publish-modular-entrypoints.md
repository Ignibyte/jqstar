---
id: 0013
title: Publish modular core, UI, and Datastar entry points
status: done
created: 2026-08-30
updated: 2026-09-01
---

# 0013: Publish modular core, UI, and Datastar entry points

## Plan

### Problem

The package has one JavaScript entry that imports jQuery, auto-installs the runtime, constructs
every UI controller, and embeds Datastar behavior. Consumers cannot install only the reactive HTML
core, ship UI without Datastar, or prove that optional code is absent. A nominal `core` export would
still bundle UI because `installStar()` constructs `createUI()`, and it would misrepresent the
current required `StarStatic.ui` and global jQuery declarations.

### Current evidence

- `src/index.ts` imports jQuery and calls `installStar(jQuery)` at module evaluation.
- `src/runtime.ts` imports `createUI()`, constructs every controller during installation, registers
  five Datastar-aware backend actions, and hard-codes the runtime version separately from
  `package.json`.
- UI construction currently opens a temporary global action-registration scope while 165 `@ui.*`
  actions register from controller factories. The document host owns auto-enhancement, observers,
  listeners, and controller disposal.
- `vite.config.ts` emits only `dist/jquery-star.js` and `dist/jquery-star.umd.cjs`; the latter
  serves both CommonJS and the `jQueryStar` browser global.
- `package.json` exports only `.` and `./ui.css`. Its `sideEffects` list marks the root artifacts
  and CSS; future subpaths remain explicitly internal in `quality/public-baseline.json`.
- API Extractor currently emits one root declaration rollup and then appends global `JQuery`/
  `JQueryStatic` augmentation. A core-only type import would incorrectly receive that global claim
  unless declaration ownership is split.
- The installed-package harness already has named dormant contracts for `core` tree shaking and
  future subpaths, plus ESM, CommonJS, NodeNext, Bundler, QUnit, module-browser, UMD-browser,
  contents, size, `publint`, and Are the Types Wrong proof.
- Tickets 0010–0012 define observation, request middleware, and `core.generic`/`core.datastar`
  profiles. Ticket 0014 will build testing conformance on the installed modular surface.

### Scope

- Publish side-effect-free ESM and CommonJS `jquery-star/core` with an explicit installer, kernel,
  applications, reactivity, expressions, actions, directives/helpers, observations, request
  middleware, the generic JSON/HTML profile, patches, and render lifecycle.
- Split core types from root global augmentation. The explicit core installer returns the same
  supplied jQuery object with a typed core-only `star` surface; importing core types alone does not
  claim that installation occurred.
- Publish side-effect-free ESM and CommonJS `jquery-star/ui` as the official `ui` plugin and typed
  controller facade. Importing it does not inspect `document`, install listeners, register actions,
  or inject CSS until the plugin is installed into a core kernel.
- Keep UI ownership under `$.star.ui` and documented `data-jqs`/`@ui.*` contracts without claiming
  the jQuery UI `$.ui` namespace, Widget Factory data keys, or ThemeRoller class names.
- Publish side-effect-free ESM and CommonJS `jquery-star/datastar` as the installable
  `core.datastar` protocol plugin with no UI import or document work at module evaluation.
- Keep `jquery-star` ESM and UMD/CommonJS as the auto-installing core + Datastar + UI compatibility
  entry. Preserve its export names, global type augmentation, `jQueryStar` browser global, and
  `$.star.ui` facade.
- Preserve `$.star.ui` and global jQuery types from the root entry.
- Define exact import/require/type export conditions, `.js`/`.cjs` artifacts, declaration rollups,
  source maps, package files, `sideEffects`, and peer requirements for every entry. Block private
  source and undeclared deep imports through the export map.
- Generate all runtime and entry-facade versions from `package.json`; keep the plugin API version a
  separately reviewed compatibility constant.
- Activate the ticket-0004 installed core tree-shaking contract with positive capabilities, negative
  sentinels, raw/gzip size budgets, and dependency-graph inspection.
- Publish the minimal external render-lifecycle adapter from `core`: discover owned roots in
  outgoing nodes; preserve `data-jqs-preserve` roots plus exact same-document live roots explicitly
  supplied by an external renderer; destroy all other outgoing roots before mutation; enhance
  incoming roots after commit; await the render barrier; and associate the work with an operation
  ID.
- Expose idempotent core/root disposal that attempts every owned cleanup and returns a bounded,
  immutable post-disposal report. The report names resource categories and owners without exposing
  live kernel collections; cleanup failures retain the same report on a typed aggregate error.
- Treat the 0.4 entry points as previews. Ticket 0017 owns their stable 1.0 designation.

### Out of scope

- Publishing stores, resources, navigation, testing, CSP, or DevTools from the root bundle.
- Publishing `jquery-star/testing`, CSP, Turbo, htmx, stores, resources, navigation, inspection, or
  DevTools entry points.
- Producing UMD globals for `core`, `ui`, `datastar`, or optional future packages. No-build/script
  tag users retain the composed root UMD build.
- Renaming the npm package, CLI, `data-jqs` attributes, public jQStar brand, local checkout, or
  repository in this distribution refactor.
- Stabilizing the preview subpaths for 1.0, removing the root compatibility entry, or changing the
  supported jQuery peer range.
- Implementing Turbo or htmx event bridges. Tickets 0016, 0036, and 0037 consume the render adapter.

### Dependencies

- Tickets 0004 and 0008 through 0012.

### Acceptance criteria

- [x] [AC-01] Importing `jquery-star/core` in Node or a browser performs no jQuery installation,
      global assignment, document access, listener/observer registration, application boot, UI
      construction, protocol installation, or CSS injection. Its explicit installer provides the
      complete core and `core.generic` runtime against the caller's jQuery instance.
- [x] [AC-02] Core declarations expose a typed installed jQuery return/facade without ambient global
      augmentation. Merely importing core types does not add `star` to unrelated jQuery values; root
      declarations retain the established global `JQuery` and `JQueryStatic` augmentation.
- [x] [AC-03] `jquery-star/ui` exports one immutable official plugin and controller types.
      Installing it transactionally creates the same `$.star.ui` facade, `@ui.*` actions,
      auto-enhancement, listeners, observers, services, controller behavior, and exactly-once
      disposal as the root baseline; importing or failed installation leaves none of them.
- [x] [AC-04] UI never registers or claims `$.ui`, `$.widget`, Widget Factory method/data contracts,
      ThemeRoller classes, or jQuery UI package identity. `data-jqs`, `data-part`, native HTML,
      documented state attributes, and `@ui.*` remain the only shipped UI contract.
- [x] [AC-05] `jquery-star/datastar` exports one immutable official plugin that installs the
      complete `core.datastar` profile from ticket 0012 without UI/controller/CSS imports or
      document work at module evaluation. Generic core requests remain available without it.
- [x] [AC-06] The root entry composes core, Datastar, then UI exactly once and retains ticket-0003
      runtime behavior, request bytes, legacy events, exports, global augmentation, ESM,
      UMD/CommonJS, script-tag global, CDN/no-build behavior, and `$.star.ui` identity.
- [x] [AC-07] Package exports publish root ESM and UMD/CommonJS plus core/UI/Datastar ESM and
      CommonJS with matched `.d.ts`/`.d.cts` declarations and source maps. Node import/require,
      NodeNext, Bundler, browser modules, `publint`, Are the Types Wrong, package contents, and
      undeclared-deep-import refusal all pass.
- [x] [AC-08] `sideEffects` marks only the auto-installing root artifacts and UI CSS. Core, UI, and
      Datastar plugin modules remain side-effect-free; bundlers retain explicitly installed plugins
      and remove unreferenced ones.
- [x] [AC-09] A packed core-only consumer executes applications, helpers/directives, observations,
      middleware, generic JSON/HTML requests, patches, and render lifecycle while excluding UI,
      Datastar, persistence, resources, navigation, CSP, testing, inspection, registry, server, and
      website sentinels. Raw/gzip bundle budgets ratchet from the first reviewed artifact.
- [x] [AC-10] Root, core, UI, Datastar, UMD, declarations, source maps, package metadata,
      CLI-visible version, and runtime facades derive one exact package version. The independently
      versioned plugin API remains explicit and consistent across entries.
- [x] [AC-11] The core render adapter opens one single-use operation with an ID; discovers owned
      roots without exposing application maps; preserves `data-jqs-preserve` roots and validated
      same-document live roots explicitly supplied by the external renderer; accepts one or more
      contained pre-mutation removal boundaries while deduplicating nested/overlapping ownership;
      destroys all other outgoing roots deepest-first exactly once; rejects wrong-document/order/
      terminal reuse; boots explicitly supplied incoming roots after commit; and resolves only after
      observer, plugin, directive/UI, task, and reactive enhancement barriers settle.
- [x] [AC-12] Render failure preserves the original mutation error while attempting every cleanup,
      settles the barrier once, and leaves no application/resource leak. Preserved roots retain DOM
      identity, state, effects, focus, values, handlers, and plugin/UI records without duplicate
      enhancement.
- [x] [AC-13] Public metadata and documentation label `core`, `ui`, and `datastar` as 0.4 previews,
      explain root compatibility versus explicit installation, list formats/side effects, and make
      no jQuery UI successor or stable-1.0 claim. Full focused and installed-package matrices,
      coverage/property/static/browser/package/release gates, `npm run check`, and
      `git diff --check` pass without mutation testing.
- [x] [AC-14] Core and root expose the same idempotent public disposal operation. It attempts every
      application, plugin, request, task, observer, listener, subscription, effect, hook, and
      service cleanup; releases installation ownership; and returns a frozen, JSON-safe report of
      attempted, released, failed, and remaining resources by exact category and owner. A cleanup
      failure throws a typed aggregate carrying that report after every cleanup was attempted.

### Design

Split installation into a core factory and explicit composition. `installStarCore($, options?)`
claims one document/kernel, installs core directives/actions plus `core.generic`, augments the
supplied jQuery object at runtime, and returns that same object with a core-only TypeScript surface.
It imports no ambient jQuery value. Repeated installation on the same jQuery object is idempotent
only when the requested core configuration is compatible; a different document, expression engine,
or core option fails before mutation.

The root entry imports the peer jQuery value, calls the core installer, then transactionally
installs the official Datastar and UI plugins before exporting the compatibility API. Root
`installStar($)` performs the same composition for caller-supplied jQuery and retains its current
behavior. The root alone owns ambient jQuery declaration augmentation and import-time installation.

Refactor UI construction so registration flows through the plugin registrar rather than a global
registration stack. The UI plugin stages all `ui.*` actions and returns the complete controller
facade; its application hook/document-host service installs auto-enhancement only after commit.
Every listener, observer, timer, active controller, and service remains kernel-owned and disposable.
The Datastar entry exports the official profile plugin from ticket 0012 with no UI import.

Build the root UMD separately from a multi-entry ESM/CommonJS build for core, UI, and Datastar.
Every subpath has explicit import/require/type targets and source maps. API Extractor produces one
reviewed report and declaration pair per public JavaScript entry. Root declaration generation alone
adds global bridges; core exports named installed-jQuery interfaces instead.

Generate a virtual/build-time version constant from `package.json` for runtime facades and built
artifacts. Package tests compare every entry, declaration, source map, root global, CLI output, and
manifest to the source package version. `STAR_PLUGIN_API_VERSION` remains separate because package
releases need not change the plugin protocol.

Publish `createRenderAdapter()` from core. `begin(root, { preserveRoots? })` validates same-document
ownership and returns a single-use transaction with `operationId`, `preservedWithin(node)`,
`beforeRemove(node)`, `commit(incomingRoots?)`, and `fail(error)`. Preservation discovery returns
only `data-jqs-preserve` roots and exact live roots the caller supplied; supplied roots must belong
to the kernel document, be contained by the outgoing boundary, and remain connected when the
transaction begins. This lets a Turbo/htmx bridge map a host library's documented permanent-element
matches without publishing a generic selector callback or application map. A transaction may receive
multiple `beforeRemove()` calls before commit because a host can report per-element cleanup; it
validates containment, deduplicates repeated and overlapping boundaries, and delegates each owned
root to the kernel's private deepest-first release exactly once. `commit` boots only caller-supplied
unowned incoming application roots, then awaits `whenEnhanced()`; surviving applications and
installed UI/plugins enhance inserted subtrees through their existing observers/hooks. No
application collection or patch implementation becomes public.

The installed core surface also exposes `dispose()`. Disposal changes the installation to a terminal
state, rejects new work, attempts every registered cleanup even after individual failures, and
removes jQuery/kernel ownership only after the cleanup sweep. It returns a frozen, JSON-serializable
`StarDisposalReport` containing exact categories and stable owner identifiers for attempted,
released, failed, and remaining resources. Repeated calls return the same terminal report.
`StarDisposalError` aggregates cleanup failures and carries that report. Neither type provides
callbacks, DOM nodes, application instances, or a live kernel/resource inspection API.

### Decisions

- jQStar is the public product. `jquery-star` is the npm package, `jqstar` the CLI/repository name,
  and `data-jqs` the UI root convention. The local `jqdatastar` checkout name remains legacy and is
  unrelated to package entry points.
- The root stays auto-installing and compatibility-first. Modular entries are explicit and
  side-effect-free.
- Core, UI, and Datastar ship ESM and CommonJS. Only the composed root ships UMD because it is the
  supported no-build/script-tag surface.
- Core installs `core.generic`; Datastar is an explicit plugin. The root composes both and keeps
  `core.datastar` as the default request profile.
- Only root declarations augment ambient jQuery. Core users receive typed augmentation from the
  explicit installer return value, preventing type-only imports from claiming runtime work.
- UI JavaScript and UI CSS remain separate. Installing the plugin never injects styles.
- The render adapter coordinates ownership around an external commit but never performs the DOM
  replacement itself. Turbo/htmx-specific event binding remains in their tickets.
- External preservation uses exact element identities supplied at transaction start, not a selector
  or predicate retained by core. Bridges own matching `data-turbo-permanent`, `hx-preserve`, or
  future host-library conventions and must prove that the external renderer actually retains each
  supplied root.
- Public disposal reports terminal facts only. They support embedders and testing without becoming
  the live inspection surface reserved for ticket 0030.
- Incoming application roots are explicit transaction inputs. The adapter does not infer application
  roots from nested `data-signals` or invent a second auto-boot marker.
- Subpaths are preview APIs until ticket 0017 completes the stable-platform audit.

### Security and accessibility

- Export-map closure prevents consumers from depending on private kernel, registry, server, or
  generated paths. Optional plugins receive only their public registrar capabilities.
- Core import has no ambient document/global side effect. Installer and render adapter validate
  document ownership before registering resources or touching DOM.
- The render adapter destroys outgoing ownership before external mutation, rejects cross-document
  nodes, preserves only `data-jqs-preserve` or exact validated caller-supplied roots, and cannot
  expose application maps. It does not execute caller selectors or predicates inside kernel
  ownership traversal.
- Disposal reports omit callback values, DOM content, request payloads, signal values, and object
  references. Stable owner identifiers and resource categories are diagnostic metadata, not an
  authority-bearing inspection handle.
- Splitting UI does not relax keyboard, focus, touch, reduced-motion, forced-color, zoom/reflow,
  JavaScript-disabled, or accessibility requirements. The complete UI three-browser matrix runs
  against both root composition and explicit core + UI installation.
- The project makes no jQuery UI, OpenJS, or official-successor claim. Ecosystem stewardship remains
  governed by ticket 0038.

### Risks

- Global jQuery declaration augmentation can appear when a consumer imports only core types. Decide
  which entry owns augmentation and test both installed and explicit installer use.
- Vite library mode may not fit all entry/format combinations. The build can move to a lower-level
  Rollup configuration if the consumer contract requires it.
- UI's temporary action-registration stack is incompatible with a reusable plugin definition and can
  hide import-time coupling. Replace it with explicit registrar injection and test two isolated
  documents/kernels.
- Root compatibility and explicit modular composition can accidentally create different facade or
  action identities. Run the same conformance vectors against both installation paths.
- Conditional exports can pass local TypeScript yet fail installed Node resolution. Test the packed
  artifact under import, require, NodeNext, Bundler, `publint`, and Are the Types Wrong.
- Tree-shaking assertions based only on size can false-green. Combine budgets with source sentinels,
  module-graph inspection, executed core behavior, and forbidden dependency checks.
- A render adapter can double-destroy or double-enhance if transaction order is loose. Make the
  state machine single-use and test every invalid ordering, failure, and preservation path.
- Repeated host cleanup callbacks can describe the same nested subtree. Track released root
  identities per transaction and make overlap idempotent without accepting calls after terminal
  settlement.
- A bridge can claim a root will be preserved and then let the external renderer remove it. At
  commit, verify supplied-root identity/connectivity; release any root not actually retained and
  report the mismatch without duplicating surviving ownership.
- Cleanup callbacks can fail or recursively request disposal. Mark disposal terminal before the
  sweep, attempt each resource exactly once, aggregate failures, and memoize the final report/error.
- Splitting artifacts changes package file counts and budgets. Apply only the documented
  first-baseline/ratchet rules and do not move unrelated root or CSS ceilings.

### Verification plan

- Validate this Plan before changing behavior.
- Refactor and run the same kernel/application/plugin/UI/Datastar conformance against root
  auto-install and explicit modular composition, including two documents and repeated compatible/
  incompatible installation.
- Add render-adapter unit/property/browser matrices for operation IDs, ownership discovery,
  preservation, deepest-first release, invalid order/reuse, commit/failure, explicit incoming roots,
  observer/plugin/UI/directive/task barriers, focus/value/handler identity, and leaks.
- Cover caller-supplied preservation with cross-document, disconnected, outside-boundary, duplicate,
  nested, actually-retained, and promised-but-removed roots. The last case must clean up the missing
  root and surface a stable mismatch diagnostic.
- Add disposal matrices for successful, repeated, recursive, partially failing, and already-released
  resources; assert exact terminal reports, complete cleanup attempts, ownership release, frozen
  JSON-safe output, and refusal of new work without inspecting private kernel maps.
- Build a real tarball and test root/core/UI/Datastar under Node ESM, required CommonJS, QUnit,
  TypeScript NodeNext/Bundler, browser modules in Chromium/Firefox/WebKit, and root UMD script tags.
- Run `publint` and Are the Types Wrong across every export; inspect source maps, declarations,
  global augmentation, private deep-import refusal, side-effect metadata, peer resolution, and one
  version source.
- Bundle and execute core-only, core+UI, core+Datastar, and root consumers. Record raw/gzip sizes
  and inspect module graphs/forbidden sentinels so optional code exclusion is proved, not inferred.
- Run existing 0.1 public baseline, API reports, package contents, self-hosted site, CLI/registry,
  UI/accessibility, request bytes, Datastar SDK, observation, middleware, profile, and release
  reproducibility checks.
- Run focused suites, `npm run quality:fast`, ticket Code validation, coverage, properties,
  three-engine browser quality, package quality, release reproducibility, `npm run check`, ticket
  Test/Document validation, and `git diff --check`.

### Planned files

- `src/core.ts`: Side-effect-free explicit core installer and core-only public exports.
- `src/index.ts`: Root compatibility composition, auto-install side effect, and root exports/global
  contract.
- `src/runtime.ts`, `src/types.ts`: Split core/root static types, remove direct UI construction,
  return typed installed jQuery, and expose render lifecycle plus public disposal reports/errors.
- `src/ui/index.ts`, `src/ui/**/*.ts`: Export one official UI plugin/facade, inject registrar
  capabilities explicitly, and remove the temporary global action-registration stack.
- `src/datastar.ts`, `src/protocol-datastar.ts`: Export the side-effect-free official Datastar
  profile plugin without UI imports.
- `src/render-adapter.ts`, `src/kernel.ts`, `src/plugin.ts`: Public render transaction state
  machine, private ownership delegation, explicit incoming boot, plugin hooks, barriers, terminal
  disposal, and bounded cleanup reporting.
- `src/version.ts`, build/test configuration: Inject the package version from one manifest source
  into every runtime artifact and consumer environment.
- `vite.config.ts`, `tsconfig.build.json`, `config/api-extractor*.json`, `scripts/build-types.mjs`:
  Multi-entry ESM/CommonJS/root UMD builds, source maps, declaration pairs, global-root bridge, and
  reviewed API reports.
- `package.json`, `package-lock.json`: Export map, packed files, side-effect declarations, preview
  metadata, and build scripts.
- `test/{runtime-install,kernel,plugin,ui-host,public-baseline}.test.ts`, UI/request/profile suites:
  Root/modular parity, isolation, ownership, compatibility, and no-import-side-effect proof.
- `test/render-adapter.test.ts`, `test/property/render-adapter.property.test.ts`, `e2e/*.spec.ts`:
  Render lifecycle, preservation, failure, browser behavior, and generated state-machine proof.
- `scripts/quality-package.mjs`, `scripts/smoke-package-files.mjs`,
  `test/package-release-hardening.test.mjs`: Installed export/type/format/version/side-effect/
  tree-shaking/package-content contracts.
- `quality/`, `schema/`, `etc/jquery-star*.api.md`: Production census, public baselines, measured
  budgets, API review, and report schemas for all published entries.
- `README.md`, `docs/{ARCHITECTURE,BACKEND,PROJECT,RUNTIME_OWNERSHIP,TESTING}.md`: Preview usage,
  root/modular distinction, formats, versioning, render bridge, ownership, and evidence.
- `docs/tickets/0013-publish-modular-entrypoints.md`: Phase state, ledger, commands, findings, and
  criterion evidence.

## Code

### Changed-file ledger

| File                                                                                   | Purpose                                                                                                  |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `docs/tickets/0013-publish-modular-entrypoints.md`                                     | Track the active Code phase and its evidence.                                                            |
| `src/fetch.ts`                                                                         | Resolve the kernel default without importing optional Datastar code.                                     |
| `src/datastar.ts`                                                                      | Define the side-effect-free official Datastar profile plugin.                                            |
| `src/kernel.ts`                                                                        | Make generic protocol ownership core-only and release installation claims.                               |
| `src/plugin.ts`                                                                        | Mark framework plugins, stage document effects, and activate them transactionally after validation.      |
| `src/protocol.ts`                                                                      | Support an optional official Datastar profile and a kernel-selected default.                             |
| `src/runtime.ts`                                                                       | Own side-effect-free explicit core installation and the supplied jQuery facade.                          |
| `src/compatibility.ts`                                                                 | Compose core, Datastar, and UI for the legacy root installer.                                            |
| `src/core.ts`                                                                          | Define the side-effect-free explicit core public surface.                                                |
| `src/index.ts`                                                                         | Keep root import-time installation on the compatibility composition.                                     |
| `src/types.ts`                                                                         | Split the core facade and explicit installed-jQuery type from the composed root facade.                  |
| `src/disposal.ts`                                                                      | Define bounded frozen terminal reports and the typed aggregate disposal failure.                         |
| `src/render-adapter.ts`                                                                | Publish the single-use host-neutral external render transaction.                                         |
| `src/dom.ts`, `src/declarative.ts`                                                     | Keep DOM type checks and preserved mutation work scoped to each owner document.                          |
| `src/version.ts`, `tsconfig.json`                                                      | Derive runtime and official-plugin versions from the package manifest.                                   |
| `vite.config.ts`, `vite.umd.config.ts`                                                 | Build modular ESM/CommonJS entries separately from the root UMD global.                                  |
| `package.json`, `package-lock.json`                                                    | Publish explicit root/core/UI/Datastar export conditions, preview metadata, and side effects.            |
| `config/quality-budgets.json`, `schema/quality-budgets.schema.json`                    | Establish package and installed core/root size ratchets.                                                 |
| `config/api-extractor.{core,ui,datastar}.json`                                         | Review one declaration/API surface per modular entry.                                                    |
| `scripts/build-types.mjs`                                                              | Roll up matched ESM/CommonJS declarations and isolate root global augmentation.                          |
| `scripts/quality-package.mjs`, `scripts/smoke-package-files.mjs`                       | Execute every installed format/type entry and graph/size sentinel.                                       |
| `bin/jqstar.mjs`, `test/cli.test.ts`                                                   | Expose and verify the manifest-derived CLI version required by the public version contract.              |
| `.prettierignore`                                                                      | Keep every generated API Extractor report byte-for-byte under drift control.                             |
| `src/ui.ts`, `src/ui/index.ts`                                                         | Publish the immutable official UI plugin with transactionally activated document work.                   |
| `src/ui/*.ts`                                                                          | Inject the plugin action registrar into every controller factory without module-global state.            |
| `src/registry.ts`                                                                      | Remove the module-global UI action-registration stack.                                                   |
| `test/kernel.test.ts`                                                                  | Verify document ownership is reusable only after terminal disposal.                                      |
| `test/declarative.test.ts`                                                             | Prove preserved render subtrees retain request and directive ownership during parent cleanup.            |
| `test/plugin.test.ts`                                                                  | Cover document-host staging, cancellation, invalid activation, and unavailable-host rollback contracts.  |
| `test/protocol-datastar.test.ts`                                                       | Install Datastar explicitly in the real-kernel profile harness.                                          |
| `test/protocol.test.ts`                                                                | Treat Datastar as optional while retaining mandatory generic validation.                                 |
| `test/runtime-install.test.ts`                                                         | Exercise the composed compatibility installer from its new module.                                       |
| `test/runtime.test.ts`                                                                 | Exercise runtime behavior through compatibility composition.                                             |
| `test/ui-host.test.ts`                                                                 | Keep internal UI host tests on the implementation module, not the public plugin entry.                   |
| `test/registry.test.ts`                                                                | Verify registry isolation without a process-global registration scope.                                   |
| `test/modular-entrypoints.test.ts`                                                     | Prove import purity, explicit composition, rollback, reserved namespaces, and two-document UI isolation. |
| `test/render-adapter.test.ts`                                                          | Verify preservation, ordering, failure, barrier, incoming boot, focus, and terminal state.               |
| `test/property/render-adapter.property.test.ts`                                        | Generate nested preservation/boundary/terminal state-machine sequences.                                  |
| `test/public-baseline.test.ts`, `quality/public-baseline.json`                         | Freeze the expanded root, subpaths, types, formats, environments, and artifact.                          |
| `test/package-release-hardening.test.mjs`                                              | Keep all declaration/API rollups and package conditions under drift control.                             |
| `e2e/fixtures/runtime.ts`, `e2e/quality-contracts.spec.ts`                             | Execute render preservation in Chromium, Firefox, and WebKit.                                            |
| `etc/jquery-star*.api.md`                                                              | Review the root, core, UI, and Datastar declaration surfaces independently.                              |
| `README.md`, `docs/{README,ARCHITECTURE,BACKEND,PROJECT,RUNTIME_OWNERSHIP,TESTING}.md` | Document preview usage, boundaries, rendering, disposal, and evidence.                                   |
| `vitest.config.ts`, `.dependency-cruiser.cjs`                                          | Resolve source self-imports and allow only the explicit public UI entry to reach UI internals.           |
| `vitest.coverage.config.ts`, `quality/production-census.json`                          | Exercise source self-imports through one runtime under coverage and classify the separate UMD build.     |
| `schema/package-report.schema.json`                                                    | Validate the active modular exports, consumers, and core bundle sentinel in package evidence.            |

### Design changes

- A kernel now starts with `core.generic` only. The official Datastar plugin registers
  `core.datastar` and root composition selects it as the default; an explicit core installation
  therefore cannot retain an accidental Datastar import.
- Kernel disposal releases its document and expression-engine claims, as required by the public
  terminal disposal contract. Existing tests that expected a disposed document to remain claimed
  must move to the new reinstall-after-disposal contract.
- Completion audit found that the CLI did not expose the package version required by AC-10. Add a
  manifest-derived `--version` path and prove both the source CLI and the installed tarball output.

## Test

| Command                                                                                                                                                                                                     | Result                     | Evidence                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx tsc --noEmit --pretty false`                                                                                                                                                                           | Pass                       | The initial protocol/kernel boundary remains type-safe.                                                                                                                                                                              |
| `npx vitest run test/protocol.test.ts test/protocol-datastar.test.ts test/fetch.test.ts test/kernel.test.ts --config vitest.config.ts`                                                                      | Fail (expected transition) | Ten assertions still encoded the former always-Datastar kernel/default and permanent disposed-document claim. The official plugin/root composition and updated core contracts are the corrective action.                             |
| `npx vitest run test/plugin.test.ts test/ui-host.test.ts test/runtime-install.test.ts test/runtime.test.ts test/fetch.test.ts test/protocol-datastar.test.ts test/kernel.test.ts --config vitest.config.ts` | Fail                       | The first UI-plugin run sent empty UI registrations through middleware/profile validators that require dotted third-party namespaces. Empty capability groups are now omitted from those registries.                                 |
| `npx vitest run test/kernel.test.ts test/modular-entrypoints.test.ts test/runtime-install.test.ts --config vitest.config.ts`                                                                                | Pass                       | 37 tests cover explicit composition plus successful, recursive, repeated, failing, and reusable-after-disposal installation.                                                                                                         |
| `npx vitest run test/render-adapter.test.ts test/property/render-adapter.property.test.ts --config vitest.config.ts`                                                                                        | Pass                       | Five focused scenarios and 100 generated state-machine sequences cover render preservation, ordering, failure, and terminal reuse.                                                                                                   |
| `npx playwright test e2e/quality-contracts.spec.ts --project=desktop-chromium --project=desktop-firefox --project=desktop-webkit --grep "external render preservation"`                                     | Pass                       | All three engines retain exact DOM/application identity, state, focus, value, handlers, and explicit incoming boot.                                                                                                                  |
| `npm run test:package:quality`                                                                                                                                                                              | Fail, then pass            | Initial reviewed size ratchets rejected the expanded tarball/root bundle; narrow measured ceilings were recorded, then all 13 installed-package checks passed across three browsers.                                                 |
| `npm run quality:fast`                                                                                                                                                                                      | Pass                       | Run `2026-09-01T17-52-37-440Z-67667` passed workflow self-tests, formatting, the complete unit suite, and all 21 fast static checks.                                                                                                 |
| `npm run quality:delivery`                                                                                                                                                                                  | Fail                       | Run `2026-09-01T17-54-02-824Z-75588` passed every enforced gate except coverage and package-report validation. Coverage used a second root runtime under instrumentation; the package schema still described the pre-modular report. |
| `npx vitest run test/declarative.test.ts test/kernel.test.ts test/plugin.test.ts test/protocol.test.ts test/render-adapter.test.ts test/modular-entrypoints.test.ts --config vitest.config.ts`              | Pass                       | 181 focused tests cover preserved declarative ownership, bounded disposal reports, render validation/failure barriers, plugin resource cancellation, protocol namespace rules, and modular installation.                             |
| `npx tsc --noEmit --pretty false`                                                                                                                                                                           | Pass                       | Source, tests, modular facades, report types, and new failure-path fixtures remain type-safe.                                                                                                                                        |
| `npm run test:coverage`                                                                                                                                                                                     | Pass                       | The source alias removed the duplicate-runtime artifact; the complete instrumented suite passed at 92.09% lines/statements, 91.52% functions, and 81.12% branches with every changed line covered.                                   |
| `npm run test:package:quality`                                                                                                                                                                              | Pass                       | A fresh tarball passed all 13 installed-package checks with the active five-export schema, ten consumers, modular bundle sentinel, browser formats, types, and private-import refusal.                                               |
| `npm run quality:fast`                                                                                                                                                                                      | Fail                       | Run `2026-09-01T18-12-07-535Z-5828` passed workflow and unit gates, then identified two unformatted edited files and one `prefer-const` cleanup declaration; formatting and a hoisted cleanup function resolved them.                |
| `npm run quality:fast`                                                                                                                                                                                      | Pass                       | Run `2026-09-01T18-13-38-640Z-13717` passed ticket workflow, runner self-tests, formatting, the complete unit suite, and all 21 fast static checks on the corrected testing tree.                                                    |
| `npm run quality:delivery`                                                                                                                                                                                  | Fail                       | Run `2026-09-01T18-14-57-378Z-21579` passed coverage, properties, self-hosting, package, release, all three browser engines, and detector self-tests; static delivery alone rejected an unsupported spelling in this ticket.         |
| `npm run quality:static:delivery`                                                                                                                                                                           | Pass                       | Static run `static-2026-09-01T18-25-33-837Z-46977` passed all 28 delivery checks, including spelling, TypeScript, ESLint, dependency rules, Semgrep, secret scans, npm audit, and OSV.                                               |
| `npm run quality:delivery`                                                                                                                                                                                  | Pass                       | Run `2026-09-01T18-26-18-489Z-49330` passed all 12 gates with an unchanged 495-file fingerprint and wrote the Test-phase delivery receipt.                                                                                           |
| Test validation with `.git/jqstar/latest-report.json`                                                                                                                                                       | Fail                       | The report alias contained the authorized run, but Test validation requires the receipt's immutable run-report path. The exact path was used for the next attempt.                                                                   |
| Test validation with the receipt's immutable report                                                                                                                                                         | Fail                       | The report and receipt passed validation; the ticket was correctly rejected because its independent inspection ledger was still empty. This ledger records the findings before the corrected run.                                    |
| Package/release temporary-directory audit                                                                                                                                                                   | Pass                       | No `jqstar-package-quality-*` or `jqstar-release-quality-*` directories remain in the owned macOS temporary root after the standalone and two delivery runs.                                                                         |
| Corrected-tree `npm run quality:delivery`                                                                                                                                                                   | Pass                       | Run `2026-09-01T18-37-53-984Z-75305` passed all 12 gates with an unchanged 495-file fingerprint and wrote the receipt that includes this inspection ledger.                                                                          |
| Test-phase validation against the immutable corrected-tree report                                                                                                                                           | Pass                       | The validator accepted the delivery report, current receipt, testing status, command/evidence table, and independent inspection ledger.                                                                                              |
| Final package/release temporary-directory audit                                                                                                                                                             | Pass                       | Zero matching package or release quality directories remain in the owned macOS temporary root after the corrected delivery run.                                                                                                      |
| `node bin/jqstar.mjs --version` and `npx vitest run test/cli.test.ts --config vitest.config.ts`                                                                                                             | Pass                       | The source CLI prints manifest version `0.1.0` for `--version` and `-v`; all 14 CLI tests pass.                                                                                                                                      |
| `npm run test:package:quality`                                                                                                                                                                              | Pass                       | All 13 installed-tarball checks pass, including exact equality between `jqstar --version` and the packed manifest; the artifact has 324 files and remains within every budget.                                                       |
| `npm run test:release:quality`                                                                                                                                                                              | Pass                       | All 7 release checks pass across two independent installs with zero generated drift and SHA-256 `b48bd73612724463bd84fffdda1377aec99accd010b106623698667eb67b0da6`.                                                                  |
| `npx vitest run test/public-baseline.test.ts test/package-release-hardening.test.mjs --config vitest.config.ts`                                                                                             | Pass                       | All 16 public-baseline, API-report, report-schema, receipt, package, and release hardening checks pass against the final measurements.                                                                                               |
| Post-CLI package/release temporary-directory audit                                                                                                                                                          | Pass                       | Zero matching package or release quality directories remain after the standalone installed-package and reproducible-release runs.                                                                                                    |
| `npm run quality:fast`                                                                                                                                                                                      | Pass                       | Run `2026-09-01T18-54-32-512Z-6555` passed workflow self-tests, formatting, 734 unit tests, and all 21 fast static checks after the CLI version and final-baseline correction.                                                       |
| Code-phase validation against the exact fast report                                                                                                                                                         | Pass                       | The validator accepted the updated plan, changed-file ledger, design record, current fast report, and transition back through Code.                                                                                                  |
| Version-complete `npm run quality:delivery`                                                                                                                                                                 | Pass                       | Run `2026-09-01T18-56-04-795Z-14492` passed all 12 gates on an unchanged 495-file fingerprint: 734 unit tests, 1,930 effective property cases, 263 browser cases, and the package and release matrices.                              |
| Test-phase validation against run `2026-09-01T18-56-04-795Z-14492`                                                                                                                                          | Pass                       | The validator accepted the current testing tree, immutable delivery report and receipt, command/evidence table, and independent inspection ledger.                                                                                   |

### Inspection ledger

| Finding                                                                                                                  | Resolution                                                                                                                                       | Evidence                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Coverage loaded registry block self-imports through the built package while tests also loaded the source runtime.        | Apply the same exact `jquery-star` source alias in the coverage configuration; all block suites now use one runtime.                             | `vitest.coverage.config.ts`; coverage passes at 92.09% lines/statements                                            |
| The production census did not classify the new root-only UMD build configuration.                                        | Add `vite.umd.config.ts` to the build/package census rule rather than excluding it from enforcement.                                             | `quality/production-census.json`; 293 production artifacts classified                                              |
| The package-report schema still described the dormant pre-modular exports and consumers.                                 | Replace the old contract with the five active exports, ten installed consumers, and measured core bundle sentinel; update the hardening fixture. | `schema/package-report.schema.json`; `test/package-release-hardening.test.mjs`; 13/13 package checks               |
| Repeated cancellation of a staged plugin listener called its underlying release more than once.                          | Make listener cancellation match service cancellation: return after the first call and preserve pre-activation rollback.                         | `src/plugin.ts`; `test/plugin.test.ts`                                                                             |
| Disposal and render failure boundaries had reachable hostile-error, invalid-root, failed-iterator, and barrier branches. | Add focused JSON-safe disposal snapshots and render transaction failure matrices; remove only unreachable placeholder callbacks.                 | `test/kernel.test.ts`; `test/render-adapter.test.ts`; every changed line covered                                   |
| Package and release quality had previously leaked large temporary workspaces.                                            | Inspect the owned temporary root after repeated current runs; the cleanup handlers leave zero matching package or release directories.           | Zero matching directories under `/var/folders/kt/sw8qzrc158g5cm6jdgx_h9dr0000gn/T` after the current delivery runs |
| AC-10 required a CLI-visible package version, but the CLI exposed no version option.                                     | Read the installed package manifest for `--version`/`-v` and compare source plus packed CLI output with the same manifest used by every entry.   | `bin/jqstar.mjs`; `test/cli.test.ts`; installed-package quality passes                                             |
| The measured public baseline predated the final cleanup and CLI implementation.                                          | Replace its package bytes, modular bundle bytes, and release hash with the final reviewed package and reproducible-release reports.              | `quality/public-baseline.json`; 16 focused hardening checks pass                                                   |

## Document

### Documentation changed

- `README.md` explains the compatibility root, explicit preview installers, supported formats,
  side-effect boundaries, render adapter, disposal contract, and the absence of a jQuery UI identity
  claim.
- `docs/README.md`, `docs/PROJECT.md`, and `docs/ARCHITECTURE.md` define the two package layers,
  modular entry ownership, version status, and composition flow.
- `docs/BACKEND.md` separates the generic core protocol from the explicit Datastar profile.
- `docs/RUNTIME_OWNERSHIP.md` records modular ownership, render transactions, preservation, and
  complete terminal disposal.
- `docs/TESTING.md` defines source, property, browser, installed-package, release, version, and
  disposal evidence for the public entries without mutation testing.
- `package.json`, `quality/public-baseline.json`, and `etc/jquery-star*.api.md` publish the preview
  metadata, export conditions, side-effect declarations, reviewed measurements, and separate API
  surfaces.
- This ticket records the implementation decisions, failures, corrective work, independent
  inspection, and direct evidence for every acceptance criterion.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                                                                                     | Result |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| AC-01 | `src/core.ts` and `test/modular-entrypoints.test.ts` prove import purity and explicit generic-core installation; the installed `core-only-esm` consumer executes the same contract from the packed artifact.                                                                                                 | Pass   |
| AC-02 | `dist/core.d.ts` and `dist/core.d.cts` contain no ambient global augmentation, while the root declarations retain it; NodeNext and Bundler consumers prove unrelated jQuery values do not gain `star` from a core type import.                                                                               | Pass   |
| AC-03 | `src/ui.ts`, `src/ui/index.ts`, plugin tests, and modular tests prove one frozen official UI plugin, all 165 actions, transactional installation and rollback, two-document isolation, auto-enhancement, and exactly-once disposal.                                                                          | Pass   |
| AC-04 | Source inspection, modular tests, and the packed modular browser consumer prove `$.ui` and `$.widget` remain absent; `README.md` documents `data-jqs`, `data-part`, native HTML, state attributes, and `@ui.*` as the shipped contract.                                                                      | Pass   |
| AC-05 | `src/datastar.ts`, protocol tests, and the installed modular consumer prove the frozen Datastar plugin installs `core.datastar` without UI or document work, while core alone retains `core.generic`.                                                                                                        | Pass   |
| AC-06 | `src/index.ts` and `src/compatibility.ts` compose core, Datastar, and UI; root ESM, CommonJS, QUnit, module-browser, and UMD consumers plus the public-baseline suite prove compatibility behavior and the `jQueryStar`/`$.star.ui` identities.                                                              | Pass   |
| AC-07 | The `package.json` export map and run `2026-09-01T18-56-04-795Z-14492` package report prove five public exports, matched ESM/CommonJS declarations and maps, ten installed consumers, strict `publint`, Are the Types Wrong, and private-import refusal.                                                     | Pass   |
| AC-08 | `package.json` limits `sideEffects` to root artifacts and UI CSS; the installed bundle matrix proves explicit plugin retention and reports a 194,837-byte raw, 62,395-byte gzip, six-module core-only bundle with every optional sentinel absent.                                                            | Pass   |
| AC-09 | The installed core-only consumer executes applications, helpers, directives, observations, middleware, generic requests, patches, render, and disposal; its graph and sentinel checks exclude every optional subsystem named by the criterion.                                                               | Pass   |
| AC-10 | `src/version.ts`, `bin/jqstar.mjs`, `test/cli.test.ts`, and the final package report prove manifest-derived version `0.1.0` across entries, declarations, maps, metadata, runtime facades, source and packed CLI output; the plugin API version remains independently explicit.                              | Pass   |
| AC-11 | `src/render-adapter.ts`, `src/kernel.ts`, focused render tests, and 100 generated render state-machine sequences prove operation IDs, exact preservation, contained removal boundaries, deepest-first deduplication, terminal ordering, explicit incoming boot, and the complete enhancement barrier.        | Pass   |
| AC-12 | Render unit and three-engine browser tests prove original-error preservation, complete failure cleanup, zero ownership leaks, and retained root identity, state, effects, focus, values, handlers, and UI/plugin records without duplicate enhancement.                                                      | Pass   |
| AC-13 | Public metadata and documentation mark all subpaths as `0.4-preview` and distinguish them from root compatibility; delivery run `2026-09-01T18-56-04-795Z-14492` passed all 12 gates, including 734 unit tests, coverage, 1,930 property cases, 263 browser cases, package, and reproducible release checks. | Pass   |
| AC-14 | `src/disposal.ts`, `src/kernel.ts`, runtime and modular tests prove the shared public disposal operation, exhaustive cleanup, ownership release, frozen JSON-safe reports, stable repeated/recursive results, reinstall after disposal, and typed aggregate failure after the complete cleanup sweep.        | Pass   |

### Completion audit

The audit traced all 14 criteria from the public entry points through declarations, runtime
ownership, installed consumers, browser execution, package metadata, public documentation, and the
immutable delivery reports. Root compatibility and explicit modular composition expose the intended
different installation models while sharing core runtime, version, render, and disposal contracts.
Core imports remain side-effect-free; UI and Datastar stay explicit and independently removable; the
package exports only the reviewed public paths.

The final reviewed artifact contains 324 files, packs to 2,469,364 bytes, unpacks to 8,349,189
bytes, and reproduces across two clean installations with SHA-256
`b48bd73612724463bd84fffdda1377aec99accd010b106623698667eb67b0da6`. The final delivery evidence
contains 12 passing gates and excludes mutation testing. Package and release cleanup handlers leave
zero matching temporary workspaces after success and failure paths.

Status: Complete
