---
id: 0045
title: Lead with the server-rendered framework promise
status: done
created: 2026-08-31
updated: 2026-08-31
---

# 0045: Lead with the server-rendered framework promise

## Plan

### Problem

The GitHub README and browser homepage currently lead with reactive syntax and the component
catalog. They demonstrate how jQuery Star works, but they do not immediately explain who the
framework is for, which application responsibilities remain on the server, or why a team would
choose it instead of adopting a single-page application architecture.

### Current evidence

- `README.md` opens with "Datastar-style reactive attributes" and moves from one syntax example
  directly into setup instructions.
- `example/index.html` opens with "Reactive markup. Actual jQuery." and then starts the component
  proof.
- `docs/PROJECT.md` defines a small reactive client layer for server-rendered applications, but that
  distinction is not prominent on either public entry point.
- The public surfaces do not gather the framework's seven concrete benefits or seven development
  priorities in one place.

### Scope

- Lead the GitHub README with the promise of a full-featured frontend platform for server-rendered
  applications that do not want to become single-page applications.
- Put the seven concrete server-rendered benefits and seven framework priorities before setup in the
  README.
- Put the same promise, benefits, and priorities before the component proof on the browser homepage.
- Keep the existing `$` versus `$name` explanation and working syntax example near the top of the
  README.
- Align the project brain with the public positioning.
- Update page metadata to describe the same product promise.
- Finish ticket 0044's explicitly deferred, uncommitted first package baseline using the exact
  public-README tarball measurement and the next 4-KiB packed and unpacked boundaries.
- Make the mobile touch-target audit select visible controls and measure their geometry in one
  browser task after delivery exposed a Message Scroller visibility race.

### Out of scope

- Adding runtime behavior, routes, components, or build dependencies.
- Comparing feature counts or performance with React or another framework.
- Claiming jQuery or OpenJS sponsorship, endorsement, or official successor status.
- Redesigning the component catalog or changing its existing demonstrations.
- Promising capabilities that are only planned and presenting them as shipped.
- Increasing an established package budget or changing any non-package ceiling.
- Changing Message Scroller behavior or weakening the minimum size asserted for visible controls.

### Acceptance criteria

- [x] [AC-01] The README's opening screen identifies jQuery Star as a frontend platform for
      server-rendered applications that do not want to become single-page applications.
- [x] [AC-02] The README puts the seven server-owned and incrementally enhanced application benefits
      and the seven framework priorities before installation instructions.
- [x] [AC-03] The browser homepage puts the same promise, benefits, and priorities before the
      component catalog without weakening semantic HTML or responsive behavior.
- [x] [AC-04] The homepage title, description, and social metadata use the server-rendered, non-SPA
      positioning.
- [x] [AC-05] The README and homepage preserve the exact rule that `$` is real jQuery and `$name` is
      a reactive signal.
- [x] [AC-06] `docs/PROJECT.md` records the positioning as a product boundary and distinguishes
      shipped capabilities from development priorities.
- [x] [AC-07] Focused documentation checks and the complete delivery gate pass on the final tree.
- [x] [AC-08] The uncommitted first package baseline records the exact final public-document
      measurement and uses only the next 4-KiB boundaries authorized by ticket 0044.
- [x] [AC-09] The mobile touch-target audit atomically excludes controls hidden by themselves or an
      ancestor while continuing to fail rendered controls below the 24-pixel minimum.

### Design

Use one plain-language promise on both public entry points: teams can build modern, reactive,
server-rendered applications without transferring ownership of routing, validation, permissions, and
data to a browser-side application. Follow it with two labeled lists: what teams can keep and what
the framework is being built to deliver.

The README retains its compact syntax proof immediately after the positioning. The browser page uses
existing colors, spacing, cards, and responsive breakpoints, with one introductory section before
the existing catalog. Priorities that are not fully shipped are labeled as direction rather than
current capability.

### Decisions

- Use "single-page application" before the abbreviation "SPA" on each public surface.
- Describe the product independently. Do not position it as React compatibility or an official
  jQuery successor.
- Keep both seven-item lists intact because the user selected them as the framework's front-page
  explanation.
- Treat optional navigation and shared state as future-friendly boundaries, not requirements for
  adopting the framework.
- The first delivery run measured 1,852,528 packed and 6,069,206 unpacked bytes after the public
  README changed. Ticket 0044 explicitly defers final baseline ratification until final ticket and
  public-documentation edits. Set only the smallest enclosing 4-KiB boundaries: 1,855,488 packed and
  6,070,272 unpacked bytes.
- Replace the two-step Playwright `:visible` selection and later `evaluateAll` measurement with one
  page evaluation. Exclude explicit `hidden`, `display: none`, and hidden-visibility ancestors, but
  still measure zero-sized rendered controls so the target-size detector cannot become vacuous.

### Risks

- "Full-featured" could imply that every roadmap item ships today. Separate current benefits from
  explicit development priorities.
- A long introduction could hide the syntax identity. Keep the working `$` and `$name` proof before
  setup and link the homepage lists visually as one compact section.
- Marketing wording can drift away from architecture. Keep server authority and progressive
  enhancement consistent with `docs/PROJECT.md`.
- A documentation change could be used to hide an uncontrolled budget increase. Preserve the exact
  measurement, the existing next-4-KiB rule, and the first-baseline-only limitation in both owning
  tickets and the quality program.
- A visibility filter could hide genuine zero-size regressions. Filter only semantic and computed
  hidden states; do not filter based on measured width or height.

### Verification plan

- Run Markdown, HTML, spelling, and formatting checks on the changed files.
- Inspect the homepage at desktop and narrow widths to confirm list flow and heading order.
- Re-run package quality after ratifying the still-uncommitted first baseline.
- Repeat the focused mobile project without retries and run its existing sabotage detector after
  making visibility sampling atomic.
- Run `npm run quality:fast` before closing Code.
- Run `npm run quality:delivery` on the completed ticket tree.
- Run ticket phase validation and `git diff --check`.

### Planned files

- `README.md`: Lead the GitHub project page with the framework promise and both lists.
- `example/index.html`: Lead the browser homepage with the same positioning and metadata.
- `example/style.css`: Lay out the positioning section with the existing visual language.
- `docs/PROJECT.md`: Record the product promise and distinguish direction from shipped behavior.
- `config/quality-budgets.json`: Ratify the final first package-byte boundaries.
- `docs/QUALITY_PROGRAM.md`: Record the final exact package measurement and ceilings.
- `docs/tickets/0044-prove-browser-package-quality.md`: Update the owning quality ticket's measured
  baseline and retained delivery evidence.
- `e2e/quality-contracts.spec.ts`: Take an atomic visible-control target-size snapshot.
- `docs/tickets/0045-lead-with-server-rendered-positioning.md`: Track decisions and evidence.

## Code

### Changed-file ledger

| File                                                         | Purpose                                           |
| ------------------------------------------------------------ | ------------------------------------------------- |
| `docs/tickets/0045-lead-with-server-rendered-positioning.md` | Record the positioning decision and its evidence. |
| `README.md`                                                  | Put the product promise and priorities first.     |
| `example/index.html`                                         | Put the same position on the browser homepage.    |
| `example/style.css`                                          | Present both lists in a responsive introduction.  |
| `docs/PROJECT.md`                                            | Bind public positioning to project direction.     |
| `config/quality-budgets.json`                                | Ratify both final first package-byte boundaries.  |
| `docs/QUALITY_PROGRAM.md`                                    | Record the exact final package baseline.          |
| `docs/tickets/0044-prove-browser-package-quality.md`         | Update the owning ticket's package evidence.      |
| `e2e/quality-contracts.spec.ts`                              | Remove the mobile visibility sampling race.       |

### Design changes

- The introductory cards reuse the existing card surface, but apply a more specific single-column
  grid rule so the heading and list do not compete for narrow columns at desktop widths.
- The mobile target audit now resolves hidden state and geometry in one page evaluation. It still
  measures rendered zero-size controls and preserves the 24-pixel threshold and sabotage path.

## Test

| Command                                                      | Result        | Evidence                                                                                                                                                      |
| ------------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ticket:validate -- --phase plan --ticket …0045….md` | Pass          | The ticket passed Plan validation before public files changed.                                                                                                |
| `npm run lint:markdown`                                      | Repair fail   | The new README heading ended with punctuation; the heading was corrected.                                                                                     |
| `npm run lint:markdown`                                      | Pass          | All 63 selected Markdown files passed with zero issues.                                                                                                       |
| `npm run lint:html`                                          | Pass          | The homepage and registry HTML passed `html-validate`.                                                                                                        |
| `npm run lint:spelling`                                      | Pass          | All 51 selected project-brain and public-document files passed.                                                                                               |
| Focused Prettier check and `git diff --check`                | Pass          | All five changed product and ticket files were formatted with no whitespace errors.                                                                           |
| Playwright inspection at 1440 × 1000 and 390 × 844           | Repair pass   | Both layouts exposed 14 list items; a desktop grid cascade issue was repaired and reinspected.                                                                |
| `npm run quality:fast`                                       | Pass          | Run `2026-08-31T14-25-43-351Z-62772` passed all five enforced fast gates.                                                                                     |
| `npm run quality:delivery`                                   | Repair fail   | Run `2026-08-31T14-27-02-980Z-70490` passed 12 gates and rejected the provisional packed-byte ceiling after the public README grew.                           |
| `npm run test:package:quality`                               | Pass          | All 13 package checks passed with the ratified 261-file public-document baseline.                                                                             |
| `npm run quality:fast` after baseline repair                 | Pass          | Run `2026-08-31T14-42-22-401Z-96932` passed all five enforced fast gates.                                                                                     |
| Repaired-tree `npm run quality:delivery`                     | Repair fail   | Run `2026-08-31T14-43-40-394Z-5070` passed 12 gates; mobile target inspection measured a button after it became hidden and correctly rejected the retry-pass. |
| Focused mobile test with `--repeat-each=10 --retries=0`      | Pass          | All 10 isolated executions passed, confirming the failure depends on visibility changing between selection and measurement.                                   |
| Atomic mobile test with `--repeat-each=20 --retries=0`       | Pass          | All 20 post-repair executions passed with no retries.                                                                                                         |
| Focused `JQS_QUALITY_SABOTAGE=mobile-target` test            | Expected fail | The unchanged detector rejected an 85.15625-pixel rendered button against the sabotaged 10,000-pixel minimum.                                                 |
| `npm run test:quality:0044`                                  | Pass          | All 16 browser, package, API, budget, and release detectors remained live after the atomic mobile repair.                                                     |
| `npm run quality:fast` after mobile repair                   | Pass          | Run `2026-08-31T15-04-39-240Z-36262` passed all five enforced fast gates.                                                                                     |
| `npm run quality:delivery` after all repairs                 | Pass          | Run `2026-08-31T15-06-12-375Z-44248` passed all 13 enforced gates and wrote a current-tree receipt.                                                           |
| Test-phase validation through `latest-report.json`           | Repair fail   | The validator refused the convenience copy because the receipt authorizes the immutable retained report path.                                                 |
| Test-phase validation through the retained run report        | Pass          | The exact receipt-authorized report passed Test-phase validation.                                                                                             |

### Inspection ledger

| Finding                                                                                                               | Resolution                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| The first desktop render split each card heading and list into columns.                                               | Increased the promise-card selector specificity; both cards now use one internal column.                                  |
| Both lists stack naturally at 390 pixels with no horizontal page scroll.                                              | Accepted; native list semantics and reading order remain intact at the narrow viewport.                                   |
| The exact tarball exceeded both provisional byte ceilings before ticket 0044's first baseline was committed.          | Apply ticket 0044's recorded next-4-KiB rule to the exact 1,852,528 packed and 6,069,206 unpacked byte measurement.       |
| Playwright selected a transiently visible Message Scroller button, then measured it after the button had `hidden=""`. | Select rendered controls and measure their boxes in one browser evaluation without excluding rendered zero-size controls. |

## Document

### Documentation changed

- `README.md` now leads the GitHub page with the server-rendered promise, seven concrete benefits,
  and seven framework priorities before syntax and setup.
- `example/index.html` and `example/style.css` put the same position and responsive list treatment
  before the component proof and align page and social metadata.
- `docs/PROJECT.md` records the product boundary and labels the numbered list as direction.
- `docs/QUALITY_PROGRAM.md` and ticket 0044 record the final first package baseline and retained
  quality evidence.
- Ticket 0045 records the positioning decisions, visual inspection, focused failures, repairs, and
  delivery evidence.

### Acceptance evidence

| ID    | Evidence                                                                                                                               | Result |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `README.md` opens with the full-featured server-rendered, non-SPA promise.                                                             | Pass   |
| AC-02 | Both seven-item lists appear before `## Setup` in `README.md`.                                                                         | Pass   |
| AC-03 | The homepage hero and two semantic list cards precede the unchanged component proof; desktop and 390-pixel inspection passed.          | Pass   |
| AC-04 | `example/index.html` title, description, Open Graph, and Twitter fields share the new position.                                        | Pass   |
| AC-05 | The README syntax proof and homepage callout state that `$` is real jQuery and `$name` is a reactive signal.                           | Pass   |
| AC-06 | `docs/PROJECT.md` separates the public product promise from the seven-item development direction.                                      | Pass   |
| AC-07 | Focused checks passed, and delivery run `2026-08-31T15-06-12-375Z-44248` passed all 13 gates.                                          | Pass   |
| AC-08 | The 1,852,528 packed and 6,069,206 unpacked byte artifact fits only the next 4-KiB ceilings recorded in `config/quality-budgets.json`. | Pass   |
| AC-09 | Twenty retry-free mobile runs passed, and the existing 10,000-pixel sabotage remained red after atomic sampling.                       | Pass   |

### Completion audit

The current tree satisfies every criterion, retains both repair failures, and has one direct Pass
row for every checked criterion. No criterion is deferred and no public capability is presented as
shipped merely because it appears in the development-priority list.

Status: Complete
