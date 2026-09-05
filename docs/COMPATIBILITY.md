# Compatibility policy

jQStar 1.x stabilizes the package surfaces listed here. The executable authority is
`quality/release-contract.json`; this page explains that contract for package users.

## Package names and versions

- The public product name is jQStar.
- The npm package is `jquery-star`.
- The command is `jqstar`.
- Component roots use `data-jqs`.
- `$` is the application-owned jQuery instance. `$name` is the reactive signal named `name`.
- `$.star.version`, modular plugin facades, package metadata, declarations, and built artifacts use
  the package version. For this candidate that value is `1.1.0`.
- `STAR_PLUGIN_API_VERSION` remains `0.1.0`. It versions the plugin registrar contract, not the npm
  package.
- The finite CSP grammar remains `jqstar-csp-expression/1`. Grammar changes require their own
  compatibility review.

## Stable package entries

| Import                         | Formats            | Installation and ownership                                            |
| ------------------------------ | ------------------ | --------------------------------------------------------------------- |
| `jquery-star`                  | ESM, CommonJS, UMD | Automatically composes core, Datastar, and UI on the imported jQuery. |
| `jquery-star/core`             | ESM, CommonJS      | Explicit, side-effect-free core installer.                            |
| `jquery-star/ui`               | ESM, CommonJS      | Explicit UI plugin and component API.                                 |
| `jquery-star/datastar`         | ESM, CommonJS      | Explicit official Datastar protocol plugin.                           |
| `jquery-star/csp`              | ESM, CommonJS      | Explicit finite-expression engine and installer.                      |
| `jquery-star/testing`          | ESM, CommonJS      | Runner-neutral core and plugin conformance tools.                     |
| `jquery-star/datastar/testing` | ESM, CommonJS      | Official-SDK Datastar test fixtures.                                  |
| `jquery-star/turbo`            | ESM, CommonJS      | Explicit Turbo lifecycle bridge.                                      |
| `jquery-star/htmx`             | ESM, CommonJS      | Explicit htmx lifecycle bridge.                                       |
| `jquery-star/stores`           | ESM, CommonJS      | Explicit per-kernel shared reactive stores plugin.                    |
| `jquery-star/ui.css`           | CSS                | Explicit compiled component theme.                                    |

Only the root entry installs at import time and publishes the `jQueryStar` UMD global. Modular
entries do no document work until their installer or factory is called. Private source paths and
undeclared package subpaths are unsupported.

## Runtime environments

| Boundary             | Supported contract                                                                    |
| -------------------- | ------------------------------------------------------------------------------------- |
| Node and CLI         | Node `>=24`; release construction uses npm `>=11`.                                    |
| jQuery               | Application-owned `jquery >=4.0.0 <5`.                                                |
| Browsers             | The Chromium, Firefox, and WebKit engines installed by the locked Playwright version. |
| Documents            | Ordinary HTML documents and explicitly supplied same-origin frame documents.          |
| Unsupported document | Shadow-root applications.                                                             |
| Module systems       | Browser modules, Node ESM, CommonJS, and root UMD/no-build use.                       |
| Turbo                | `@hotwired/turbo >=8.0.21 <8.1.0`, injected explicitly.                               |
| htmx                 | `htmx.org >=2.0.0 <2.1.0`, injected explicitly.                                       |

Browser support is tied to executed engine builds rather than a guessed browser-brand range. Each
release candidate records the exact three engine versions that passed. Applications remain
responsible for any older browser policy they choose to carry.

## Document and lifecycle compatibility

One live kernel owns one `Document` and one canonical jQuery instance. A second kernel or another
package copy cannot claim that live document. Separate same-origin frame documents can own separate
kernels. `$.star.dispose()` releases the document claim and all tracked runtime resources, even when
cleanup reports failures.

Server-rendered HTML remains the authority. jQStar enhances `data-jqs` roots and can consume JSON,
HTML, or Datastar SDK event streams. It does not define application routes, authentication,
authorization, CSRF policy, or persistence.

## Expression compatibility

The root package keeps trusted JavaScript expressions for 0.1 compatibility and therefore needs a
page policy that allows its trusted compiler. `jquery-star/csp` is an explicit finite alternative.
It accepts only the documented grammar, capabilities, limits, and branded action/helper results. It
does not turn attacker-authored markup into safe input. See [CSP_EXPRESSIONS.md](CSP_EXPRESSIONS.md)
and the repository's
[CSP threat model](https://github.com/Ignibyte/jqstar/blob/main/docs/security/CSP_THREAT_MODEL.md).

## Deprecation and breaking changes

Version 1.1 has no deprecated package entry, plugin API member, directive, action, component method,
or stable error code. The root 0.1 behavior recorded in `quality/public-baseline.json` remains the
compatibility baseline. The modular entries that carried a `0.4-preview` label are stable in 1.0;
`jquery-star/stores` is stable in 1.1.

A future removal from a stable 1.x surface requires a documented replacement and at least one minor
release of deprecation unless a security issue makes continued support unsafe. Security removals
must be called out in the changelog, security advisory, and migration instructions.

## Features outside 1.1

Persistence, native resources and mutations, native navigation and regions, prefetching, inspection,
an in-page DevTools UI, and package-upgrade diagnostics are not 1.1 package entries. Their planned
tickets do not block 1.1 and must not appear in stable bundle graphs. Shared stores are
client-visible coordination state only; see [STORES.md](STORES.md).

## Verification

The release candidate must pass both commands against one unchanged committed tree:

```sh
npm run quality:full-audit
npm run check
```

The package and release gates install the generated tarball into ESM, CommonJS, TypeScript, QUnit,
browser-module, UMD/no-build, CLI/registry, CSP, testing, Turbo, htmx, and self-hosted consumers.
The candidate receipt records the exact artifact hashes and report hashes.
