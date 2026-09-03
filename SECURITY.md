# Security policy

## System and scope

jQStar is a browser-side jQuery framework with reactive state, declarative expressions, plugins,
registered actions and helpers, HTTP protocol profiles, DOM patching, and published package
entrypoints. This policy covers the runtime and package sources, registries, backend examples, build
and release automation, and the behavior represented by generated distribution artifacts.

Tests, examples, and documentation are evidence of intended behavior. They do not prove that a
security control is effective.

## Threat model and trust boundaries

Application markup, expression-bearing HTML responses, installed plugins, registered actions and
helpers, and the supplied canonical jQuery peer are trusted code or markup. State, form values,
event detail, action arguments, JSON signal patches, response data, and action/helper return data
may be attacker-controlled and must remain data.

The current trusted expression engine executes JavaScript and requires `unsafe-eval`. The planned
`jquery-star/csp` profile is a separate finite interpreter defined by `jqstar-csp-expression/1`. It
is not shipped yet and must not be described as an attacker-expression sandbox.

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

The CSP parser, evaluator, package subpath, and strict-policy browser proof are planned work, not a
shipped security control. `docs/CSP_EXPRESSIONS.md` and `docs/security/CSP_THREAT_MODEL.md` define
the frozen contract and its implementation gates.

Before the CSP implementation can be treated as effective, it must resolve and test raw
action/helper result branding before thenable assimilation, exact committed-helper provenance,
expression-bearing response HTML as trusted markup, and engine ownership/disposal semantics. Until
then, deployments use the trusted engine and its required page policy explicitly.
