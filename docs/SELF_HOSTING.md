# Self-host jQStar

The production build is a static multi-page framework website served by a small Node HTTP process.
The home page is `/` and documentation begins at `/docs/`. The complete Component Lab is embedded on
home and `/docs/components/`; `/components/lab/` serves the same proof in the shared documentation
shell. Each route includes all recipes and seven source-owned blocks. The same process exposes
`/health`, JSON proof routes, and Datastar SSE routes. It binds to `127.0.0.1:4173` by default, so
put an HTTPS reverse proxy in front of it for public traffic.

The build composes Lab and registry markup into native HTML and adds code frames and syntax colors
before serving it. Static Pages previews retain the existing simulated examples and label the new
dashboard/profile controls as backend-only. Those controls stay disabled in the enhanced static
preview; use the Node proof server for their JSON and SSE actions.

## Build a release

Use Node 24 or newer. Build each release in its own directory so rollback only changes a symlink.

```sh
git clone git@github.com:Ignibyte/jqstar.git /opt/jqstar/releases/2026-08-28
cd /opt/jqstar/releases/2026-08-28
npm ci
npm run check
npm run build:self-hosted
npm prune --omit=dev
sudo ln -sfn /opt/jqstar/releases/2026-08-28 /opt/jqstar/current
```

Keep `node_modules` in the release. The server bundle imports the official Datastar SDK at runtime.
The browser assets are already compiled and do not need Tailwind or Vite on the server. A source
build keeps inspectable nested files under `demo-dist/`. The npm tarball stores the same sorted
build as `demo-dist/site.br`; the server falls back to that deterministic archive when loose files
are not present.

## Install the service

Create a system account once, then install the environment file and unit.

```sh
sudo useradd --system --home /nonexistent --shell /usr/sbin/nologin jqstar
sudo mkdir -p /etc/jqstar
sudo cp deploy/jqstar.env.example /etc/jqstar/jqstar.env
sudo cp deploy/jqstar.service /etc/systemd/system/jqstar.service
sudo systemctl daemon-reload
sudo systemctl enable --now jqstar
```

The supplied unit runs as `jqstar`, treats the application files as read-only, gives the service a
writable `/var/lib/jqstar` state directory, limits the process to 512 MB of memory and 64 tasks, and
restarts it after a failure. Change `MemoryHigh` and `MemoryMax` only after measuring the deployed
workload.

Check the local service before configuring the reverse proxy:

```sh
curl --fail --silent http://127.0.0.1:4173/health
curl --fail --silent http://127.0.0.1:4173/docs/
curl --fail --silent http://127.0.0.1:4173/docs/compatibility/
curl --fail --silent http://127.0.0.1:4173/docs/migration/
curl --fail --silent http://127.0.0.1:4173/docs/security/
curl --fail --silent http://127.0.0.1:4173/docs/download/
curl --fail --silent http://127.0.0.1:4173/docs/agents/
curl --fail --silent http://127.0.0.1:4173/llms.txt
curl --fail --silent http://127.0.0.1:4173/llms-full.txt
curl --fail --silent http://127.0.0.1:4173/jqstar-agent-index.json
curl --fail --silent http://127.0.0.1:4173/components/lab/
curl --fail --silent http://127.0.0.1:4173/api/demo/runtime
sudo systemctl status jqstar
sudo journalctl -u jqstar --since today
```

The health response should include `"service":"jqstar"`, `"status":"healthy"`, and
`"database":"ready"`. The server opens `JQS_DATABASE_PATH`, applies schema migrations, enables
foreign keys and WAL, and idempotently supplies the deterministic seed before it starts listening.

The four agent resources are ordinary static build artifacts and require no model service or remote
MCP process. The text files are served as UTF-8 plain text, the index as UTF-8 JSON, and the guide
as HTML. GET and HEAD behave the same whether the server reads loose `demo-dist/` files or falls
back to the packaged `demo-dist/site.br` archive. WebMCP registration requires a supporting secure
browser; headless clients should use the static resources directly.

`/api/demo/projects` is an SSE route rather than a JSON route. It expects Datastar signals in the
standard `datastar` query parameter and patches Project Browser rows, Pagination, and result state.
It supports validated facets, ordered multi-sort, grouping, page slices, and virtual windows.
`PATCH /api/demo/projects/:id` accepts project name, owner, status, and expected version as JSON.
Writes use optimistic concurrency: stale versions return `409` with the current stored project
rather than overwriting it. `/api/demo/access` accepts Datastar signals by GET query or POST JSON
body. It keeps the demo member assignments in the running process and patches the Access Manager
Transfer List and result state. Each successful POST also records an in-memory audit entry, capped
at the latest 100 entries. `/api/demo/access/audit` accepts Datastar signals by GET query and
patches the Audit Log rows, Pagination, and result state. Replace both in-memory collections with
persistent storage before using the routes for real authorization data.

## Database operations

The shipped SQLite adapter is for one Node process. WAL permits normal concurrent reads and writes
inside that process, but the database file is not a coordination mechanism for multiple app
instances. Use the injectable project-store boundary with a managed database before running more
than one writer.

Back up the database before each application upgrade and on a regular schedule. The SQLite CLI can
take a consistent online backup without copying a live WAL file by itself:

```sh
sudo install -d -o jqstar -g jqstar -m 0750 /var/backups/jqstar &&
sudo -u jqstar sqlite3 /var/lib/jqstar/projects.sqlite ".backup '/var/backups/jqstar/projects-$(date +%F).sqlite'"
```

Test restores away from production. Replace `YYYY-MM-DD` with the chosen backup date before running
the following block. Stop any other database users first. The block checks the backup, stops the
service and preserves the existing database with its optional WAL, SHM and journal files under their
original names in a new private directory. Keeping these files together preserves the failed state
and prevents an old WAL from being applied to the restored backup. The shell stops on any failed
step, leaving the service stopped if preservation or installation fails. Resolve that failure before
restarting; the archive path is printed for recovery.

```sh
sudo sh -eu <<'RESTORE'
backup_path=/var/backups/jqstar/projects-YYYY-MM-DD.sqlite
test -f "$backup_path"
test -r "$backup_path"
systemctl stop jqstar
jqstar_failed_dir=$(mktemp -d /var/lib/jqstar/failed.XXXXXX)
printf 'Preserving database files in %s\n' "$jqstar_failed_dir"
for suffix in '' -wal -shm -journal; do
  database_file="/var/lib/jqstar/projects.sqlite$suffix"
  if test -e "$database_file"; then
    mv "$database_file" "$jqstar_failed_dir/"
  fi
done
install -o jqstar -g jqstar -m 0640 "$backup_path" /var/lib/jqstar/projects.sqlite
systemctl start jqstar
curl --fail --silent http://127.0.0.1:4173/health
RESTORE
```

## Public traffic

Configure Caddy, nginx, or another reverse proxy to terminate TLS and forward requests to
`http://127.0.0.1:4173`. Do not expose port 4173 directly. SSE responses must stream without proxy
buffering, and the proxy timeout must allow long-lived responses.

The server sends a Content Security Policy that allows `'unsafe-eval'` because jQStar compiles
declarative expressions such as `data-on:click="$count++"`. Removing that directive stops those
expressions from running. Keep user-authored HTML and attribute expressions out of the deployed page
unless the application explicitly trusts them.

This policy describes the bundled demo, which uses the trusted compatibility root. An application
that explicitly installs `jquery-star/csp` can omit `'unsafe-eval'` after auditing its other scripts
and jQuery plugins. The host still owns the response header and every allowed script, style, and
connection source. The CSP runtime requires trusted markup and trusted installed extensions and is
not a sandbox.

## Upgrade and rollback

Build and test the next release in a new directory and back up the database. Move
`/opt/jqstar/current` only after its checks pass, then restart and read `/health` again. Migrations
are forward-only, so an application rollback may also require the pre-upgrade database backup when a
future release changes the schema incompatibly.

```sh
sudo ln -sfn /opt/jqstar/releases/NEW_RELEASE /opt/jqstar/current
sudo systemctl restart jqstar
curl --fail --silent http://127.0.0.1:4173/health
```

Rollback uses the same three commands with the previous release path. Do not delete the previous
release until the new one has served real traffic successfully.
