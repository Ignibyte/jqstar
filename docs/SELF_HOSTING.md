# Self-host jQuery Star

The production build is a static site served by a small Node HTTP process. The same process exposes
`/health`, the JSON demo routes, and the Datastar SSE routes. It binds to `127.0.0.1:4173` by
default, so put an HTTPS reverse proxy in front of it for public traffic.

## Build a release

Use Node 20 or newer. Build each release in its own directory so rollback only changes a symlink.

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
The browser assets are already compiled and do not need Tailwind or Vite on the server.

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

The supplied unit runs as `jqstar`, treats the application files as read-only, limits the process to
512 MB of memory and 64 tasks, and restarts it after a failure. Change `MemoryHigh` and `MemoryMax`
only after measuring the deployed workload.

Check the local service before configuring the reverse proxy:

```sh
curl --fail --silent http://127.0.0.1:4173/health
curl --fail --silent http://127.0.0.1:4173/api/demo/runtime
sudo systemctl status jqstar
sudo journalctl -u jqstar --since today
```

The health response should include `"service":"jqstar"` and `"status":"healthy"`.

## Public traffic

Configure Caddy, nginx, or another reverse proxy to terminate TLS and forward requests to
`http://127.0.0.1:4173`. Do not expose port 4173 directly. SSE responses must stream without proxy
buffering, and the proxy timeout must allow long-lived responses.

The server sends a Content Security Policy that allows `'unsafe-eval'` because jQuery Star compiles
declarative expressions such as `data-on:click="$count++"`. Removing that directive stops those
expressions from running. Keep user-authored HTML and attribute expressions out of the deployed page
unless the application explicitly trusts them.

## Upgrade and rollback

Build and test the next release in a new directory. Move `/opt/jqstar/current` only after its checks
pass, then restart and read `/health` again.

```sh
sudo ln -sfn /opt/jqstar/releases/NEW_RELEASE /opt/jqstar/current
sudo systemctl restart jqstar
curl --fail --silent http://127.0.0.1:4173/health
```

Rollback uses the same three commands with the previous release path. Do not delete the previous
release until the new one has served real traffic successfully.
