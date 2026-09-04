# Quality and delivery program

Status: active Created: 2026-08-30 Updated: 2026-08-31

## Outcome

jQStar will use a fail-closed, evidence-gated delivery pipeline for every product change. The public
workflow remains Plan → Code → Test → Document. Each phase has machine-checkable entry and exit
evidence, and a delivery is valid only for the exact worktree state that passed the gate.

The quality system must remain usable by public contributors without access to Ignibyte services.
Rustal Workflow may orchestrate the same commands for Ignibyte work, but the commands, results,
thresholds, and CI verdict live in this repository.

## Reference findings

The plan was derived from direct inspection on 2026-08-30.

### Rustal and Rustal Workflow

Rustal runs separate fast, diff-delivery, and full-regression modes. Its delivery system provides
the controls this project needs:

- named gates with pass, fail, error, and reasoned-skip results
- missing tools fail closed
- no suppression or baseline policy
- coverage floors that environment variables can raise but never lower
- browser and dogfood gates selected by changed-path impact
- gate self-tests that plant failures and prove each detector remains live
- a content fingerprint and receipt proving the tested state is the committed state
- phase evidence for requirements, decisions, file manifests, inspection, validation, and completion

Rustal Workflow makes the phase system invariant and leaves only gate membership, paths, and
enforce/observe mode configurable. Its six internal phases map to this repository as follows:

| Public phase | Enforced work                                                                      |
| ------------ | ---------------------------------------------------------------------------------- |
| Plan         | Requirements, current evidence, decisions, design, risks, file manifest, test plan |
| Code         | Implementation, changed-file ledger, focused tests, design-change record           |
| Test         | Independent inspection, fast gate, delivery gate, defect and correction ledger     |
| Document     | Public docs, acceptance evidence, completion audit, worktree-bound receipt         |

### AIC and UCSOS v2

AIC currently exposes 32 named gates. Its relevant controls include production and test static
analysis, formatting, automated refactor drift, code smells, coding standards, architecture rules,
duplicate detection, unused dependencies, a second static analyzer, coverage, secret scanning,
Semgrep, source-policy checks, shell checks, documentation checks, generated-file drift, and a
no-baselines gate. AIC enforces PHPStan level 10 for its enrolled source.

UCSOS v2 runs production and test static analysis, style and type rules, architecture analysis,
copy/paste detection, unused-dependency checks, browser tests, and application contract gates. Its
parallel analyzer runs retain separate logs, timeouts, deterministic summaries, and fail the
combined result if any tool fails.

The useful lesson is not the number of tools. Each claim has a detector, the detector proves it ran,
and the result is bound to the code it approves.

## Baseline before the quality tickets

The current repository has a solid starting suite:

- TypeScript uses `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`.
- ESLint uses type information for selected promise and import rules.
- Vitest has 62 passing files and 336 passing tests.
- Playwright covers component behavior and axe checks.
- Package, deployment, server, and built-artifact smoke scripts exist.
- There are no inline ESLint or TypeScript suppression comments in the searched runtime, server,
  tests, examples, scripts, or CLI.
- `npm audit --omit=dev` reported zero known production vulnerabilities on 2026-08-30.

The current gate has material gaps:

- `npm run check` calls `vitest run` without `--coverage`, so the configured thresholds do not run.
- A measured coverage run reports 89.08% statements, 75.58% branches, 88.38% functions, and 89.08%
  lines for the configured `src/**/*.ts` scope.
- The coverage scope includes a declaration file at 0% and omits the shipped CLI, copied registry
  behavior, proof server, and operational scripts. The denominator must be fixed before ratcheting.
- ESLint enables the recommended rules plus selected typed rules, not the complete
  `strictTypeChecked` family.
- Playwright runs Chromium only and allows two CI retries without failing a flaky result.
- No committed CI workflow runs the canonical gate from a clean checkout.
- There is no property-based, architecture, dead-code, duplication, SAST, secret, documentation,
  public-API-report, package-type, or bundle-budget gate.
- A green `npm run check` is not fingerprinted, so later edits can reuse stale test evidence.
- Test and coverage commands do not independently reject an empty or silently skipped scope.

## Quality rules

### Fail closed

A missing tool, unreadable report, empty required test suite, unmatched configured scope, killed
process, timeout, or result-recording failure is a gate error. A gate cannot infer pass from missing
evidence.

### No invisible debt

The program does not add generated baselines or blanket suppressions for ESLint, TypeScript,
coverage, Semgrep, Stylelint, Knip, dependency rules, tests, or accessibility checks.

A rare unavoidable deviation is a reviewed record with:

- exact rule and source range
- technical reason the result is equivalent, generated, or outside tool capability
- owner and approval date
- removal condition and expiry date
- test or other evidence covering the excluded behavior
- a liveness check that fails when the exclusion stops matching

Expired, unmatched, broadened, or unreferenced deviations fail the gate. New code does not inherit
old debt.

### Ratchets only move up

Coverage, package size, duplication, complexity, and warning counts have committed floors.
Environment variables may raise a floor for an audit but cannot lower it. Lowering a floor requires
a ticket with measured evidence and an explicit product decision.

### Test behavior, not implementation trivia

Coverage identifies unexecuted code. Property tests explore input spaces. Browser tests prove
platform behavior. None substitutes for the others.

### Every gate proves it is alive

Each custom gate has a self-test or sabotage fixture that plants one violation, observes a red exit,
removes the violation, and observes green. Path selectors and ignore rules receive both positive and
negative fixtures.

### Tested state equals delivered state

The delivery runner captures the gated file set and content hash at startup, derives affected work
from that snapshot, runs the selected gates, captures the final hash, and writes a receipt only when
the endpoints match. The commit guard and CI verify the same fingerprint.

Phase closure does not trust a ticket's prose alone. A Code or Test phase report must satisfy the
complete report schema, match the current `HEAD`, and bind identical start, end, and current
fingerprints. Test closure additionally requires the exact report authorized by the current delivery
receipt. A fabricated four-field “pass” object, a copied report, or a report made stale by editing
any gated file is rejected.

A receipt proves that one exact state passed its configured gates; it does not relabel a ticket as
finished. Valid work-in-progress commits may retain `coding`, `testing`, or `documenting` status.
Terminal closure is a separate invariant: each acceptance criterion has a stable ID, exactly one
matching Pass or Approved-Disposition row, and a positive `Status: Complete` audit marker. Changing
the status or evidence invalidates the old receipt, so a finished ticket receives a new delivery run
over the final documented tree.

## JavaScript quality stack

| PHP/Rust control             | jQStar control                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| Pint / PHPCS / rustfmt       | Prettier, ESLint stylistic typed rules, Stylelint, HTML validation                                    |
| PHPStan / Psalm / Clippy     | TypeScript strict compiler matrix plus `typescript-eslint` `strictTypeChecked`                        |
| PHPMD                        | ESLint complexity and SonarJS correctness, maintainability, and cognitive-complexity rules            |
| Rector dry run               | Prettier check, ESLint non-mutating fix check, and ticketed TypeScript codemods where needed          |
| Deptrac                      | dependency-cruiser rules for layers, cycles, resolution, and production/dev dependency boundaries     |
| composer-unused / machete    | Knip for unused files, exports, dependencies, binaries, and unresolved imports                        |
| PHPCPD                       | `jscpd` with ratcheted language-aware duplication limits                                              |
| Assertion-strength checks    | Focused behavior tests, generated properties, cross-engine browser tests, and coverage                |
| PHPUnit / nextest            | Vitest with required non-empty suites, timeouts, deterministic seeds, and no only/skip/todo           |
| PCOV / llvm-cov              | Vitest V8 coverage with an explicit production-source census                                          |
| Property/fuzz testing        | `fast-check` with replayable seeds and shrunk counterexamples                                         |
| Semgrep / source bans        | Semgrep JavaScript/TypeScript rules plus project-specific ESLint or AST checks and sabotage fixtures  |
| gitleaks                     | gitleaks over history and the delivery worktree                                                       |
| cargo-audit / Composer audit | `npm audit`, OSV-Scanner, lockfile integrity, dependency review, and CodeQL JavaScript/TypeScript     |
| API and package contracts    | API Extractor reports, `publint`, `@arethetypeswrong/cli`, tarball consumers, and export-map fixtures |
| Browser and accessibility    | Playwright Chromium/Firefox/WebKit projects, axe, ARIA assertions, and manual release charters        |
| Build and package drift      | clean `npm ci`, reproducible builds, generated-output comparison, package manifest and size budgets   |
| Documentation quality        | Markdownlint, spelling, link checking, compiled examples, schema checks, and actionable-TODO checks   |
| Shell and automation quality | ShellCheck, actionlint, script self-tests, timeouts, and deterministic per-tool logs                  |

There is no useful reason to add a second JavaScript type system merely to imitate PHPStan plus
Psalm. The second opinions come from typed ESLint rules, architecture analysis, Semgrep, CodeQL,
consumer compilation modes, and browser tests.

## Static gate implementation

Ticket 0042 implements the static program through `scripts/quality/run-static.mjs`. Fast mode
enforces the exact file census, detector self-tests, source policy, JSON schemas, metric and
lockfile integrity, four TypeScript scopes, zero-warning ESLint, Stylelint, HTML validation,
dependency-cruiser, Knip, jscpd, Markdownlint, cspell, local links, licenses, ShellCheck, and
actionlint. Delivery adds executable sabotage for every dependency-cruiser and Semgrep rule plus
gitleaks, Semgrep, npm audit, OSV-Scanner, and secret scans of both Git history and the worktree.

The measured 1.0 static maxima are cognitive complexity 149 and total duplicated lines 2.99%. The
duplication run measured 2.9812% and uses the committed token and line sensitivity in
`quality/metrics.json`. Environment values can tighten these maxima and cannot raise them. CodeQL
and dependency review remain hosted GitHub checks; they do not replace mandatory local security
gates.

Dependency Review requires the repository Dependency Graph. For `Ignibyte/jqstar`, organization
security configuration `270649` enables the graph only for this repository, leaves the existing
advanced CodeQL workflow in charge, and keeps unrelated secret-scanning features disabled. Branch
protection on `main` strictly requires `delivery (Node 24)`, `static-delivery`,
`CodeQL JavaScript and TypeScript`, and `dependency-review`, including for administrators.

The detector sabotage is executable. The in-memory suite proves all 15 source-policy rules and every
census selector on red and green inputs. The external suite creates temporary graphs and files to
prove all eight dependency rules, all six Semgrep rules, and the gitleaks secret detector. It
removes its fixtures before returning and refuses missing tools, empty selections, unreadable
reports, or a detector that stays green.

Static analyzers run sequentially with isolated logs and per-gate timeouts, but the runner does not
stop at the first red result. It writes `jqstar-static-report/1` after every selected analyzer has a
recorded verdict. If the runner receives SIGINT or SIGTERM, it terminates the detached active
analyzer group, records analyzers that did not start as errors, writes an interrupted report, and
exits nonzero. The sabotage suite proves the nested analyzer PID is gone after terminating only the
static runner.

## Gate modes

### Fast

The fast gate is the edit loop and writes no delivery receipt. Target wall time is under two minutes
on the reference machine.

- formatting and configuration syntax
- production and test TypeScript compilation
- strict typed ESLint and project source bans
- all Vitest unit and integration tests without coverage instrumentation
- architecture, unused-code, documentation, and test-selection checks that complete inside budget
- gate-runner self-tests when gate code or configuration changes

### Delivery

The delivery gate authorizes a commit and publication candidate only for its content fingerprint.

- every fast gate
- complete production coverage census and ratchet
- property and contract tests selected by affected subsystem
- local Semgrep, gitleaks, npm audit, OSV, dependency, license, and lockfile checks
- clean build, generated-output drift, package API, package types, exports, and size budgets
- affected Playwright projects across Chromium, Firefox, and WebKit
- self-hosted and installed-tarball proof
- documentation examples and links affected by the change
- one machine-readable report on green or red
- a final snapshot-stability check and receipt

### Full audit

The full audit runs on a schedule, before release candidates, and when a gate or high-risk boundary
changes. It is explicitly acknowledged because repeated cross-engine browser, package, and release
runs are expensive.

- clean clone and `npm ci`
- all browser, device, reduced-motion, forced-color, touch, no-JavaScript, and accessibility lanes
- repeated unit, property, and browser runs with recorded seeds to expose flakes
- full package consumer matrix, reproducible build comparison, SBOM, and provenance checks
- CodeQL and full Semgrep/security policy
- manual assistive-technology charter for release-critical interaction changes
- quality report and ratchet recommendations, but no automatic threshold rewrite

## Coverage policy

Ticket 0043 defines a production-source census instead of using a broad glob as a proxy. At minimum
it classifies:

- installed runtime and UI under `src/`
- shipped CLI code under `bin/`
- copied executable registry blocks
- the self-hosted server
- build, package, deployment, and generated artifacts that need non-unit evidence

Declaration files and type-only modules are excluded by semantics, not filename accidents. Every
other production artifact is instrumented or mapped to named integration, package, browser, or
deployment evidence.

After the census is corrected, the first enforced floors equal the measured result rounded down no
more than one percentage point. They never decrease. Changed production lines and functions require
100% coverage immediately. Security, request encoding, patching, lifecycle ownership, expression,
and parser modules target 100% line and function coverage plus at least 95% branch coverage. The
whole production census ratchets toward the same bar.

## Mutation-testing policy

Mutation testing is not installed and is not part of fast, delivery, full-audit, ticket, or release
workflows. Ticket 0048 removed its dependencies, configuration, reports, schemas, ratchets, gates,
and generated evidence because its runtime and storage cost outweighed its value for routine jQStar
development. It may return only after an explicit user request and a separate quality ticket.

## Coverage and property implementation

The quality program exposes `quality:census`, `test:coverage`, `test:property`,
`test:property:audit`, and `test:quality:self`. The coverage census enrolls runtime TypeScript,
server handlers, and executable registry blocks while mapping non-instrumented artifacts to named
evidence. Its initial enforced floors are 89% lines/statements, 88% functions, and 75% branches
globally, plus committed subsystem ratchets. Changed executable lines and functions remain an exact
100% gate.

The deterministic property lane uses seed 430043. The acknowledged audit lane generates a fresh
signed 32-bit seed and records it with the test result; discovered minimized cases remain in
`test/property/regressions.json`.

Standalone evidence is written below `test-results/quality/` (and `coverage/quality/` for coverage
detail). A canonical quality run relocates the same evidence beneath that run's `.git/jqstar/`
directory and rejects a scope whose HEAD or complete worktree fingerprint no longer matches.

## Browser and accessibility policy

Chromium, Firefox, and WebKit are blocking projects for shared platform behavior. Mobile and touch
projects run for responsive or pointer-sensitive changes. Reduced motion, forced colors, zoom,
keyboard-only use, direct URLs, no-JavaScript fallback, and server replacement are selected by
component contracts.

Retries may collect diagnostic evidence, but `failOnFlakyTests` makes a retry-pass fail delivery.
The scheduled audit uses repeated runs without treating a later pass as proof that the first failure
was harmless.

The full-audit runner executes repeated browser projects with isolated reports and deterministic
selection. Host pressure, timeouts, retry-only passes, and incomplete project counts fail closed.

Automated axe and ARIA checks do not prove screen-reader usability. Release-critical focus,
announcement, drag/drop, complex grid, dialog, menu, combobox, and navigation changes include a
manual NVDA or VoiceOver charter with the environment and result recorded.

Ticket 0044 exposes four stable commands:

```sh
npm run test:browser:quality
npm run test:package:quality
npm run test:release:quality
npm run test:quality:0044
```

Their transient evidence is written beneath `JQS_QUALITY_RUN_DIRECTORY`. Standalone runs use
`.git/jqstar/standalone/ticket-0044`; generated evidence is never written to a root-level results
directory. Each child report records `JQS_QUALITY_RUN_ID` and a stable mode. Browser projects and
self-test sabotage fixtures keep Playwright results, HTML, screenshots, and traces in isolated
subdirectories. `JQS_BROWSER_REPORT_NAME` accepts only a safe JSON basename and separates the
delivery and repeated-audit artifacts.

### Initial structural and package budgets

The current public-document packlist contains 262 files and fits ceilings of 1,859,584 packed bytes,
6,082,560 unpacked bytes, and 265 files. The ticket-0003 delivery measurement was 1,855,069 packed
and 6,078,819 unpacked bytes. The installed peer-contract measurement after the kernel ownership
foundation is 1,868,748 packed and 6,151,259 unpacked bytes. It contains only the four user guides
linked from the package README beneath `docs/` plus the published schemas. An exact detector rejects
missing or extra packaged documentation. The prior 261-file public-document baseline measured
1,852,528 packed and 6,069,206 unpacked bytes; the earlier broad-document artifact measured 316
files, 1,969,066 packed and 6,483,449 unpacked bytes. The ESM, CommonJS/UMD, and compiled CSS files
are 491,435, 387,855, and 169,239 bytes. The installed root-import consumer bundle is 467,249 bytes.

The installed-consumer report is fail-closed. It records the positive ESM, CommonJS, private-path,
NodeNext, and Bundler fixtures plus the expected missing and incompatible jQuery peer failures. The
browser report records `boot-and-dispose` only after both module and UMD pages render and dispose an
application in Chromium, Firefox, and WebKit.

Ticket 0008 added the root transactional plugin host before the quality program's first immutable
commit. Its complete UMD measures 402,320 bytes, and the installed root-import consumer measures
481,635 bytes. Their first-baseline ceilings use the same next-1-KiB rule: 402,432 and 482,304
bytes. The package, ESM, CSS, browser-operation, and generated-output ceilings did not move. The
ratchet still rejects any increase after this quality configuration enters the immutable delivery
base.

Ticket 0009 added the public directive/helper registry before that first immutable commit. The
packlist measures 266 files, 1,783,516 packed bytes, and 5,394,537 unpacked bytes. Its UMD measures
412,180 bytes, and the installed root-import consumer measures 491,548 bytes. The next-five-files
and next-1-KiB rules set ceilings of 270 files, 413,696 UMD bytes, and 492,544 consumer bytes.
Packed, unpacked, ESM, CSS, browser-operation, and generated-output ceilings remain unchanged. The
ratchet will reject increases once this configuration enters the immutable delivery base.

Ticket 0034 adds the private pre-assimilation action/helper provenance runtime and its cancellation
liveness check. The UMD artifact measures 463,940 bytes, and the installed root-import consumer
measures 542,455 bytes, an increase of 2,174 bytes each. The tree-shaken core consumer measures
197,091 bytes, a 2,172-byte increase. Because the immutable base still has no quality-budget file,
the first-baseline ceilings follow the next-1-KiB rule: 464,896 UMD bytes, 542,720 root-import
bytes, and 197,632 core-import bytes. No other ceiling moves.

The repeated-enhancement fixture starts with 2,263 DOM nodes on Chromium, Firefox, and WebKit. One
owned mutation observer and one owned event listener remain active while mounted. Both return to
zero after destroy and removal. Both mount/destroy cycles end with zero owned timers and requests,
1,141 DOM queries, four patch mutations, and no DOM-node delta.

Ceilings use the next 4 KiB boundary for package bytes, the next 1 KiB boundary for individual
bundles, the next group of five files, the next 100 DOM nodes, and a narrow measured boundary for
owned operations. Clean builds have a zero changed-file budget. `budget-ratchet.mjs` compares every
numeric ceiling with `JQS_QUALITY_BASE_SHA` or the runner's immutable scope. Removing a ceiling or
raising it fails. The initial revision is reported as `first-baseline` when the base has no budget
file. There is no environment override that can loosen a ceiling.

## Reports and evidence

Every gate emits a `jqstar-quality-report/1` JSON record on green and red with:

- mode, start and end fingerprints, git base, Node/npm versions, OS, and tool versions
- selected paths and the reason each conditional gate ran or skipped
- command identity, enforce/observe mode, start/end time, exit code, and artifact links
- test counts, coverage denominator and score, browser projects, package formats, security results,
  and size results
- receipt hash or the reason no receipt was written

Ticket evidence cites the report and summarizes the result. Generated reports stay out of source
control unless a ticket explicitly retains a stable release artifact.

## Delivery sequence

1. Ticket 0041 installs the public workflow, gate runner, CI, evidence schema, and receipt.
2. Ticket 0042 installs the static, architecture, security, documentation, and dependency gates.
3. Ticket 0043 corrects the production census and installs coverage and property testing. Ticket
   0048 removes the later mutation-testing experiment from every active workflow.
4. Ticket 0004 supplies the installed-package consumer harness.
5. Ticket 0044 completes the browser, accessibility, package, API, performance, and release matrix.

No later release may weaken an enforced gate as an incidental fix. Threshold or scope changes use a
quality ticket and sabotage proof.

## Research basis

- [typescript-eslint strict type-checked configurations](https://typescript-eslint.io/users/configs/)
- [Vitest coverage thresholds](https://vitest.dev/guide/coverage.html)
- [Knip issue types](https://knip.dev/reference/issue-types)
- [dependency-cruiser rules](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)
- [fast-check property testing](https://github.com/dubzzz/fast-check)
- [Playwright projects](https://playwright.dev/docs/test-projects) and
  [flaky-test failure](https://playwright.dev/docs/api/class-testconfig#test-config-fail-on-flaky-tests)
- [GitHub CodeQL for JavaScript and TypeScript](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning)
- [API Extractor reports](https://api-extractor.com/pages/overview/demo_api_report/)
- [Are the Types Wrong CLI](https://github.com/arethetypeswrong/arethetypeswrong.github.io/tree/main/packages/cli)
