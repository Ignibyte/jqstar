---
id: 0046
title: Build the jQStar website with jQStar
status: done
created: 2026-08-31
updated: 2026-08-31
---

# 0046: Build the jQStar website with jQStar

## Plan

### Problem

The current browser surface is a single, very large component proof. It demonstrates the runtime,
but it is not an approachable framework website or documentation system. A supplied jQStar website
design provides a stronger public identity and documentation structure, but its implementation is a
React 19 prototype whose component examples and API copy do not match the real library.

The public site must adopt that design without making React, Radix, a client router, or a React
component stack part of jQStar. It should be a credible self-hosting proof: native HTML enhanced by
the actual jQStar package, while preserving the comprehensive component and backend laboratory used
by the quality suite.

### Current evidence

- `/Users/chadpeppers/Downloads/jQStar-Component-Library.zip` contains a React/Vite prototype with
  client-side routes, Radix UI dependencies, Tailwind utilities, and React-local component state.
- The prototype defines a home page, a responsive documentation shell, Getting Started, Datastar,
  Core API, component overview, and Dialog, Dropdown, Tabs, and Toast pages.
- Its visual language is dark-first with a terminal-and-star mark, yellow/orange accents, restrained
  borders and glow, display typography, documentation side navigation, preview/code panels, and a
  mobile navigation sheet.
- Its examples use nonexistent `data-jqstar-*` attributes and hand-built React behavior. The real
  public contracts use native elements, `data-jqs` roots, `data-part` slots, documented state
  attributes, and jQuery Star actions.
- `example/index.html`, `example/main.ts`, and `example/style.css` currently combine the product
  introduction, all component proofs, block proofs, and backend integration into one page.
- Browser and accessibility tests currently enter at `/` and rely on that laboratory's semantic
  names and stable IDs.
- `vite.demo.config.ts` currently builds one HTML entry and publishes it to GitHub Pages under a
  configurable base path.
- The package is named `jquery-star`; `jqstar` is the intended display brand and future domain, not
  a published package rename authorized by this ticket.

### Scope

- Rebuild the supplied visual design in native HTML and CSS enhanced by the repository's actual
  jQStar runtime; ship no React application or React-only dependency.
- Replace the root catalog page with a framework home page that leads with the server-rendered,
  non-SPA position and keeps the agreed benefits and roadmap priorities prominent.
- Publish a responsive multi-page documentation shell with Introduction, Datastar Integration, Core
  API, Components, Dialog, Dropdown, Tabs, and Toast routes.
- Replace every prototype API name and example with verified jQStar markup and behavior.
- Use real jQStar Dialog, Menu/Dropdown, Tabs, Toast, Button, and related primitives in interactive
  previews and in the site's own navigation, theme, search, and copy interactions where applicable.
- Move the existing comprehensive proof to a clearly named Component Lab route and preserve all of
  its component, block, backend, Datastar, accessibility, and browser-test behavior.
- Build every public route for both local development and the configured static GitHub Pages base.
- Add route, responsive, interaction, keyboard, accessibility, metadata, and build-output tests.
- Prepare the site for `jqstar.com` without claiming that DNS, hosting, or the domain purchase has
  already completed.

### Out of scope

- Purchasing the domain, changing DNS, connecting external hosting, or publishing a production
  deployment.
- Renaming the npm package from `jquery-star` to `jqstar`.
- Importing the prototype's `.git` directory, React source, hosted-editor workspace, generated
  components, or dependency graph.
- Writing individual documentation pages for all 102 component recipes in this ticket. The full
  Component Lab remains the exhaustive proof while the initial hand-authored pages establish the
  durable documentation pattern.
- Changing runtime or component behavior solely to imitate the prototype.
- Claiming official ownership of jQuery or any archived jQuery project.

### Acceptance criteria

- [x] [AC-01] The root page matches the supplied design's identity and responsive hierarchy while
      stating jQStar's full framework position rather than the prototype's narrower component-only
      claim.
- [x] [AC-02] The home page prominently presents the server-owned application benefits, seven
      framework priorities, the exact `$` versus `$name` rule, real installation commands, and clear
      Getting Started, documentation, GitHub, and Component Lab paths.
- [x] [AC-03] All nine planned home/documentation routes are directly loadable in local development
      and in the static build under an arbitrary configured base path.
- [x] [AC-04] Site behavior is implemented with native HTML, jQuery, and the repository's jQStar
      runtime; the built site contains no React runtime, React root, JSX entry, client router, or
      Radix dependency.
- [x] [AC-05] Dialog, Dropdown, Tabs, and Toast documentation uses real interactive jQStar examples,
      accurate source snippets, and API/keyboard guidance derived from current contracts.
- [x] [AC-06] The responsive documentation header, desktop sidebar, mobile navigation, theme
      control, search/navigation affordance, preview/code switcher, and copy controls are
      keyboard-usable, semantically labeled, and covered by browser accessibility checks.
- [x] [AC-07] The existing comprehensive component/backend proof remains available at the Component
      Lab route with its established E2E and backend quality contracts passing there.
- [x] [AC-08] Page titles, descriptions, robots policy, favicon, social metadata, visible focus,
      reduced motion, contrast, narrow-screen tables/code blocks, and no-horizontal-overflow checks
      cover the public site.
- [x] [AC-09] Public and project-brain documentation explains the site routes, local preview, static
      build, future `jqstar.com` handoff, and the rule that the website is itself a jQStar consumer.
- [x] [AC-10] Focused checks and `npm run check` pass, and the completion evidence proves no
      downloaded repository metadata or React implementation was copied into the product tree.

### Design

Use a static multi-page site rather than a client router. Each route owns useful server-rendered
HTML, a unique title and description, and the common design shell. Vite receives explicit HTML
entries so nested routes build as nested `index.html` files and remain directly addressable on
static hosting. Shared site TypeScript installs jQStar and small named actions; application-level
navigation/search/theme orchestration stays in the site consumer rather than `src/`.

The root page retains the supplied terminal/star identity, dark canvas, yellow/orange accent, glow,
bordered feature panels, and display typography. Content comes from the established framework
position in ticket 0045, not from the prototype's speculative package/API claims. The display brand
is `jQStar`; install snippets use the current `jquery-star` package.

Documentation pages share one semantic header and sidebar pattern. On narrow screens, a native
`dialog` enhanced by `data-jqs="dialog"` becomes the navigation sheet. Preview/code panels use the
real tabs component. Component previews run real package behavior and source snippets are literal,
auditable HTML rather than a second hidden implementation.

The existing large catalog moves intact to `/components/lab/`. Its TypeScript and CSS remain
separate from the public site entry so the home and documentation pages do not execute the lab's
backend fixtures or ship its demonstration state.

The static deployment keeps ordinary nested files. The npm tarball stores the same deterministic
build as one Brotli-compressed site archive, and the self-hosted server falls back to that archive
when loose deployment files are absent. This keeps the immutable package file, packed-byte, and
unpacked-byte ceilings intact without dropping routes from either deployment mode.

### Decisions

- Treat the downloaded project as a visual and information-architecture reference only.
- Use the source prototype's retro display treatment selectively for identity and headings while
  keeping body copy, code, and tables highly readable.
- Preserve light and dark themes, with dark as the initial design and system preference respected
  when no visitor preference exists.
- Use static nested HTML routes rather than introducing a client-side router before the native
  navigation decision in ticket 0023.
- Preserve the comprehensive proof as Component Lab instead of flattening more than 100 recipes into
  the initial hand-authored documentation navigation.
- Keep the current public package name and current hosted URL until the domain is owned and a
  deployment ticket authorizes canonical and DNS changes.
- Use only assets intentionally selected from the supplied design; do not copy its repository or
  dependency artifacts.
- Do not depend on remote font services. Use the supplied typographic direction with local system
  stacks so CSP, privacy, offline development, and self-hosting remain truthful.
- Bundle site files only at the npm packaging boundary; local development, GitHub Pages, and normal
  self-hosted builds retain inspectable nested HTML files.

### Security and accessibility

- Copy actions write only fixed, authored snippets and report success through an accessible status.
- Search/filter actions operate on authored local navigation data and do not inject query text as
  HTML.
- External links use the real project destinations and safe new-window attributes only when needed.
- Native landmarks, headings, lists, links, buttons, dialogs, tables, code blocks, focus return,
  escape handling, and reduced-motion behavior remain usable without pointer input.
- Theme preference is cosmetic local storage only; content and controls remain available when
  storage or JavaScript is unavailable.
- No downloaded executable, package lock, workspace metadata, or third-party runtime is trusted or
  copied wholesale.

### Risks

- Moving the lab can silently weaken browser coverage if tests are changed rather than retargeted.
- A multi-page Vite configuration can work locally but omit nested entries from the static build.
- Shared shell duplication can drift; tests should census route landmarks, navigation, titles, and
  entry scripts.
- The prototype's visual fonts can reduce readability or add an external performance dependency.
- Documentation can become inaccurate as the component API changes; examples should use tested
  production markup and link to the exhaustive lab.
- The monolithic lab currently imports application-specific block orchestration; that code must not
  leak into ordinary documentation pages.
- A packaged site archive can become nondeterministic or change fallback semantics; sort every path,
  use fixed Brotli parameters, and exercise installed-package GET and HEAD requests.

### Verification plan

- Validate the ticket in Plan, Code, Test, and Document phases.
- Add fast structural tests for the route manifest, HTML entries, metadata, real jQStar markers, and
  forbidden React artifacts.
- Retarget existing E2E suites to the Component Lab without weakening assertions.
- Add Chromium, Firefox, and WebKit checks for direct route loads, home hierarchy, docs navigation,
  theme persistence, copy feedback, search/navigation, component previews, keyboard behavior,
  accessibility, responsive overflow, and reduced motion.
- Build with `/` and `/jqstar/` bases and inspect the nested output route census.
- Run focused formatting, lint, type, HTML, style, unit, E2E, package/static-site, and link checks.
- Run `npm run check` and `git diff --check` before completion.

### Planned files

- `example/index.html`: New framework home page.
- `example/site.ts`, `example/site.css`: Shared self-hosted jQStar behavior and supplied visual
  language.
- `example/docs/**/index.html`: Native multi-page documentation shell and verified content.
- `example/components/lab/index.html`: Preserved comprehensive component/backend proof.
- `example/main.ts`, `example/style.css`: Lab-only behavior and styles after the route move.
- `example/docs-shell.html`: One build-time native documentation shell shared by every article.
- `example/public/favicon.svg`, `example/public/og-jqstar.png`, `example/public/robots.txt`:
  Selected brand assets, social preview, and crawl policy.
- `vite.demo.config.ts`: Explicit multi-page inputs and base-safe build behavior.
- `scripts/bundle-site.mjs`, `server/index.ts`, `package.json`: Deterministic package-site archive
  and installed self-hosted fallback without loosening immutable package ceilings.
- `e2e/components.spec.ts`, `e2e/quality-contracts.spec.ts`: Retarget unchanged lab contracts.
- `e2e/site.spec.ts`: Public-site route, interaction, responsive, and accessibility proof.
- `test/site-structure.test.mjs`: Static route/output and forbidden-runtime contracts.
- `README.md`, `docs/DEVELOPMENT.md`, `docs/PROJECT.md`, `docs/README.md`: Public site, local
  preview, architecture, and project-brain routing.
- `docs/tickets/ROADMAP.md`: Add the website as a Release 0.2 public proof.
- `docs/tickets/0046-build-jqstar-website.md`: Live Plan → Code → Test → Document record.

## Code

### Changed-file ledger

| File                                                                      | Purpose                                                         |
| ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `docs/tickets/0046-build-jqstar-website.md`                               | Plan and live implementation evidence.                          |
| `docs/tickets/ROADMAP.md`                                                 | Place the public self-hosting proof in Release 0.2.             |
| `example/index.html`                                                      | Publish the new framework home and product position.            |
| `example/site.ts`, `example/site.css`                                     | Install jQStar and own site actions and visual system.          |
| `example/docs-shell.html`                                                 | Own the single build-time documentation shell.                  |
| `example/docs/**/index.html`                                              | Publish eight directly loadable, verified guides.               |
| `example/components/lab/index.html`                                       | Preserve the exhaustive proof at its explicit route.            |
| `example/main.ts`, `example/style.css`                                    | Keep the existing proof isolated as the lab consumer.           |
| `example/public/*`                                                        | Ship favicon, social card, and crawler policy.                  |
| `vite.demo.config.ts`                                                     | Build all routes and inject the common docs shell.              |
| `e2e/components.spec.ts`, `e2e/site.spec.ts`                              | Retarget the lab and prove site behavior in browsers.           |
| `test/site-structure.test.mjs`                                            | Census native routes, assets, and forbidden React artifacts.    |
| `scripts/bundle-site.mjs`                                                 | Create a sorted deterministic Brotli site archive.              |
| `server/index.ts`                                                         | Serve loose files or the packaged archive with GET/HEAD parity. |
| `scripts/smoke-server.mjs`, `scripts/smoke-deployment.mjs`                | Verify route and deployment output.                             |
| `scripts/quality-release.mjs`                                             | Require the archive and public routes in release proof.         |
| `scripts/quality/check-links.mjs`, `scripts/quality/static-self-test.mjs` | Support and prove Vite base placeholders.                       |
| `quality/scopes.json`                                                     | Assign new public assets to a quality scope.                    |
| `package.json`, `knip.json`                                               | Wire site CSS, entry, archive, and package boundaries.          |
| `README.md`, `docs/README.md`                                             | Route users into the website and project brain.                 |
| `docs/PROJECT.md`, `docs/DEVELOPMENT.md`                                  | Record ownership, architecture, and local workflow.             |
| `docs/SELF_HOSTING.md`                                                    | Document nested files and packaged archive serving.             |

### Design changes

The implementation keeps the planned multi-page architecture but centralizes repeated navigation in
`example/docs-shell.html`. A Vite HTML transform inserts that native shell around each route-owned
article during development and builds; no client templating or router was introduced.

The npm package could not include every loose site file without weakening the frozen publish-size
budgets. The build now creates one deterministic Brotli archive at the package boundary. Static
hosting and source builds still expose ordinary nested files, while the installed server validates
and serves the archive only when those files are absent.

The old catalog social card was replaced with a jQStar-specific 1200 × 630 card. Remote font loading
was removed after CSP and self-hosting inspection; the supplied typographic direction now uses local
system stacks.

## Test

| Command                                                                                      | Result          | Evidence                                                                                                      |
| -------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run ticket:validate -- --phase plan --ticket docs/tickets/0046-build-jqstar-website.md` | Pass            | Plan requirements validated before implementation.                                                            |
| `npx playwright test e2e/site.spec.ts --project=chromium`                                    | Pass            | Five home, docs, accessibility, component, and copy tests passed after action boot and locator repairs.       |
| `npx playwright test e2e/site.spec.ts --project=firefox --project=webkit`                    | Pass            | Ten cross-browser tests passed after replacing unsupported clipboard permissions with a deterministic stub.   |
| `npx playwright test e2e/components.spec.ts --project=chromium`                              | Pass            | All 75 established Component Lab contracts passed at the new route.                                           |
| `npm run lint:html`                                                                          | Pass            | Native source pages and the shared shell passed HTML validation.                                              |
| `npm run typecheck`                                                                          | Pass            | Runtime, server, site, E2E, and Vite configuration passed strict TypeScript checks.                           |
| `npx vitest run test/site-structure.test.mjs`                                                | Pass            | Four structural and asset contracts passed.                                                                   |
| `npm run build:demo`                                                                         | Pass            | Ten HTML inputs built as nested public routes.                                                                |
| `npm run build:pages`                                                                        | Pass            | The same routes built with the configured `/jqstar/` base.                                                    |
| `npm run test:self-hosted`                                                                   | Pass            | The standalone server served home, docs, lab, API, and SSE routes.                                            |
| `npm run test:package:quality`                                                               | Pass            | Thirteen installed-package contracts passed before the final asset refresh.                                   |
| `npm run test:release:quality`                                                               | Pass            | Seven deterministic release contracts passed before the final asset refresh.                                  |
| First `npm run quality:fast`                                                                 | Expected repair | Scope census, one strict type edge, placeholder links, spelling, and duplication exposed integration defects. |
| `npm run quality:fast`                                                                       | Pass            | All five enforced gates passed in `2026-08-31T22-30-46-022Z-37712`.                                           |
| First `npm run quality:delivery`                                                             | Expected repair | Twelve substantive gates passed; formatting alone caught the newly added ticket evidence row.                 |
| `npm run quality:delivery`                                                                   | Pass            | All 13 delivery gates passed in `2026-08-31T22-50-28-534Z-74320`.                                             |

### Inspection ledger

| Finding                                                                                  | Resolution                                                                                                     |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| The supplied project used React state, a client router, Radix, and fictional attributes. | Kept only its visual and information architecture; every shipped example uses current jQStar contracts.        |
| Site actions were registered but not installed on the document consumer.                 | Booted the body with real `$("body").star()` behavior and retained native fallback content.                    |
| The search dialog did not close reliably when Escape originated in its input.            | Added an explicit local Escape handler with focus return.                                                      |
| A responsive table triggered an accessibility warning for a scrollable region.           | Added keyboard focus and an accessible region label.                                                           |
| Firefox and WebKit do not support Playwright's Chromium clipboard permission.            | Stubbed the authored copy boundary in the cross-browser test without weakening its visible-feedback assertion. |
| Eight copied documentation shells raised measurable drift and duplication.               | Centralized the shell in one native template inserted by Vite before serving or building.                      |
| Loose multi-page files exceeded immutable npm package ceilings.                          | Stored the exact sorted site as a validated Brotli archive and proved archive-only serving.                    |
| The prototype's remote fonts conflicted with offline, privacy, and CSP goals.            | Replaced them with self-hosted system font stacks.                                                             |
| The previous social card described the old Component Lab.                                | Generated and installed a dedicated jQStar framework social card, then removed the obsolete asset.             |

## Document

### Documentation changed

- `README.md` now leads visitors to the framework home, documentation, Component Lab, local preview,
  GitHub Pages URL, and future domain handoff.
- `docs/README.md` and `docs/PROJECT.md` define the website as a native jQStar consumer and place it
  in the repository map and release shape.
- `docs/DEVELOPMENT.md` records the three public surfaces, shared site ownership, local command, and
  quality expectations.
- `docs/SELF_HOSTING.md` documents home/docs/lab routes, nested build files, archive-only package
  fallback, reverse-proxy requirements, and verification commands.
- `docs/tickets/ROADMAP.md` places this public self-hosting proof in Release 0.2; this ticket
  retains the implementation, failure, inspection, and acceptance evidence.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                        | Result |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `example/index.html`, `example/site.css`, and the home Playwright contract prove the supplied dark terminal/star hierarchy at desktop and mobile sizes.         | Pass   |
| AC-02 | Home source and browser assertions contain the exact `$` rule, seven benefits, seven priorities, current install commands, and primary routes.                  | Pass   |
| AC-03 | `vite.demo.config.ts`, `npm run build:demo`, `npm run build:pages`, and deployment census prove root plus eight documentation entries under `/` and `/jqstar/`. | Pass   |
| AC-04 | `example/site.ts` installs real jQuery Star; `test/site-structure.test.mjs` proves no JSX, React root, router, Radix, or copied project metadata.               | Pass   |
| AC-05 | Four component guide sources and the cross-browser site suite exercise real Dialog, Menu, Tabs, and Toast markup and behavior.                                  | Pass   |
| AC-06 | Five site scenarios pass in Chromium and ten pass in Firefox/WebKit, including search, mobile navigation, keyboard use, copy, overflow, and axe checks.         | Pass   |
| AC-07 | `/components/lab/` retains the original consumer and all 75 Chromium component/backend contracts; delivery browser quality passes all required projects.        | Pass   |
| AC-08 | Route metadata, `robots.txt`, favicon, 1200 × 630 social card, reduced-motion CSS, focus styles, axe, and overflow assertions are present and green.            | Pass   |
| AC-09 | README and project-brain development, project, and self-hosting guides document routes, preview, builds, archive fallback, and future domain work.              | Pass   |
| AC-10 | Focused commands and the exact-tree delivery report `2026-08-31T22-50-28-534Z-74320` pass; `git diff --check` is clean.                                         | Pass   |

### Completion audit

The downloaded archive was used only as a design reference from a temporary extraction. No React
runtime, JSX entry, client router, Radix dependency, downloaded lockfile, or repository metadata is
present in `example/`. All requested routes, interactions, documentation, package boundaries, and
quality evidence are complete. Domain purchase, DNS, and production publication remain correctly
outside this ticket and no external deployment state was changed.

Status: Complete
