---
id: 0038
title: Define jQuery ecosystem stewardship and naming
status: done
created: 2026-08-30
updated: 2026-09-03
---

# 0038: Define jQuery ecosystem stewardship and naming

## Plan

### Problem

The jQuery website still presents a family that includes jQuery UI, jQuery Mobile, Sizzle, and
QUnit, but those projects do not have one maintenance state or one useful role in a modern library.
Treating all of them as dependencies would import archived designs and overlapping component
contracts. Ignoring all of them would discard active jQuery/QUnit work, Migrate guidance, proven
progressive-enhancement lessons, and credible migration paths for existing applications.

jQStar also needs a clear answer to the user's central hesitation: its native component system is
the product, not a skin over jQuery UI. The framework can help jQuery UI applications migrate
without forking the Widget Factory, adopting ThemeRoller as its design system, or calling itself the
new official jQuery UI without permission.

### Current evidence

Evidence was rechecked against official sources on 2026-09-03:

- The
  [OpenJS Cross Project Council roster](https://github.com/openjs-foundation/cross-project-council)
  lists jQuery as Impact, QUnit as At-Large, and jQuery UI, jQuery Mobile, and Sizzle as Archived.
- The [official jQuery blog](https://blog.jquery.com/2026/01/17/jquery-4-0-0/) released jQuery 4.0.0
  on 2026-01-17 and provides a [4.0 upgrade guide](https://jquery.com/upgrade-guide/4.0/) plus
  jQuery Migrate workflow. The [official CDN](https://releases.jquery.com/) currently lists jQuery
  Migrate 4.0.2.
- The [official jQuery UI blog](https://blog.jqueryui.com/2026/01/jquery-ui-1-14-2-released/)
  released 1.14.2 on 2026-01-28, tested it with jQuery 4.0.0, and states that UI is in maintenance:
  compatibility/security/important regressions, with no significant new feature work planned. OpenJS
  project status still remains Archived.
- The official [jquery-archive/jquery-mobile](https://github.com/jquery-archive/jquery-mobile)
  repository is read-only and says jQuery Mobile is no longer maintained; its documented 1.4.x
  jQuery range predates current jQuery.
- The [official QUnit site](https://qunitjs.com/) lists 2.26.0 as current, and its
  [release history](https://github.com/qunitjs/qunit/blob/main/History.md) shows active 2025–2026
  releases. It is useful as a supported consumer, not a runtime dependency.
- The official Sizzle project remains listed Archived by OpenJS. jQStar already delegates selector
  semantics to its real supplied jQuery; a separate Sizzle dependency would create a second selector
  support contract with no user-facing gap.
- The registry currently has 109 component recipes and seven composed blocks. It covers the jQuery
  UI widget catalog and many newer patterns, but intentionally does not promise Widget Factory,
  ThemeRoller, effects, generic draggable/droppable/selectable/resizable, or third-party plugin
  compatibility.
- The [OpenJS trademark policy](https://trademark-policy.openjsf.org/) and
  [artwork guidance](https://github.com/openjs-foundation/artwork) do not grant official-project,
  endorsement, or successor status through an open-source license. Ticket 0049 records the public
  product name jQStar, npm package jquery-star, CLI/repository shorthand jqstar, data-jqs markup,
  and jqstar.com intent; the local jqdatastar checkout name is legacy.

### Scope

- Publish a dated, machine-readable and human-readable ecosystem matrix for jQuery Core, jQuery
  Migrate, jQuery UI, jQuery Mobile, Sizzle, and QUnit. Each row records official OpenJS status,
  current/reviewed release, maintenance statement, authoritative sources/review date, jQStar role,
  integration/migration/ignore decision, exact non-goals, owner ticket, and next review trigger.
- Adopt real jQuery Core as the peer/foundation. Freeze supported jQuery ranges through installed
  compatibility tests and documented release review rather than vendoring/forking it. Keep the
  invariant that dollar is real jQuery and dollar-name is a reactive signal.
- Integrate QUnit only through jquery-star/testing conformance so established jQuery projects can
  test plugins/components with their existing runner. Keep Vitest/property/static and Playwright as
  the repository quality stack; do not rewrite the project test pipeline around QUnit.
- Integrate jQuery Migrate as an opt-in, application-owner upgrade aid. Point to official staged
  jQuery upgrade guidance, preserve its warnings, and let ticket 0032 diagnose declared versions/
  ingest a bounded user-produced summary. Never bundle, auto-load, inject, suppress, or interpret
  warnings as universally safe automatic rewrites.
- Treat jQuery UI as a maintained-for-compatibility migration source and external coexistence
  target, not a jQStar runtime dependency, source fork, architecture, theme layer, or future feature
  roadmap. jQStar's native semantic components remain the recommended system for new code.
- Assign ticket 0039 an exact coexistence fixture, complete catalog/API gap map, representative
  incremental migration, and evidence-scored decision on a narrowly bounded adapter. No adapter is
  presumed; a go decision requires its own implementation ticket and cannot recreate Widget Factory.
- Treat jQuery Mobile as an archived migration source only. Preserve useful principles—semantic
  content before enhancement, direct URLs, native links/forms, responsive layouts, touch/keyboard,
  progressive enhancement, graceful degradation—without its router, page model, virtual mouse,
  themes, widgets, or runtime. Ticket 0040 owns the no-runtime migration proof.
- Ignore standalone Sizzle integration. Selector behavior comes from the supported real jQuery peer,
  irrespective of jQuery's internal implementation. Do not fork Sizzle, expose a selector-engine
  swap, or claim Sizzle extension compatibility.
- Freeze independent naming/attribution: public product jQStar, npm jquery-star, CLI jqstar, markup
  data-jqs, intended site jqstar.com. Describe it as an independent HTML-first UI and application
  library for jQuery. Clearly state it is not affiliated with, sponsored by, endorsed by, or an
  official successor to the jQuery project/OpenJS unless written permission changes that fact.
- Use jQuery/OpenJS marks only in nominative compatibility/migration statements with appropriate
  ownership attribution. Do not copy official logos/site trade dress, use “jQuery UI 2,” or label
  jQStar “the new jQuery UI” in package metadata, website titles, social cards, repository topics,
  examples, or release notes.
- Define a future stewardship proposal gate rather than a unilateral claim. It requires shipped
  migration evidence, sustained independent adoption, contributions/participation with upstream, a
  concrete maintenance/governance/security/funding plan, community consultation, and explicit
  written jQuery/OpenJS agreement. Contact/public proposal remains separately authorized.
- Recheck statuses/releases/trademark policy before each stable-major ecosystem claim and at least
  on the documented cadence. Historical rows remain dated; changes go through a ticket and update
  downstream compatibility tests/docs.

### Out of scope

- Forking, vendoring, republishing, or claiming stewardship of jQuery Core/UI/Mobile/Sizzle/QUnit/
  Migrate; contacting OpenJS; filing a governance proposal; registering marks; or publishing
  packages.
- Depending on jQuery UI/Mobile/Sizzle at runtime, recreating Widget
  Factory/ThemeRoller/effects/mobile navigation, or adopting QUnit as the sole repository test
  system.
- Providing legal advice. This is conservative product/governance policy pending any actual written
  permission or counsel.

### Dependencies

- None. It supplies policy inputs to tickets 0014, 0032, 0039, 0040, and the stable release/audit.

### Activation evidence

- `npm run ticket:validate -- --phase plan --ticket docs/tickets/0038-define-jquery-ecosystem-stewardship.md`
  passed on 2026-09-03 before Code.
- Primary sources were rechecked on 2026-09-03. OpenJS still lists jQuery as Impact, QUnit as
  At-Large, and jQuery UI, jQuery Mobile, and Sizzle as Archived. Official release surfaces still
  list jQuery 4.0.0, Migrate 4.0.2, jQuery UI 1.14.2, and QUnit 2.26.0. The archived Mobile
  repository names 1.4.x and the package registry's later tag remains prerelease-only.
- The existing package contract already pins `jquery` as the sole peer at `>=4.0.0 <5`, installs
  jQuery 4.0.0 and QUnit 2.26.0 into a fresh consumer, runs three QUnit cases, and rejects QUnit
  from the published testing bundle graph. Ticket 0038 adopts that evidence instead of adding
  another runner or runtime dependency.

### Acceptance criteria

- [x] [AC-01] A schema-valid matrix dated with review time records jQuery Core, Migrate, UI, Mobile,
      Sizzle, and QUnit official status, reviewed release, maintenance statement, primary sources,
      jQStar disposition, non-goals, owner ticket, and recheck trigger; link/status validation
      passes.
- [x] [AC-02] jQuery Core is the real peer/foundation with exact tested version policy and no
      vendored fork. Public architecture preserves dollar as jQuery and dollar-name as signal.
- [x] [AC-03] QUnit is an active supported jquery-star/testing consumer with exact installed
      conformance, while repository Vitest/property/static/Playwright quality remains authoritative;
      QUnit enters no runtime/root bundle.
- [x] [AC-04] Migrate guidance follows the official staged workflow, is opt-in and temporary, and
      preserves warnings. Package/graph/runtime tests prove jQStar never bundles, injects,
      auto-loads, suppresses, or auto-rewrites from Migrate.
- [x] [AC-05] jQuery UI policy states exact coexistence/migration role and maintenance status, while
      jQStar native components remain primary. Runtime/package/source scans prove UI is not a
      dependency/fork/theme/architecture of jQStar.
- [x] [AC-06] The UI capability map distinguishes catalog counterpart, semantic/API migration,
      coexistence, and no equivalent; it explicitly names Widget Factory, ThemeRoller, effects,
      positioning, generic interactions, third-party extensions, and imperative plugin gaps rather
      than implying drop-in compatibility.
- [x] [AC-07] jQuery Mobile policy preserves named progressive-enhancement lessons but rejects its
      runtime/router/page/virtual-mouse/theme/widget contracts. Artifact/source scans and ticket
      0040 prove a no-runtime migration path.
- [x] [AC-08] Sizzle is not imported/forked/exposed independently; supported selector behavior is
      delegated to the real tested jQuery peer and no Sizzle extension/API compatibility is claimed.
- [x] [AC-09] Tickets 0014, 0032, 0039, and 0040 contain exact QUnit, Migrate, UI, and Mobile
      implementation/evidence boundaries with stable mappings back to this matrix.
- [x] [AC-10] Product/package/CLI/markup/site naming is consistently jQStar/jquery-star/jqstar/
      data-jqs/jqstar.com, the jqdatastar path is documented as legacy-only, and public wording
      makes no ownership/sponsorship/endorsement/official-successor claim.
- [x] [AC-11] Trademark/attribution review covers package metadata, README/site titles/copy, social/
      image assets, repository topics, examples, migration guides, and release notes. Marks/logos/
      trade dress are not used beyond approved nominative compatibility and attribution.
- [x] [AC-12] Any future official stewardship/successor proposal is gated on shipped migration,
      adoption, upstream participation, governance/security/funding, consultation, and explicit
      written jQuery/OpenJS agreement; no contact or claim occurs in this ticket.
- [x] [AC-13] Status/release/policy review cadence and change process are documented. Expired
      evidence fails release/audit checks rather than silently presenting an old active/archived
      claim.
- [x] [AC-14] Schema/link/spelling/static/package graph/forbidden-name scans, npm run check, ticket
      phase validation, and git diff --check pass without mutation testing.

### Design

Use one evidence-dated matrix as the routing authority. “Integrate” means an active adjacent tool
has a bounded public interop role. “Migrate” means jQStar helps applications leave an old runtime
while preserving the user need. “Ignore” means no dependency/API work because the supported
foundation already supplies the capability or the archived contract would harm the architecture.

The concrete result is:

- jQuery Core: integrate as the real peer and foundation.
- QUnit: integrate as a testing consumer.
- jQuery Migrate: integrate as opt-in migration evidence.
- jQuery UI: coexist and migrate; ignore as an implementation foundation; do not fork.
- jQuery Mobile: migrate lessons/applications; ignore the runtime; do not fork.
- Sizzle: ignore as a separate package and rely on jQuery selector behavior.

The independent product line is “an HTML-first UI and application library for jQuery.” The migration
promise is “Keep your HTML. Keep your server. Keep jQuery. Modernize one feature at a time.” Neither
phrase claims official project status.

### Decisions

- jQStar's component library is the new-code path; jQuery UI is not its base or public identity.
- Compatibility work serves migration and coexistence, not indefinite emulation.
- Active infrastructure can integrate; archived runtime contracts do not enter the artifact.
- No fork or official-successor claim is part of this roadmap.
- Status claims are dated and sourced because archived/maintenance/release facts can change.

### Security and accessibility

- Archived runtimes do not receive new protection merely by being wrapped. Excluding them from the
  shipped artifact avoids inheriting unsupported security and browser claims.
- Migration guides preserve server validation, native forms/links, no-JavaScript behavior, keyboard/
  screen-reader use, focus, responsive layout, reduced motion, and current browser testing.
- Names and release/status statements link to primary sources and distinguish observed evidence from
  jQStar policy. The matrix stores no third-party code or logos.

### Risks

- “Replacement” can be read as drop-in API compatibility. Use migration/counterpart wording and show
  exact gaps beside catalog coverage.
- UI maintenance releases can look like renewed feature development. Record both the actual release
  and official maintenance/OpenJS status.
- A small adapter can become Widget Factory emulation. Ticket 0039 freezes demand/cost thresholds
  and requires a separate bounded ticket for any go decision.
- Trademark/governance policy can change. Recheck official sources before stable-major release and
  never infer permission from silence.
- Users may need third-party plugins outside official catalogs. Label those application-specific and
  avoid claims based on untested extensions.

### Verification plan

- Recheck official OpenJS roster, project repositories/blogs/releases, jQuery upgrade/Migrate docs,
  and trademark policy; archive source URLs, retrieval dates, and reviewed versions in the matrix.
- Compare jQuery UI catalogs/Widget Factory/interactions/effects/themes and jQuery Mobile feature
  groups against current jQStar public contracts and generate complete downstream mappings.
- Inspect package manifests/lock/graphs/source/registry/site/assets for forbidden runtime
  dependencies, archived source, misleading names, official logos/trade dress, and successor claims.
- Validate all downstream ticket IDs and decisions; run QUnit package-consumer and Migrate/UI/Mobile
  absence fixtures when their owning tickets implement evidence.
- Run schema/link/spelling/static/package/check/ticket/diff gates without mutation testing.

### Planned files

- Public ecosystem stewardship/status/naming document and website ecosystem/migration overview.
- Versioned ecosystem matrix schema/data with primary sources, review dates, decisions, owners, and
  expiry/recheck policy.
- Forbidden dependency/source/claim/asset checks plus package and documentation fixtures.
- README, package metadata, architecture/project/release/support docs, downstream ticket mappings,
  and this ticket.

## Code

### Changed-file ledger

| File                                                                                                            | Purpose                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quality/jquery-ecosystem.json`, `schema/jquery-ecosystem.schema.json`                                          | Freeze dated project status, release, disposition, UI capability, naming, and review evidence.                                                                       |
| `test/jquery-ecosystem-contract.test.ts`, `scripts/quality/validate-json.mjs`                                   | Validate the matrix, review expiry, package/source absence, QUnit evidence, naming, and downstream identity.                                                         |
| `docs/JQUERY_ECOSYSTEM.md`, `docs/{README,PROJECT,ARCHITECTURE,TESTING,LIBRARY_EXPANSION_PLAN}.md`, `README.md` | Publish the ecosystem decisions, upgrade boundary, attribution, and repository contract.                                                                             |
| `example/docs/ecosystem/index.html`, `example/docs-shell.html`, `vite.demo.config.ts`                           | Publish and build the human-readable ecosystem overview.                                                                                                             |
| `config/agent-content.json`, generated agent corpus, and CSP inventory                                          | Keep browser and headless-agent documentation in sync with the new public guide.                                                                                     |
| Site structure, browser, deployment, Pages, and package smoke tests                                             | Enroll the ecosystem route in native-site and generated-artifact proof.                                                                                              |
| `scripts/quality-0044-self-test.mjs`                                                                            | Keep the delivery self-test's exact passing package-hardening count current.                                                                                         |
| Tickets `0014`, `0032`, `0039`, and `0040`                                                                      | Pin stable downstream mapping IDs and exact ecosystem-matrix identity.                                                                                               |
| `package.json`, `example/public/og-jqstar.png`                                                                  | Keep the repository-only policy schema out of the tarball and losslessly recompress the reviewed social image so the public route fits the immutable package budget. |
| `docs/tickets/0038-define-jquery-ecosystem-stewardship.md`                                                      | Keep phase, decisions, commands, findings, and acceptance evidence current.                                                                                          |

### Design changes

- The existing installed QUnit consumer is the executable integration. The matrix points to that
  package gate, and focused tests verify its exact version and graph exclusion instead of creating a
  second QUnit harness.
- The detailed jQuery UI and Mobile feature inventories remain downstream work. This ticket records
  the complete official UI catalog at the policy level and classifies every widget, interaction,
  theme/effect, positioning, Widget Factory, plugin bridge, and extension boundary without claiming
  executable migration coverage that tickets 0039 and 0040 have not built.
- The repository guide is source documentation, while the concise website page enters the packaged
  self-hosted site archive. This avoids adding a second large package guide while keeping the policy
  public and agent-readable.
- The agent corpus indexes the ecosystem route with its reviewed summary and uses the full public
  page as provenance. Detailed policy stays in the repository guide instead of being triplicated in
  every generated corpus surface.
- The repository-only evidence schema is excluded from the npm tarball. The existing indexed PNG
  social preview was recompressed losslessly with identical dimensions, palette, and decoded image
  data, restoring margin under the unchanged package budget.
- Matrix evidence expires on 2027-03-03 and earlier on a named status, stable release, support, or
  trademark-policy change. A current-date test deliberately turns stale evidence red.

## Test

| Command                                                                                                                                                  | Result  | Evidence                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `node scripts/quality/validate-json.mjs`                                                                                                                 | Pass    | 63 JSON files parsed; 11 instances and 17 schemas validated.                                                                                                                                                                                                                                                                                                 |
| `npx vitest run test/jquery-ecosystem-contract.test.ts test/site-structure.test.mjs`                                                                     | Pass    | 13 tests cover the policy matrix, package/runtime absence, UI map, downstream IDs, naming, and native route structure.                                                                                                                                                                                                                                       |
| `npm run csp:inventory && npx vitest run test/agent-content.test.mjs test/csp-contract.test.ts`                                                          | Pass    | Five CSP artifacts regenerated; seven deterministic corpus and CSP contract tests passed.                                                                                                                                                                                                                                                                    |
| `npm run build:pages`                                                                                                                                    | Pass    | The final `/jqstar/` base-path build and static Pages smoke accepted the ecosystem route and agent surfaces.                                                                                                                                                                                                                                                 |
| `npm run build:demo && node scripts/bundle-site.mjs && node scripts/smoke-deployment.mjs`                                                                | Pass    | The root site built with 35 files; the self-hosted archive and deployment contract passed.                                                                                                                                                                                                                                                                   |
| `npm pack --dry-run --json`                                                                                                                              | Fail    | The first complete dry pack was 2,872,854 bytes, 2,854 over the immutable ceiling. The policy schema was still entering the tarball and assets needed optimization.                                                                                                                                                                                          |
| `npm pack --ignore-scripts --dry-run --json`                                                                                                             | Pass    | Final dry pack is 2,867,417 bytes and 201 files, 2,583 bytes below the unchanged ceiling.                                                                                                                                                                                                                                                                    |
| `node scripts/smoke-package-files.mjs`                                                                                                                   | Pass    | All 201 expected package files, exact guide set, CLI/registry assets, and bundled site/agent artifacts passed.                                                                                                                                                                                                                                               |
| `npx playwright test e2e/site.spec.ts --project=chromium`                                                                                                | Fail    | The repository has no project named `chromium`; the configured project is `desktop-chromium`.                                                                                                                                                                                                                                                                |
| `npx playwright test e2e/site.spec.ts --project=desktop-chromium`                                                                                        | Pass    | Nine site tests passed, including every direct documentation route and WebMCP registration.                                                                                                                                                                                                                                                                  |
| `npm run quality:fast`                                                                                                                                   | Fail    | Run `2026-09-03T13-07-43-667Z-64537` found one Markdown issue, one spelling issue, and missing `actionlint`; all other selected gates passed.                                                                                                                                                                                                                |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run quality:fast`                                                                                           | Pass    | Current fast report `2026-09-03T13-09-26-322Z-72552` passed ticket workflow, self-test, format, unit, and all static-fast checks.                                                                                                                                                                                                                            |
| `npm run ticket:validate -- --phase code --ticket docs/tickets/0038-define-jquery-ecosystem-stewardship.md --report .git/jqstar/latest-report.json`      | Pass    | Code phase validated against current fast report `2026-09-03T13-10-53-616Z-81073`.                                                                                                                                                                                                                                                                           |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run check`                                                                                                  | Fail    | Delivery run `2026-09-03T13-12-15-749Z-89656`: nine gates passed; package, browser, and release lanes failed when WebKit 2336 launched but did not complete its inspector-pipe handshake. The detector self-test inherited those failures and also found a stale expected test count.                                                                        |
| `npx vitest run test/package-release-hardening.test.mjs`                                                                                                 | Pass    | All 13 package/release contract tests pass after the delivery green-control detector was updated from 12 to 13.                                                                                                                                                                                                                                              |
| Isolated `playwright@1.63.0-alpha-2026-09-03` minimal WebKit probe                                                                                       | Fail    | WebKit 26.6 revision 2359 reproduces the same bounded inspector-pipe timeout as stable 1.62.1/revision 2336. No child remains, and current Chromium and Firefox preflight checks still pass.                                                                                                                                                                 |
| Direct Chrome 151 headless-shell render of `/docs/ecosystem/`                                                                                            | Pass    | The browser executable was invoked without the Playwright runner or API. Nine rendered-DOM assertions cover the title, initialized color scheme, current navigation state, independence notice, Core and QUnit rows, reviewed versions, and peer range.                                                                                                      |
| `sudo /usr/bin/safaridriver --enable`; direct Safari and Chrome 152 launch probes                                                                        | Partial | Safari remote automation is enabled in `~/Library/WebDriver/com.apple.Safari.plist`. This server has no active macOS GUI login or `gui/501` launch domain, so Safari fails with `RBSRequestErrorDomain Code=5` and its WebDriver service exits. The installed desktop Chrome exits 138 for the same host-session limitation.                                 |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run quality:fast`                                                                                           | Pass    | Current-tree report `2026-09-03T14-23-34-739Z-43627` passes ticket workflow, runner self-test, formatting, all unit tests, and every fast static detector after the direct-browser evidence was recorded.                                                                                                                                                    |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run check`                                                                                                  | Fail    | Delivery report `2026-09-03T14-24-47-812Z-52156` passes eight enforced lanes. Package, release, and browser quality fail only when WebKit 2336 misses its 30-second inspector handshake. The detector self-test's two red cases detect their intended sabotage but reject the same WebKit timeout as an extra failure. Its 13-test hardening control passes. |
| Native Safari 26.6.2 Apple WebDriver ecosystem route and theme-control probe                                                                             | Pass    | Safari loads `/docs/ecosystem/`, initializes the documentation shell, exposes the independence notice, Core/QUnit versions and peer range, and updates both theme state and its accessible label through a real WebDriver click.                                                                                                                             |
| `node scripts/quality/browser-preflight.mjs webkit --json`; `CI=1 npx playwright test e2e/site.spec.ts --project=desktop-webkit --workers=1 --retries=0` | Pass    | The active Aqua session clears the WebKit launch problem. WebKit 26.5 passes preflight, and all nine website tests pass, including every direct documentation route and WebMCP registration.                                                                                                                                                                 |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run check` (`quality:delivery`)                                                                             | Pass    | Delivery report `2026-09-03T14-48-11-618Z-8205` passes all 12 enforced lanes, including package consumers, the 299-test browser selection, release proof, and all 13 detector self-tests.                                                                                                                                                                    |

### Inspection ledger

| Finding                                                                                                    | Resolution                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raw phrase assertions broke when HTML or Markdown formatting inserted inline markup or whitespace.         | Normalize rendered-policy whitespace for disclaimer assertions and keep the exact `$ is real jQuery` phrase in one Markdown code span.                                                                                                                                          |
| The initial package exceeded its frozen size ceiling.                                                      | Exclude the repository-only evidence schema and losslessly recompress the indexed PNG without changing dimensions, palette, or image data.                                                                                                                                      |
| The ecosystem article duplicated its detailed repository policy through every generated surface.           | Keep the full public overview page, index it with a concise source-backed corpus summary, and retain detailed evidence in the repository doc.                                                                                                                                   |
| A direct Pages smoke ran after a root-base build.                                                          | Use the configured `npm run build:pages` command, which sets `/jqstar/` before running the same smoke.                                                                                                                                                                          |
| Delivery's package-hardening detector expected 12 tests after the suite had grown to 13.                   | Update the exact green-control count to 13; the suite itself passed all 13 tests in the failed delivery run.                                                                                                                                                                    |
| The current Playwright alpha carries WebKit 26.6 revision 2359, newer than the failing stable revision.    | An isolated minimal probe reproduces the same timeout, so a repository dependency bump cannot clear the delivery blocker today.                                                                                                                                                 |
| Native Safari testing was requested after `safaridriver` initially reported remote automation as disabled. | `sudo safaridriver --enable` created the user WebDriver preference with `AllowRemoteAutomation = true`. Native Safari still could not launch while the server had no logged-in macOS desktop session. Direct Chrome headless-shell proof remained available without Playwright. |
| The WebDriver preference alone did not create a desktop browser session.                                   | Logging `chadpeppers` into the Aqua console made Safari 26.6.2 and bundled WebKit 26.5 available. Native route/interaction proof and all nine desktop-WebKit website tests now pass.                                                                                            |

## Document

### Documentation changed

- `docs/JQUERY_ECOSYSTEM.md` publishes the dated status matrix, exact dispositions, migration
  boundaries, capability gaps, naming, attribution, stewardship gates, and review cadence.
- `README.md`, `docs/README.md`, `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, and the roadmap place
  Core, QUnit, Migrate, UI, Mobile, and Sizzle in their approved package and migration roles.
- `example/docs/ecosystem/index.html`, the shared documentation shell, and the generated agent
  corpus publish the independent-project notice, reviewed releases, peer range, and migration
  summary to browser and headless users.
- Tickets 0014, 0032, 0039, and 0040 carry the stable QUnit, Migrate, jQuery UI, and jQuery Mobile
  implementation boundaries from the matrix.

### Acceptance evidence

| Criterion | Result | Evidence                                                                                                                                                                                                                                                       |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01     | Pass   | `quality/jquery-ecosystem.json` validates against its closed schema with review and expiry dates, all six projects, official status/releases/sources, dispositions, non-goals, owner tickets, and recheck triggers.                                            |
| AC-02     | Pass   | `package.json`, package consumers, graph checks, and public architecture keep `jquery` as the sole real peer at `>=4.0.0 <5`, with no fork. Tests preserve `$` as jQuery and `$name` as a signal.                                                              |
| AC-03     | Pass   | The installed testing consumer runs three QUnit cases against the exact tarball. Package and graph proof exclude QUnit from runtime bundles while Vitest, property, static, and Playwright gates remain authoritative.                                         |
| AC-04     | Pass   | The guide follows Migrate's staged, opt-in, temporary warning workflow. Ecosystem contract and package/source/graph checks reject bundled, injected, auto-loaded, suppressed, or rewriting Migrate behavior.                                                   |
| AC-05     | Pass   | The matrix and guide assign jQuery UI to coexistence and migration while native jQStar remains primary. Dependency, source, package, site, and graph scans prove no UI runtime, fork, theme, or architecture ships.                                            |
| AC-06     | Pass   | The complete UI capability map distinguishes direct counterparts, changed semantic/API migrations, coexistence, and gaps across Widget Factory, ThemeRoller, effects, Position, interactions, extensions, and imperative plugins.                              |
| AC-07     | Pass   | Mobile guidance preserves named progressive-enhancement lessons while rejecting its router, page, virtual-mouse, theme, widget, and runtime contracts. Source/artifact scans and ticket 0040 enforce the no-runtime path.                                      |
| AC-08     | Pass   | The matrix assigns Sizzle no separate integration. Source, dependency, export, and claim scans keep selector behavior with the tested jQuery peer and expose no Sizzle extension contract.                                                                     |
| AC-09     | Pass   | Tickets 0014, 0032, 0039, and 0040 contain stable matrix IDs and exact QUnit, Migrate, UI, and Mobile implementation/evidence boundaries. Contract tests verify the downstream mappings.                                                                       |
| AC-10     | Pass   | Naming scans and public copy consistently use jQStar, `jquery-star`, `jqstar`, `data-jqs`, and jqstar.com, classify the repository path as legacy only, and include the independent-project disclaimer.                                                        |
| AC-11     | Pass   | Package metadata, README/site copy, generated assets, examples, guides, and release surfaces pass attribution and forbidden-claim checks. No official logo or confusing trade dress ships.                                                                     |
| AC-12     | Pass   | The matrix requires shipped migration evidence, adoption, upstream participation, governance, security, funding, consultation, and explicit written agreement before any official stewardship claim or contact.                                                |
| AC-13     | Pass   | The policy documents the six-month expiry, release/audit recheck triggers, primary-source refresh procedure, digest propagation, and fail-closed checks for stale status or release evidence.                                                                  |
| AC-14     | Pass   | Focused ecosystem/site tests, JSON/schema validation, spelling, static, package graph, forbidden-name, native Safari, WebKit site, ticket Test validation, `git diff --check`, and delivery run `2026-09-03T14-48-11-618Z-8205` pass without mutation testing. |

### Completion audit

All 14 criteria have direct current-tree evidence. The dated matrix, schema, package and graph
boundaries, public guide, generated corpus, downstream ticket mappings, native Safari check,
three-browser site proof, and delivery receipt agree. No unresolved finding remains in this ticket.

Status: Complete
