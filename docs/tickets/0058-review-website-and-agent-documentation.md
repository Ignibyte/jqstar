---
id: 0058
title: Review website and agent documentation
status: done
created: 2026-09-26
updated: 2026-09-26
---

# 0058: Review website and agent documentation

## Plan

### Problem

The original website objective includes reproducing the supplied Downloads design, reviewing the
documentation in several passes, and providing full agent-readable instructions. Tickets 0049 and
0050 implemented the design and one generated corpus. The current completion review finds small
usage gaps that should be corrected before closing that objective.

### Current evidence

- The Downloads archive contains the desktop retro-type and mobile Dialog references. Ticket 0049
  records their visual comparison and native implementation. Current focused site checks cover their
  geometry, fonts, controls, and direct routes in three engines.
- The current corpus contains 24 guides, 109 registry records, five verified examples, and 11
  invariants. Its combined reference is `example/public/llms-full.txt`; discovery is `llms.txt`.
- Generation drift checks and 17 focused corpus, website-structure, and WebMCP cases pass.
- The introduction mentions jQuery 4 without the tested 3.7.1 floor and shows different root IDs
  between installation and the introductory markup example.
- The API overview lists the stable 1.0 entries but omits the stable 1.1 stores, persistence, and
  inspection entries from its initial installation map.
- The backend guide does not distinguish generic requests from the Datastar profile. Its sample form
  omits native method/action, and its preservation wording suggests all unsaved values survive.
- `src/patch.ts` protects the active value and restores focus during morphing. Other controls can
  receive server values. External render focus remains host-owned under `docs/INTEROPERABILITY.md`.
- The index is 189,973 bytes under a 190,000-byte bound. Edits must fit existing bounds through
  concise source prose rather than raising the limits.

### Scope

- Review documentation in three passes: current contract accuracy, usage and topic coverage, and
  discovery/retrieval plus browser behavior.
- Correct introductory setup, current optional entries, request-profile wording, native form
  fallback, preservation limits, and external render focus ownership.
- Identify the existing full-text corpus as the combined reference and expose it from the human
  introduction. Retain one reviewed generation source and the existing read-only WebMCP tools.
- Add retrieval questions for the clarified contracts and regenerate the corpus.
- Record the audit and verification against the original website objective.

### Out of scope

- Runtime behavior, a new remote MCP service, another documentation generator, or duplicated guides.
- Changing reference design, component behavior, package versions, published byte limits, or
  hosting.
- Domain purchase, DNS changes, or publication.

### Acceptance criteria

- [x] [AC-01] Three review passes record coverage, findings, and their resolution for the original
      website, documentation, and agent-instruction requirements.
- [x] [AC-02] Public examples and explanations match supported peers, installed roots, all stable
      entries, request profiles, native form fallback, morph preservation, and host-owned focus.
- [x] [AC-03] Human discovery and agent retrieval reach the combined reference and clarified
      contracts; generated outputs remain deterministic and within existing bounds.
- [x] [AC-04] Reference geometry, direct routes, search, component examples, copy controls, and
      read-only WebMCP behavior pass focused checks in Chromium, Firefox, and WebKit.
- [x] [AC-05] Required quality checks and the ticket evidence ledger cover the final documented
      tree.

### Design

Preserve the existing native website and generated `llms-full.txt` as the combined reference. Change
authored public guide HTML and reviewed retrieval questions, then regenerate all five artifacts.
Keep prose concise so the fixed corpus bounds remain unchanged.

### Decisions

- Existing design evidence and current focused checks establish the redesign baseline. This review
  corrects instructions rather than rebuilding an already implemented website.
- Static discovery fulfills the original MCP and/or text requirement; optional browser WebMCP adds
  structured retrieval. A remote service is unnecessary for that requirement.
- Native form fallback must use the same endpoint, while servers must negotiate a useful native
  response. SSE alone is not the no-JavaScript form response.
- Preservation protects an active value during morphing, not every unsaved field or removed node.

### Security and accessibility

Keep native links/forms, current trusted-markup boundaries, server authorization and validation,
read-only tool inputs, and host-owned focus explicit. The combined corpus contains reviewed public
facts and excludes private planning and deployment data.

### Risks

- Generated files can drift if source formatting occurs after generation.
- Extra prose can exceed the current index bound.
- New retrieval questions can expose ranking weaknesses rather than a content gap.
- Documentation can promise preservation or focus behavior outside the tested runtime contract.

### Verification plan

- Validate Plan before authored guide changes.
- Review guide coverage against package exports, registry entries, source contracts, and the design.
- Run focused corpus, structure, WebMCP, and three-engine site tests.
- Regenerate, check drift, spelling, formatting, and HTML.
- Run fast quality before Test and delivery quality before Document closure.
- Keep build and browser commands sequential so generated writes cannot reload an in-flight page.
- Audit final artifacts and criterion evidence without treating historical results as current proof.

### Planned files

- `example/docs/index.html`: Peer floor, matching introductory root, and combined reference link.
- `example/docs/api/index.html`: Current stable entry map and concise installation overview.
- `example/docs/datastar/index.html`: Profile, native form, and preservation contracts.
- `example/docs/plugins/index.html`: External render focus ownership.
- `config/agent-content.json`: Corpus revision and retrieval questions.
- Generated agent HTML, public text/index, and module-side index: Current reviewed instructions.
- `test/site-structure.test.mjs`: Expected corpus revision.
- `README.md`, `docs/README.md`: Combined-reference discovery and current review record.
- This ticket and `docs/tickets/ROADMAP.md`: Review and verification evidence.

## Code

### Changed-file ledger

| File                                                                                        | Purpose                                                                 |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `docs/tickets/0058-review-website-and-agent-documentation.md`                               | Scope, three-pass review, and evidence.                                 |
| `example/docs/index.html`                                                                   | Tested peers, matching root IDs, and combined-reference discovery.      |
| `example/docs/api/index.html`                                                               | Stable 1.1 entries and structural installation order.                   |
| `example/docs/datastar/index.html`                                                          | Request profiles, native form fallback, and active-value preservation.  |
| `example/docs/plugins/index.html`                                                           | Host-owned DOM mutation and focus around the render adapter.            |
| `config/agent-content.json`                                                                 | Corpus 7, corrected verified counter, and four retrieval questions.     |
| `example/docs/agents/index.html`, `example/public/llms.txt`, `example/public/llms-full.txt` | Regenerated public instructions from the reviewed source.               |
| `example/public/jqstar-agent-index.json`, `example/agent-content.generated.json`            | Identical versioned structured corpus for static and browser consumers. |
| `test/site-structure.test.mjs`                                                              | Expected reviewed corpus version.                                       |
| `README.md`, `docs/README.md`, `docs/tickets/ROADMAP.md`                                    | Combined-reference discovery and review ownership.                      |

### Design changes

The existing design, routes, tools, and runtime remain the baseline. Public source prose now
distinguishes generic and Datastar requests, demonstrates native form fallback, bounds preservation
claims, and assigns external-render focus to the host. Concise edits keep the structured index at
189,993 bytes and the combined text at 115,352 bytes, below the unchanged limits.

### Three-pass review

| Pass                              | Reviewed evidence                                                                                                                                                | Finding and resolution                                                                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract accuracy                 | Package peer/export metadata; authored installation/API/backend/plugin guides; `src/patch.ts`, `src/render-adapter.ts`, backend and interoperability contracts.  | Corrected the tested peer floor, matching counter root, 1.1 entry map, profiles, native endpoint fallback, active input protection, and external focus ownership.            |
| Usage and topic coverage          | All 24 corpus guide records, 109 registry records, five verified examples, 11 invariants, current route census, and the main README.                             | Retained the topic guides, complete registry inventory, and source-backed examples. Made the combined reference visible from the introduction and clarified its README role. |
| Discovery and observable behavior | Manifest and drift generator; deterministic retrieval; source allowlist and output limits; downloaded reference images; three-engine route/design/control tests. | Added four retrieval questions for profiles, preservation, combined-reference discovery, and focus ownership. Final changed-tree checks are recorded below.                  |

## Test

| Command                                                                   | Result | Evidence                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build:agent-content -- --check`                                  | Pass   | Baseline five artifacts match the current manifest.                                                                                                                                                                                                                                                                                                        |
| Focused corpus, structure, and WebMCP Vitest selection                    | Pass   | Baseline three files, 17 cases.                                                                                                                                                                                                                                                                                                                            |
| Baseline focused three-engine site suite                                  | Pass   | 30 cases cover reference geometry, every documentation route, search, copy, components, WebMCP registration, retrieval, and cancellation.                                                                                                                                                                                                                  |
| `npm run build:agent-content`                                             | Pass   | Corpus 7 regenerates five artifacts within unchanged index and full-text limits.                                                                                                                                                                                                                                                                           |
| Focused retrieval evaluation after guide changes                          | Fail   | The combined-reference question did not return the introduction in its first eight results.                                                                                                                                                                                                                                                                |
| Generation with expanded discovery metadata                               | Fail   | Two metadata revisions exceeded the unchanged 190,000-byte index ceiling.                                                                                                                                                                                                                                                                                  |
| Focused corpus, structure, and WebMCP selection after metadata correction | Pass   | 17 cases pass, including all 20 retrieval questions, unchanged output bounds, and tool validation.                                                                                                                                                                                                                                                         |
| `npm run quality:fast`                                                    | Pass   | Run `2026-09-26T13-38-18-622Z-45274`: five enforced gates pass, including 76 component browser cases and static analysis.                                                                                                                                                                                                                                  |
| Code phase validation against the fast report                             | Pass   | Validated before advancing to testing.                                                                                                                                                                                                                                                                                                                     |
| Changed-tree three-engine site suite                                      | Pass   | 30 cases pass in 42.8 seconds: reference geometry, direct routes, search, theme, preview, copy, WebMCP registration, retrieval, and cancellation.                                                                                                                                                                                                          |
| Current reference render comparison                                       | Pass   | Inspected 1440 × 1000 home and 390 × 844 Dialog renders against the supplied images after enhancement and component styles loaded. The archive's final source defines Audiowide headings; current copy uses the real package and candidate version.                                                                                                        |
| `npm run build:pages`                                                     | Pass   | Built all public routes under `/jqstar/`; smoke verifies guide, text corpus, index, and compiled index URL. The built introduction links `/jqstar/llms-full.txt` and the built index contains corpus 7.                                                                                                                                                    |
| `npm run check`                                                           | Fail   | Run `2026-09-26T13-41-21-449Z-49798`: other selected delivery gates pass; Firefox executes 563 cases with 562 passes and one flaky network case. Its trace shows Vite CSS hot updates and a page-context loss at 13:51:09 UTC, coinciding with the parallel Pages build completing at 13:51:10 UTC. The retry passes, but the gate rejects flaky evidence. |
| Focused Firefox network check, three repeats with no retries              | Pass   | All three executions pass in 7.0 seconds after the standalone build has completed. Remaining checks run sequentially.                                                                                                                                                                                                                                      |
| Sequential `npm run check` / `quality:delivery`                           | Pass   | Run `2026-09-26T13-58-11-064Z-55381`: all ten selected enforced gates pass. All 1,717 browser cases execute and pass, with zero failures, skips, or flaky results. Package, release, serving, property, static, formatting, and component evidence pass on one unchanged tree. Two detector gates for unchanged files remain explicitly skipped.           |
| Test-phase validation against the current delivery report                 | Pass   | Validated the testing ticket, matching fingerprints, and authorized receipt before entering Document.                                                                                                                                                                                                                                                      |
| Initial Document-phase validation                                         | Fail   | The ledger named `npm run check` without its `quality:delivery` alias, so the validator did not recognize the passing delivery command. Added the explicit alias; the successful report itself is unchanged.                                                                                                                                               |
| Document-phase validation after alias correction                          | Pass   | The three-pass review, public/internal documentation list, all five acceptance mappings, and completion audit validate before terminal status.                                                                                                                                                                                                             |

### Inspection ledger

| Finding                                                                | Resolution                                                                                                                                                  |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The design and static/structured agent surfaces already exist.         | Preserve them and verify current behavior.                                                                                                                  |
| Introduction roots did not match between setup and markup.             | Use `#app` consistently and regenerate the verified counter example.                                                                                        |
| Public preservation prose covered every unsaved value.                 | Match `ignoreActiveValue` and removal behavior; other controls can receive server values.                                                                   |
| Plugin guide assigned focus restoration to the render adapter.         | Assign DOM mutation and focus to the external host, matching the current interoperability contract.                                                         |
| Combined-reference retrieval ranked unrelated component records first. | Added a reviewed introduction keyword and shortened its summary. The original question now retrieves the introduction.                                      |
| Concurrent Pages generation disturbed an in-flight Firefox page.       | Retain the failed trace and run all remaining builds and browser verification sequentially; do not change runtime behavior or weaken the flaky-result gate. |
| Structured corpus had only 27 bytes of headroom.                       | Tightened authored prose and discovery metadata; final index is 189,993 bytes without changing limits or removing guides.                                   |

## Document

### Documentation changed

- The public introduction now documents the tested jQuery floor, consistent application root, and
  combined reference link.
- The API map includes stable 1.1 stores, persistence, and inspection entries.
- The backend guide distinguishes request profiles, includes native form fallback, and limits
  preservation to the active input and surviving nodes.
- The plugin guide assigns external DOM mutation and focus to the host.
- Corpus 7 regenerates the agent HTML, public text, public JSON, and byte-identical module index.
  Four new retrieval questions cover the clarified contracts and combined-reference discovery.
- README and the project brain identify the combined reference and this three-pass review.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                                                                    | Result |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | The three-pass review records source-contract accuracy, all 24 guides and 109 registry records, five examples, 11 invariants, discovery evaluation, and current desktop/mobile comparison.                                                                                                  | Pass   |
| AC-02 | The introduction, API, backend, and plugin source pages agree with package peer/exports metadata, `docs/BACKEND.md`, `src/patch.ts`, and `src/render-adapter.ts`. Corrected root markup is also the verified corpus example.                                                                | Pass   |
| AC-03 | The introduction and README discover `llms-full.txt`; 17 focused cases include all 20 retrieval questions. Corpus 7 produces five deterministic outputs, with index 189,993 bytes and full text 115,352 bytes under unchanged bounds. The Pages build resolves the combined-reference link. | Pass   |
| AC-04 | Current three-engine site selection passes all 30 cases in 42.8 seconds. It covers reference geometry, routes, search, theme, copy, component previews, tool registration, source retrieval, and cancellation.                                                                              | Pass   |
| AC-05 | Sequential delivery run `2026-09-26T13-58-11-064Z-55381` passes all selected gates and all 1,717 browser cases. Test-phase validation confirms the unchanged tested tree and authorized receipt. Final handoff uses a matching delivery receipt for the terminal documentation record.      | Pass   |

### Completion audit

| Original requirement                                      | Current evidence                                                                                                                                                                                                                                                                                                                                                                              | Result |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Build the website from the supplied Downloads design.     | The native site reproduces the archive's home composition, typography, dark/gold palette, shared documentation shell, and mobile Dialog frame. Current 1440 × 1000 and 390 × 844 renders were inspected directly. Three-engine focused geometry and controls pass, and full browser delivery passes. Truthful package and candidate copy replaces fictional archive examples.                 | Pass   |
| Review documentation in several passes.                   | Contract accuracy, usage/topic coverage, and discovery/observable behavior are recorded above. Public guide corrections agree with package metadata and runtime ownership. All 24 guide records, 109 registry records, five verified examples, and 11 invariants remain present.                                                                                                              | Pass   |
| Provide full agent instructions and a combined reference. | `llms.txt` discovers `llms-full.txt` and the structured index. The combined reference includes every guide, example, and registry record. Corpus 7 is deterministic and bounded; 20 retrieval questions pass. Five optional read-only WebMCP tools pass three-engine registration, execution, citation, and cancellation checks. Root, Pages, packaged, and self-hosted artifact checks pass. | Pass   |

All five ticket criteria have direct evidence. The build/browser concurrency failure remains in the
ledger and trace; the sequential replacement passes every selected gate. The terminal review record
and its documented sources are handed off only with a matching delivery receipt. Hosting and
publication are outside this repository-build objective.

Status: Complete
