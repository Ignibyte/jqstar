---
id: 0050
title: Publish an agent-first jQStar website with WebMCP
status: done
created: 2026-09-02
updated: 2026-09-02
---

# 0050: Publish an agent-first jQStar website with WebMCP

## Plan

### Problem

The public jQStar website explains the framework to people through semantic HTML, but it gives
agents no first-party contract for finding the right guide, component, example, or invariant.
Browser agents must infer actions from the rendered page, while headless and coding agents must
crawl pages or clone the repository. That makes it easy to confuse jQStar with jQuery, Datastar, or
fictional APIs copied from unrelated examples.

The website should treat agents as a supported audience. An agent should be able to discover what
jQStar is, retrieve current source-backed documentation, find the right component or example, and
cite the public page without guessing from visual layout.

### Current evidence

- `example/` contains a native multi-page website, verified component guides, and the exhaustive
  Component Lab. The pages remain useful without JavaScript.
- `registry.json`, `registry/`, the package metadata, and project-brain documents already contain
  the facts an agent needs, but no public artifact joins them into one versioned corpus.
- `example/public/` has `robots.txt`, a favicon, fonts, and social metadata, but no `llms.txt`,
  agent index, capability guide, or WebMCP contract.
- `example/site.ts` owns site-level search, navigation, theme, copy, and component examples. It does
  not register tools with `document.modelContext`.
- The self-hosted Node service and static GitHub Pages build serve the same HTML assets. Agent
  understanding must not depend on a backend that is absent from the static build.
- The [26 August 2026 WebMCP Community Group draft](https://webmachinelearning.github.io/webmcp/)
  defines browser-mediated tools under `document.modelContext`, JSON Schema inputs, cancellation,
  read-only and untrusted-content annotations, and origin controls. It is not a W3C Standard or on
  the W3C Standards Track, so the site must feature-detect it and preserve normal behavior
  elsewhere.
- WebMCP provides in-page tools, not backend MCP resources or prompts. Its own proposal notes that a
  browsing context is required and that it does not solve headless discovery. Static agent-readable
  documents are therefore part of the product contract rather than a fallback added later.

### Scope

- Define “agent-first” for jQStar as parity: agents can reach the same current product facts and
  public examples as people, through stable structured interfaces with canonical citations.
- Create one versioned, deterministic agent-content manifest from reviewed public documentation,
  package metadata, and registry metadata. Generate every agent-facing surface from that manifest.
- Publish `/llms.txt`, a bounded full-text companion, and a machine-readable agent index at stable
  root URLs in local, base-path, self-hosted loose-file, and packaged-site builds.
- Add a visible `/docs/agents/` guide that explains the corpus, WebMCP tools, supported
  environments, version/provenance fields, and exact limitations without requiring JavaScript.
- Feature-detect `document.modelContext` and register a small read-only WebMCP catalog on every
  public website route. At minimum, agents can inspect the current page, search jQStar
  documentation, read a guide, retrieve a component contract, and retrieve a verified example.
- Give each tool one job, a bounded JSON Schema, precise effect-free language, deterministic output,
  a canonical public URL, and the appropriate WebMCP annotations.
- Keep the tool implementation in website orchestration. Reuse jQStar actions and the same local
  search/content functions used by the human interface where their contracts match.
- Add deterministic retrieval evaluations for common install, API, component, Datastar, server
  patch, migration, and troubleshooting questions. The expected evidence must include the `$` versus
  `$name`, `data-jqs`, `data-part`, registry ownership, and official Datastar SDK rules.
- Document how an agent or browser user can report a stale, missing, unsafe, or ambiguous contract.

### Out of scope

- A general-purpose assistant, chatbot, hosted model, embeddings service, or model-generated answer
  endpoint.
- Tools that write files, install packages, submit forms, mutate Component Lab state, call arbitrary
  URLs, run code, access credentials, or perform account actions.
- A server-side remote MCP endpoint. WebMCP is a browser API, while the static corpus covers
  headless discovery. A remote MCP service requires a separate ticket if measured client needs
  justify its deployment and operating cost.
- A WebMCP polyfill shipped to all visitors or claims that the Community Group draft is a stable
  cross-browser standard.
- Replacing semantic HTML, visible navigation, accessibility APIs, search indexing, or human
  documentation with agent-only metadata.
- Exposing project-brain planning notes, private deployment data, local paths, test fixtures, or
  unshipped roadmap capabilities as current public behavior.

### Acceptance criteria

- [x] [AC-01] The main website publishes a reviewed definition of agent-first parity and a directly
      loadable agent guide that names every supported agent surface and its limits.
- [x] [AC-02] `/llms.txt`, its bounded full-text companion, and a versioned machine-readable index
      ship from one source manifest and contain canonical URLs, package/site versions, provenance,
      content types, and stable identifiers.
- [x] [AC-03] In a WebMCP-capable secure context, every public site route registers the documented
      read-only tool catalog through `document.modelContext`, with valid JSON Schemas, cancellation,
      exact descriptions, stable structured results, and canonical citations.
- [x] [AC-04] The catalog can inspect the current page, search documentation, read a guide, retrieve
      a component contract, and retrieve verified source examples without arbitrary network, file,
      DOM-selector, or code-execution inputs.
- [x] [AC-05] The human page, static agent files, WebMCP results, package metadata, and registry
      entries are generated or checked against the same corpus. A drift test fails on conflicting
      package names, versions, attributes, component APIs, routes, or code examples.
- [x] [AC-06] A checked-in evaluation set proves deterministic retrieval and citations for the
      framework identity, installation, `$` versus `$name`, lifecycle, Datastar transport, component
      markup, registry ownership, accessibility, and migration boundaries.
- [x] [AC-07] WebMCP is progressive enhancement. Unsupported Chromium configurations, Firefox,
      WebKit, JavaScript-disabled browsing, and base-path builds keep their existing content,
      navigation, search, accessibility, and Component Lab behavior without errors.
- [x] [AC-08] Tool metadata and results contain only reviewed public content, disclose no private or
      user-specific state, request no unrelated personal context, use correct read-only and
      untrusted-content annotations, and pass prompt-injection, schema, size, cancellation, and
      lifecycle tests.
- [x] [AC-09] Supported WebMCP execution passes in a real implementation or standards test build. A
      standards-shaped test harness covers registration and execution in routine CI without
      overstating native browser support.
- [x] [AC-10] Local development, static Pages output, loose self-hosting, packaged self-hosting,
      installed-package checks, `npm run check`, and `git diff --check` pass with the agent surfaces
      included.

### Design

Store agent-facing records in one reviewed manifest with stable IDs, titles, summaries, public URLs,
keywords, version applicability, and source references. A build step validates referenced files and
routes, extracts only approved public content, normalizes ordering, and emits the text and JSON
artifacts. WebMCP tools load the same bounded browser artifact instead of maintaining another copy
of the documentation or fetching the repository at runtime.

Register imperative WebMCP tools only when `document.modelContext?.registerTool` exists. Keep one
`AbortController` for the page-owned registrations and abort it during teardown so repeat boot or
navigation cannot duplicate tools. Tool handlers validate again at the implementation boundary,
honor the invocation `AbortSignal`, search only the local corpus, cap query and result sizes, and
return stable records with canonical web citations. Every tool is read-only and must describe that
fact accurately.

The first catalog is intentionally small:

- `get_jqstar_page`: return the current route's identity, summary, headings, and canonical URL.
- `search_jqstar_docs`: search the approved corpus with a bounded query and result count.
- `read_jqstar_guide`: retrieve one guide by stable ID rather than an arbitrary path.
- `get_jqstar_component`: retrieve one registry component's contract, dependencies, and public URL.
- `get_jqstar_example`: retrieve a verified example by stable ID with its language and source URL.

The public files serve agents that cannot execute WebMCP. They are static build outputs and work on
GitHub Pages as well as the Node service. This ticket does not make the website depend on a remote
MCP transport or an AI vendor.

### Decisions

- Treat WebMCP as optional browser progressive enhancement because the current document is a
  Community Group draft, not a W3C Recommendation.
- Use the current `document.modelContext` draft shape behind a narrow local adapter so a later draft
  change affects one site-owned boundary.
- Prefer imperative tools for retrieval because the current tasks are not form submissions and the
  draft's declarative section is incomplete.
- Publish static text and JSON alongside WebMCP because browser-only tool discovery cannot serve
  headless or coding agents.
- Keep all initial tools anonymous and read-only. Any authenticated or mutating tool requires a new
  threat model and ticket.
- Treat canonical public documentation and tested runtime behavior as authoritative. Roadmap and
  internal planning prose can provide provenance but cannot be returned as shipped capability.
- Do not publish a remote `/mcp` route under this ticket. Measure demand and interoperability before
  adding a second protocol surface and production dependency.

### Security and accessibility

- Tool descriptions and results are reviewed agent input. They must not concatenate query text into
  instructions, interpret retrieved prose as commands, or return untrusted Component Lab/demo data.
- Schemas allow only the minimum parameters, reject unknown keys, bound strings and result counts,
  and use enumerated stable IDs wherever possible.
- Tools make no cross-origin requests and receive no ambient cookies, tokens, geolocation, browsing
  history, personalization, or free-form user data beyond the bounded search query.
- Registration stays in the top-level same-origin document. No cross-origin `exposedTo` grant ships
  without a separately reviewed need.
- Cancellation, teardown, repeat installation, and failed registration leave no active duplicate
  handlers or unhandled promise rejections.
- The agent guide and all referenced documentation retain headings, landmarks, focus, contrast,
  reduced motion, zoom/reflow, and useful JavaScript-disabled content. WebMCP does not replace the
  accessibility tree or native controls.

### Risks

- WebMCP can change before standardization. A narrow adapter, capability detection, and a recorded
  draft version limit the update surface and prevent breakage in unsupported browsers.
- Duplicated agent copy can drift from package and component contracts. Generated artifacts and
  cross-surface drift checks must fail closed.
- Broad tool descriptions or inputs can invite prompt injection and unnecessary disclosure. The
  initial catalog must remain read-only, local, bounded, and specific.
- Dumping the entire repository can overwhelm agent context and expose internal plans as current
  behavior. The corpus needs explicit inclusion rules, summaries, size budgets, and provenance.
- An agent can retrieve the right page yet still produce incorrect code. Evaluations must assert
  exact snippets and invariants, not keyword matches alone.
- Static hosting and self-hosting can diverge if generated files or base URLs are handled only in
  one build path.

### Verification plan

- Validate this ticket in Plan before changing website behavior.
- Unit-test corpus validation, deterministic generation, stable ordering, base URL handling, search
  ranking, limits, cancellation, schemas, annotations, citations, and teardown.
- Use a standards-shaped `document.modelContext` test harness to inspect registered tools and invoke
  every success, error, cancellation, repeat-boot, and disposal path.
- Run the current WebMCP web-platform tests or a real supporting Chromium build for native
  execution, while keeping ordinary Chromium, Firefox, and WebKit regression coverage.
- Verify each evaluation question selects the expected source-backed answer and canonical page.
- Build with `/` and `/jqstar/` bases and inspect `llms.txt`, its companion, the agent index, agent
  guide, routes, content types, links, and package archive.
- Exercise loose and packaged self-hosted GET/HEAD behavior, caching, compression, security headers,
  and missing-resource responses for every static agent artifact.
- Run focused unit, site structure, browser, accessibility, self-hosted, and package checks before
  `npm run check` and `git diff --check`.

### Planned files

- `config/agent-content.json`: Reviewed source manifest, stable IDs, inclusion rules, and version
  metadata.
- `scripts/build-agent-content.mjs`: Validate the manifest and emit deterministic text and JSON
  artifacts.
- `example/public/llms.txt`, full-text companion, agent index: Generated static discovery and
  retrieval surfaces.
- `example/docs/agents/index.html`: Visible agent guide and WebMCP capability documentation.
- `example/agent-content.ts`, `example/webmcp.ts`, `example/site.ts`: Typed local corpus access,
  WebMCP adapter/registration, and website lifecycle integration.
- `vite.demo.config.ts`, `scripts/bundle-site.mjs`: Include the agent guide and deterministic agent
  artifacts in root/base-path and packaged builds.
- `test/agent-content.test.mjs`, `test/site-structure.test.mjs`: Corpus, drift, generation, route,
  metadata, and static-build contracts.
- `e2e/site.spec.ts`, WebMCP harness fixtures: Native-page regression and tool discovery/execution
  evidence.
- `scripts/smoke-server.mjs`, `scripts/smoke-package-files.mjs`: Loose, packed, and
  installed-package serving proof.
- `README.md`, `docs/{PROJECT,DEVELOPMENT,SELF_HOSTING,TESTING}.md`: Agent-first product promise,
  authoring rules, deployment, limitations, and verification.
- `docs/tickets/ROADMAP.md`: Place agent-first website delivery after the reference site.
- `docs/tickets/0050-publish-agent-first-webmcp.md`: Plan, implementation ledger, evidence, and
  completion audit.

## Code

### Changed-file ledger

| File                                                                                                                                        | Purpose                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `docs/tickets/0050-publish-agent-first-webmcp.md`                                                                                           | Plan, implementation ledger, verification history, and completion evidence.                                                |
| `config/agent-content.json`                                                                                                                 | Reviewed corpus, limits, stable IDs, public source allowlist, and retrieval evaluations.                                   |
| `scripts/build-agent-content.mjs`                                                                                                           | Validate package, registry, sources, examples, and limits; deterministically generate every agent surface.                 |
| `example/docs/agents/index.html`, `example/public/{llms.txt,llms-full.txt,jqstar-agent-index.json}`, `example/agent-content.generated.json` | Generated visible, text, public JSON, and byte-identical type-source artifacts.                                            |
| `example/agent-content.ts`                                                                                                                  | Load the public index once and provide bounded deterministic search and stable record lookup.                              |
| `example/webmcp.ts`                                                                                                                         | Feature-detected five-tool WebMCP adapter, schemas, validation, cancellation, citations, registration, and teardown.       |
| `example/site.ts`, `example/main.ts`                                                                                                        | Reuse the corpus for human search and install/dispose WebMCP on documentation and Component Lab routes.                    |
| `example/index.html`, `example/docs-shell.html`, `example/docs/api/index.html`                                                              | Publish discovery metadata/navigation and correct stale public entry-point copy.                                           |
| `vite.demo.config.ts`, `package.json`, `playwright.config.ts`                                                                               | Build the agent route/artifacts and define static, native-WebMCP, package, and browser commands.                           |
| `server/index.ts`                                                                                                                           | Serve text MIME types, opt into an origin-keyed agent cluster, and decode the packaged site.                               |
| `scripts/bundle-site.mjs`                                                                                                                   | Store text assets as UTF-8 and binary assets as base64 in deterministic site-bundle schema 2.                              |
| `scripts/smoke-{deployment,package-files,pages,server}.mjs`, `scripts/quality-release.mjs`                                                  | Prove root/base-path, loose, archived, and installed agent resources, headers, methods, and content.                       |
| `test/agent-content.test.mjs`, `test/webmcp.test.ts`, `test/site-structure.test.mjs`                                                        | Prove generation, drift, evaluations, retrieval, tool contracts, safety, and visible/static structure.                     |
| `e2e/fixtures/webmcp-harness.ts`, `e2e/site.spec.ts`, `e2e/webmcp-native.spec.ts`, `e2e/quality-contracts.spec.ts`                          | Prove routine draft-shaped registration/execution, zero-mock Chromium execution, accessibility, and no-JavaScript content. |
| `README.md`, `docs/{README,PROJECT,DEVELOPMENT,SELF_HOSTING,TESTING}.md`                                                                    | Document the product promise, authoring workflow, deployment, support boundary, and evidence model.                        |

### Design changes

- One reviewed JSON manifest now joins public HTML, package metadata, registry metadata, invariants,
  exact source examples, limits, and evaluations. Generation fails closed and emits every public
  agent surface deterministically.
- Browser code fetches the public JSON index once instead of bundling it. Human documentation search
  and WebMCP use the same normalized ranking and lookup object; unsupported browsers do not fetch
  solely for WebMCP.
- The website registers five local read-only tools through a narrow `document.modelContext` adapter.
  It validates inputs at the callback boundary, returns versioned envelopes with canonical
  citations, honors draft cancellation, tolerates Chromium's earlier missing callback-options
  argument, rolls back partial registration, and disposes registrations on repeat boot or page hide.
- WebMCP remains progressive enhancement. Static HTML/text/JSON serves headless agents and
  JavaScript-disabled users, while a separate flagged Chromium project proves the real experimental
  implementation without changing the ordinary three-engine claims.
- Site-bundle schema 2 stores UTF-8 text directly and base64-encodes only binary files. This keeps
  all agent surfaces in the npm archive while remaining below the immutable package-size ceilings.

## Test

| Command                                                | Result | Evidence                                                                                                                                                   |
| ------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan-phase ticket validation                           | Pass   | The complete ticket plan passed before website behavior changed.                                                                                           |
| `npm run build:agent-content -- --check`               | Pass   | Five generated artifacts match one validated corpus; public and module-side JSON are byte-identical.                                                       |
| `npm run typecheck`                                    | Pass   | Website, WebMCP, native browser fixture, runtime, and registry TypeScript compile.                                                                         |
| Focused Vitest corpus/WebMCP/site suite                | Pass   | 3 files and 15 tests passed.                                                                                                                               |
| `npx playwright test e2e/site.spec.ts --reporter=line` | Pass   | 24 tests passed across Chromium, Firefox, and WebKit.                                                                                                      |
| JavaScript-disabled Playwright project                 | Pass   | The agent guide, static discovery link, Component Lab heading, native disclosure, and form remain usable without scripts.                                  |
| `npm run test:webmcp:native`                           | Pass   | Chromium 151 with the real experimental API registered all five tools and executed the cited Dialog contract without the harness.                          |
| `npm run build:pages`                                  | Pass   | The `/jqstar/` build passed agent guide, text corpus, JSON index, and compiled runtime URL checks.                                                         |
| `npm run test:self-hosted`                             | Pass   | Root loose-file build, MIME, GET/HEAD, guide/index/text resources, browser runtime, backend, and deployment checks passed.                                 |
| `npm run test:package`                                 | Pass   | All package smokes passed; the 324-file archive contains the four agent surfaces and valid index.                                                          |
| Package dry-run measurement                            | Pass   | 2,408,349 packed and 8,290,620 unpacked bytes remain below 2,470,000 and 8,350,000-byte ceilings.                                                          |
| `npm run quality:fast`                                 | Fail   | Run `2026-09-02T16-00-44-393Z-45686` exposed generated-output formatting, two unused test types, two dictionary terms, and missing `actionlint` on `PATH`. |
| `npm run quality:fast`                                 | Pass   | Run `2026-09-02T16-04-17-000Z-54189` passed ticket workflow, runner self-test, formatting, unit, and all static-fast checks with the pinned analyzer path. |
| Code-phase ticket validation                           | Pass   | Ticket 0050 validated against the exact passing fast report before entering Test.                                                                          |
| `npm run quality:delivery`                             | Pass   | Run `2026-09-02T16-06-02-436Z-62696` passed all 12 delivery gates and wrote a matching receipt.                                                            |
| Test-phase ticket validation                           | Pass   | Ticket 0050 and its receipt validated against the exact passing delivery report before completion documentation.                                           |

### Inspection ledger

| Finding                                                                                             | Resolution                                                                                                                                           |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vite warned when browser code imported JSON directly from `example/public/`.                        | Generate a byte-identical type source but fetch the public index at runtime; production builds no longer import from the public directory.           |
| Chromium 151's real experimental callback omits the current draft's required options argument.      | Accept the draft argument when present and use a never-aborted signal for the earlier implementation; draft-shaped cancellation tests remain intact. |
| Ordinary Playwright Chromium does not expose WebMCP by default.                                     | Keep routine engines unflagged and add one named zero-mock project using Chromium's documented experimental feature.                                 |
| Adding duplicate text/JSON corpus data pushed the old all-base64 site archive over package budgets. | Site-bundle schema 2 stores UTF-8 assets directly, shrinking the archive from about 770 kB to 672 kB with no missing resource.                       |
| Formatting source pages made derived content stale.                                                 | Regenerated after formatting; the checked generation command then passed, proving the drift detector is live.                                        |

## Document

### Documentation changed

- `example/docs/agents/index.html`, `example/public/llms.txt`, `example/public/llms-full.txt`, and
  `example/public/jqstar-agent-index.json` publish the visible guide, static discovery, bounded
  full-text corpus, stable records, provenance, versions, limits, and contract-reporting path.
- `README.md` defines agent-first parity, names all supported surfaces and tools, and states the
  browser-draft and remote-MCP limitations.
- `docs/PROJECT.md` records the corpus as a public product and package artifact;
  `docs/DEVELOPMENT.md` defines its authoring and generation rules; `docs/SELF_HOSTING.md` defines
  deployment paths, MIME types, and loose/archive behavior; and `docs/TESTING.md` separates the
  routine harness, native experimental proof, no-JavaScript coverage, and package checks.
- The corrected public API guide distinguishes the stable compatibility root from the published 0.4
  preview subpaths.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                  | Result |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | The generated visible guide defines parity, links all four agent surfaces, lists every tool and limitation, and provides a public issue-reporting contract.                                                               | Pass   |
| AC-02 | Deterministic generation emits the two text files and versioned JSON index from one manifest; drift tests prove canonical URLs, versions, provenance, content types, stable IDs, limits, and byte-identical runtime data. | Pass   |
| AC-03 | Unit schemas/lifecycle tests and 24 cross-engine route tests prove five read-only registrations, cancellation, descriptions, stable envelopes, and canonical citations on every route.                                    | Pass   |
| AC-04 | Unit, harness, and native execution invoke current-page, search, guide, component, and example retrieval using only enumerated or bounded local inputs.                                                                   | Pass   |
| AC-05 | The generator validates package, registry, source paths, public routes, component anatomy, exact source examples, limits, and checked-in bytes; human search and WebMCP load its public index.                            | Pass   |
| AC-06 | Ten checked-in questions pass deterministic ranked retrieval for identity, install, signal syntax, lifecycle, Datastar, component anatomy, registry ownership, accessibility, migration, and troubleshooting.             | Pass   |
| AC-07 | Unflagged Chromium, Firefox, and WebKit pass the site suite; the JavaScript-disabled guide and `/jqstar/` paths pass; unsupported WebMCP is a no-op; and Component Lab remains green.                                     | Pass   |
| AC-08 | Reviewed-source allowlisting, schema rejection, output limits, non-echoed prompt-shaped queries, privacy patterns, annotations, cancellation, repeat boot, rollback, and disposal pass focused and delivery gates.        | Pass   |
| AC-09 | Chromium 151's real experimental WebMCP passes zero-mock `getTools()` and `executeTool()`; the separate standards-shaped harness passes routine three-engine registration, execution, citations, and cancellation.        | Pass   |
| AC-10 | Root and `/jqstar/` builds, loose and archived GET/HEAD/MIME checks, the 324-file package, installed release, package budgets, all 12 delivery gates, and `git diff --check` pass with the generated surfaces.            | Pass   |

### Completion audit

All ten acceptance criteria have direct evidence. The terminal ticket, generated corpus,
implementation, public documentation, browser/native tests, self-hosted archive, and installed
package are ready for the final delivery receipt.

Status: Complete
