# jQuery Star agent guide

Read [docs/README.md](docs/README.md) before changing this repository. It is the project brain and
links to architecture, backend, development, and testing contracts.

All product changes use the ticket workflow in [docs/tickets/README.md](docs/tickets/README.md):
Plan → Code → Test → Document. Create or update the ticket before changing behavior. Keep its
acceptance criteria, changed-file ledger, commands, and evidence current.

Preserve these boundaries:

- `$` is real jQuery and `$name` is a reactive signal.
- UI uses native HTML first, `data-jqs` roots, `data-part` slots, and documented state attributes.
- Application orchestration belongs in registry blocks. Generic behavior belongs in `src/`.
- Datastar SSE comes from `@starfederation/datastar-sdk`, never handwritten event strings.
- A completed change passes `npm run check` and updates affected public and brain documentation.
