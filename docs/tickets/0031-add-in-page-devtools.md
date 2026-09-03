---
id: 0031
title: Add optional in-page DevTools
status: planned
created: 2026-08-30
updated: 2026-09-01
---

# 0031: Add optional in-page DevTools

## Plan

### Problem

Serializable inspection data is useful but still requires users to write a viewer. A small in-page
inspector could make ownership, plugin installation, operation flow, cleanup, and optional services
understandable without browser-extension distribution. It could also leak redacted data through the
DOM or clipboard, observe itself recursively, freeze the page while rendering traces, collide with
application focus and styles, or accidentally enter production bundles.

The UI is therefore conditional. Ticket 0030 must first prove that real users can diagnose problems
through the public data API and that the remaining usability gap warrants a maintained visual tool.

### Current evidence

- Ticket 0030 conditionally supplies stable, read-only, versioned snapshots and bounded redacted
  traces. It deliberately exposes no mutation, replay, transport, or live runtime object.
- The jQStar registry supplies accessible dialog, tabs, tree, table, log, disclosure, button, and
  JSON-viewer patterns that can build the tool with jQStar itself rather than another framework.
- Ticket 0013's modular graph and ticket 0004's installed consumers can prove the DevTools
  entrypoint does not enter production/root/core/UI bundles unless imported.
- No usage study, go decision, mounting contract, overlay ownership policy, or DevTools package
  currently exists.

### Activation gate

Do not start Code until ticket 0030 is done and at least two distinct application investigations are
recorded using its public API. The evidence must name the question, data consulted, time/friction,
whether the problem was resolved, and the exact visual interaction that would materially improve it.
Record bundle/maintenance/accessibility cost and choose go or no-go. Plan-validate the imported 0030
schema/redaction/lease contract. A no-go marks this ticket declined; the supported solution is the
documented inspection API and no jquery-star/devtools export may ship.

### Scope

- Publish side-effect-free jquery-star/devtools only after a go decision. Importing it registers no
  kernel observer, custom element, shortcut, stylesheet, timer, or DOM. The explicit mount call
  accepts a kernel and optional container, acquires a ticket-0030 client lease, and returns an
  idempotent controller.
- Build the inspector with public jQStar application and component contracts from the packed
  artifact. No React/Vue/Svelte runtime, private source import, private kernel access, patched
  observation hook, or duplicate state model is allowed.
- Mount into a caller container or a library-owned top-layer sibling under document.body. Use a
  documented data-jqs-devtools root, namespaced CSS layer/tokens, and owned portal boundary so host
  resets, z-index, pointer handling, and application styles are contained without a closed shadow
  root that breaks public accessibility or theming contracts.
- Present current kernel/application/plugin ownership, public capability and cleanup counts,
  operation timeline, redaction-policy status, aggregate drops/evictions/errors, and installed
  official-service summaries. Never infer or show fields absent from ticket 0030's public snapshot
  and export objects.
- Provide pause/resume of display consumption, explicit snapshot refresh, filtering, selection,
  clear, bounded export download, and copy-current-selection. Pause never pauses application work or
  collector bounds. Clear calls only the public trace-clear method. No control mutates application
  state, dispatches application actions, retries requests, or disposes host resources.
- Window the timeline and tree/table rows. Render only a fixed overscan range, coalesce refreshes to
  at most one per animation frame, stop rendering while hidden, and show aggregate skipped counts.
  The ticket freezes maximum rendered row/DOM-node/serialized-copy sizes before Code.
- Preserve ticket 0030 redaction end to end. Text, attributes, accessible names/descriptions, title,
  data attributes, search indexes, clipboard, exports, download filenames, errors, and internal
  component state may contain only provided redacted fields. The UI cannot enable a sensitive
  policy; it may only display that the host enabled one and require separate host code to change it.
- Exclude tooling-origin observations by the public tooling marker while retaining aggregate counts
  that prove exclusion. The inspector never displays its own render/action loop as application
  activity and cannot hide non-tool application operations.
- Define complete focus behavior: explicit open button/host call, optional shortcut disabled by
  default, initial heading/control focus, contained modal focus only in modal mode, Escape/close,
  return focus when connected, non-modal pointer/keyboard access, no host shortcut theft while
  closed, and recovery when the invoking node disappears.
- Support narrow/wide viewports, zoom/reflow, forced colors, reduced motion, screen readers,
  keyboard only, touch target size, and high-volume timelines. Announce
  connection/error/clear/export results through bounded status text without reading every operation
  live.
- Keep development-only use an explicit documentation and packaging policy. The package may be
  importable in production for diagnostics, but never auto-enables based on NODE_ENV, never relies
  on dead-code constants for safety, and remains absent unless deliberately imported and mounted.
- Dispose controller and final lease exactly once: cancel frames/tasks, remove listeners/shortcut,
  revoke object URLs, remove owned DOM/styles, destroy its jQStar application, release inspector
  snapshots/selection/search strings, and return focus without disposing the inspected kernel.

### Out of scope

- Browser extensions, remote telemetry, source-map debugging, profiling/flame graphs, operation
  replay/time travel, DOM/state editing, request retry, store mutation, or production auto-install.
- Rendering credentials, bodies, HTML, DOM, arbitrary state, full URLs, error messages/stacks, or
  any field ticket 0030 excludes.
- Supporting an unbounded number of visible rows or retaining a second independent trace history.

### Dependencies

- Ticket 0030 plus its recorded usage go decision.

### Acceptance criteria

- [ ] [AC-01] Two public-API investigations and a scored go/no-go record identify the unmet visual
      need, alternatives, bundle/maintenance/accessibility cost, and decision. A no-go declines this
      ticket and package/graph tests prove no DevTools export or runtime shipped.
- [ ] [AC-02] On go, jquery-star/devtools is side-effect-free on import and mounts only through an
      explicit kernel/container call. Root/core/UI/Datastar/CSP/testing/inspect consumers that omit
      it contain no DevTools code, CSS, shortcut, observer, timer, custom element, or DOM.
- [ ] [AC-03] The installed DevTools is implemented with public jQStar application/components and
      jquery-star/inspect only; forbidden-framework, private-import, package-graph, source-census,
      and exact-tarball tests enforce that boundary.
- [ ] [AC-04] Every displayed/searchable/copied/exported/downloaded/accessibility field comes from
      the public inspection schema. Adversarial canary secrets never appear in DOM text/attributes,
      accessible names, titles, component state, search index, clipboard, files, or diagnostics.
- [ ] [AC-05] Pause/resume, refresh, filter, selection, clear, copy, and export use public
      read/clear methods only and cannot change application operations, state, requests, resources,
      navigation, cleanup, or the kernel lifecycle.
- [ ] [AC-06] Timeline/table/tree virtualization enforces frozen visible-row, overscan, DOM-node,
      frame-frequency, selection, search, and copy/export limits under sustained trace volume;
      hidden/paused UI performs no render loop and collector bounds still apply.
- [ ] [AC-07] Tooling-origin records do not recurse into the displayed timeline, while public
      aggregate exclusion counts reconcile and genuine application records remain visible.
- [ ] [AC-08] Explicit mount/open/close, optional-off shortcut, initial/return focus, Escape,
      modal/non-modal behavior, disconnected invoker, host shortcuts, multiple kernels/controllers,
      z-index, hit targets, and portal/style containment pass deterministic browser tests.
- [ ] [AC-09] Keyboard, screen-reader, axe, zoom/reflow, narrow/mobile, touch target, forced-colors,
      reduced-motion, high contrast, and bounded status-announcement tests pass in Chromium,
      Firefox, and WebKit without announcing every operation.
- [ ] [AC-10] Sensitive inspection policy cannot be enabled or widened through DevTools. The UI
      shows a clear warning when the host enabled approved fields and continues to enforce the
      supplied export permissions.
- [ ] [AC-11] Closing/disposal is idempotent and cancels frames/tasks, removes listeners/shortcuts,
      revokes object URLs, destroys owned application/DOM/styles, clears derived/search/selection
      data, releases its lease, and preserves the inspected kernel and other clients.
- [ ] [AC-12] Installed package declarations, module formats approved by 0013, version identity, CSP
      compatibility, no-auto-install behavior, root exclusion/tree-shaking, and packed/bundled size
      budgets pass from the exact tarball.
- [ ] [AC-13] Focused, coverage/property/static, three-browser/accessibility, package, release, npm
      run check, ticket phase validation, and git diff --check pass without mutation testing.

### Design

The mount controller owns one tooling-marked jQStar application and one ticket-0030 client lease. It
derives a small immutable view model from the latest public snapshot/export and never keeps the
inspected runtime or original observation records in UI state. Timeline windowing uses sequence IDs,
not array indices that change under eviction.

The default presentation is a non-modal edge panel; callers may request a modal overlay. A single
owned portal boundary and namespaced CSS layer isolate layout while preserving document-level focus,
label, forced-color, and accessibility semantics. Multiple mounted controllers are either explicitly
rejected per document or isolated by controller ID—the chosen rule is frozen at activation.

Copy/export serializes the already redacted public selection into a bounded blob only in response to
a user gesture. Object URLs are short-lived and revoked after use/disposal. The UI supplies data to
the browser; it never sends it to a server.

### Decisions

- A visual tool ships only after measured need; the inspection API remains the baseline solution.
- The tool dogfoods jQStar and public package contracts.
- Import is inert, mount is explicit, and production exclusion is structural rather than an
  environment guess.
- Display is virtualized and derived from the one bounded collector, not a second trace store.
- DevTools cannot broaden sensitive capture or mutate the inspected application.

### Security and accessibility

- DOM, accessibility, clipboard, search, and download are all disclosure surfaces and receive the
  same canary-secret tests. Host code—not markup or DevTools controls—owns any approved sensitive
  policy.
- The inspector must remain operable when the inspected application is broken. Its controls use
  native buttons/inputs and semantic landmarks first, with jQStar enhancements layered on top.
- No automatic global shortcut is installed. If a caller opts in, the shortcut is configurable,
  collision-checked, scoped to the document, and removed on disposal.

### Risks

- Inspecting the inspector can recurse. Mark tooling at the operation source and test that exclusion
  rather than filtering by application display name.
- High-volume derived search can freeze the page even if the trace is bounded. Freeze UI-specific
  row/string/frame limits and exercise worst-case inputs.
- Host CSS can make overlay controls unusable. Namespace the layer/tokens and test representative
  resets, transforms, stacking contexts, zoom, forced colors, and mobile viewports.
- “Development-only” can be mistaken for a security boundary. Keep import/mount explicit and enforce
  redaction regardless of build mode.

### Verification plan

- Record and Plan-validate the two usage studies and go/no-go decision before source changes.
- Test pure controller/view derivation, limits, tooling exclusion, redaction, export/copy, multiple
  leases, failures, and disposal with fake time and adversarial records.
- Run exact installed-package fixtures in Chromium/Firefox/WebKit across accessibility, responsive,
  high-volume, CSP, style-reset, multiple-kernel, and broken-host cases.
- Inspect module graphs/census/bundles for forbidden frameworks, private imports, auto-install side
  effects, and entrypoint exclusion; run focused/fast/coverage/property/static/browser/package/
  release/check/ticket/diff gates without mutation testing.

### Planned files

- src/devtools modules: inert mount API, public-data projection, windowing, controls, copy/export,
  ownership, and disposal.
- src/devtools/devtools.css and registry/application templates built from native HTML and public
  jQStar component contracts.
- Package export/build/type/API/census/size/CSP configuration for jquery-star/devtools and explicit
  exclusion from every other entrypoint.
- Usage-decision artifact, unit/property/redaction fixtures, exact-package
  three-browser/accessibility tests, and bundle graph proofs.
- Public DevTools/privacy/usage docs, project architecture/ownership/testing docs, and this ticket.

## Code

### Changed-file ledger

| File       | Purpose                         |
| ---------- | ------------------------------- |
| _None yet_ | Implementation has not started. |

### Design changes

None recorded.

## Test

| Command   | Result      | Evidence                                    |
| --------- | ----------- | ------------------------------------------- |
| _Not run_ | Conditional | Waiting for the ticket-0030 usage decision. |

## Document

### Documentation changed

Pending.

### Acceptance evidence

Pending implementation.

### Completion audit

Pending.
