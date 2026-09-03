---
id: 0012
title: Extract generic and Datastar protocol profiles
status: done
created: 2026-08-30
updated: 2026-09-01
---

# 0012: Extract generic and Datastar protocol profiles

## Plan

### Problem

Moving only SSE parsing behind an adapter would leave the request path sending Datastar headers,
query parameters, implicit signal payloads, media preferences, response-hint headers, and legacy
events. It would call the code “generic” while retaining Datastar on the wire. Protocol neutrality
requires request encoding, response selection, body ownership, streaming, patch interpretation,
events, retry semantics, and disposal to move together without changing the root package's 0.1
contract.

### Current evidence

- `src/fetch.ts` always sets `Datastar-Request: true` and defaults `Accept` to
  `text/event-stream, text/html, application/json`.
- JSON-mode GET writes filtered application signals to the `datastar` query parameter. POST, PUT,
  and PATCH write them as JSON; DELETE writes the same data to both locations for SDK compatibility.
  Form mode follows native form encoding instead.
- `handleResponse()` selects SSE, JSON, or HTML by normalized content type. It interprets
  `datastar-only-if-missing`, `datastar-selector`, `datastar-mode`, and
  `datastar-use-view-transition` response headers.
- SSE handling owns the response reader, applies Datastar signal/element events incrementally, and
  forwards unknown messages through `jquery-star:sse`. Earlier streamed patches remain committed if
  a later event fails.
- JSON signal patches and ordinary HTML patches are useful without Datastar, but the current root
  wire bytes and matching `datastar-fetch`/`jquery-star:fetch` events are frozen by ticket 0003.
- Ticket 0011 selects a profile before request middleware and prohibits middleware from changing it.
  Ticket 0013 needs an installable Datastar entry point that does not pull Datastar behavior into a
  future core-only consumer.

### Scope

- Publish a plugin-registerable protocol-profile contract covering request encoding, authored
  options, header/media defaults, response-adapter selection, response hints, body leasing,
  streaming, patch capabilities, compatibility events, cancellation, and cleanup.
- Ship reserved official profiles `core.generic` and `core.datastar`. External profiles use IDs
  below their plugin namespace and commit atomically with the rest of the plugin batch.
- Add a generic JSON/HTML profile that sends only explicit params, payloads, or form values and no
  Datastar header, signal query parameter, SSE media type, response hint, or `datastar-fetch` event.
- Move the complete current Datastar request/response path into `core.datastar`, including signal
  filtering/encoding, DELETE compatibility, accepted media, SSE events, response headers,
  incremental patches, and compatibility events.
- Preserve `core.datastar` as the root action default so existing root requests remain byte-,
  event-, result-, retry-, cancellation-, and patch-compatible with ticket 0003.
- Select one profile before ticket 0011 middleware. Revalidate the returned request descriptor
  afterward, and reject profile changes in middleware.
- Define exact and suffix media matchers, duplicate/overlap detection, zero/multiple-match errors,
  204/empty-body behavior, and exactly one body owner.
- Wrap a live response in one body lease. Profiles receive immutable status/header metadata plus
  exclusive text or stream capabilities, not a freely reusable `Response` object.
- Abort and cancel the reader/body on request, application, profile, plugin, or kernel disposal.
  Ignore late chunks or settlements after terminal cleanup.
- Keep root `SSEParser`, `parseSSE`, `sseDataFields`, `SSEMessage`, and legacy event APIs compatible
  without promising a generic SSE profile or modular subpath in this ticket.

### Out of scope

- WebSocket support or a second maintained streaming protocol.
- Public arbitrary patch middleware without a demonstrated second user.
- GraphQL, JSON:API, Turbo, htmx, multipart response, file-download, upload-progress, or navigation
  profiles.
- Moving official profiles to separate package entry points; ticket 0013 owns installed modular
  distribution and tree-shaking proof.
- Buffering or rolling back already committed streamed patches. Stream commits remain incremental.
- Changing the proof server to handwritten SSE. It continues to use `@starfederation/datastar-sdk`
  exclusively.

### Dependencies

- Tickets 0010 and 0011.

### Acceptance criteria

- [x] [AC-01] Root-package types define protocol profiles, request preparation, response metadata,
      exact/suffix adapter matchers, exclusive body leases, profile capabilities, cleanup, and typed
      selection/ownership errors without exposing fetch, patch, or kernel internals.
- [x] [AC-02] `StarPluginRegistrar.protocolProfile()` validates plugin-qualified IDs, reserved
      official IDs, duplicate profiles, matcher forms, duplicate/overlapping adapters, required
      handlers, and synchronous setup before atomic commit. Failed installation exposes no partial
      profile.
- [x] [AC-03] Selecting `core.generic` sends no `Datastar-Request` header, `datastar` query
      parameter, implicit signal payload, `text/event-stream` media preference, `datastar-*`
      response-hint behavior, `datastar-fetch`, or Datastar SSE interpretation. Only explicit
      params/payload/form values are sent; JSON and HTML responses retain core patching.
- [x] [AC-04] Root `get`/`post`/`put`/`patch`/`delete` and their direct action factories default to
      `core.datastar` and remain byte-compatible for URL, signal filtering, GET/DELETE query data,
      JSON/form bodies, headers, credentials, and every ticket-0003 method fixture.
- [x] [AC-05] `core.datastar` retains JSON signal patches, HTML element patches, response selector/
      mode/only-if-missing/view-transition hints, chunked Datastar signal/element events, unknown
      SSE forwarding, matching legacy lifecycle targets/payloads/order, and official SDK
      interoperability.
- [x] [AC-06] Profile selection is explicit and deterministic. An unknown profile, middleware
      profile change, unsupported media type, zero adapter, multiple adapters, invalid response
      metadata, or body already consumed fails once before an ambiguous handler or second read can
      run.
- [x] [AC-07] A body lease can be claimed exactly once for text or streaming. Success, unsupported
      content, parser failure, handler failure, abort, retry, and disposal close/cancel the reader
      and body exactly once and leave no active request, stream, profile task, or body owner.
- [x] [AC-08] Streaming tests prove CRLF/LF chunk boundaries, split UTF-8 decoding, comments,
      multiline data, IDs, retry fields, unknown events, malformed Datastar fields, abort between
      chunks, parse failure after a committed patch, and documented retry behavior. Earlier
      committed patches remain; no hidden rollback or duplicate terminal observation occurs.
- [x] [AC-09] Generic and Datastar work uses the ticket 0010 operation ID and ticket 0011 validated
      descriptor. Profiles cannot publish a second terminal record, escape the application root,
      retain live context after cleanup, or consume a response after application/plugin/kernel
      disposal.
- [x] [AC-10] Installed ESM, CommonJS, QUnit, TypeScript NodeNext/Bundler, module-browser, and
      UMD-browser consumers select both official profiles using only the root package. API review,
      coverage/property/static/browser/package/release gates, `npm run check`, and
      `git diff --check` pass without mutation testing.

### Design

Add a kernel-owned profile registry with two reserved built-ins and transactionally staged plugin
profiles. `BackendActionOptions.profile` selects a string ID. Root actions use `core.datastar` when
the option is absent; `core.generic` is opt-in until ticket 0013 creates modular entry points.
Selection happens once before request middleware and is immutable for the logical request.

A profile prepares the protocol-owned portion of a private request plan from authored options and a
bounded application context. The plan is converted into ticket 0011's inert descriptor, composed,
then validated against both authored request policy and the selected profile before dispatch.
Profiles may supply header/media defaults and encode explicit payload/form data; only
`core.datastar` may implicitly serialize filtered signals under the reserved `datastar` field.

After `fetch`, normalize status, URL, redirect state, and header tuples into immutable metadata. A
private body lease offers a profile adapter exactly one of `text()` or `stream()`. The first claim
brands the owner; another claim or any attempt after release throws a typed ownership error. The
engine cancels an unconsumed or failed body and records the reader/adapter task in the kernel
resource ledger.

Each profile owns a static ordered adapter list using exact MIME or `+suffix` matchers. Matcher
overlaps are rejected during registration where possible; runtime still requires exactly one match
before body access. Empty/204 responses use an explicit no-body adapter. Profiles receive narrow
capabilities for signal patches, element patches, progress reporting, and compatibility events;
generic middleware never receives those capabilities or the body lease.

The generic profile recognizes JSON, `+json`, HTML, XHTML, and empty responses. It applies JSON as
signal data and HTML using authored target/mode only. It ignores Datastar response headers and
rejects SSE. The Datastar profile adds `text/event-stream`, Datastar response hints, filtered signal
request encoding, incremental event interpretation, and the existing compatibility events.

Stream patches commit as complete events arrive. If a later chunk, event, or handler fails, earlier
commits stay visible and the request fails once. Retry policy remains the existing logical-request
policy: a retry can replay a request after a partially applied stream when the author explicitly
selected a mode that permits it. Documentation warns that servers and applications must make such
streams idempotent or disable those retries.

### Decisions

- Official IDs are `core.generic` and `core.datastar`; the root package defaults to `core.datastar`
  for 0.1 compatibility. External profile IDs must belong to the registering plugin namespace.
- A profile is a trusted plugin capability with request encoding and patch authority. It receives
  narrow capabilities and an exclusive response lease, never the kernel registry or application
  maps.
- Generic means no Datastar behavior on the wire or client event surface. JSON signal and authored
  HTML patching remain core jQStar behavior.
- Profiles are selected once by ID. They do not chain, auto-negotiate across profiles, or compete by
  priority.
- Adapter matching uses normalized media types with exact and structured-suffix matchers only. No
  arbitrary matching function can inspect or consume a response during selection.
- A response has one owner. Middleware sees only data-only outcome metadata; the selected profile
  alone can claim the body lease.
- Root SSE parser utilities and legacy events remain public and compatible. Modular exports and a
  Datastar-free core graph remain ticket 0013 work.

### Security and accessibility

- Generic requests omit Datastar signals by construction. Profile and middleware validation rejects
  URL credentials, origin changes, forbidden headers, invalid selectors/targets, profile swaps, and
  patch targets outside the owning application root before dispatch or mutation.
- Body leases prevent double reads and cancel abandoned readers. Profiles cannot pass stream chunks,
  response bodies, DOM, state, credentials, or live response objects to middleware or operation
  observations.
- The Datastar parser treats event data as protocol input: JSON is parsed as data, element patches
  pass through existing transactional DOM safety, and no event data is executed as JavaScript.
- The proof server continues to create SSE exclusively through the official Datastar SDK.
- Profiles add no visual interface. Existing patch focus/preservation, live-region, reduced-motion,
  and JavaScript-disabled behavior retain their browser/accessibility contracts.

### Risks

- Existing options combine generic fetch concerns and Datastar signal concerns. Preserve root types
  while introducing narrower profile types for modular imports.
- Retrying after a partial stream patch can duplicate server effects. Preserve and document current
  behavior before changing it.
- A public profile contract can accidentally expose a second middleware system. Keep request
  transformation, response consumption, and patch capabilities narrow and phase-specific.
- Sharing JSON/HTML adapters between built-ins can leak Datastar hints into generic requests. Byte-
  and header-level negative tests must search the generic wire and behavior for every Datastar
  sentinel.
- A profile can retain a lease or settle after abort. Ownership tokens, task records, and late-call
  guards must make cleanup terminal and exactly once.
- Content-type suffix matching can become ambiguous. Registration rejects known overlaps and
  dispatch refuses zero or multiple matches before claiming the body.
- The root default and future modular defaults differ by design. Documentation must distinguish root
  compatibility from ticket 0013's explicit core/datastar installation.

### Verification plan

- Validate this Plan before changing behavior.
- Add focused registry tests for official/external IDs, plugin namespace ownership, duplicates,
  matcher overlap, atomic batch rollback, selection, lock timing, and disposal.
- Add byte-level request matrices for both profiles across every method, explicit/implicit payload,
  params, filtered signals, JSON/form/multipart bodies, headers, credentials, and middleware edits.
- Add response matrices for JSON, `+json`, HTML, XHTML, SSE, 204/empty, missing/unsupported media,
  zero/multiple adapters, profile hints, authored patch options, and one body claim.
- Add stream matrices for chunk/UTF-8/newline boundaries, fields/events, incremental commits,
  unknown/malformed input, abort, cleanup, failure after commit, retry, reader cancellation, and
  late settlement.
- Run current fetch, patch, SSE, runtime, declarative, operation, middleware, server, official
  Datastar SDK, public-baseline, API-extractor, and package hardening suites.
- Add generated tests for profile/adapter registrations, request encodings, content-type selection,
  body ownership state machines, chunk splits, exactly-one terminal outcome, and cleanup.
- Expand installed tarball consumers to compile and execute generic and Datastar requests through
  ESM, CommonJS, QUnit, NodeNext, Bundler, module browsers, and the UMD browser global.
- Run focused suites, `npm run quality:fast`, ticket Code validation, coverage, properties,
  three-engine browser quality, package quality, release reproducibility, `npm run check`, ticket
  Test/Document validation, and `git diff --check`.

### Planned files

- `src/protocol.ts`: Public profile/adapter/matcher/lease types, registry validation, selection,
  exclusive body ownership, capabilities, and disposal.
- `src/protocol-generic.ts`: Datastar-free explicit request encoding plus JSON/HTML/empty response
  adapters.
- `src/protocol-datastar.ts`: Current signal encoding, Datastar headers/media/hints, SSE handling,
  incremental patches, and compatibility events.
- `src/fetch.ts`: Select and prepare one profile, compose middleware, dispatch the validated plan,
  delegate response ownership, and preserve retries/cancellation/results.
- `src/plugin.ts`, `src/kernel.ts`: Transactionally register profiles and own profile, adapter,
  stream, reader, and task cleanup.
- `src/types.ts`, `src/index.ts`: Publish profile selection and trusted profile contracts while
  retaining root request/SSE compatibility.
- `src/sse.ts`, `src/patch.ts`: Change only where exclusive streaming or narrow profile patch
  capabilities require it; preserve public parser and patch APIs.
- `test/protocol.test.ts`, `test/protocol-datastar.test.ts`: Registry, byte, adapter, body lease,
  response, stream, compatibility, and disposal matrices.
- `test/{fetch,sse,patch,datastar-sdk,runtime,declarative,plugin,kernel}.test.ts`: Existing behavior
  and cross-layer integration.
- `test/property/protocol.property.test.ts`: Generated encoding, matcher, lease, chunk-split,
  terminal, and cleanup invariants.
- `test/public-baseline.test.ts`, `etc/jquery-star.api.md`, `quality/`, `schema/`: Reviewed root
  API, immutable request/event fixtures, production census, and measured budgets.
- `scripts/quality-package.mjs`, `test/package-release-hardening.test.mjs`: Installed generic and
  Datastar consumers across every supported module, type, test-runner, and browser shape.
- `README.md`, `docs/{ARCHITECTURE,BACKEND,PROJECT,RUNTIME_OWNERSHIP,TESTING}.md`: Profile usage,
  default compatibility, wire semantics, body/stream ownership, security, and evidence.
- `docs/tickets/0012-extract-protocol-profiles.md`: Phase state, ledger, commands, findings, and
  criterion evidence.

## Code

### Changed-file ledger

| File                                                                            | Purpose                                                                                        |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `docs/tickets/0012-extract-protocol-profiles.md`                                | Open Code phase and maintain design, file, command, finding, and evidence ledgers.             |
| `src/protocol.ts`                                                               | Define public profile contracts, registry, selection, preparation, body lease, and validation. |
| `src/protocol-generic.ts`, `src/protocol-datastar.ts`                           | Implement the official generic and compatibility Datastar request/response profiles.           |
| `src/{fetch,request-middleware,plugin,kernel,types,index}.ts`                   | Integrate selection, middleware identity, dispatch, plugin transactions, ownership, and API.   |
| `test/{protocol,protocol-datastar,fetch,plugin,kernel}.test.ts`                 | Prove profile registry, wire bytes, adapters, lease ownership, compatibility, and disposal.    |
| `test/property/protocol.property.test.ts`                                       | Generate matcher, body ownership, encoding, stream, and cleanup invariants.                    |
| `quality/`, `schema/`, `etc/jquery-star.api.md`, `scripts/quality-package.mjs`  | Review public evidence and exercise installed consumers.                                       |
| `README.md`, `docs/{ARCHITECTURE,BACKEND,PROJECT,RUNTIME_OWNERSHIP,TESTING}.md` | Document profile use, wire behavior, ownership, compatibility, security, and verification.     |

### Design changes

The implementation starts with the validated Plan. Public request preparation uses a frozen,
serialized input and a sealed writer capability, so external profiles never receive live state, DOM,
a form, or the private request body. The writer owns URL/header updates and exactly one body choice.
Response streaming uses a callback-based lease so the engine retains the reader and can cancel it on
abort or disposal; profiles never receive `Response` or a freely retained reader.

`executeProtocolResponse()` cancels bodies on every pre-adapter rejection, including request/profile
identity mismatch and an already-aborted signal. The application registry owns active leases so
application and kernel cleanup cancel a body even when a plugin handler ignores abort. Scoped patch
and event capabilities close in the same terminal path.

The installed-package proof selects both official profiles in ESM, CommonJS, QUnit, module-browser,
and UMD-browser consumers. NodeNext and Bundler consumers compile the complete public profile,
adapter, matcher, request, response, lease, capability, and error surface plus plugin registration.
Measured package growth is six declaration artifacts, so the artifact and UMD/root-consumer ceilings
were adjusted to the observed package rather than inferred.

## Test

| Command                                                                                                                               | Result | Evidence                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| `npx tsc -p tsconfig.quality.test.json`                                                                                               | Pass   | Production and test declarations compile after profile integration.                                         |
| `npx vitest run test/protocol.test.ts test/protocol-datastar.test.ts test/plugin.test.ts test/request-middleware-integration.test.ts` | Pass   | 87/87 focused registry, integration, plugin, and middleware tests.                                          |
| `npm run test:unit`                                                                                                                   | Pass   | 86 files and 697 tests passed.                                                                              |
| `npm run test:property`                                                                                                               | Pass   | 24/24 properties passed with seed 430043; protocol adds four generated invariants.                          |
| `node scripts/quality-package.mjs`                                                                                                    | Pass   | 13/13 installed-tarball checks; ESM/CJS/QUnit/types/module/UMD and Chromium/Firefox/WebKit select profiles. |
| `npm run lint:markdown && npm run lint:spelling`                                                                                      | Pass   | 68 Markdown files and 55 spelling inputs passed.                                                            |
| `npm run quality:fast` (run `2026-09-01T16-24-02-552Z-24770`)                                                                         | Fail   | Static analysis found two unused test imports and one internal type alias exported from its source module.  |
| `npm run quality:fast` (run `2026-09-01T16-25-37-371Z-32525`)                                                                         | Pass   | Ticket, runner self-test, format, 697 unit tests, and the complete fast static matrix passed.               |
| Code phase validation against `.git/jqstar/latest-report.json`                                                                        | Pass   | Code phase closed against the current fast report.                                                          |
| `npm run quality:delivery` (run `2026-09-01T16-27-21-913Z-40363`)                                                                     | Fail   | 11/12 gates passed; coverage rejected untested reachable paths and redundant post-selection branches.       |
| `npm run test:coverage`                                                                                                               | Pass   | Added error/cleanup matrices and simplified impossible body branches; the changed-line gate passed.         |
| `npm run quality:fast` (run `2026-09-01T16-41-09-603Z-63957`)                                                                         | Pass   | Current tree passed ticket workflow, runner self-test, format, 715 unit tests, and the fast static matrix.  |
| `npm run quality:delivery` (run `2026-09-01T16-42-52-734Z-72388`)                                                                     | Pass   | 12/12 delivery gates passed and wrote the Test-phase receipt.                                               |
| Test phase validation and `npm run quality:receipt`                                                                                   | Pass   | Canonical delivery report validated; its receipt matched the then-current 477-file tree.                    |

### Inspection ledger

| Finding                                                                                                 | Resolution                                                                                                           | Evidence                                                                                             |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Profile mismatch and already-aborted response paths could exit before cancelling a synthetic body.      | Cancel the body before both typed early exits; assert one underlying cancellation.                                   | `src/protocol.ts`; `test/protocol.test.ts`                                                           |
| A browser package proof read its result before the two real profile requests settled.                   | Wait for the asynchronous click result and retain page/console diagnostics for future failures.                      | `scripts/quality-package.mjs`; 13/13 package checks                                                  |
| Protocol declaration artifacts and runtime code exceeded the old file, UMD, and root-consumer ceilings. | Measure the packed tarball and bundles, then adjust only the affected first-baseline ceilings to the observed shape. | 276 files; 1,907,347 packed bytes; 451,675-byte UMD; 531,000-byte installed root bundle              |
| Static analysis found unused test imports and an internal exported type alias.                          | Remove the imports and make `ProtocolRequestBody` module-private.                                                    | Fast run `2026-09-01T16-25-37-371Z-32525`                                                            |
| Delivery coverage identified unexercised validation, metadata, adapter, and cleanup paths.              | Add focused matrices for every reachable path and remove redundant branches made impossible by prior selection.      | Standalone coverage gate passes; protocol source lines and functions are 100% covered                |
| The proof server might have drifted toward handwritten SSE while client parsing moved.                  | Inspect server sources and retain official SDK generation plus the existing SDK interoperability tests.              | `server/api.ts`; `test/datastar-sdk.test.ts`; `test/server.test.ts`; no handwritten event generation |

## Document

### Documentation changed

- `README.md` now leads backend users through `core.generic`, the compatible root default,
  per-action selection, plugin registration, response leases, profile-specific hints/events, and
  partial-stream retry behavior.
- `docs/ARCHITECTURE.md` records the kernel profile registry, shared plugin transaction, request
  preparation boundary, adapter selection, scoped capabilities, and body ownership.
- `docs/BACKEND.md` is the complete generic/Datastar wire contract and trusted plugin-profile guide.
- `docs/PROJECT.md` adds protocol profiles and their public root contracts to the shipped runtime
  and compatibility policy.
- `docs/RUNTIME_OWNERSHIP.md` assigns profiles, live bodies, readers, parser tasks, weak links, and
  cleanup paths to the kernel, request, and adapter owners.
- `docs/TESTING.md` records the unit, integration, generated, SDK, installed-package, and
  three-engine conformance matrix and continues to exclude mutation testing.
- `quality/public-baseline.json`, its schema/test, and `etc/jquery-star.api.md` review the runtime,
  declarations, default/profile semantics, exact artifact, and Test-phase delivery evidence.

### Acceptance evidence

| Criterion | Result | Evidence                                                                                                                                                                                                                          |
| --------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01     | Pass   | `src/protocol.ts`, `src/index.ts`, reviewed `etc/jquery-star.api.md`, and `test/public-baseline.test.ts` publish and freeze the bounded request/response, matcher, lease, capability, and typed-error surface.                    |
| AC-02     | Pass   | `src/plugin.ts` and `test/{plugin,protocol}.test.ts` prove qualified/reserved IDs, synchronous registrar closure, matcher/handler validation, atomic batch rollback, commit, cleanup, and disposal.                               |
| AC-03     | Pass   | `src/protocol-generic.ts`, `test/protocol-datastar.test.ts`, and generated request matrices prove no implicit signal, Datastar header/query/hint/event/SSE behavior while JSON/HTML patching remains.                             |
| AC-04     | Pass   | `src/protocol-datastar.ts`, existing `test/fetch.test.ts`, all-method protocol tests, generated encodings, and installed consumers preserve root request bytes and the `core.datastar` default.                                   |
| AC-05     | Pass   | `test/{fetch,protocol-datastar,datastar-sdk,server,sse}.test.ts` cover JSON/HTML hints, chunked patches, unknown events, legacy lifecycle behavior, and official SDK interoperability.                                            |
| AC-06     | Pass   | `test/{protocol,request-middleware}.test.ts` covers unknown/mismatched profiles, immutable middleware identity, invalid metadata, zero/multiple adapters, unsupported media, and consumed bodies.                                 |
| AC-07     | Pass   | Body-lease unit/integration/property tests plus the delivery coverage gate prove one claim and zero owner leaks after success, selection failure, parser/handler failure, abort, disposal, and cancellation failure.              |
| AC-08     | Pass   | `test/protocol-datastar.test.ts`, `test/property/{protocol,sse}.property.test.ts`, and `test/sse.test.ts` cover newline/byte boundaries, UTF-8, fields, unknown/malformed events, partial commit, abort, and terminal uniqueness. |
| AC-09     | Pass   | The installed plugin-profile integration uses the ticket 0010 operation ID and ticket 0011 descriptor; cleanup, root-scoped patching, closed late capabilities, and single terminal observations all pass.                        |
| AC-10     | Pass   | Delivery run `2026-09-01T16-42-52-734Z-72388` passed 12/12 gates; package quality passed 13/13 ESM/CJS/QUnit/NodeNext/Bundler/module/UMD checks across Chromium, Firefox, and WebKit without mutation testing.                    |

### Completion audit

All ten criteria are implemented and mapped once. The root package keeps its compatible default and
public SSE utilities while generic and plugin profiles are explicit. The Test-phase tree had 715/715
unit tests, 24/24 generated properties, 260/260 browser executions with zero failures, flakes, or
skips, a 276-file installed package, 100% changed executable-line/function coverage, 13/13 package
checks, and a reproducible SHA-256 of
`af2f2199566cc282d1f9c91bb2c4b8861350b0d79ab84cabd7995526cb48d00f`. Release and package runners left
no owned temporary directories. Mutation testing was not run.

Status: Complete
