# Release process

This document prepares a jQStar release candidate. It does not authorize a tag, npm publication,
GitHub release, signature, provenance publication, or announcement. Each external write requires a
separate explicit approval after the candidate receipt passes.

The executable authority is `quality/release-contract.json`. Candidate evidence is written beneath
`.git/jqstar/releases/1.0.0/` and is not committed into the source tree.

## Required source state

The candidate command refuses to proceed unless all of these are true:

- the branch is `feat/stable-platform-release`
- `package.json` and the lockfile report `1.0.0`
- the source is committed and the working tree is clean
- the checkout is not shallow
- submodules, if any, are at committed revisions
- no ignored production input is present
- `v1.0.0` does not already exist locally
- Node is at least 24 and npm is at least 11

The command records the commit, tree, commit timestamp, contract/package/lock hashes, tool versions,
and names of allowlisted environment variables. It never records environment values or credentials.

## Candidate stages

`prepare` creates two fresh local clones at the exact commit, runs locked installs, builds the full
self-hosted package twice with the commit timestamp as `SOURCE_DATE_EPOCH`, and packs each clone. It
requires byte-identical tarballs and identical normalized path, mode, size, and SHA-256 manifests.
It records SHA-256, SHA-512, npm integrity, npm shasum, the website archive, SBOM, license
inventory, and production dependency audit.

`prove` reads passing full-audit and delivery reports for the unchanged tree. It requires the exact
gate sequences from the release contract, verifies report hashes, and binds the installed package
consumer report and security evidence to the prepared tarball.

`handoff` validates the complete candidate schema, writes the immutable receipt, and prints the
read-only verification commands and separately labeled approval-required commands. It executes no
publication command.

The final sequence is:

```sh
npm run release:prepare
npm run quality:full-audit
npm run check
npm run release:prove -- --full-audit <full-report> --delivery <delivery-report>
npm run release:handoff
```

`npm run release:candidate` performs the same stages in order after the ticket and release documents
have been finalized and committed.

## Read-only verification

The handoff substitutes the exact commit and artifact digest into these checks:

```sh
git show --no-patch --format=fuller <candidate-commit>
git rev-parse <candidate-commit>^{tree}
shasum -a 256 <candidate-tarball>
shasum -a 512 <candidate-tarball>
tar -xOf <candidate-tarball> package/package.json
npm view jquery-star@1.0.0 --json
gh release view v1.0.0 --json tagName,targetCommitish,isDraft,isPrerelease,url
```

The two network reads are expected to fail before publication because neither npm version nor GitHub
release should exist. After an authorized publication, repeat them and compare registry integrity,
tag target, release state, and package metadata with the candidate receipt.

## Approval-required writes

Never copy this block into automation that prepares or proves a candidate. After separate approval,
replace `<candidate-commit>` and `<candidate-tarball>` only with values printed by the receipt:

```sh
git tag -a v1.0.0 <candidate-commit> -m "jQStar 1.0.0"
git push origin v1.0.0
npm publish ./<candidate-tarball> --access public --tag latest --provenance
gh release create v1.0.0 ./<candidate-tarball> --verify-tag --title "jQStar 1.0.0" --notes-file CHANGELOG.md
```

The npm CLI accepts a tarball as the publish subject, records SHA-1 and SHA-512 integrity, and uses
`latest` as the default tag. The explicit flags make the intended public state reviewable. GitHub
CLI's `--verify-tag` prevents release creation from silently creating a tag.

References:

- [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/)
- [npm deprecate](https://docs.npmjs.com/cli/v11/commands/npm-deprecate/)
- [GitHub CLI release creation](https://cli.github.com/manual/gh_release_create)

## Post-publication checks

1. Fetch the remote tag and confirm it resolves to the candidate commit and tree.
2. Read `npm view jquery-star@1.0.0 dist --json` and compare `shasum` and `integrity`.
3. Install `jquery-star@1.0.0` into an empty directory with jQuery 4 and run the root ESM smoke
   test.
4. Download the GitHub release asset and compare both hashes with the receipt.
5. Open the public website, component docs, migration guides, `llms.txt`, and agent index.
6. Confirm no candidate command changed the source tree.

## Withdrawal and deprecation

Do not unpublish by default. npm recommends deprecation because it keeps existing dependency graphs
installable while displaying a warning. Any rollback is another external write and needs explicit
approval.

For a defective 1.0.0 release:

```sh
npm deprecate jquery-star@1.0.0 "Do not install this release: <reason and safe version>."
npm dist-tag add jquery-star@<safe-version> latest
gh release edit v1.0.0 --draft
```

If GitHub release immutability is enabled, the release or tag may not be editable after publication.
Publish a corrective release and security notice instead. Never reuse the `jquery-star@1.0.0`
name/version pair, even if a registry operation removes it.

Record the reason, affected range, safe replacement, advisory link, registry state, tag/release
state, and verification output in the incident or follow-up ticket.
