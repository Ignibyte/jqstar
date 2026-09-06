# Package diagnostics and configuration upgrades

Use the installed `jqstar` executable to check package compatibility before changing an application.
The ordinary `jqstar doctor` command still checks the source registry. Package checks are explicit:

```sh
jqstar doctor --packages --cwd .
jqstar doctor --packages --cwd . --json
jqstar doctor --packages --cwd . --entrypoint jquery-star/core --format esm
```

`--entrypoint` can be repeated up to 32 times. Formats are `esm` (default), `commonjs`, `umd`, and
`css`. These arguments describe intended imports; doctor does not discover imports from source.
`--quiet` suppresses output and preserves the exit status. It cannot be combined with `--json`.

## Evidence and exit status

Package mode reads manifests, recognized lockfiles, installed package metadata, and optional jQStar
configuration under the selected project root. It makes no network calls and launches no processes.
It does not run package managers, lifecycle scripts, configuration modules, application JavaScript,
or Yarn PnP hooks. Nothing is written by package checks or upgrade planning.

| Exit | Meaning                                                                                |
| ---- | -------------------------------------------------------------------------------------- |
| 0    | No error diagnostic. Warnings and unknown or incomplete evidence can still be present. |
| 1    | At least one supported compatibility error.                                            |
| 2    | Invalid usage, unsafe path, malformed/unreadable required input, or failed operation.  |

CI that requires a complete scan must also require `complete: true` in JSON. A zero exit code alone
does not prove runtime compatibility. Reports use `jqstar-doctor-report/1` in
[doctor.schema.json](../schema/doctor.schema.json). Diagnostics have stable codes, severity,
evidence kind, relative path, bounded observed/expected values, documentation URL, and correction.
The schema also defines configuration plans, results, journals, ownership assertions, and Migrate
summaries.

Installed metadata takes precedence over a selected lockfile resolution. Doctor resolves nearest
workspace/hoisted packages, pnpm store aliases, npm package locations, pnpm importers, and Yarn
dependency selectors. A separate transitive jQuery 3 copy produces a duplication warning; it does
not make an application resolving jQuery 4 incompatible. Detected peer mismatches remain errors.
Installed names, versions, exports, and artifact file existence are checked; package metadata cannot
authenticate downloaded bytes or prove that a module executes successfully.

Supported metadata formats are npm package-lock versions 2 and 3, pnpm lockfile 9.0, Yarn Classic
lockfile v1, and modern Yarn metadata versions 4 through 8. Workspace patterns accept literal path
segments and single `*` directory segments. Unsupported formats, patterns, dependency protocols, or
unresolved packages produce unknown evidence. Parent workspaces outside `--cwd` are never searched.
Select the workspace root when applications use dependencies hoisted above their own directory.

CDN scripts, import maps, generated bundles, runtime globals, and dynamically installed plugins
remain unknown. An optional package manifest field `jqstar.pluginApiVersion` can declare a semantic
version range for the plugin registrar. Doctor checks that assertion without importing the plugin.
Absence of that field is not proof of compatibility. See [compatibility](COMPATIBILITY.md) for Node,
jQuery, module formats, and the supported Turbo/htmx ranges. An npm version warning concerns release
construction; doctor does not impose npm on applications using another package manager.

The package ships dated [offline rules](../bin/doctor/compatibility.json). Their support and export
facts are checked against the repository release contract, and their ecosystem authority is bound to
its reviewed digest. Rules past their review date emit `JQS_RULES_EXPIRED`; doctor never fetches
replacement rules. Update the installed package after reviewing its release notes.

## Bounds and privacy

If the installed rules cannot be loaded, JSON reports `JQS_INTERNAL_ERROR`, exit 2, and null
`version`/`rulesReviewedAt` values instead of inventing package or rule-review facts.

One scan allows 2 MiB per metadata file, 16 MiB total, 256 workspace manifests, 4,096 normalized
package evidence records, and 1,024 diagnostics. Repeated evidence from manifest, lockfile, and disk
counts separately. pnpm importer declarations are also bounded to 256 importers and 4,096 dependency
records. Directory traversal allows at most eight workspace segments, 32,768 directory entries,
4,096 distinct package directories, and a queue of 8,192 directories. JSON/YAML data is limited to
32 levels and 200,000 visited values; YAML aliases and custom tags are refused. Public scalar fields
are at most 256 characters. Files must contain valid UTF-8.

The ten-second scan deadline is checked between bounded operations. It cannot interrupt a stalled
operating-system filesystem call or synchronous parser already in progress. A reached scan limit
sets `complete: false` and emits `JQS_SCAN_TRUNCATED`. No CLI option increases these limits.

Reports omit configuration values, credentials, raw parser errors, source text, and individual
Migrate warning messages. They retain package names, versions, and relative metadata paths. Plans
and migration results also identify the absolute project root; review them before sharing.

## Plan, apply, and rollback

The only supported migration adds or replaces `configVersion` with `1` in `jquery-star.json`.
Unversioned configuration and explicit version `0` are legacy schema 0. Existing valid fields keep
their values. Version 1 remains readable by the existing registry commands. Unknown versions or
fields are refused rather than removed. Application source, copied recipes, package manifests,
lockfiles, and third-party configuration are outside the migration target.

```sh
jqstar doctor --upgrade-config --cwd . --json > upgrade-plan.json
# Review the plan before applying it.
jqstar doctor --apply upgrade-plan.json --cwd . --json
```

`--upgrade-config` is always a dry run; optional `--dry-run` makes that intent explicit. The command
prints a plan but creates no files itself. Shell redirection in the example saves the reviewed plan.
Migration commands print JSON by default; `--quiet` suppresses it. Package and migration modes are
mutually exclusive.

A plan binds the root device/inode, fixed target, original byte and canonical-data SHA-256 hashes,
safe file mode, target hashes, and one known operation. Apply recomputes the plan from the current
file. Changed bytes, identity, permissions, or root cause refusal. It exclusively creates a sibling
backup and journal, flushes a temporary file, rechecks identities/hashes, then atomically renames it
over the target. Backups/journals use mode 0600. Target permissions retain only original bits
allowed by 0644. Reapplying the exact migrated content is a no-op and creates no additional files.

The result includes the exact backup and journal paths and a `rollback` argument array. Run that
array with the installed `jqstar` executable; do not join untrusted arguments into a shell command.
For example, use the actual journal filename returned by your plan:

```sh
jqstar doctor --rollback jquery-star.json.jqstar-BEFORE_HASH.journal.json --cwd . --json
```

Rollback checks the journal, backup, known migration, and current hashes before restoring the
original bytes. Changed backups or target content cause refusal. Restoring an already original file
is a no-op. Recovery files remain after success so the owner can retain or remove them deliberately.
The journal contains paths, hashes, schema versions, and operations; the backup contains the full
original configuration and should be protected as carefully as that file.

Failures before replacement preserve the original. Failures after replacement retain recovery
metadata and identify recovery paths in JSON. Partial backup/journal creation can leave incomplete
recovery files; inspect their hashes and the current configuration before retrying. Never delete a
backup merely because the command failed. A prepared journal does not imply replacement succeeded.

Apply and rollback reject symlink targets and non-regular files and use an exclusive sibling lock.
Cooperating doctor processes cannot write concurrently. SIGINT, SIGTERM, and SIGHUP trigger checked
cleanup; forced termination or power loss can leave a lock or temporary file. Confirm the recorded
process has stopped and inspect recovery files before removing an abandoned lock. Parent-directory
identity checks and final target rechecks reduce races, but cannot provide a transaction against an
uncooperative writer with the same filesystem privileges. Keep editors and other writers idle during
migration. Windows has atomic replacement checks but no POSIX directory-flush guarantee.

## Registry ownership assertions

An application may provide `.jqstar-ownership.json` with schema `jqstar-registry-ownership/1`,
package `jquery-star`, the version originally copied, and a `configuration` object containing
`output` and optional `blocksOutput`. Doctor compares those destinations with `jquery-star.json` and
warns on disagreement. Existing `init`/`add` commands do not generate this assertion. It is
application-owned metadata, not a byte-identity inventory or permission to overwrite edited recipes.
A different original package version is allowed because copied source belongs to the application.

## Opt-in jQuery Migrate summaries

Follow the staged, application-owned browser workflow in [jQuery ecosystem](JQUERY_ECOSYSTEM.md)
before collecting a summary. Choose the Migrate version appropriate to that stage, exercise real
application flows, and review each warning in source. Doctor neither injects Migrate nor interprets
warnings as safe automatic rewrites. jQuery UI and Mobile metadata link to their migration guides;
doctor never loads their archived runtimes.

Summarize only category counts in a project-local file:

```json
{
  "schema": "jqstar-migrate-summary/1",
  "jqueryVersion": "4.0.0",
  "migrateVersion": "4.0.2",
  "categories": [{ "category": "event", "count": 3 }]
}
```

```sh
jqstar doctor --packages --cwd . --migrate-summary migrate-summary.json --json
```

Allowed unique categories are `api`, `event`, `selector`, `ajax`, `css`, `data`, and `other`, with
integer counts from zero through 1,000,000. Do not include raw messages, URLs, selectors, or
secrets. Positive counts yield `JQS_MIGRATE_SUMMARY` warnings. User-supplied counts are assertions,
not an independently verified browser result.

## Stable diagnostic codes

The shipped rule registry gives each code its severity, source, correction, and review date.

| Codes                                                                             | Meaning                                                                |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `JQS_NODE_INCOMPATIBLE`, `JQS_TOOLING_RANGE`                                      | Node support or declared npm release-tooling range.                    |
| `JQS_PACKAGE_VERSION`, `JQS_DECLARED_RANGE`                                       | Resolved incompatibility or incompatible declared range.               |
| `JQS_PACKAGE_DUPLICATE`, `JQS_RESOLUTION_DRIFT`                                   | Multiple copies/versions or installed-versus-lock disagreement.        |
| `JQS_PEER_INCOMPATIBLE`, `JQS_PLUGIN_API`                                         | Peer resolution or asserted plugin registrar mismatch.                 |
| `JQS_ENTRYPOINT_USE`, `JQS_ENTRYPOINT_UNAVAILABLE`, `JQS_ENTRYPOINT_DEPRECATED`   | Explicit import intent and format availability.                        |
| `JQS_ARTIFACT_IDENTITY`, `JQS_OWNERSHIP_MISMATCH`                                 | Package metadata/file identity or supplied copy destinations disagree. |
| `JQS_CONFIG_VERSION`, `JQS_CONFIG_UNSUPPORTED`                                    | Known configuration upgrade or unsupported schema version.             |
| `JQS_JQUERY_UI`, `JQS_JQUERY_MOBILE`, `JQS_JQUERY_MIGRATE`, `JQS_MIGRATE_SUMMARY` | Ecosystem metadata and application-supplied warning counts.            |
| `JQS_RUNTIME_UNKNOWN`, `JQS_METADATA_UNKNOWN`                                     | Evidence cannot establish runtime behavior or metadata resolution.     |
| `JQS_RULES_EXPIRED`, `JQS_SCAN_TRUNCATED`                                         | Rules need review or a resource limit stopped the scan.                |
| `JQS_INPUT_INVALID`, `JQS_PATH_UNSAFE`, `JQS_INTERNAL_ERROR`                      | Invalid input, unsafe boundary, or execution failure.                  |
| `JQS_MIGRATION_CONFLICT`, `JQS_MIGRATION_RECOVERY`                                | Migration refused changed state or requires recovery inspection.       |
