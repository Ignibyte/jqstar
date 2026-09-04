# Support policy

This policy applies when `jquery-star@1.0.0` is published. Until then, the repository contains a
release candidate and no npm availability is implied.

## Supported line

The latest 1.x minor and patch line receives compatibility fixes and security updates. After a new
1.x minor release, the previous minor receives security fixes for six months. A release may end
early only when an upstream runtime or browser security boundary can no longer be supported safely.
That change requires a security notice and migration path.

The 0.1 line is the executable migration baseline. Once 1.0.0 is published, 0.1 receives no new
features. A security fix may be backported when the change is safe and users cannot move to 1.x
immediately, but no backport is promised.

Node, jQuery, browser, document, module, and bridge ranges are listed in
[the compatibility policy](docs/COMPATIBILITY.md). jQuery UI and jQuery Mobile are migration inputs,
not bundled or supported jQStar runtimes.

## Getting help

Use a GitHub issue for reproducible package defects, documentation errors, compatibility reports,
and feature proposals. Include:

- the exact `jquery-star`, jQuery, Node, npm, browser, Turbo, or htmx versions involved
- the package entry and module format
- a minimal server-rendered document or repository
- the observed and expected behavior
- whether JavaScript is disabled, the CSP entry is selected, or an external renderer owns the DOM

Questions about application authentication, authorization, CSRF, output encoding, sanitization,
database consistency, or deployment policy belong to the application or platform that owns those
controls.

## Security reports

Do not open a public issue for a suspected vulnerability. Follow [SECURITY.md](SECURITY.md), which
defines the private reporting route, scope, severity context, and response expectations.

## Compatibility reports

A compatibility report is actionable when it uses a supported version range and demonstrates the
failure from a public package entry. Private imports, shadow-root applications, multiple kernels on
one live document, unsupported host versions, and attacker-authored expression markup are outside
the supported contract.

## Response expectations

This project does not offer a commercial service-level agreement. The target for ordinary issue
triage is seven calendar days. Security reports follow the shorter acknowledgment window in
`SECURITY.md`. A fix schedule depends on impact, reproducibility, and whether an upstream dependency
owns the defect.
