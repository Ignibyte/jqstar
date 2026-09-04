# Changelog

This file records user-visible package changes. A version marked Unreleased is not an npm, git tag,
or GitHub release claim.

## 1.0.0 - Unreleased

### Stable package surface

- Stabilize the root, core, UI, Datastar, CSP, testing, Datastar testing, Turbo, htmx, and UI CSS
  package entries.
- Keep the root auto-installing composition compatible with the executable 0.1 baseline.
- Derive runtime, facade, declaration, website, registry, and report version values from
  `package.json`.
- Keep `STAR_PLUGIN_API_VERSION` at `0.1.0` and the CSP grammar at `jqstar-csp-expression/1`.

### Runtime and extensions

- Add one document kernel with transactional application setup, exact cleanup, terminal disposal,
  and public operation observations.
- Add transactional plugins, directives, helpers, application hooks, request middleware, protocol
  profiles, render adapters, and owned resource tracking.
- Add side-effect-free modular installers and isolated declarations.
- Add the finite CSP expression entry while retaining trusted JavaScript in the compatibility root.
- Add explicit Turbo and htmx lifecycle bridges with bounded supported ranges.

### UI and server-rendered applications

- Complete the native HTML component registry and server-driven Project Browser/Data Table.
- Preserve `data-jqs` roots, `data-part` slots, documented state attributes, native links and forms,
  and server ownership of routes and validation.
- Add the self-hosted multi-page jQStar website, Component Lab, agent corpus, and optional read-only
  WebMCP tools.

### Package and testing

- Add installed-tarball consumers for ESM, CommonJS, TypeScript, QUnit, browser modules, UMD,
  external plugins, registry copies, CSP, testing, Turbo, htmx, and self-hosting.
- Add reproducible dual builds, package/API/type/size checks, SBOM and license evidence, browser and
  accessibility matrices, coverage and property tests, and evidence-bound quality receipts.
- Add a candidate handoff that prepares hashes and publication commands without tagging or
  publishing.
- Keep contributor research and the detailed CSP threat-model worksheet in the source repository
  while shipping the user-facing security, CSP, compatibility, migration, and release guides.

### Security

- Publish the trusted-markup boundary and finite CSP grammar/threat model.
- Keep credentials, environment values, response data, DOM/state graphs, and private paths out of
  diagnostics and release receipts.
- Require the official Datastar SDK for server event generation.
- Exclude jQuery UI, jQuery Mobile, Turbo, htmx, QUnit, and standalone Sizzle from runtime bundle
  graphs unless their documented package boundary requires them.

### Migration

- Publish [the 0.1-to-1.0 guide](MIGRATING_TO_1.md).
- Publish tested jQuery UI coexistence and semantic component migration without a Widget Factory
  adapter or runtime fork.
- Publish route-by-route jQuery Mobile migration without reviving its page framework, Ajax router,
  virtual controls, theme, or runtime.
- Keep jQStar independent from jQuery and the OpenJS Foundation. This release makes no official
  successor claim.

### Compatibility and known limits

- Require Node `>=24` for Node tools and the server, npm `>=11` for release construction, and
  application-owned `jquery >=4.0.0 <5`.
- Test Chromium, Firefox, and WebKit through the locked Playwright release.
- Support ordinary HTML documents and explicit same-origin frame documents. Shadow-root applications
  remain unsupported.
- Shared stores, persistence, resources, native navigation, inspection, DevTools, and upgrade
  diagnostics remain post-1.0 work and are absent from stable exports.

### Attribution

jQStar uses jQuery, Idiomorph, JSON5, and the Star Federation Datastar SDK at runtime. The release
SBOM and license inventory record exact dependency versions and licenses. Browser, type, static,
accessibility, and test evidence is produced by the tools locked in `package-lock.json`.

## 0.1.0 - Baseline

- Establish the auto-installing jQuery root, declarative signals and expressions, backend actions,
  JSON/HTML/Datastar responses, DOM patching, UI API, registry CLI, and executable public baseline.
