# Library expansion ticket roadmap

This roadmap turns [the library expansion plan](../LIBRARY_EXPANSION_PLAN.md) into ordered delivery
tickets. Ticket numbers preserve creation history. The release tables and dependencies decide
delivery order and when parallel work can start.

## Release 0.2: quality, evidence, and ownership

| Ticket                                              | Outcome                                                                                                      | Depends on      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------- |
| [0041](0041-install-evidence-gated-workflow.md)     | Public phase enforcement, fail-closed gate runner, CI reports, worktree receipt, and gate selftests.         | None            |
| [0042](0042-install-static-quality-gates.md)        | Strict static, architecture, security, dependency, source, style, and documentation gates.                   | 0041            |
| [0043](0043-enforce-coverage-and-mutation.md)       | Production census, coverage ratchets, and property testing; mutation tooling was removed by 0048.            | 0041, 0042      |
| [0048](0048-remove-mutation-testing.md)             | Remove mutation tooling and keep it out unless a future ticket is explicitly requested.                      | 0043            |
| [0003](0003-freeze-public-baseline.md)              | Executable 0.1 behavior, environment, package, event, and request baseline.                                  | 0041            |
| [0004](0004-build-package-consumer-harness.md)      | Real tarball consumers for modules, types, UMD, contents, sizes, and tree shaking.                           | 0003, 0041–0043 |
| [0044](0044-prove-browser-package-quality.md)       | Three-browser, accessibility, package API/type, reproducibility, and release-quality proof.                  | 0004, 0041–0043 |
| [0005](0005-define-kernel-host-and-ownership.md)    | One documented kernel/document host and ownership ledger with disposal.                                      | 0003, 0041–0043 |
| [0046](0046-build-jqstar-website.md)                | Self-hosted jQStar framework website, documentation shell, and preserved Component Lab.                      | 0044, 0045      |
| [0049](0049-reproduce-jqstar-reference-website.md)  | Reference-matched native jQStar public website and final public naming decision.                             | 0046, 0048      |
| [0050](0050-publish-agent-first-webmcp.md)          | First-party WebMCP tools and one verified agent-readable corpus for browser and headless agents.             | 0049            |
| [0006](0006-make-lifecycle-transactional.md)        | Transactional application creation, exactly-once teardown, patch ownership, and render commits.              | 0005            |
| [0007](0007-inject-expression-engines.md)           | Per-kernel expression-engine contract with unchanged trusted JavaScript behavior.                            | 0005, 0006      |
| [0038](0038-define-jquery-ecosystem-stewardship.md) | Integrate Core/QUnit/Migrate, migrate from UI/Mobile, ignore standalone Sizzle, and keep jQStar independent. | None            |

Current closure state: the quality, ownership, website, agent, extension, modular, CSP, bridge, and
jQuery migration prerequisites through ticket 0050 are complete. Ticket 0048 removed mutation
testing from ticket 0043's active contract. Ticket 0017 now owns the clean 1.0 candidate audit and
non-publishing handoff.

Release gate: Plan → Code → Test → Document is evidence-gated. Delivery is bound to the exact tested
worktree. Static analysis, coverage, security, browser, accessibility, installed-package, and
gate-liveness checks pass without hidden baselines or suppressions. Current root behavior remains
green while every owned runtime resource has a disposal path. Ecosystem work has an explicit
integrate, migrate, or ignore decision and makes no unapproved official-project claim. The public
site gives browser and headless agents a tested path to the same source-backed framework contracts
shown to people, while WebMCP remains optional progressive enhancement.

## Release 0.3: extension kernel

| Ticket                                          | Outcome                                                                                   | Depends on |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------- |
| [0008](0008-install-plugins-transactionally.md) | Atomic manifests, dependencies, namespaces, application hooks, and rollback.              | 0005, 0006 |
| [0009](0009-register-directives-and-helpers.md) | Public directive and expression-helper registries with owned cleanup.                     | 0007, 0008 |
| [0010](0010-publish-operation-observations.md)  | Typed action/request records, stable IDs, cancellation, errors, and legacy compatibility. | 0006, 0008 |
| [0011](0011-compose-request-middleware.md)      | One validated request middleware pipeline with deterministic order and disposal.          | 0010       |
| [0012](0012-extract-protocol-profiles.md)       | Generic JSON/HTML and complete Datastar request/response profiles.                        | 0010, 0011 |

Release gate: an external plugin can register public behavior without private imports. Failed
installation and failed application setup leave no partial state.

## Release 0.4: modular distribution and conformance

| Ticket                                          | Outcome                                                                                      | Depends on             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------- |
| [0013](0013-publish-modular-entrypoints.md)     | Preview `core`, `ui`, and `datastar` entry points plus the public render adapter.            | 0004, 0008–0012        |
| [0014](0014-publish-testing-conformance.md)     | Runner-neutral testing and installed external-plugin and DOM-replacement conformance.        | 0006, 0009–0013        |
| [0015](0015-publish-csp-runtime.md)             | Approved versioned CSP grammar, semantics, threat boundary, and adversarial corpus.          | 0007, 0009             |
| [0034](0034-implement-csp-parser-evaluator.md)  | CSP parser and evaluator implementation behind the shared engine contract.                   | 0014, 0015             |
| [0035](0035-publish-csp-browser-conformance.md) | Installed CSP entry point, module-graph proof, threat cases, and three-browser policy proof. | 0013, 0014, 0034       |
| [0016](0016-bridge-turbo-and-htmx.md)           | Shared external-navigation event, lifecycle, version, and browser-fixture contract.          | 0006, 0010, 0013, 0014 |
| [0036](0036-publish-turbo-bridge.md)            | Installed Turbo lifecycle bridge and multi-browser compatibility matrix.                     | 0014, 0016             |
| [0037](0037-publish-htmx-bridge.md)             | Installed htmx lifecycle bridge and multi-browser compatibility matrix.                      | 0014, 0016             |

Release gate: modular consumers import only what they request. CSP works without `unsafe-eval`.
Turbo and htmx replacements do not duplicate or leak jQuery Star behavior.

## Release 1.0: stable platform

| Ticket                                          | Outcome                                                                                                      | Depends on              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------- |
| [0039](0039-publish-jquery-ui-migration.md)     | jQuery UI coexistence and semantic migration; no runtime fork, Widget Factory claim, or presumed adapter.    | 0013, 0014, 0038        |
| [0040](0040-publish-jquery-mobile-migration.md) | jQuery Mobile no-runtime route-by-route migration; preserve progressive enhancement, not the page framework. | 0014, 0036–0038         |
| [0017](0017-prepare-stable-platform-release.md) | Compatibility, security, deprecation, migration, release, and clean-tarball audit.                           | 0001–0016 and 0034–0050 |

Release gate: every 1.0 entry point, browser, format, public API, migration promise, and security
statement has current evidence. jQuery UI and jQuery Mobile migrations do not add either archived
runtime to the package. Optional application services do not block this release.

### jQuery ecosystem disposition

| Project        | Roadmap decision                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| jQuery Core    | Integrate as the real peer and foundation; support exact tested ranges rather than vendoring or forking. |
| QUnit          | Integrate as a public testing-package consumer; keep the repository's full quality stack.                |
| jQuery Migrate | Use only as an application-owner, opt-in upgrade aid and diagnostic input; never bundle or auto-load it. |
| jQuery UI      | Coexist and migrate to native jQStar components; do not fork it or use it as the component architecture. |
| jQuery Mobile  | Migrate applications and preserve its progressive-enhancement lessons; do not revive or emulate runtime. |
| Sizzle         | Do not integrate separately; selector behavior remains the supported real jQuery peer's responsibility.  |

jQStar remains an independent project. It does not claim to be jQuery UI 2, an official successor,
or an OpenJS/jQuery-sponsored project. Any future stewardship proposal requires shipped migration
evidence, adoption, upstream participation, governance/security/funding, and explicit written
agreement; it is not assumed by this roadmap.

## Release 1.1: shared state

| Ticket                                    | Outcome                                                                               | Depends on |
| ----------------------------------------- | ------------------------------------------------------------------------------------- | ---------- |
| [0018](0018-add-shared-stores.md)         | Per-kernel reactive stores with typed plugin facade and two-root behavior.            | 0014, 0017 |
| [0019](0019-add-versioned-persistence.md) | Versioned synchronous persistence, corruption recovery, and cross-tab reconciliation. | 0018       |

Release gate: stores and persistence are optional, dispose completely, and do not become application
authorization or entity databases.

## Release 1.2: asynchronous data decision

| Ticket                                  | Outcome                                                                                              | Depends on                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------- |
| [0020](0020-prove-resource-strategy.md) | Reference use case and decision among server patches, an external query client, or native resources. | 0014, 0017                  |
| [0021](0021-build-resource-client.md)   | Conditional native cache, leases, keys, loaders, invalidation, cancellation, stale state, and GC.    | 0020 approves native client |
| [0022](0022-add-resource-mutations.md)  | Conditional overlapping mutation state, ordered optimism, rollback, conflicts, and invalidation.     | 0021 approves mutations     |

Release gate: ticket 0020 may close the track without 0021 or 0022. Ticket 0021 may close 0022 as
`declined` when the completed reference application has no native mutation need. If implemented,
resources have a specific reference application and retain server-rendered HTML as the authority.

## Release 1.3: native navigation decision

| Ticket                                           | Outcome                                                                                       | Depends on                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------- |
| [0023](0023-decide-native-navigation.md)         | Cross-browser fixture, interoperability gap report, and go/no-go decision.                    | 0017, 0036, 0037                |
| [0024](0024-intercept-get-document-visits.md)    | Conditional opt-in same-origin GET eligibility, fetch, cancellation, and safe fallback.       | 0023 approves native navigation |
| [0025](0025-commit-documents-and-head.md)        | Conditional application-aware body commits, permanent roots, and explicit head/script policy. | 0024                            |
| [0026](0026-restore-history-focus-and-scroll.md) | Conditional history ordering, restoration, focus, scroll, busy state, and accessibility.      | 0025                            |
| [0027](0027-enhance-native-forms.md)             | Conditional validation, submitter semantics, encodings, redirects, and no write replay.       | 0026                            |
| [0028](0028-add-navigation-regions.md)           | Conditional matching regions, targeting, lazy loading, fallback, and cleanup.                 | 0026, 0027                      |
| [0029](0029-add-bounded-prefetch-cache.md)       | Conditional bounded memory cache with eligibility and HTTP cache controls.                    | 0026, 0028                      |

Release gate: ticket 0023 may close the track without a native engine. If implemented, navigation is
optional, defines no routes, passes Chromium/Firefox/WebKit, and preserves JavaScript-disabled
behavior.

## Release 1.4: inspection and upgrades

| Ticket                                          | Outcome                                                                                       | Depends on                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [0030](0030-add-inspection-and-tracing.md)      | Serializable inspection plus bounded, redacted, production-off tracing and service adapters.  | 0010, 0017, 0019, 0020, 0023, and approved service work    |
| [0031](0031-add-in-page-devtools.md)            | Conditional inspection UI after usage evidence and a recorded go decision.                    | 0030 plus usage go decision                                |
| [0032](0032-add-package-upgrade-diagnostics.md) | Package doctor checks and dry-run configuration upgrades without changing registry ownership. | 0013, 0017                                                 |
| [0033](0033-audit-full-library-program.md)      | Requirement-by-requirement audit of every completed and declined program track.               | 0019, 0020, 0023, 0030–0032, and approved conditional work |

## Dependency graph

```text
0041 -> 0042 -> 0043
  |
  +-> 0003 -> 0004 -> 0044
        |
        +-> 0005 -> 0006 -> 0007
                     |       |
                     +-> 0008 -> 0009
                     +-> 0010 -> 0011 -> 0012

0041..0043 + 0003 -> 0004
0041..0043 + 0003 -> 0005
0041..0043 + 0004 -> 0044

0004 + 0008..0012 -> 0013 -> 0014
0007 + 0009 -> 0015
0014 + 0015 -> 0034
0013 + 0014 + 0034 -> 0035
0006 + 0010 + 0013 + 0014 -> 0016 -> 0036 + 0037
0038 -> 0039
0014 + 0036 + 0037 + 0038 -> 0040
0001..0016 + 0034..0050 -> 0017

0014 + 0017 -> 0018 -> 0019
0014 + 0017 -> 0020 -> [resource decision] -> 0021 -> [mutation decision] -> 0022
0017 + 0036 + 0037 -> 0023 -> [decision] -> 0024 -> 0025 -> 0026 -> 0027
                                                                    |
                                                                    +-> 0028 -> 0029

completed service decisions + implementations -> 0030 -> [usage decision] -> 0031
0013 + 0017 -> 0032
completed tracks -> 0033
```

## Evidence required from every ticket

Each ticket follows Plan → Code → Test → Document. In addition to its focused acceptance criteria,
an implementation ticket records:

- focused unit or integration tests for the changed contract
- browser proof for focus, history, storage, CSP, layout, or lifecycle claims that jsdom cannot
  prove
- `npm run check`
- `npm run test:package` when runtime exports, bundles, registry contents, or CLI behavior change
- `git diff --check`
- changed-file ledger and design changes
- public and project-brain documentation
- criterion-by-criterion completion evidence

Conditional tickets remain `planned` until their decision ticket approves the track. A rejected
track marks each named child ticket `declined`, links the decision and supported alternative, and
proves that no partial public surface shipped. It is not silently implemented under another ticket.
