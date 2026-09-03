# Turbo and htmx interoperability contract

This contract covers the shipped `jquery-star/turbo` preview and the planned `jquery-star/htmx`
plugin. The machine authority is
[`quality/external-bridge-contract.json`](../quality/external-bridge-contract.json).

## Ownership

The host owns requests, forms, redirects, cache, history, head, scroll, focus, indicators, and DOM
mutation. A bridge uses only `jquery-star/core` and `jquery-star/testing` to release outgoing roots
and enhance explicit incoming roots at a documented seam. Private state and observer-based disposal
are off limits.

## Shared lifecycle

The hosts keep separate event maps and share this state machine:

```text
idle -> prepared -> removing -> externally-mutated -> enhancing -> committed
            |            |               |                 |
         canceled      failed          failed            failed
```

`prepared` is correlation only. Cancellable intent destroys nothing. At the mutation seam:

1. Begin one public transaction with exact live preservation roots.
2. Call `beforeRemove()` for each actual removal boundary.
3. Let the host mutate once, then commit explicit incoming roots.
4. Await enhancement and release correlation with one outcome.

A pre-removal failure leaves applications live. Later failures record whether mutation occurred; a
bridge never rolls back the DOM.

## Supported evidence ranges

These ranges constrain bridge inputs. They do not imply support outside the tested host seams.

| Host  | Package           | Approved range    | Tested boundaries | Version source                                                        |
| ----- | ----------------- | ----------------- | ----------------- | --------------------------------------------------------------------- |
| Turbo | `@hotwired/turbo` | `>=8.0.21 <8.1.0` | 8.0.21 and 8.0.23 | Explicit caller value. Turbo has no documented runtime version field. |
| htmx  | `htmx.org`        | `>=2.0.0 <2.1.0`  | 2.0.0 and 2.0.10  | Explicit capability plus read-only `htmx.version`.                    |

Unsupported versions fail before listeners. The manifest pins aliases and digests. Turbo starts at
8.0.21 because [GHSA-qppm-g56g-fpvp](https://github.com/advisories/GHSA-qppm-g56g-fpvp) affects
releases through 8.0.20. A wider range requires new three-browser boundary traces.

## Turbo mapping

Install Turbo and core explicitly, then install one bridge into that document's jQStar kernel:

```ts
import * as Turbo from "@hotwired/turbo";
import $ from "jquery";
import { installStarCore } from "jquery-star/core";
import { createTurboBridge } from "jquery-star/turbo";

const { star } = installStarCore($);
const bridge = star.use(createTurboBridge({ $, Turbo, version: "8.0.23" }));
```

The version must be the exact installed package version. The import and factory call are inert. The
plugin installation registers document-scoped listeners without calling `Turbo.start()` or
`Turbo.visit()`. It rejects missing capabilities, malformed or prerelease versions, versions outside
`>=8.0.21 <8.1.0`, and duplicate installation before listener commit.

The bridge wraps Turbo's pausable `event.detail.render` and calls the host renderer once. It commits
ordinary incoming roots when that renderer finishes. When Turbo must complete a
`data-turbo-permanent` handoff after the callback, the bridge commits on the matching `turbo:render`
or `turbo:frame-render` event. `bridge.whenIdle()` exposes the complete jQStar enhancement barrier.

| Stable ID                  | Host seam                                 | jQStar action                                 | Terminal evidence            |
| -------------------------- | ----------------------------------------- | --------------------------------------------- | ---------------------------- |
| `turbo.document.visit`     | `before-render` callback                  | Remove body children, render, commit roots    | `render`, `load`             |
| `turbo.form.visit`         | Follow-up `before-render`                 | Start after the form request finishes         | `render`, `load`             |
| `turbo.document.restore`   | Each restoration `before-render`          | One transaction per preview or final render   | `render`, `load`             |
| `turbo.frame.replace`      | `before-frame-render` callback            | Remove Frame children and commit its roots    | `frame-render`, `frame-load` |
| `turbo.cache.snapshot`     | `before-cache`                            | No transaction                                | Same event                   |
| `turbo.document.no-render` | 204, empty response, native fallback      | No transaction                                | Fetch or native completion   |
| `turbo.document.canceled`  | Canceled visit or render intent           | No transaction                                | Canceled intent              |
| `turbo.document.error`     | Fetch failure, reload, or `frame-missing` | Leave roots live or fail the open transaction | Host error or reload         |

`turbo:submit-end` and redirected `turbo:before-visit` can reverse order across browsers. Both
precede `turbo:before-render`.

`data-turbo-permanent` requires a connected, contained, same-document old element and one marked ID
match. `data-jqs-preserve` follows the same exact-identity core policy. Focus stays host-owned.
Streams, morph refresh, custom renderers, cross-document Frames, and extensions are unsupported.

`bridge.observations()` returns at most 256 frozen, redacted lifecycle records. `bridge.observe()`
subscribes to new records. `bridge.dispose()` is idempotent, removes the bridge listeners, and fails
any bridge-owned active render without disposing Turbo or the jQStar kernel.

## htmx mapping

One htmx operation deduplicates target and descendant cleanup. An insertion-only swap begins after
`htmx:beforeSwap` confirms `shouldSwap`.

| Stable ID              | Host seam                                     | jQStar action                           | Terminal evidence |
| ---------------------- | --------------------------------------------- | --------------------------------------- | ----------------- |
| `htmx.swap.inner`      | `beforeSwap`, cleanup, `afterSwap`            | Remove children once and commit roots   | `afterSettle`     |
| `htmx.swap.outer`      | Target cleanup, then `afterSwap`              | Remove target and commit replacement    | `afterSettle`     |
| `htmx.swap.delete`     | Target cleanup                                | Remove target and commit no roots       | `afterRequest`    |
| `htmx.swap.adjacent`   | Confirmed `beforeSwap`, then `afterSwap`      | Insert without outgoing removal         | `afterSettle`     |
| `htmx.swap.oob`        | `oobBeforeSwap`, then `oobAfterSwap`          | One operation per disjoint OOB boundary | `afterSettle`     |
| `htmx.document.boost`  | Boosted standard swap                         | Replace body target and commit          | `afterSettle`     |
| `htmx.history.restore` | Cache source and restoration swap             | Keep restore distinct from requests     | `historyRestore`  |
| `htmx.swap.none`       | Canceled swap, 204, or `hx-swap="none"`       | No transaction                          | `afterRequest`    |
| `htmx.request.error`   | Response, network, timeout, abort, swap error | Leave roots live or fail open operation | Host error event  |

The tested releases place `afterRequest` before `afterSettle`. Delete has no `afterSwap` or
`afterSettle`. `hx-swap="none"` can emit `afterSwap` without mutation.

`hx-preserve` uses the same identity checks. Focus stays host-owned. Custom swaps, View Transitions,
cross-document or shadow targets, and script guarantees are out of scope.

## Exact-once, observation, and coexistence rules

Disjoint boundaries use distinct operation IDs. Active overlapping boundaries reject before begin.
Cleanup is idempotent and deepest first. Commit, failure, cancellation, and disposal are terminal.

Observations contain sequence, operation ID, host/version/flow, boundary, phase, outcome, and
removal count. They exclude URLs, form/network data, HTML, errors, DOM, state, signals, and history
values.

| Surface                             | Required result across a host render                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| Behavior and declarative roots      | Actual outgoing roots release once. Explicit incoming roots enhance once.                |
| Generic JSON/HTML and Datastar      | Existing ownership and official SDK protocol remain independent of the host bridge.      |
| UI document services                | Controllers clean before removal. Surviving services remain singletons.                  |
| Native forms and controls           | Host validation, serialization, submitter, redirect, and focus behavior remain intact.   |
| jQuery handlers and preserved state | Approved live nodes retain identity, handlers, state, effects, and values.               |
| Operation observations              | One render ID covers each real mutation and ends in one redacted outcome.                |
| Disposal                            | Plugin listeners and active operations release idempotently without changing host state. |

Ticket 0036 reruns this matrix for the shipped Turbo preview. Ticket 0037 must do the same before an
htmx bridge ships.

## Evidence and updates

The same-origin fixture serves exact aliases. Its three-browser suite covers the mapped flows,
history, cache, preservation, cancellation, failures, forms, repeat visits, focus, and no-JavaScript
fallback. Assertions use semantic order and DOM identity, not timing or private host data.

Host records contain event, phase, outcome, host/version, bounded target/focus keys, a stable-ID
hash, history length, and owned/preserved-root counts. They omit HTML, URLs, forms, headers, bodies,
DOM objects, and state. The server separately verifies submitters, disabled controls, and multipart
files.

Before changing a mapping, review Turbo's [events](https://turbo.hotwired.dev/reference/events),
[Drive](https://turbo.hotwired.dev/handbook/drive), and
[Frames](https://turbo.hotwired.dev/handbook/frames), plus htmx's
[events](https://htmx.org/events/), [swap](https://htmx.org/attributes/hx-swap/), and
[preservation](https://htmx.org/attributes/hx-preserve/). Update the manifest, schema, aliases,
tests, guide, and downstream tickets together.
