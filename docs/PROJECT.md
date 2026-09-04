# Project definition

## Public name

The public product name is **jQStar**. The npm package remains `jquery-star`, the executable remains
`jqstar`, and component roots remain `data-jqs`. The existing `jqdatastar` checkout directory is a
legacy working name and does not define the product. Datastar is a supported transport and primary
integration, not the only protocol jQStar can use.

jQStar is an independent project. It is not affiliated with, sponsored by, endorsed by, or an
official successor to the jQuery project or the OpenJS Foundation. The expression boundary is exact:
`$ is real jQuery` and `$name` is the reactive signal named `name`. The reviewed project statuses,
migration roles, and naming rules live in [JQUERY_ECOSYSTEM.md](JQUERY_ECOSYSTEM.md).

## Product goal

jQStar gives server-rendered applications a small reactive client layer without replacing jQuery or
requiring a virtual DOM. HTML attributes can read and write signals, call named actions, run jQuery
methods, submit native forms, and consume server patches.

Its public promise is a full-featured frontend platform for server-rendered applications that do not
want to become single-page applications. Teams keep routes, validation, permissions, data, and
useful initial HTML on the server. They can add reactivity and accessible components where needed,
update page regions through HTML, JSON, or Datastar streams, reuse backend templates and jQuery
plugins, and adopt the framework without an application rewrite. The framework does not require JSX,
hydration, virtual DOM ownership, or duplicate client-side routes.

The UI catalog applies the same approach to accessible application controls. It favors native
elements such as `dialog`, `details`, `input`, `select`, and `table`, then adds only the state and
keyboard behavior the platform does not provide.

## Product direction

The development program prioritizes:

1. An excellent server-rendered development experience.
2. Predictable enhancement and cleanup after HTML replacement.
3. Backend-agnostic examples for PHP, Rails, Django, Node, and similar stacks.
4. Strong no-build and modular-package support.
5. Accessible components that solve real application workflows.
6. Optional navigation and shared state without making them mandatory.
7. Clear migration paths from ordinary jQuery, jQuery UI, and jQuery Mobile.

This list defines direction, not a claim that every roadmap item already ships. Public capability
claims remain limited to tested runtime, registry, component, server-channel, packaging, and
deployment contracts.

## Public products

### Runtime package

The `jquery-star` package installs onto a jQuery instance. Consumers can initialize an explicit
application with `$(root).star(definition)` or boot declarative markup with `$.star.boot()`.

The package exports:

- an auto-installing compatibility root plus side-effect-free `core`, `ui`, `datastar`, `testing`,
  `datastar/testing`, `htmx`, and `turbo` 0.4 preview entries; only the root composes runtime
  plugins and publishes a UMD global
- application lifecycle and typed definitions
- the trusted expression-engine factory, installer capability, structured failures, and cache
  controls; explicit core installation selects the engine before document ownership
- transactional plugins with versioned manifests, dependency/order graphs, namespaced actions,
  exact/prefix directives, expression helpers, typed facades, application hooks, and owned cleanup
- reactive state scheduling through `nextUpdate`
- complete server-patch commits through `whenEnhanced`
- named frontend and backend actions
- typed kernel, application, and plugin operation observations with action/request parentage
- transactional, ordered request middleware with frozen descriptors, guarded dispatch, and owned
  cancellation
- explicit `core.generic` and `core.datastar` protocol profiles, plus atomic plugin profile
  registration and exclusive response-body ownership
- request cancellation and retry controls
- JSON signal patches and Datastar SSE consumption
- DOM patch operations backed by Idiomorph
- a host-neutral external render adapter with exact preservation, incoming-root boot, and the full
  enhancement barrier
- a frozen Turbo and htmx bridge contract with exact evidence ranges, plus shipped optional
  host-specific lifecycle bridges
- transactional application setup, public terminal disposal reports, and explicit
  `data-jqs-preserve` roots
- an explicit-realm, runner-neutral testing harness with bounded settling, deterministic response
  queues, public cleanup assertions, and core/plugin conformance
- the `$.star.ui` component APIs

### Source registry

`registry.json` describes components and blocks in the shadcn registry vocabulary. The `jqstar` CLI
adds project-specific destination rules, dependency ordering, dry runs, overwrite protection, and a
doctor command. Installed HTML and block TypeScript belong to the consuming application.

### Website, Component Lab, and proof server

The public website in `example/` is native multi-page HTML enhanced by jQStar itself. It provides
the framework home, documentation shell, and initial verified component guides without a React
runtime or client router. The exhaustive former catalog lives at `/components/lab/`, where Vite
mounts registry blocks into one application. `server/api.ts` supplies the backend used by Vite
middleware and by the standalone Node server. `server/project-store.ts` is a migration-managed
SQLite reference adapter for the production Data Table proof. Its injectable interface is an
integration boundary, not a general persistence framework.

The website is agent-first by parity, not by replacing human HTML: browser and headless agents can
retrieve the same reviewed facts, registry contracts, and examples with canonical citations. One
manifest generates the visible `/docs/agents/` guide, `/llms.txt`, `/llms-full.txt`, and the
versioned `/jqstar-agent-index.json`. Website search and optional read-only WebMCP tools use that
index. WebMCP remains a feature-detected Community Group draft; the static files are the contract
for agents without a supporting browsing context.

The website also publishes the `jqstar-csp-expression/1` language profile at `/docs/csp/`. The
profile means no dynamic code construction in the shipped CSP entry graph, requires trusted markup
and trusted installed extensions, and is not a sandbox. The `jquery-star/csp` subpath provides the
explicit installer and engine factory. The exact packed entry is tested under a strict response
policy in Chromium, Firefox, and WebKit.

## Non-goals

- jQStar does not provide a jQuery-compatible replacement. It requires jQuery.
- It does not own application-wide persistence, authentication, tenancy, or authorization policy.
  The proof server owns only its project-table schema and exposes a write-policy hook.
- It does not render a virtual DOM or require client-side component templates.
- Registry recipes are not immutable package widgets. Applications are expected to edit them.
- The SQLite project store is designed for one Node process. Other demo state remains in memory, and
  applications that need multiple writers must provide a managed-database adapter.

## Repository map

```text
bin/                 registry CLI
deploy/              systemd unit and environment example
docs/                project brain, architecture, operations, and tickets
e2e/                 Playwright browser and accessibility proof
example/             self-hosted website, documentation, and Component Lab
registry/components/ copy-in component HTML
registry/blocks/     copy-in composed HTML and TypeScript
config/              reviewed agent-content and quality contracts
schema/               jquery-star.json schema
scripts/              package and deployment smoke checks
server/               proof HTTP server and Datastar endpoints
src/                  published runtime and UI behavior
test/                 Vitest unit and integration tests
```

`docs/CSP_EXPRESSIONS.md`, `docs/security/CSP_THREAT_MODEL.md`, and `test/fixtures/csp/` are the
versioned contract inputs for the shipped CSP parser, package entry, and browser proof.
`docs/INTEROPERABILITY.md`, `quality/external-bridge-contract.json`, and the interoperability
fixtures define the approved inputs for the shipped Turbo and htmx bridges.

## Dependency boundaries

- `jquery` is a peer dependency because the host application owns its instance.
- `json5` parses declarative signal and option values.
- `idiomorph` performs state-preserving HTML morphs.
- `@starfederation/datastar-sdk` defines the server event protocol.
- `@hotwired/turbo >=8.0.21 <8.1.0` is an optional peer used only by `jquery-star/turbo`.
- `htmx.org >=2.0.0 <2.1.0` is an optional peer used only by `jquery-star/htmx`. Exact Turbo
  8.0.21/8.0.23 and htmx 2.0.0/2.0.10 aliases are development fixtures. Host code does not enter a
  published jQStar bundle.
- QUnit 2.26.0 is an exact installed-package test consumer. jQuery Migrate, jQuery UI, jQuery
  Mobile, standalone Sizzle, and QUnit are absent from runtime dependencies and published bundle
  graphs. `@types/sizzle` is only a transitive development declaration from `@types/jquery`.
- Vite, TypeScript, Tailwind, Vitest, and Playwright are build/test dependencies.

## Release shape

The npm package exposes the compatibility root as ESM, CommonJS, and UMD; modular
core/UI/Datastar/testing/htmx/Turbo entries as ESM and CommonJS; matched declarations and source
maps; explicit compiled UI CSS; the CLI; registry sources; schema; deployment examples; the public
guides linked from the package README; the static agent corpus and guide; and one deterministic
Brotli archive of the self-hosted website. The server uses that archive only when loose deployment
files are absent; local development and GitHub Pages retain ordinary nested HTML routes. Repository
brain, quality, accessibility-release, and ticket documents remain source-repository material. Node
24 or newer is required.

## Compatibility policy

`quality/public-baseline.json` is the executable 0.1 compatibility index. Public root exports,
declarations, jQuery members, component APIs, directives, named actions, request and event
contracts, package entries, formats, and supported environments are stable for the 0.x line. A
stable item must remain deprecated for at least one minor release before removal.

Version 0.1 has no deprecated entries and publishes no stable error codes. Error message intent is
consumer-visible, but callers must not parse message text as an identifier. Plugin API 0.1.0 is
public through the root entry, including transactional directive, helper, request-middleware,
protocol-profile, and operation-observer registration. The root entry also publishes kernel and
application operation subscriptions; request descriptor, outcome, and middleware contracts; protocol
request/response, matcher, lease, and capability contracts; and typed errors. `core`, `ui`,
`datastar`, `testing`, `datastar/testing`, `htmx`, and `turbo` are published and package-tested as
0.4 previews; ticket 0017 owns their stable 1.0 designation. Source-only modules and undeclared
package subpaths are internal until a later ticket publishes and tests them.

The supported document host is an ordinary HTML document, including an explicitly supplied
same-origin frame document, with one live jQStar kernel and one canonical jQuery instance. A second
kernel or package copy cannot claim the same live document; terminal disposal releases the claim.
Separate realms can own separate kernels. Shadow-root applications remain unsupported. Shared
browser behavior is blocking in Chromium, Firefox, and WebKit rather than being promised by an
untested brand-version range. The complete mutable-state and disposal boundary is recorded in
[RUNTIME_OWNERSHIP.md](RUNTIME_OWNERSHIP.md).
