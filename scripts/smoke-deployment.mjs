import { access, readFile } from "node:fs/promises";

const service = await readFile("deploy/jqstar.service", "utf8");
const environment = await readFile("deploy/jqstar.env.example", "utf8");
const runbook = await readFile("docs/SELF_HOSTING.md", "utf8");

for (const path of ["server-dist/index.mjs", "demo-dist/index.html"]) await access(path);

const requiredServiceSettings = [
  "User=jqstar",
  "WorkingDirectory=/opt/jqstar/current",
  "ExecStart=/usr/bin/node /opt/jqstar/current/server-dist/index.mjs",
  "NoNewPrivileges=true",
  "ProtectSystem=strict",
  "MemoryHigh=384M",
  "MemoryMax=512M",
  "TasksMax=64",
];
const missingSettings = requiredServiceSettings.filter((setting) => !service.includes(setting));
if (missingSettings.length > 0) {
  throw new Error(`The systemd service is missing settings:\n${missingSettings.join("\n")}`);
}

const requiredEnvironment = [
  "NODE_ENV=production",
  "JQS_HOST=127.0.0.1",
  "JQS_PORT=4173",
  "JQS_STATIC_DIR=/opt/jqstar/current/demo-dist",
];
const missingEnvironment = requiredEnvironment.filter((setting) => !environment.includes(setting));
if (missingEnvironment.length > 0) {
  throw new Error(`The deployment environment is incomplete:\n${missingEnvironment.join("\n")}`);
}

for (const evidence of ["npm run check", "npm prune --omit=dev", "/health", "rollback"]) {
  if (!runbook.toLowerCase().includes(evidence.toLowerCase())) {
    throw new Error(`The self-hosting runbook is missing: ${evidence}`);
  }
}

process.stdout.write(
  "deployment proof: build artifacts=present, loopback env=passed, systemd hardening=passed, 512MB memory ceiling=passed, runbook=passed\n",
);
