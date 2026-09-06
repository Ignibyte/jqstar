# Native navigation decision

Decision: retain ordinary browser navigation and the existing optional Turbo/htmx bridges. No native
navigation slice or new generic utility is approved.

## Frozen comparison contract

The machine contract is [navigation-decision.json](../../quality/navigation-decision.json). It
freezes the application, 28 scenario IDs and their assertions, exact candidates, three-browser
matrix, semantic events, hard gates, weights, demand rules, correction ladder and slice mapping
before measurements. Its normalized contract digest prevents silent changes during measurement. The
actual shared fixture and driver receive a separate source digest before each comparison revision.
An amendment must explain the change and repeat affected comparisons.

The application combines the public documentation site's ordinary pages with the project-editor and
list/detail/search/edit workflows exercised in completed migration tickets 0039 and 0040. It
contains native links/forms/details, nested jQStar roots, a permanent preference root, multipart and
versioned writes, validation/conflict/error documents, an addressable activity region, long-page
anchors, and explicit head/script changes. Every candidate receives the same application HTML,
responses, interaction driver and assertions. A fixture-only context cookie selects its startup
asset. Host configuration is a measured integration cost.

The six candidates are ordinary browser navigation without JavaScript, ordinary documents with
jQStar, Turbo 8.0.21/8.0.23 with the shipped bridge, and htmx 2.0.0/2.0.10 with its shipped bridge.
All use Chromium, Firefox and WebKit. Every enhanced candidate uses the same locally packed and
installed jQStar artifact. The supported host ranges and original integrity values come from the
[interoperability contract](../INTEROPERABILITY.md) and root lockfile. Source aliases and direct
serving of repository distribution files cannot substitute for the installed artifact.

Ordinary browser behavior is the progressive baseline. A full document receives canonical server
state; only an enhanced visit can preserve a live node identity. A region is always a useful full
document without enhancement. These applicability differences are frozen, not concessions made when
a candidate fails. The native collapsible component keeps its `details`/`summary` interaction
without JavaScript. Native document boundaries cover non-HTML/download destinations and changed
head/script policy; the comparison records that integration cost explicitly.

Server evidence contains only fixed route/method categories, status, revision, request/write counts,
and successful-control/file/submitter booleans. Semantic records use fixed event/role categories,
opaque operation identities, bounded timing and counts. They exclude application URLs/query values,
headers/cookies, form/file contents, response HTML, signal values, raw errors and DOM references.
The fixture must not break browser restoration through its own instrumentation.

### Decision rule

Correctness, no write replay, no-JavaScript operation, ownership cleanup, server authority, and
accessible focus/error behavior are hard gates. An eligible candidate is rated from 0 to 5 in each
category; weighted totals have a maximum of 100.

| Category                                      | Weight | Rating anchor                                                                   |
| --------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| Browser semantics and progressive correctness | 25     | Fixed workflow outcomes and explicit fallback boundaries.                       |
| Demonstrated user benefit                     | 20     | Reproduced needs with a source and consequence; hypothetical parity earns zero. |
| Server/HTML authority and backend portability | 15     | Canonical server response, method, version and full-document contracts.         |
| Lifecycle and failure safety                  | 10     | Public removal/enhancement barriers, race handling and disposal evidence.       |
| Accessibility                                 | 10     | Native/keyboard interaction, focus, errors, progress and media-mode results.    |
| Shipped and integration cost                  | 10     | Measured packages/graphs plus markup, configuration and server protocol.        |
| Maintenance, security and upgrade risk        | 10     | Ownership surface, version coupling, testing and uncertain annual support cost. |

A native proposal must identify a concrete unresolved gap in both supported hosts, or a documented
product segment unable to use either. It must show measurable benefit, preserve every hard gate, and
have lower long-term cost than an existing host or a bounded utility. An unbuilt implementation
receives no credit for future behavior. Its engineering estimates remain labeled ranges, not
measured bundle or browser results.

For every gap, try documented host configuration, the current bridge, a host-specific correction,
and then a bounded host-neutral utility in that order. A successful earlier option makes later
options unnecessary; record that reason. A preference or convenience difference is not a defect.
Keep host-default failures and configured results as separate raw records with stable gap IDs.

Sensitivity varies each weight by 25 percent and renormalizes, removes unconfirmed demand, compares
oldest/newest supported versions, and separately excludes forms, regions and prefetch. A separate
same-session evidence review and independent calculation inspect bias, public boundaries,
no-write-replay and missing evidence. This is not another human review.

Documents (0024–0026), forms (0027), regions (0028), and prefetch (0029) receive separate
activation/disposition. A utility needs its own Plan-validated implementation ticket. Unapproved
native exports, types, dependencies, prototypes and public availability claims must remain absent.

### Available demand evidence

On 2026-09-05, a read-only all-state query of `Ignibyte/jqstar` returned zero GitHub issues. The
repository's discussions were disabled, with zero records. This bounds available public repository
evidence; it does not establish what every possible user needs. The working site and completed
migration workflows supply concrete integration needs, but do not themselves justify native
navigation ownership.

### Primary-source inputs

These sources guided configuration hypotheses; the retained browser measurements establish the
scoped outcomes for the exact installed versions.

- [Turbo Drive](https://turbo.hotwired.dev/handbook/drive) and
  [application building guidance](https://turbo.hotwired.dev/handbook/building).
- [htmx boosted links/forms](https://htmx.org/attributes/hx-boost/),
  [history embargo](https://htmx.org/attributes/hx-history/), and
  [request synchronization](https://htmx.org/attributes/hx-sync/).
- [Turbo security advisory](https://github.com/hotwired/turbo/security/advisories/GHSA-qppm-g56g-fpvp),
  which identifies 8.0.21 as the patched version for the documented frame/session-cookie race.

## Results and decision

The manifest indexes lossless raw archives in `quality/evidence/navigation/`. Each reference records
compressed and decoded SHA-256, byte lengths, source/artifact identity and exact row/flow/failure
counts. Canonical validation opens the archive, verifies both digests, validates every raw field and
recomputes its summary. Failed and partial runs remain available. Original run files also remain in
the local immutable measurement directory.

The decisive run is `2026-09-05T23-18-54.986Z-29717`: 30 candidate/configuration/browser rows and
840 flows. All 498 applicable configured flows pass; six no-JavaScript-only exclusions remain
explicit. The 72 host-default failures remain in the same archive. No baseline was replaced with a
configured-host result. The installed artifact is jQStar 1.1.0, SHA-256
`664ce25e7434a0e0bf0d91baa5679848d8d0b9dae94cdba3fec7afd021caf33e`; the shared final fixture digest
is `5dec4403d832234c2888317b13e311770ead2f4e3c40a6c8e06fcfbab4ea37cc`.

A separate Chromium run removes Playwright's back-forward-cache disabling flag and passes all its
applicable history, preservation, cleanup and private-cache cases. Its archive is marked partial
because it covers only four scenarios. The fixture uses `no-store`; this does not establish actual
BFCache restoration or a cache-speed advantage. Browser chrome and manual assistive-technology
behavior are outside the DOM assertions. The ordinary/error documents also receive the normal
three-browser axe checks.

### Observed integration gaps

The manifest records exact run/browser/version/configuration/scenario references for every row
below, plus frequency, severity, consequences and all five correction-ladder dispositions. Host
defaults are valid choices for other applications; a failed fixture requirement is not automatically
an upstream defect.

| Gap        | Observed consequence                                                                                                                                    | Supported resolution                                                                                                                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NAV-GAP-1  | Default Turbo issues an extra document read for the tested local hash link.                                                                             | Use the documented data-turbo=false native boundary on same-document anchors; apply it to incoming bodies through the public before-render hook.                                                                                                                                                               |
| NAV-GAP-2  | Default no-swap status policy leaves the full server error/validation document undisplayed.                                                             | Configure htmx responseHandling to render this application's full error documents, leaving 204 without a swap. Native autofocus/aria error semantics then pass all three engines.                                                                                                                              |
| NAV-GAP-3  | Transport failure or an accepted write with a lost response lacks application-visible recovery under host defaults; some Turbo errors remain unhandled. | Application-owned public transport/submit handlers expose recovery and clear busy state without resending writes. Only the exact previously handled Error object is suppressed. Server revision protection remains mandatory.                                                                                  |
| NAV-GAP-4  | A response lacking the requested activity region cannot silently clear or target unrelated content.                                                     | Turbo frame-missing invokes the public full-document visit on the response; htmx beforeSwap checks the exact region and uses same-origin GET document fallback when absent. Writes never use that fallback.                                                                                                    |
| NAV-GAP-5  | The tested Turbo 204 visit reports an error and does not preserve the required unchanged-document behavior.                                             | The known 204 destination explicitly uses native navigation, which leaves the document unchanged. This is a route policy boundary, not a universal inference from unknown response content.                                                                                                                    |
| NAV-GAP-6  | Default htmx indicator placement does not reveal this application's status region while the request is pending.                                         | Configure hx-indicator=body and the matching visible status CSS; keyboard usability and terminal busy clearing pass.                                                                                                                                                                                           |
| NAV-GAP-7  | Turbo's default hover prefetch performs incidental reads against the application's explicit-intent policy.                                              | Cancel the documented turbo:before-prefetch event with an owned listener. This survives full incoming head replacement.                                                                                                                                                                                        |
| NAV-GAP-8  | Rapid programmatic Back before a completed visit's final native scroll event can overwrite the restored position.                                       | Retain the limitation; the shared driver waits one painted frame after host settlement before its next history intent. Ordinary browser navigation remains the supported option for a product requiring unpainted programmatic history transitions. There is no evidence that both hosts require a new engine. |
| NAV-GAP-9  | htmx 2.0.0's boosted private entry retained the fixed private marker when the history embargo existed only on the outer body.                           | Put hx-history=false on private content that actually swaps, as well as the full-page body. Expanded direct and linked entry, leave and Back pass both versions in all engines without private WebStorage data.                                                                                                |
| NAV-GAP-10 | The original pre-header socket loss let the browser retry an accepted POST; the server revision guard prevented a second commit.                        | Keep server-side version/idempotency protection. The final lost-response test acknowledges response headers before truncation and proves no added client replay at that boundary. No client engine can promise that every underlying transport or user will never retry.                                       |

The current bridges already provide the required public lifecycle ownership. Host configuration and
application-owned public event handlers resolve the tested integration requirements. No generic
utility prototype is needed, and no native engine was built. The rapid programmatic Turbo history
case remains a limitation: the successful workflow waits for a painted frame before the next history
intent. This does not establish correctness for arbitrary unpainted transitions. Browser navigation
and htmx remain available; the frozen rule requires a concrete unresolved gap in both hosts or an
evidenced segment unable to use either.

The initial pre-header write-loss experiment is retained. A browser retried that POST; the server's
revision guard rejected the duplicate and preserved one commit. The final acknowledged-header,
truncated-response case shows that no tested client adds a replay. Server version/idempotency
protection remains necessary. Suppressing the exact Turbo Error already handled by recovery does not
suppress unrelated errors; Firefox's raw handled-rejection `pageerror` count remains separate from
uncaught errors.

### Measured cost and estimated ownership

[The raw cost inventory](../../quality/evidence/navigation-costs.json) includes each installed
file's size/digest, exact host tarball integrity, dependency/license records and uninstrumented
resolved bundle graphs. It matches the decisive fixture and artifact. The isolated dependency audit
found zero known advisories at measurement time; future and undisclosed issues remain unknown.

| Candidate                  | Raw / gzip browser bytes | Host packed / installed bytes | Estimated annual support hours |
| -------------------------- | -----------------------: | ----------------------------: | -----------------------------: |
| Browser without JavaScript |                    0 / 0 |                          None |                           4–12 |
| browser                    |        513,327 / 134,335 |                          None |                          12–36 |
| turbo-8.0.21               |        616,098 / 162,049 |              92,035 / 423,445 |                         40–100 |
| turbo-8.0.23               |        616,098 / 162,050 |              92,094 / 423,646 |                         40–100 |
| htmx-2.0.0                 |        592,177 / 156,549 |             186,207 / 750,251 |                         48–120 |
| htmx-2.0.10                |        594,771 / 157,433 |             213,472 / 883,941 |                         48–120 |
| native-documents           |                  Unbuilt |                       Unknown |                        160–400 |
| native-forms               |                  Unbuilt |                       Unknown |                        120–300 |
| native-regions             |                  Unbuilt |                       Unknown |                         60–160 |
| native-prefetch            |                  Unbuilt |                       Unknown |                        100–260 |

Browser bytes include jQuery, core and UI where JavaScript is enabled; the host adds roughly 22–28
KB gzip to that installed composition. The jQStar package itself is 3,063,823 packed bytes and
10,715,438 installed bytes. Package size includes modules unused by this particular bundle. The
complete dependency inventory keeps jQuery and transitive installation costs separate from unused
comparison aliases. No-JavaScript means zero actual script requests and executions, regardless of an
unused generated research entry.

Annual hours are engineering estimates for two version-review cycles, three-browser regression,
documentation and incident allowance. They are neither observed labor nor support commitments.
Native slices have unknown bytes/dependencies/files and receive no measured behavior credit. Their
estimated initial implementation ranges are documents 320–800 hours, forms 160–400, regions 80–200
and prefetch 120–320, with the latter three incremental to document navigation. The manifest also
records markup, configuration, server protocol, public concepts and source/test/doc paths.

### Rubric and sensitivity

| Candidate                  | Semantics | Benefit | Authority | Lifecycle | Accessibility | Cost | Maintenance | Total |
| -------------------------- | --------: | ------: | --------: | --------: | ------------: | ---: | ----------: | ----: |
| Browser without JavaScript |         5 |       2 |         5 |         5 |             4 |    5 |           5 |    86 |
| browser                    |         5 |       3 |         5 |         5 |             4 |    4 |           4 |    86 |
| turbo-8.0.21               |         4 |       4 |         5 |         4 |             4 |    3 |           3 |    79 |
| turbo-8.0.23               |         4 |       4 |         5 |         4 |             4 |    3 |           3 |    79 |
| htmx-2.0.0                 |         4 |       4 |         5 |         4 |             4 |    3 |           3 |    79 |
| htmx-2.0.10                |         4 |       4 |         5 |         4 |             4 |    3 |           3 |    79 |

Native documents/forms/regions/prefetch are ineligible and have no total. Scores are judgments
against this workflow, not performance measurements or a claim that every application should use the
same host. Benefit is 2 for working native documents/forms, 3 for live local UI, and 4 for added
identity preservation and targeted regions. Ordinary navigation earns 5 for tested semantics and
lifecycle; hosts earn 4 because explicit policy and recovery are required. Accessibility is 4,
reflecting scoped browser/axe evidence without a manual assistive-technology audit. Cost and
maintenance distinguish no script, existing core/UI, and added host/version/configuration ownership.
Unconfirmed demand earns zero.

Run `node scripts/score-navigation-decision.mjs` to reproduce totals, matrix closure, weight sweep,
and scenario exclusions. The 2,187 renormalized combinations of ±25% weights give 891 strict wins
each to the browser/no-JavaScript and browser/jQStar baselines, with 405 ties. Neither a host nor an
unbuilt native candidate wins the weighted comparison. The outcome still permits hosts when an
application values their demonstrated preservation or region behavior.

An independently written Python `itertools.product` calculation, without importing the JavaScript
scorer, reproduces every nominal total, the two 891 counts and 405 ties. Removing all benefit points
as an additional conservative stress gives 78 for no-JavaScript, 74 for browser/jQStar and 63 for
each host. The actual missing-demand case changes nothing because speculative demand already earns
zero. Oldest/newest supported versions have identical configured success and ratings; the older htmx
privacy difference remains recorded.

The independent calculation can be repeated without the JavaScript scorer:

```python
import itertools
import json
from collections import Counter
from pathlib import Path

proof = json.loads(Path("quality/navigation-decision.json").read_text())
weights = proof["contract"]["weights"]
candidates = [row for row in proof["decision"]["scores"] if row["eligible"]]
wins, ties = Counter(), 0
for factors in itertools.product((0.75, 1, 1.25), repeat=len(weights)):
    varied = {key: value * factor for (key, value), factor in zip(weights.items(), factors)}
    totals = {
        row["candidate"]: 20 * sum(row["ratings"][key] * value for key, value in varied.items())
        / sum(varied.values())
        for row in candidates
    }
    best = max(totals.values())
    selected = [name for name, total in totals.items() if abs(total - best) < 1e-9]
    if len(selected) == 1:
        wins[selected[0]] += 1
    else:
        ties += 1
print(dict(wins), ties)
```

Excluding forms (NAV-11–16), regions (NAV-17–18), or prefetch (NAV-27) leaves respectively 390, 462
or 480 passing applicable configured flows. Those exclusions remove optional benefits and costs;
they cannot give an unbuilt engine passing hard gates or create a gap shared by both hosts. No slice
changes its activation decision.

### Supported navigation patterns

Start with useful full HTML documents, native links/forms and server-owned routes. Install one
supported host and its public jQStar bridge only when enhanced visits solve an application need. The
bridge manages outgoing cleanup, exact preservation and incoming enhancement. Host navigation policy
and application recovery remain separate responsibilities.

- **Documents (0024–0026):** keep same-document anchors native when avoiding incidental reads is a
  requirement. Use explicit native boundaries for non-HTML/download, known 204 and changed
  head/script policy. The host owns URL/history/focus/scroll and busy state; a jQStar enhancement
  barrier is not a guarantee that every host scroll observer has completed. Applications that need
  rapid programmatic history transitions must verify that workflow or keep browser navigation.
- **Forms (0027):** preserve action, method, encoding, names, constraints and submitter intent.
  Return complete accessible error documents and 303 after accepted writes. htmx applications
  rendering full error documents configure `responseHandling`; every application shows transport
  recovery. Never automatically resend an uncertain write. Authentication, CSRF, validation,
  versioning and idempotency remain on the server.
- **Regions (0028):** use official-SDK patches for server-driven updates, or explicit host targets.
  Verify exact matching response content before a targeted replacement. Missing read regions fall
  back to useful complete documents through the host's public event/API; writes do not use a GET
  fallback that replays their body. Keep page/region template trust and escaping on the server.
- **Prefetch (0029):** default to no incidental reads. Turbo applications can cancel
  `turbo:before-prefetch`; htmx has no prefetch extension in this comparison. Server HTTP cache
  policy and host snapshot caches both need attention. Put htmx's `hx-history="false"` on private
  content that swaps, as well as the outer page, and use Turbo's documented no-cache metadata. Test
  direct entry, enhanced entry, leaving, Back and storage; a `no-store` header alone is not a
  blanket policy for a host's DOM snapshot cache.

The [public interoperability guide](../INTEROPERABILITY.md) provides installation and ownership
contracts. [Research host hooks](../../test/fixtures/navigation-decision/host-corrections.js) show
the measured application policies, with owned listeners and exact-error identity handling. They are
not a package API or a drop-in navigation service. No `jquery-star/navigation` entry, native runtime
source, public type, dependency or prototype ships.

### Dispositions, review and reopening

Tickets 0024, 0025 and 0026 are declined as a document chain. Forms 0027, regions 0028 and prefetch
0029 are separately declined with the contracts above. No utility ticket is activated. This closes
the navigation decision without adding a client router or duplicating server routes.

A separate same-session review inspected the immutable evidence, identical workflow, public-only
hooks, redaction, no-write-replay boundary, head/region policy, ownership, costs and rubric bias. It
retained and corrected the hidden private-entry path, premature error counting and driver timing
assumptions. This is not a second person or agent review. Focused regression tests reject altered
scores, incomplete matrices, invalid archives, secret fields, missing cost provenance and dangling
gap references. Package and import guards exclude research code and unapproved navigation exports.

Reopen only with a reproduced gap in both supported hosts or a documented excluded product segment,
a measured recurring need for a bounded utility, a material supported-version/security change, or a
native slice that passes all hard gates and demonstrates benefit at lower long-term cost. New
utility or native implementation requires a new decision and Plan validation. Production latency,
manual screen-reader behavior, other cache policies and future upstream releases remain unknown.
