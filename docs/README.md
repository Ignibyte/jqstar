# jQStar project brain

This directory is the durable operating context for jQStar. Read this file first, then follow the
links that match the task.

## What this project is

jQStar is an HTML-first reactive runtime that keeps the real jQuery API available inside
Datastar-style attribute expressions. It also ships an accessible component registry, a copy-in CLI,
a self-hosted framework website and Component Lab, one reviewed agent-readable corpus with optional
read-only WebMCP tools, and a small Node server that proves JSON and Datastar SSE integration.

The package has two public layers:

1. `src/` is the installed runtime. It owns signals, expressions, actions, requests, DOM patches,
   and reusable UI behavior.
2. `registry/` is source-owned application markup and block code. `jqstar add` copies these files
   into a consuming project so the application can change them.

## Reading order

- [PROJECT.md](PROJECT.md): product boundaries, terminology, and repository map.
- [ARCHITECTURE.md](ARCHITECTURE.md): runtime data flow and extension seams.
- [RUNTIME_OWNERSHIP.md](RUNTIME_OWNERSHIP.md): kernel topology, retained-state inventory, and
  disposal ownership.
- [DEVELOPMENT.md](DEVELOPMENT.md): local commands and change rules.
- [BACKEND.md](BACKEND.md): JSON and Datastar SDK server contracts.
- [TESTING.md](TESTING.md): test layers and evidence expectations.
- [CSP_EXPRESSIONS.md](CSP_EXPRESSIONS.md): shipped CSP installation, finite-expression grammar,
  capabilities, limits, diagnostics, migration, policy template, and version contract.
- [INTEROPERABILITY.md](INTEROPERABILITY.md): approved Turbo and htmx versions, external render
  state machine, event mappings, preservation, ownership, and downstream bridge requirements.
- [COMPATIBILITY.md](COMPATIBILITY.md): stable 1.0 entries, environments, version boundaries,
  deprecation policy, and executable evidence map.
- [../MIGRATING_TO_1.md](../MIGRATING_TO_1.md): complete 0.1-to-1.0 package migration.
- [../SUPPORT.md](../SUPPORT.md): maintained release lines and support expectations.
- [../RELEASING.md](../RELEASING.md): clean candidate proof, publication authorization boundary,
  verification, and rollback.
- [JQUERY_ECOSYSTEM.md](JQUERY_ECOSYSTEM.md): current jQuery project statuses, package boundaries,
  migration roles, naming, and independent-project policy.
- [JQUERY_UI_MIGRATION.md](JQUERY_UI_MIGRATION.md): exact jQuery UI coexistence ownership, complete
  API map, incremental migration sequence, measurements, and no-adapter decision.
- [JQUERY_MOBILE_MIGRATION.md](JQUERY_MOBILE_MIGRATION.md): no-runtime route migration, complete
  Mobile 1.4 inventory, modern owner map, reference app, triage worksheet, and rollback path.
- [security/CSP_THREAT_MODEL.md](security/CSP_THREAT_MODEL.md): CSP engine assets, trust boundaries,
  abuse cases, mitigations, and downstream security gates.
- [COMPONENT_ARCHITECTURE.md](COMPONENT_ARCHITECTURE.md): component public contracts.
- [SELF_HOSTING.md](SELF_HOSTING.md): production build and service operation.
- [LIBRARY_EXPANSION_PLAN.md](LIBRARY_EXPANSION_PLAN.md): reviewed architecture and release plan for
  the extension kernel and optional application services.
- [QUALITY_PROGRAM.md](QUALITY_PROGRAM.md): evidence-gated workflow, JavaScript quality stack,
  coverage, browser, package, and release standards.
- [tickets/README.md](tickets/README.md): the required Plan → Code → Test → Document workflow.
- [tickets/ROADMAP.md](tickets/ROADMAP.md): ordered library-expansion tickets and dependency gates.

## Fast orientation

| Area             | Source                                              | Purpose                                                                            |
| ---------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Root entry       | `src/index.ts`                                      | Auto-installs the compatibility core + Datastar + UI composition.                  |
| Modular entries  | `src/core.ts`, `src/ui.ts`, `src/datastar.ts`       | Stable side-effect-free installers/plugins and isolated types.                     |
| Runtime          | `src/runtime.ts`                                    | Creates applications, state, effects, rules, actions, and lifecycle cleanup.       |
| Kernel           | `src/kernel.ts`                                     | Owns one document host, actions, applications, resources, and disposal.            |
| Render adapter   | `src/render-adapter.ts`                             | Coordinates external DOM commits, preservation, incoming boot, and barriers.       |
| Testing adapters | `src/testing/`, `src/datastar/testing.ts`           | Explicit-realm harness, fixtures, and runner-neutral conformance.                  |
| Declarative mode | `src/declarative.ts`                                | Compiles `data-*` attributes into application behavior.                            |
| Expressions      | `src/expression.ts`, `src/csp/`, `src/csp.ts`       | Keeps trusted JavaScript as the root default and publishes the finite CSP profile. |
| Reactivity       | `src/reactivity.ts`                                 | Owned effects, dependency tracking, and contained microtask scheduling.            |
| Requests         | `src/fetch.ts`                                      | Backend actions, cancellation, retries, JSON, and SSE response handling.           |
| Patching         | `src/patch.ts`, `src/sse.ts`                        | Transactional DOM/signal patches, preservation, and SSE parsing.                   |
| UI behavior      | `src/ui/`                                           | Reusable accessible component controllers.                                         |
| Source registry  | `registry.json`, `registry/`                        | Copy-in HTML components and composed blocks.                                       |
| Registry CLI     | `bin/jqstar.mjs`                                    | `init`, `list`, `add`, and `doctor`.                                               |
| Website and lab  | `example/`                                          | Native docs, agent corpus, WebMCP adapter, and end-to-end integration proof.       |
| Proof backend    | `server/`                                           | Node HTTP routes using the official Datastar SDK.                                  |
| Tests            | `test/`, `e2e/`                                     | Unit, integration, server, browser, responsive, and accessibility evidence.        |
| Release contract | `quality/release-contract.json`, `scripts/release/` | Stable surface and non-publishing candidate proof.                                 |

## Current invariants

- `$` always means the installed jQuery instance. `$count` means the `count` signal.
- Component roots use `data-jqs`, stable internal slots use `data-part`, and reflected state uses
  `data-state` or a documented component-specific data attribute.
- Components retain native HTML behavior and form submission whenever the platform has the needed
  primitive.
- Server-rendered HTML must remain valid after an Idiomorph or Datastar patch and must be safe to
  enhance again.
- `data-jqs-preserve` is the explicit opt-in for retaining a live application root through a patch;
  `whenEnhanced()` is the barrier for observing a complete patch commit.
- Datastar responses are produced with `@starfederation/datastar-sdk`, not handwritten SSE.
- Registry files are source-owned after installation. Runtime behavior stays in the package.
- A feature is not complete until its ticket contains Plan, Code, Test, and Document evidence.
