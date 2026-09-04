# Backend integration

## Supported response styles

jQStar backend actions use one explicit protocol profile for request encoding and response
interpretation. The stable actions are `get`, `post`, `put`, `patch`, and `delete`. Credentials
default to `same-origin`.

| Profile         | Request contract                                                                                                                                  | Response contract                              | Lifecycle events                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------- |
| `core.generic`  | Explicit params, payload, or native form values only. No implicit signals, `Datastar-Request`, `datastar` query, or SSE preference.               | JSON/`+json` signal and HTML/XHTML patches.    | `jquery-star:fetch`                      |
| `core.datastar` | Implicit filtered signals, `Datastar-Request: true`, and SSE/HTML/JSON preference. GET uses the `datastar` query; DELETE uses the query and body. | Generic responses plus Datastar hints and SSE. | `datastar-fetch` and `jquery-star:fetch` |

The root package defaults to `core.datastar` to preserve the 0.1 request bytes and events. An
explicit `jquery-star/core` installation contains only `core.generic`; install `datastarPlugin` from
`jquery-star/datastar` before selecting `core.datastar`. Select the generic profile per action when
the endpoint is ordinary JSON or HTML:

```ts
await app.run(
  $.star.get("/account", {
    profile: "core.generic",
    params: { section: "security" },
  }),
);
```

An explicit generic GET payload is serialized under the `payload` query key. Explicit generic POST,
PUT, PATCH, and DELETE payloads use a JSON body. A generic request with no payload sends no
application state. Form mode keeps native URL-encoded or multipart behavior under either profile.

Response media selection is deterministic. Profiles declare normalized exact media types or one
structured suffix such as `+json`; registration rejects known overlaps. A 204/205 or missing body
uses the profile's explicit empty handler. Missing, unsupported, ambiguous, or malformed media
metadata fails before a handler can consume the body.

The selected adapter gets immutable response metadata and one exclusive body lease. It may claim the
body once as text or as a stream. Success, failure, abort, application destruction, plugin cleanup,
and kernel disposal close or cancel the reader and remove its owner. A profile can patch signals or
elements only while that lease is active. It never receives the kernel, registry, live application
context, or reusable `Response` object.

The initiating element, or the application root when there is no initiating element, emits the
selected profile's lifecycle events. Their `FetchLifecycleDetail` payloads are ordered as attempts
occur. The Datastar profile forwards unknown SSE messages as `jquery-star:sse` with an `SSEMessage`
payload. Declarative and behavior-sheet failures reach the application root through
`jquery-star:error`.

Those events are the 0.x compatibility surface and still contain live `Response` or error values.
Use `$.star.observeOperations()` when metrics, tests, or plugins need frozen JSON data instead. One
request observation spans all attempts and can emit `started`, `progress`, `retrying`, and one
terminal `completed`, `cancelled`, or `failed` phase. Cancellation reasons are `superseded`,
`cleanup`, `external`, or `aborted`. A request invoked by an observed action includes that action's
ID as `parentId`.

Request observations contain the method, URL origin and path, attempt, and applicable status or
progress counts. They omit the query, fragment, headers, payload, credentials, response body, stream
chunks, state, DOM, and every live browser object. Paths and normalized error messages can still
hold application data, so external exporters must apply their own redaction policy.

Datastar stream patches commit event by event. If a later event is malformed, earlier patches stay
committed and the request fails once. An explicitly configured retry may therefore replay a
partially applied stream. Disable that retry or make the endpoint idempotent when duplicate effects
would be unsafe.

## Plugin protocol profiles

A trusted structural plugin can register another profile before the first application starts:

```ts
registrar.protocolProfile({
  id: "acme.transport.text",
  compatibilityEvents: ["jquery-star:fetch"],
  prepareRequest(input, writer) {
    writer.setHeader("X-Operation", input.operationId);
    writer.none();
  },
  adapters: [
    {
      id: "text",
      match: { kind: "exact", mediaType: "text/plain" },
      async handle(_response, body, capabilities) {
        capabilities.patchSignals({ message: await body.text() });
      },
    },
  ],
  empty: () => undefined,
});
```

External IDs must be descendants of the plugin name; `core.generic` and `core.datastar` are
reserved. Request preparation is synchronous and must select exactly one of `none()`, `json()`, or
`form()`. The full plugin batch validates and commits atomically, so a bad profile exposes no
actions, directives, middleware, observers, profiles, facade, or cleanup state from that batch.
Profiles are trusted code: their request input includes serialized filtered signals, and their
active response capabilities can patch the owning application.

## Outgoing request middleware

Installed plugins can register `requestMiddleware()` before the first application starts. The chain
runs once per logical backend request, before its first network attempt. It receives a frozen
data-only descriptor and a request-owned `AbortSignal`; the body, form entries, files, controller,
DOM, state, live response, and stream remain private. Retries reuse the one validated descriptor and
body without repeating middleware side effects.

Middleware can change only the authored URL's path/query and add ordinary headers. Final validation
preserves the origin, URL fragment and credentials, method, credential mode, existing and protected
headers, body kind/size metadata, response target, form selector, patch mode, and selected profile.
It also rejects URL credentials, invalid header values, browser-owned headers, invalid scoped
selectors, and an already-aborted request before `fetch`.

This is an integration seam, not an authentication service. An application may read its own token
provider and add an `Authorization` header, but jQStar does not store, refresh, rotate, redact, or
authorize credentials. Servers must still authenticate the request and enforce authorization and
tenant policy. Query values and permitted custom headers are intentionally absent from observations
but visible to middleware; a logger or exporter remains responsible for redaction.

Calling `next()` advances the chain once. A callback must return the exact frozen outcome it
receives from `next()`. It may instead use its invocation's `complete()` factory to satisfy the
request without network or patch work, or `cancel()` to publish cancellation. Throws and rejections
preserve their original value at the action boundary. Cleanup or kernel disposal aborts the signal
and prevents late middleware from dispatching.

## Datastar SDK contract

The proof backend imports `ServerSentEventGenerator` from `@starfederation/datastar-sdk/web`.
Incoming Datastar signals are decoded with `ServerSentEventGenerator.readSignals(request)`.
Responses are created with `ServerSentEventGenerator.stream()` and written through
`sendWebResponse()`.

```ts
const read = await ServerSentEventGenerator.readSignals(request);
if (!read.success) return badRequest(read.error);

const response = ServerSentEventGenerator.stream((stream) => {
  stream.patchSignals(JSON.stringify({ count: 12 }));
  stream.patchElements(rowsHtml, {
    selector: "#result-rows",
    mode: "inner",
  });
});
```

Do not construct SSE fields by hand. The SDK owns protocol event names, data encoding, retry
metadata, and event IDs.

## jQuery Mobile migration reference endpoint

The ticket-0040 browser fixture is a separate synthetic server, not a production package route. It
serves complete documents for the migration home, project list/search, project detail, edit, new
project, and help URLs. Native edit and multipart forms remain authoritative with JavaScript off.
The server checks a fixture CSRF token, validates names and files, enforces a version field, escapes
returned values, uses 303 after successful writes, and renders deliberate 403, 409, 422, and 503
responses. It never queues or automatically replays an uncertain write.

Only the project-status control uses a partial update.
`POST /jquery-mobile-migration/projects/alpha/status` returns an element patch created by
`ServerSentEventGenerator.stream()`. The request and patch do not own route history, the document
head, scroll, or full-page errors. The fixture includes slow and error documents so browser tests
can verify that normal navigation keeps those responsibilities. Full implementation and route
ownership are documented in [JQUERY_MOBILE_MIGRATION.md](JQUERY_MOBILE_MIGRATION.md).

## Project Browser endpoint

`GET /api/demo/projects` is the reference Data Table endpoint. The client sends the complete query
state as Datastar signals:

```json
{
  "projectBrowserQuery": "runtime",
  "projectBrowserOwner": "all",
  "projectBrowserStatus": "active",
  "projectBrowserSorts": [
    { "key": "owner", "direction": "ascending" },
    { "key": "updated", "direction": "descending" }
  ],
  "projectBrowserGroupBy": "owner",
  "projectBrowserMode": "page",
  "projectBrowserPage": 1,
  "projectBrowserPageSize": 20,
  "projectBrowserWindowStart": 0,
  "projectBrowserWindowSize": 40,
  "projectBrowserRequestId": 7
}
```

The server validates facets, sort entries, group key, mode, page, page size, window bounds, and
request ID before querying. Sort SQL comes from a server-owned column map and all values use bound
parameters. The store adds a stable tie-breaker. Page mode accepts 5, 10, 20, 50, 100, or 200 rows.
Virtual mode clamps the window to 20–80 rows and returns top and bottom spacer metadata. Virtual
mode uses fixed-height rows and disables grouping and row expansion so offsets remain deterministic.

The query response emits:

1. a signal patch with canonical query metadata and the status message
2. an inner patch for the table body
3. an outer patch for Pagination

`PATCH /api/demo/projects/:id` accepts a JSON object with `name`, `owner`, `status`, and `version`.
Names contain 1–120 characters, owners must exist, status is allowlisted, and version is a positive
integer. The update predicate includes the expected version and increments it atomically. A stale
write returns `409` with the current record; it never overwrites that record. Hosts can supply
`authorizeProjectWrite` to `createProofApi` for identity and authorization policy.

## Project storage

`server/project-store.ts` defines the injectable store boundary and the shipped SQLite adapter. On
startup it creates the database parent directory, enables foreign keys, configures a five-second
busy timeout, enables WAL for file-backed databases, applies transactional schema migrations, and
idempotently supplies 2,500 deterministic records. Tests use `:memory:` or temporary files.

The self-hosted server reads `JQS_DATABASE_PATH`; its default is `data/projects.sqlite` under the
working directory. The adapter is synchronous and intended for one Node process with moderate table
workloads. A multi-instance application should implement the same boundary with a managed database
rather than sharing the SQLite file between writers. Backup and restore steps are in the
[self-hosting runbook](SELF_HOSTING.md#database-operations).

## Server safety

- Escape every record value inserted into HTML.
- Allowlist sort keys and filter values before applying them.
- Clamp page and page-size values.
- Bound virtual windows and reject unknown grouping or sort descriptors.
- Use expected versions for writes and return conflicts instead of last-write-wins updates.
- Return a 400 response when SDK signal decoding fails.
- Bound request bodies before parsing.
- Keep authorization and tenant filtering server-side in real applications.
- Never treat this demo's in-memory access state as production authorization storage.
