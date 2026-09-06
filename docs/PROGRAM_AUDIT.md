# Program audit evidence

Ticket [0033](tickets/0033-audit-full-library-program.md) is in progress. No complete program-audit
verdict exists yet. Ticket 0053 remains a separately authorized future mutation audit.

Run `node scripts/program-audit/inventory.mjs` to create a review inventory under
`.git/jqstar/program-audit/inventories/<digest>/`. The command records all 53 tickets, validates the
51 terminal prerequisites, and derives their criteria plus the expansion plan's criteria. It also
captures authored Markdown and HTML units from the exact public, project-brain, website, and API
source list in `quality/program-audit/inputs.json`. New or missing input files require explicit
review of that list.

The inventory is a planning artifact. Every extracted claim candidate starts unreviewed. Prose,
examples, headings, and declarations require semantic review to identify every promise and its
evidence. Extraction does not prove that the promises are complete or supported. A workspace with
uncommitted changes can produce this inventory, but it cannot provide the final immutable release
manifest. Repeating the same inventory refuses to overwrite its previous files.

Evidence adapters in `scripts/program-audit/` check named executed unit assertions, browser tests,
generated properties, static gates, installed-package checks, and exact source excerpts. They reject
missing or duplicate selectors, required skips, browser retries, expected failures, stale source
identities, different toolchains, and execution outside the frozen audit interval. A green aggregate
result cannot replace a named executed assertion.

`createReportLoader()` verifies report byte counts and SHA-256 digests against explicit references,
then validates the JSON against schema bytes identified by the frozen input inventory. It returns
immutable data. Eight report kinds use existing producer schemas; internal Vitest and Playwright
schemas validate the upstream fields consumed by the adapters. A valid schema does not mean tests
passed: named execution checks still reject unsuccessful or incomplete runs. Connecting the loader
to the final immutable manifest, execution index, and reviewed mappings remains unfinished.

Browser selectors may use a unique spec title or a JSON array containing every parent suite title
followed by the spec title. The latter distinguishes equal titles in separate groups. Missing or
duplicate matches fail. All selectors are literal strings, including embedded asterisks; they never
expand patterns. Empty selectors and a bare wildcard are rejected.

Evidence files must be bounded regular UTF-8 files beneath the selected root. The reader refuses
symbolic links, traversal, changed files, and digest mismatches. Snapshots use exclusive creation,
deterministic JSON, and read-only file permissions. Their digests detect later changes. File modes
are protection against accidental editing, not a guarantee against a user who controls the
filesystem. The reader is not a sandbox against another privileged process changing ancestor
directories concurrently.

Both real [assistive-technology charters](accessibility/RELEASE_CHARTERS.md) remain required for the
final candidate. Records must identify the exact tarball, commit, quality receipt, supported tool
versions, tester, date, profile, and observations for every step. VoiceOver records include the
Quick Nav setting for each step. The validator checks completeness and identity. It cannot prove
that a person performed the test. Synthetic test records and automated accessibility checks do not
count as manual evidence.

The final audit still needs reviewed mappings for every requirement and public claim, a clean source
freeze, both complete quality modes, verified current subordinate reports, declined-feature decision
and absence proof, and the two manual records. The inventory command does not build, publish, change
tickets, or execute mutation tooling.
