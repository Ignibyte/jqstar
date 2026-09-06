# In-page DevTools decision

Ticket 0031 retains the public inspection API and declines an official `jquery-star/devtools` UI.
Two controlled investigations of packaged registry applications resolved their questions with
bounded snapshots and traces. Neither established an unmet visual need that justified a maintained
overlay. No DevTools entrypoint, controller, stylesheet, shortcut, or dependency ships.

## Evidence and limits

The investigations used the actual Project Browser and Audit Log markup and application code copied
from a locally packed `jquery-star@1.1.0` candidate. Vite resolved root and inspection imports from
the installed tarball, with no repository runtime imports. Both investigations passed in Chromium,
Firefox, and WebKit. Each used four public inspection reads and ended with zero failed or remaining
kernel resources. The public schema's default disclosure policy remained active.

These are controlled developer investigations with deliberately seeded integration faults. They are
not an independent user study, a production incident sample, a usability benchmark, or manual
assistive-technology evidence. The recorded milliseconds measure automated scenario execution,
including browser scheduling and local requests. Operator preparation and analysis time were not
measured and cannot be inferred from those durations.

The raw record is `quality/inspection-decision.json`. It includes six complete scenario results,
browser versions, package digest, public snapshots/traces, fixture digests, import graphs, and
package-absence checks. Reproduce after a current build:

```sh
npm run build:self-hosted
npm run research:inspection:measure
```

The default command writes an out-of-tree report under `.git/jqstar/inspection-investigations/`.
Pass `-- --record` only when deliberately refreshing the reviewed source record. The contract test
validates the saved documents against the published inspection schema and checks the fixture hashes.
Package quality independently rejects a DevTools export or packed implementation.

## Application investigations

| Application     | Question and seeded integration fault                                                                                | Public evidence                                                                                                               | Resolution                                                                                                                                                                | Visual interaction considered                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project Browser | Why does an outgoing workspace remain owned after its replacement appears? The old root was hidden without disposal. | Initial, hidden, corrected, and terminal snapshots; ordinary DOM inspection confirms the old root is connected and hidden.    | Hiding adds no cleanup. A public render transaction removes the outgoing roots; the replacement remains active and mutable.                                               | A before/after application-count comparison could save manual comparison. Opaque owner IDs still require application/DOM context; an overlay cannot infer withheld selectors or names. |
| Audit Log       | Is a failed refresh caused by missing registration or a backend failure? The local backend first returns HTTP 503.   | Initial snapshot, correlated action/request failure trace with status 503, corrected completion trace, and terminal snapshot. | The action executed and issued a request. Correcting the backend response to an official SDK signal patch clears error/loading and updates the visible application state. | Filtering by kind/outcome and selecting a request's parent action could save array filtering. This investigation required only one failed and one successful request.                  |

Each investigation needed four read calls. Project Browser needed a count comparison and normal DOM
context. Audit Log needed two record filters and a parent-ID lookup. The fixture automates those
steps for reproducibility; it does not show that every user will find them easy. No repeated
high-volume investigation or unresolved diagnosis was observed.

## Decision gate and costs

The activation rule recorded before the investigations requires an unresolved diagnosis or repeated
material friction, a named visual interaction that can resolve it through the existing schema, and
acceptable bundle, maintenance, and accessibility cost. The scored gate below counts only
demonstrated findings, not speculative UI benefits. All four findings are required to approve a UI.

| Required finding                                                                   | Score | Evidence                                                                                      |
| ---------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------- |
| An unresolved diagnosis or repeated material inspection friction                   | 0/1   | Both controlled questions resolved; repeated operator friction was not measured.              |
| A visual interaction shown to materially improve that unmet need                   | 0/1   | Count comparison and trace filtering are plausible conveniences, with no measured unmet need. |
| Public-schema implementation with measured acceptable bundle and lifecycle cost    | 0/1   | No UI was built or measured. Public data is sufficient for these diagnoses.                   |
| Accepted keyboard, focus, rendering bounds, redaction, and accessibility ownership | 0/1   | Those UI obligations remain unimplemented and unverified.                                     |

The result is **0/4: no-go**. This is a scored approval gate, not a claim that an unbuilt tool has
zero usability value. Recording the unmet-need result as zero is sufficient to decline; building an
overlay to obtain the remaining scores would bypass the conditional activation gate.

| Alternative                                         | Diagnostic evidence                                                         | Incremental bundle cost                                                        | Maintenance and accessibility cost                                                                                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public snapshots/traces with ordinary browser tools | Both questions resolved in all three engines.                               | No additional library UI or dependency. Inspector remains explicitly imported. | Existing inspection schema/lease contract; browser tooling owns its interface.                                                                                             |
| Application-owned small view                        | Can consume the same public data; no view was implemented or measured here. | Unknown until an application builds and measures it.                           | Application owns markup, bounds, disclosure, focus, and cleanup.                                                                                                           |
| Official in-page UI                                 | Unbuilt; no demonstrated improvement over the supported workflow.           | Unknown, not zero.                                                             | Library would own overlay containment, virtualization, keyboard/focus, copy/export redaction, lease disposal, responsive behavior, and accessibility across three engines. |

## Supported workflow and reopening

Attach the inspector explicitly to the installed kernel. Compare snapshots before and after a
lifecycle operation. For an operation failure, enable a bounded trace, reproduce once, filter by
kind/outcome, and join request `parentId` to action `id`. Use browser DOM/network tools for context
the inspection schema intentionally withholds. Clear or disable tracing and dispose the lease when
finished. See [the inspection guide](../INSPECTION.md).

Reopen 0031 with a new decision record when distinct application investigations show repeated
material friction or an unresolved diagnosis, identify a visual interaction that helps without
expanding disclosure, and provide measured UI cost plus a credible accessibility/ownership plan. New
demand may justify a tool. These six executions establish only the narrower current decision.
