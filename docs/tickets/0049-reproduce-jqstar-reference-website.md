---
id: 0049
title: Reproduce the jQStar reference website
status: done
created: 2026-08-31
updated: 2026-09-02
---

# 0049: Reproduce the jQStar reference website

## Plan

### Problem

The repository already ships a native jQStar website, but it does not reproduce the supplied
`jQStar-Component-Library.zip` design closely enough to serve as the intended public face. The
reference implementation is a React, Radix, Tailwind, and Wouter application. Shipping it directly
would contradict the framework's HTML-first position and would fail to prove that jQStar can build
its own website.

The repository folder still uses the older `jqdatastar` working name even though the package, CLI,
attributes, documentation, source archive, and current website all present the product as jQStar.
That ambiguity should end before the public site moves to its permanent domain.

### Current evidence

- `package.json` names the package `jquery-star`; the CLI is `jqstar`; component roots use
  `data-jqs`; and the project brain calls the product jQuery Star.
- The supplied archive labels the site jQStar and contains desktop and mobile screenshots. Its
  source depends on React, Radix UI, Tailwind, and Wouter.
- The archive's current source and `jqstar-retro-type.jpg` agree on the final display typography.
  The older `jqstar-home.jpg` remains useful for layout dimensions but is not the type authority.
- `example/` already provides native multi-page home, documentation, and Component Lab routes with
  real jQStar behavior, so the redesign should replace presentation rather than architecture.
- As checked on 2026-08-31, npm reports no `jqstar`, `jquery-star`, or `jqdatastar` package. DNS
  reports no live A or NS records for `jqstar.com`; registrar availability is a separate purchase
  check.
- jQStar describes the durable jQuery-centered product. jQDatastar would imply that Datastar is the
  only supported protocol even though JSON/HTML work now and Turbo, htmx, CSP, plugins, and shared
  services are planned.

### Scope

- Adopt **jQStar** as the public product and site name. Keep `jqdatastar` only as the existing local
  repository directory until a separately ticketed repository rename is safe.
- Treat the supplied React source plus `jqstar-retro-type.jpg` and `jqstar-dialog-mobile.jpg` as the
  visual reference.
- Reproduce the home page and documentation shell geometry, typography, palette, glow, cards,
  borders, spacing, responsive behavior, and interaction states with native HTML, CSS, and jQStar.
- Reproduce the supplied documentation routes with truthful current package names, attributes, APIs,
  and examples.
- Keep direct multi-page URLs, JavaScript-disabled content, self-hosting, base-path builds, and the
  Component Lab.
- Use real jQStar components and actions for theme, mobile navigation, search, copy feedback,
  preview tabs, dialog, dropdown, tabs, and toast examples.
- Self-host any reference fonts needed for visual fidelity under their original licenses. Do not add
  a remote runtime font dependency.
- Compare the rendered desktop home and mobile dialog route with the supplied screenshots and record
  concrete differences and resolutions.
- Prepare metadata and documentation for `jqstar.com` without claiming the domain is connected
  before DNS and hosting actually exist.

### Out of scope

- Shipping React, Radix, Tailwind, Wouter, or the archive's generated workspace and API server.
- Copying fictional `jqstar` package installation commands or unimplemented component attributes.
- Renaming the local checkout, Git repository, npm package, CLI binary, or public runtime methods.
- Purchasing a domain, changing DNS, publishing npm packages, or claiming affiliation with the
  jQuery Foundation or OpenJS Foundation.
- Replacing or weakening the exhaustive Component Lab.
- Implementing roadmap ticket 0007 or later runtime capabilities as part of a visual redesign.

### Acceptance criteria

- [x] [AC-01] Public website copy, metadata, project documentation, and visible branding use jQStar
      consistently and explain the legacy `jqdatastar` directory name where needed.
- [x] [AC-02] At 1440 × 1000, the rendered home page reproduces the supplied final reference's
      header, hero, glow, display type, calls to action, feature cards, and first-viewport geometry.
- [x] [AC-03] At the supplied mobile width, the dialog documentation route reproduces the header,
      content rhythm, preview frame, and API table while remaining keyboard and touch usable.
- [x] [AC-04] Home, documentation, search, theme, copy, preview, and component interactions run
      through native behavior and real jQStar contracts with useful JavaScript-disabled content.
- [x] [AC-05] No React, React DOM, Radix, Tailwind, Wouter, or client-router runtime ships in the
      public website bundle.
- [x] [AC-06] Every visible installation command, URL, attribute, API example, version statement,
      and GitHub link matches the current repository; Component Lab coverage remains intact.
- [x] [AC-07] Chromium, Firefox, and WebKit checks pass for direct routes, responsive layout,
      keyboard behavior, reduced motion, theme persistence, accessibility, and component previews.
- [x] [AC-08] Visual comparison records the reference and rendered viewport dimensions plus any
      remaining pixel differences; no known material mismatch remains.
- [x] [AC-09] Base-path builds, self-hosted serving, installed-package serving, `npm run check`, and
      `git diff --check` pass on the completed tree.

### Design

Keep the multi-page site built in ticket 0046. Route HTML remains authoritative and usable before
JavaScript. The shared documentation shell remains a build-time HTML transform, while `site.ts`
installs only localized enhancement. Recreate the reference's design tokens in `site.css` and use
the framework's documented `data-jqs`, `data-part`, and state attributes for interactive examples.

The public name is jQStar. “jQ” identifies the real jQuery foundation and “Star” leaves room for
Datastar plus other HTML delivery protocols. Datastar remains a first-class integration and a
prominent part of the message, not the product's entire name.

### Decisions

- Current archive source and the retro-type screenshot are the final visual authority when the two
  supplied desktop screenshots differ.
- Visual fidelity does not override truthful package/API copy, native semantics, accessibility, or
  the no-React boundary.
- Self-host reference fonts rather than loading Google Fonts at runtime.
- Preserve the existing social preview unless inspection shows it conflicts with the final visual
  direction or metadata.
- Record but do not perform the `jqstar.com` hosting and DNS handoff until the domain exists.

### Security and accessibility

- Search remains local and must not inject query text as HTML.
- Copy actions write fixed authored snippets and expose an accessible status message.
- Mobile navigation and component overlays retain focus trapping, Escape, outside-pointer,
  restoration, labeling, and reduced-motion behavior.
- External links receive safe new-window attributes where applicable.
- Font files are vendored from an authoritative source with their licenses and no executable code.

### Risks

- A literal copy of the React markup can smuggle fictional APIs or framework-specific state into the
  public examples.
- Visual fonts and glow effects can harm loading, contrast, or reduced-motion behavior.
- Added assets can exceed immutable package budgets or make the packaged site nondeterministic.
- Desktop similarity can hide overflow, clipped tables, or unusable navigation at the mobile
  reference viewport.
- Existing broad worktree changes make unrelated rewrites dangerous; this ticket must touch only the
  website and its direct documentation/test contracts.

### Verification plan

- Validate this ticket before changing website behavior.
- Build a bounded home-page slice, start the existing development server, and open the first
  meaningful preview only after it compiles.
- Capture and compare 1440 × 1000 home and mobile dialog screenshots against the supplied files.
- Exercise search, theme, copy, navigation, preview tabs, dialog, dropdown, tabs, and toast with
  keyboard and pointer input.
- Run focused structure, HTML, style, type, site E2E, component-lab, base-path, self-hosted, and
  package checks before the complete delivery gate.
- Run `npm run check` and `git diff --check` on the final documented tree.

### Planned files

- `example/index.html`: Reference-matched home markup and truthful product message.
- `example/docs-shell.html`, `example/docs/**/index.html`: Reference-matched documentation shell and
  route content.
- `example/site.css`, `example/site.ts`: Shared visual system and real jQStar interactions.
- `example/public/fonts/**`, font license files: Self-hosted reference display typography if package
  budgets permit it without weakening a ceiling.
- `example/public/favicon.svg`, `example/public/og-jqstar.png`: Preserve or align brand assets after
  inspection.
- `e2e/site.spec.ts`, `test/site-structure.test.mjs`: Responsive, interaction, route, and forbidden
  runtime contracts.
- `vite.demo.config.ts`, `scripts/bundle-site.mjs`, package quality fixtures: Update only if assets
  or route output require it.
- `README.md`, `docs/{PROJECT,DEVELOPMENT,SELF_HOSTING}.md`: Public name, preview, and domain
  handoff.
- `docs/tickets/ROADMAP.md`: Place the redesign after the original website delivery.
- `docs/tickets/0049-reproduce-jqstar-reference-website.md`: Plan, ledger, comparison evidence, and
  completion audit.

## Code

### Changed-file ledger

| File                                                                                          | Purpose                                                                                            |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `docs/tickets/0049-reproduce-jqstar-reference-website.md`                                     | Plan, changed-file ledger, verification history, and completion evidence.                          |
| `docs/tickets/ROADMAP.md`                                                                     | Place the reference redesign after the original site delivery.                                     |
| `cspell.json`                                                                                 | Recognize the reference's Wouter and Audiowide proper names in checked documentation.              |
| `README.md`, `package.json`                                                                   | Use jQStar as the public brand while preserving the `jquery-star` package contract.                |
| `docs/README.md`, `docs/PROJECT.md`, `docs/SELF_HOSTING.md`, `docs/LIBRARY_EXPANSION_PLAN.md` | Record the public naming decision and use jQStar consistently in project and operating guidance.   |
| `docs/BACKEND.md`, `docs/COMPONENT_ARCHITECTURE.md`, `docs/COMPONENT_RESEARCH.md`             | Use jQStar consistently in shipped backend and component guidance.                                 |
| `docs/QUALITY_PROGRAM.md`, `docs/RUNTIME_OWNERSHIP.md`                                        | Use jQStar consistently in current quality and runtime architecture guidance.                      |
| `example/index.html`                                                                          | Reproduce the reference home structure, first viewport, and truthful framework message.            |
| `example/docs-shell.html`                                                                     | Reproduce the desktop sidebar and compact mobile documentation header with native markup.          |
| `example/docs/index.html`, `example/docs/{api,datastar,components}/index.html`                | Apply the reference documentation rhythm to truthful current guides.                               |
| `example/docs/components/{dialog,dropdown,tabs,toast}/index.html`                             | Reproduce the supplied component-guide pattern with real jQStar attributes and APIs.               |
| `example/site.css`                                                                            | Reproduce the reference tokens, typography, glow, geometry, dark/light themes, and responsive UI.  |
| `example/site.ts`                                                                             | Run search, theme, copy, mobile navigation, and dialogs through installed jQStar actions.          |
| `example/main.ts`, `example/components/lab/index.html`                                        | Use the jQStar public name throughout visible Component Lab content.                               |
| `example/public/fonts/**`                                                                     | Self-host Audiowide, Inter, and Silkscreen WOFF2 files with their OFL licenses.                    |
| `example/public/og-jqstar.png`                                                                | Preserve the social artwork as a high-quality indexed PNG that stays inside package budgets.       |
| `e2e/site.spec.ts`                                                                            | Verify routes, three-engine behavior, reference geometry, mobile overflow, a11y, and interactions. |
| `test/site-structure.test.mjs`                                                                | Prove native route structure, forbidden-runtime absence, social metadata, and licensed fonts.      |
| `scripts/smoke-server.mjs`, `scripts/quality-release.mjs`                                     | Verify the reference headline from loose and packed self-hosted website builds.                    |

### Design changes

The existing multi-page architecture remains intact. The home now follows the supplied 1440 × 1000
reference geometry, defaults to its dark presentation, and keeps the broader framework promise below
the reference-matched first viewport. The documentation routes use one build-time native HTML shell
and the supplied mobile header/content dimensions. Their examples retain real `data-jqs`,
`data-part`, jQuery, package, and CLI contracts instead of copying the React reference's fictional
attributes.

Audiowide, Inter, and Silkscreen are self-hosted under the SIL Open Font License. The site maps the
published jQStar component theme variables onto its dark and light palettes so preview controls keep
their real runtime styling and WCAG contrast. The public name is jQStar; `jquery-star` remains the
npm package, `jqstar` remains the CLI and repository name, and `jqdatastar` remains only the current
checkout directory.

## Test

| Command                                       | Result | Evidence                                                                                                                                                   |
| --------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan-phase ticket validation                  | Pass   | Ticket 0049 passed before website behavior changed.                                                                                                        |
| `npx playwright test e2e/site.spec.ts`        | Fail   | Initial run passed 12/18. All engines found the 65 px header caused by a 64 px inner row plus its border; the box model was corrected to 64 px total.      |
| `npx playwright test e2e/site.spec.ts`        | Fail   | Second run passed geometry and interactions but exposed a skipped home heading level and dark-theme component contrast; both contracts were corrected.     |
| `npx vitest run test/site-structure.test.mjs` | Pass   | All five native-route, forbidden-runtime, social-preview, WOFF2, and font-license tests passed.                                                            |
| `npm run lint:html`                           | Pass   | Every website and registry HTML file passed html-validate.                                                                                                 |
| `npm run lint:css`                            | Pass   | Website and published component CSS passed stylelint.                                                                                                      |
| `npm run typecheck`                           | Pass   | Runtime, server, website, tests, and registry TypeScript contracts compiled without output.                                                                |
| `npx playwright test e2e/site.spec.ts`        | Pass   | All 18 focused cases passed in Chromium, Firefox, and WebKit, including desktop/mobile geometry, a11y, direct routes, theme, search, copy, and components. |
| `npm run quality:fast`                        | Fail   | Unit and workflow gates passed; Prettier found five changed documentation files and cspell lacked the Wouter and Audiowide proper names.                   |
| `npm run quality:fast`                        | Pass   | Run `2026-09-01T04-04-15-314Z-80571` passed workflow, runner self-tests, format, unit, and all fast static checks.                                         |
| Code-phase ticket validation                  | Fail   | The validator correctly rejected the recorded fast report after adding its evidence changed a gated ticket file; a current-tree fast run is required.      |
| Code-phase ticket validation                  | Pass   | Run `2026-09-01T04-05-25-727Z-88271` passed the current-tree fast gate and Code-phase ticket validation without an intervening edit.                       |
| `npm run build:pages`                         | Pass   | Built all native routes and the Component Lab with `/jqstar/` asset paths, including the four licensed font files.                                         |
| `npm run test:self-hosted`                    | Fail   | Build and deployment proof passed, then the server smoke timed out because it still expected the old home headline; loose and packed checks were updated.  |
| `npm run test:self-hosted`                    | Pass   | Loose self-hosted assets passed home, docs, Component Lab, JSON/SSE, browser runtime, page-error, and security-header proof.                               |
| `npm run test:package:quality`                | Fail   | All checks reached the budget gate; the 1,923,483-byte tarball exceeded the fixed 1,871,872-byte ceiling by 51,611 bytes.                                  |
| `npm run test:package:quality`                | Pass   | All 13 checks passed; the indexed social PNG reduced the package to 1,718,375 bytes, 153,497 bytes below the immutable packed ceiling.                     |
| `npm run quality:delivery`                    | Pass   | Run `2026-09-01T04-12-28-247Z-99759` passed all 12 delivery gates and wrote a current-tree receipt.                                                        |
| Test-phase ticket validation                  | Fail   | The mutable latest-report path was rejected because Test validation requires the exact report authorized by the receipt.                                   |
| Test-phase ticket validation                  | Pass   | The exact receipt report path validated ticket 0049 in Test without rerunning the delivery suite.                                                          |
| `npm run quality:fast`                        | Fail   | Every gate except spelling passed; cspell rejected the informal documentation term `lede`, which was replaced with plain wording.                          |
| Direct reference screenshot comparison        | Pass   | Inspected the current 1440 × 1000 home and 390 × 844 dialog renders beside `jqstar-retro-type.jpg` and `jqstar-dialog-mobile.jpg`.                         |
| `npm run quality:delivery`                    | Fail   | Run `2026-09-02T14-50-31-731Z-57511` passed 11/12 gates; static delivery could not start five pinned external analyzers that were absent from `PATH`.      |
| `npm run quality:static:delivery`             | Pass   | With the documented pinned analyzer versions in an isolated temporary tool directory, all 28 static delivery gates passed.                                 |
| `npm run quality:delivery`                    | Pass   | Run `2026-09-02T15-02-54-330Z-83594` passed all 12 delivery gates with the pinned external analyzers available and wrote a current-tree receipt.           |

### Inspection ledger

| Finding                                                                                   | Resolution                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The supplied site is React, Radix, Tailwind, and Wouter code with fictional jQStar APIs.  | Used it only as a visual/content authority; the shipped site remains native multi-page HTML enhanced by the real local package.                                                                                                                                                                                                                                                                |
| The desktop screenshots disagree on display typography.                                   | Treated the current archive source plus `jqstar-retro-type.jpg` as authoritative and self-hosted its Audiowide, Inter, and Silkscreen fonts.                                                                                                                                                                                                                                                   |
| The working folder says `jqdatastar` while every durable public identifier says jQStar.   | Adopted jQStar publicly and documented `jquery-star`, `jqstar`, `data-jqs`, and the legacy checkout name explicitly.                                                                                                                                                                                                                                                                           |
| Relative font URLs were not rewritten for the `/jqstar/` Pages base.                      | Changed the authored font sources to root URLs; Vite now emits the correct base-prefixed assets in Pages builds.                                                                                                                                                                                                                                                                               |
| The first browser run measured a 65 px header in all engines.                             | Made the 4 rem height include the border; home and mobile documentation now begin at the reference's 64 px boundary.                                                                                                                                                                                                                                                                           |
| Defaulting from OS color preference rendered the supplied dark reference in light mode.   | Defaulted first visits to dark while preserving an explicit stored light/dark choice.                                                                                                                                                                                                                                                                                                          |
| Published component colors were light-only inside the dark documentation shell.           | Mapped the real component CSS variables to the site palette; the active and inactive tab states now pass axe contrast checks.                                                                                                                                                                                                                                                                  |
| The first fast gate rejected formatting and two reference proper names.                   | Formatted only the changed documentation and added Wouter and Audiowide to the checked project dictionary.                                                                                                                                                                                                                                                                                     |
| Self-hosted and release smokes still asserted the previous home headline.                 | Updated both loose-server browser/HTML checks and the packed-release check to the reference headline.                                                                                                                                                                                                                                                                                          |
| Licensed fonts pushed the package over its immutable packed-byte ceiling.                 | Kept every font and PNG metadata contract; high-quality indexing reduced the visually unchanged card from 595,391 to 390,989 bytes.                                                                                                                                                                                                                                                            |
| The post-document fast gate rejected the informal word `lede`.                            | Replaced it with `introductory text`; no dictionary exception was needed.                                                                                                                                                                                                                                                                                                                      |
| The in-app browser reported no available browser surface for the requested visual review. | Continued with reproducible three-engine project tests and retained AC-08 as open until a direct final screenshot comparison can be completed.                                                                                                                                                                                                                                                 |
| The original screenshot archive remained available after the in-app browser limitation.   | Extracted the three reference images to an isolated temporary directory, captured the exact current viewports in Chromium, and inspected both pairs directly. The structure, geometry, type, palette, glow, and responsive frame match. Current framework copy and `npm install jquery-star jquery` remain intentional corrections to the archive's fictional text and `npm i jqstar` command. |

## Document

### Documentation changed

- `README.md` now leads with jQStar, keeps the server-rendered framework promise at the front, and
  documents the native public website, local preview, Component Lab, GitHub Pages address, and
  planned `jqstar.com` handoff.
- `docs/PROJECT.md` records jQStar as the public product name, `jquery-star` as the package,
  `jqstar` as the executable, `data-jqs` as the component root, and `jqdatastar` as a legacy
  checkout directory only.
- `docs/README.md`, `docs/BACKEND.md`, `docs/COMPONENT_ARCHITECTURE.md`,
  `docs/COMPONENT_RESEARCH.md`, `docs/QUALITY_PROGRAM.md`, `docs/RUNTIME_OWNERSHIP.md`,
  `docs/SELF_HOSTING.md`, and `docs/LIBRARY_EXPANSION_PLAN.md` use jQStar consistently while
  preserving generic jQuery and package identifiers.
- The native website and Component Lab present jQStar consistently. Installation commands, route
  URLs, APIs, attributes, and version copy remain tied to the current package.

### Acceptance evidence

| Criterion | Evidence                                                                                                                                                                                                                                                                                                                             | Status |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| AC-01     | Website metadata/copy, the Component Lab, README, package description, project brain, backend/component/quality/runtime guides, and self-hosting guidance use jQStar. `docs/PROJECT.md` explains the legacy directory.                                                                                                               | Pass   |
| AC-02     | Three engines assert the 1440 × 1000 header, 606.4 px hero, 670.4 px feature boundary, x=104 content alignment, Audiowide display face, dark default, calls to action, and three supplied feature cards.                                                                                                                             | Pass   |
| AC-03     | Three engines assert the 390 × 844 mobile dialog route, 64 px header, x=24/342 px article and preview frame, no horizontal overflow, reference introductory text, API heading, focus, and Escape behavior.                                                                                                                           | Pass   |
| AC-04     | Direct-route, search, theme persistence, copy, mobile navigation, dialog, menu, tabs, toast, reduced-motion, and JavaScript-disabled delivery checks pass through native HTML and installed jQStar actions.                                                                                                                          | Pass   |
| AC-05     | `test/site-structure.test.mjs`, the native route source, build output, and package checks contain no React, React DOM, Radix, Tailwind client runtime, Wouter, or client router.                                                                                                                                                     | Pass   |
| AC-06     | Site structure and browser tests exercise `jquery-star`, `jquery`, `jqstar`, real `data-jqs`/`data-part` markup, the 0.1 version, current GitHub URL, and the unchanged exhaustive Component Lab.                                                                                                                                    | Pass   |
| AC-07     | Focused site tests passed 18/18 in Chromium, Firefox, and WebKit; delivery browser quality also passed mobile touch, reduced motion, forced colors, zoom/reflow, no-JavaScript, and axe contracts.                                                                                                                                   | Pass   |
| AC-08     | Direct inspection compared 1440 × 1000 and 390 × 844 current Chromium renders with `jqstar-retro-type.jpg` and `jqstar-dialog-mobile.jpg`. Layout, type, palette, glow, cards, header, and mobile preview frame match. Truthful framework copy and the real install command intentionally replace the archive's fictional contracts. | Pass   |
| AC-09     | Delivery run `2026-09-02T15-02-54-330Z-83594` passed ticket workflow, runner self-tests, format, unit, coverage, property, all 28 static analyzers, self-hosted, package, release, browser, and detector self-test gates. The terminal ticket tree is bound by the final delivery receipt.                                           | Pass   |

### Completion audit

All nine acceptance criteria have direct evidence. The final delivery receipt binds the terminal
ticket, implementation, tests, generated assets, and documentation to one unchanged worktree
fingerprint.

Status: Complete
