# Security policy

## System and scope

jQStar is a browser-side jQuery framework with reactive state, declarative expressions, plugins,
registered actions and helpers, HTTP protocol profiles, DOM patching, and published package
entrypoints. This policy covers the runtime and package sources, registries, backend examples, build
and release automation, and the behavior represented by generated distribution artifacts.

Tests, examples, and documentation are evidence of intended behavior. They do not prove that a
security control is effective.

## Reporting a vulnerability

Use
[GitHub private vulnerability reporting](https://github.com/Ignibyte/jqstar/security/advisories/new).
Do not open a public issue, attach exploit material to a public discussion, or include credentials
or production data. Include the affected package version and entry, supported environment, minimal
reproduction, reachability assumptions, and observed impact.

The target is to acknowledge a complete report within three business days and provide an initial
triage decision within seven calendar days. These are response goals, not a service-level agreement.
Coordinated disclosure timing depends on impact, fix availability, downstream exposure, and reporter
agreement. The project will credit reporters who want attribution and will not publish their private
contact information.

The latest published 1.x minor and patch line receives security fixes. The previous 1.x minor
receives security fixes for six months after the next minor release. Before `1.0.0` is published,
the repository is a candidate and makes no registry support claim. See [SUPPORT.md](SUPPORT.md).

## Threat model and trust boundaries

Application markup, expression-bearing HTML responses, installed plugins, registered actions and
helpers, and the supplied canonical jQuery peer are trusted code or markup. State, form values,
event detail, action arguments, JSON signal patches, response data, and action/helper return data
may be attacker-controlled and must remain data.

The trusted expression engine executes JavaScript and requires `unsafe-eval`. The explicit
`jquery-star/csp` profile is a separate finite interpreter defined by `jqstar-csp-expression/1`.
Neither profile is an attacker-expression sandbox.

Applications remain responsible for authentication, authorization, CSRF protection, endpoint policy,
output encoding, HTML sanitization, Trusted Types, and their page Content Security Policy.

## Security invariants

- A document has one owning kernel and canonical jQuery peer. Kernels, applications, registries,
  caches, observers, and cleanup records must not leak authority or mutable state across owners.
- Plugin, action, helper, middleware, directive, and protocol installation is validated and
  transactional. Failure exposes no partial registration and cleanup remains exact-once.
- Datastar SSE is generated through `@starfederation/datastar-sdk`; handwritten event framing is not
  an accepted implementation.
- Runtime data must not become expression source, a callable origin, an action/helper name, or an
  authority-bearing selector, property path, HTML fragment, or method name.
- The CSP expression profile must use no `eval`, `Function`, string timer, dynamic import,
  WebAssembly compilation, or equivalent source-to-code path in its package entry graph.
- CSP parsing and evaluation must remain inside the frozen grammar, capability tables, limits,
  source locations, and first-failure behavior. Rejected input produces no later state, DOM, or
  action side effect.
- DOM and jQuery capabilities must remain bound to the owning root, realm, and canonical jQuery
  peer. Foreign-realm or untracked live objects do not gain authority through duck typing or
  `instanceof`.
- Functions, accessors, inherited properties, arbitrary thenables, and magic prototype properties
  obtained from data or call results must not become executable capabilities.
- Diagnostics, reports, and observations must not serialize credentials, headers, state graphs, DOM
  graphs, event detail, response bodies, action arguments, rejection causes, or other secrets.
- Package entrypoints must preserve their documented installation and side-effect boundaries.

## Reportable findings and severity context

Report a finding when attacker-controlled data or an untrusted integration can cross one of these
boundaries with realistic reachability and security impact.

- Critical impact includes arbitrary code execution, escape into dynamic code construction from the
  CSP entry graph, or package/build compromise affecting consumers.
- High impact includes cross-kernel or cross-realm authority, prototype/callable escalation,
  unauthorized registry or network operations, or attacker-controlled data becoming trusted
  expression-bearing markup.
- Medium impact includes deterministic resource exhaustion, sensitive diagnostic disclosure, partial
  externally visible effects after a rejected precondition, or stale evaluator and lifecycle reuse.
- Lower-severity compatibility or documentation defects are security findings only when they weaken,
  conceal, or materially misstate a security boundary.

Severity must account for actual exposure, required trust, existing controls, and demonstrated
impact. Tests alone are not evidence that a suspected path is unreachable.

## Out of scope, exclusions, and accepted risk

- Treating attacker-authored expression markup as safe is out of scope. Expression source and
  expression-bearing response HTML are trusted inputs. A path that unexpectedly converts
  attacker-controlled data into source remains reportable.
- Dynamic construction in the explicitly selected trusted JavaScript engine is accepted behavior.
  Its presence in the CSP entry graph, or a claim that the trusted engine works without
  `unsafe-eval`, is reportable.
- Registered actions, helpers, and plugins intentionally retain their application authority. Their
  authorized behavior is not itself a finding; bypassing registration, provenance, ownership, or
  capability boundaries is.
- Application authentication, authorization, CSRF, sanitization, Trusted Types, and page-policy
  configuration are outside the library’s enforcement boundary unless repository code claims or
  implements such a control.

## Known limitations and compensating controls

The CSP entry limits expression syntax and removes dynamic code from that package graph. It does not
sanitize HTML, make untrusted markup safe, control third-party scripts, or replace the application
page policy. `docs/CSP_EXPRESSIONS.md` and the repository's
[CSP threat model](https://github.com/Ignibyte/jqstar/blob/main/docs/security/CSP_THREAT_MODEL.md)
define its frozen contract, tested capabilities, and remaining application duties.

The root entry deliberately retains trusted JavaScript expressions for 0.1 compatibility. A site
that cannot allow the trusted compiler must migrate its expressions and install the CSP entry
explicitly. Turbo and htmx bridges trust the injected host capability and supported version. The
proof server demonstrates boundaries but is not an authentication or authorization service.

## Fix, withdrawal, and disclosure

A confirmed finding is fixed on the supported line and receives a public advisory when users need
action. The advisory states affected versions, impact, prerequisites, fixed versions, and migration
or mitigation steps without exposing private reporter data.

If a published release is unsafe, prefer a corrected release and npm deprecation over unpublishing.
Deprecation preserves existing dependency graphs while warning new installations. Changing an npm
dist-tag, deprecating a version, editing a GitHub release, creating a tag, or publishing a fix is an
external write and requires explicit authorization under [RELEASING.md](RELEASING.md).
