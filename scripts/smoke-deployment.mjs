import { access, readFile } from "node:fs/promises";

const service = await readFile("deploy/jqstar.service", "utf8");
const environment = await readFile("deploy/jqstar.env.example", "utf8");
const runbook = await readFile("docs/SELF_HOSTING.md", "utf8");

const siteArtifacts = [
  "demo-dist/index.html",
  "demo-dist/docs/index.html",
  "demo-dist/docs/datastar/index.html",
  "demo-dist/docs/api/index.html",
  "demo-dist/docs/csp/index.html",
  "demo-dist/docs/compatibility/index.html",
  "demo-dist/docs/migration/index.html",
  "demo-dist/docs/security/index.html",
  "demo-dist/docs/download/index.html",
  "demo-dist/docs/interoperability/index.html",
  "demo-dist/docs/ecosystem/index.html",
  "demo-dist/docs/plugins/index.html",
  "demo-dist/docs/testing/index.html",
  "demo-dist/docs/components/index.html",
  "demo-dist/docs/components/dialog/index.html",
  "demo-dist/docs/components/dropdown/index.html",
  "demo-dist/docs/components/tabs/index.html",
  "demo-dist/docs/components/toast/index.html",
  "demo-dist/docs/agents/index.html",
  "demo-dist/components/lab/index.html",
];
const agentArtifacts = [
  "demo-dist/llms.txt",
  "demo-dist/llms-full.txt",
  "demo-dist/jqstar-agent-index.json",
];

for (const path of [
  "server-dist/index.mjs",
  "demo-dist/site.br",
  ...siteArtifacts,
  ...agentArtifacts,
]) {
  await access(path);
}

for (const path of siteArtifacts.slice(0, -1)) {
  const html = await readFile(path, "utf8");
  if (!html.includes("<main") || !html.includes("data-signals=")) {
    throw new Error(`The public site artifact is not native jQStar HTML: ${path}`);
  }
  if (/id=["']root["']|react-dom|wouter|@radix-ui/i.test(html)) {
    throw new Error(`The public site artifact contains a forbidden React implementation: ${path}`);
  }
}

const [llms, llmsFull, agentIndexSource] = await Promise.all(
  agentArtifacts.map((path) => readFile(path, "utf8")),
);
const agentIndex = JSON.parse(agentIndexSource);
if (
  !llms.includes("https://ignibyte.github.io/jqstar/docs/agents/") ||
  !llmsFull.includes("@starfederation/datastar-sdk") ||
  agentIndex.schema !== "jqstar-agent-index/1" ||
  agentIndex.package?.name !== "jquery-star"
) {
  throw new Error("The built agent corpus is incomplete or inconsistent.");
}

const requiredServiceSettings = [
  "User=jqstar",
  "WorkingDirectory=/opt/jqstar/current",
  "ExecStart=/usr/bin/node /opt/jqstar/current/server-dist/index.mjs",
  "NoNewPrivileges=true",
  "ProtectSystem=strict",
  "StateDirectory=jqstar",
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
  "JQS_DATABASE_PATH=/var/lib/jqstar/projects.sqlite",
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
  "deployment proof: build artifacts=present, agent-corpus=passed, loopback env=passed, systemd hardening=passed, 512MB memory ceiling=passed, runbook=passed\n",
);
