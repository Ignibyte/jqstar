import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const child = spawn(process.execPath, ["server-dist/index.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    JQS_DATABASE_PATH: ":memory:",
    JQS_HOST: "127.0.0.1",
    JQS_PORT: "0",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stderr = "";
child.stderr.setEncoding("utf8");
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});

const origin = await new Promise((resolve, reject) => {
  const timeout = setTimeout(
    () => reject(new Error(`Server startup timed out.\n${stderr}`)),
    10_000,
  );
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    const match = String(chunk).match(/listening on (http:\/\/[^\s]+)/);
    if (!match) return;
    clearTimeout(timeout);
    resolve(match[1]);
  });
  child.once("exit", (code) => {
    clearTimeout(timeout);
    reject(new Error(`Server exited during startup with ${code}.\n${stderr}`));
  });
});

try {
  const page = await fetch(`${origin}/`);
  const html = await page.text();
  if (
    !page.ok ||
    !html.includes("Polished UI behavior for") ||
    !html.includes("Datastar applications.")
  ) {
    throw new Error("The self-hosted server did not serve the framework home page.");
  }
  const docsResponse = await fetch(`${origin}/docs/components/dialog/`);
  const docs = await docsResponse.text();
  if (!docsResponse.ok || !docs.includes("Dialog · jQStar Components")) {
    throw new Error("The self-hosted server did not serve a direct documentation route.");
  }
  const docsHead = await fetch(`${origin}/docs/components/toast/`, { method: "HEAD" });
  if (!docsHead.ok || docsHead.headers.get("content-type") !== "text/html; charset=utf-8") {
    throw new Error("The self-hosted documentation HEAD contract failed.");
  }
  const agentResources = [
    ["/docs/agents/", "text/html; charset=utf-8", "Agent-first parity:"],
    ["/llms.txt", "text/plain; charset=utf-8", "# jQStar"],
    ["/llms-full.txt", "text/plain; charset=utf-8", "@starfederation/datastar-sdk"],
    ["/jqstar-agent-index.json", "application/json; charset=utf-8", '"jqstar-agent-index/1"'],
  ];
  for (const [path, contentType, marker] of agentResources) {
    const response = await fetch(`${origin}${path}`);
    const body = await response.text();
    const head = await fetch(`${origin}${path}`, { method: "HEAD" });
    if (
      !response.ok ||
      response.headers.get("content-type") !== contentType ||
      !body.includes(marker) ||
      !head.ok ||
      head.headers.get("content-type") !== contentType ||
      Number(head.headers.get("content-length")) <= 0
    ) {
      throw new Error(`The self-hosted agent resource contract failed for ${path}.`);
    }
  }
  const labResponse = await fetch(`${origin}/components/lab/`);
  const lab = await labResponse.text();
  if (!labResponse.ok || !lab.includes("Self-hosting operations console")) {
    throw new Error("The self-hosted server did not preserve the Component Lab.");
  }
  const healthResponse = await fetch(`${origin}/health`);
  const health = await healthResponse.json();
  if (
    !healthResponse.ok ||
    health.status !== "healthy" ||
    health.database !== "ready" ||
    health.projects !== 2500 ||
    health.components !== 102
  ) {
    throw new Error("The self-hosted health contract failed.");
  }
  const operationsResponse = await fetch(`${origin}/api/demo/operations`);
  const operations = await operationsResponse.json();
  if (!operationsResponse.ok || operations.revision !== 1 || operations.components !== 102) {
    throw new Error("The self-hosted operations contract failed.");
  }
  const runtimeResponse = await fetch(`${origin}/api/demo/runtime`);
  const runtime = await runtimeResponse.json();
  if (
    !runtimeResponse.ok ||
    runtime.revision !== 1 ||
    runtime.components !== 102 ||
    runtime.logs?.length !== 3
  ) {
    throw new Error("The self-hosted runtime snapshot contract failed.");
  }
  const profileResponse = await fetch(`${origin}/api/demo/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: "Grace Hopper", email: "grace@example.com" }),
  });
  const profile = await profileResponse.json();
  if (!profileResponse.ok || profile.revision !== 1 || profile.displayName !== "Grace Hopper") {
    throw new Error("The self-hosted profile persistence contract failed.");
  }
  const inviteResponse = await fetch(`${origin}/api/demo/profile/invite`, { method: "POST" });
  const invite = await inviteResponse.json();
  if (!inviteResponse.ok || !invite.inviteUrl?.endsWith("self-hosted-1")) {
    throw new Error("The self-hosted invite rotation contract failed.");
  }
  const projectSignals = encodeURIComponent(
    JSON.stringify({
      projectBrowserDirection: "ascending",
      projectBrowserOwner: "all",
      projectBrowserPage: 2,
      projectBrowserPageSize: 5,
      projectBrowserQuery: "",
      projectBrowserSort: "name",
      projectBrowserStatus: "all",
    }),
  );
  const projectsResponse = await fetch(`${origin}/api/demo/projects?datastar=${projectSignals}`);
  const projects = await projectsResponse.text();
  if (
    !projectsResponse.ok ||
    !projects.includes('data-row-id="deployment-kit"') ||
    !projects.includes("selector #project-browser-pagination")
  ) {
    throw new Error("The self-hosted Project Browser stream contract failed.");
  }
  const accessSignals = encodeURIComponent(
    JSON.stringify({ accessManagerMember: "luis", accessManagerPermissions: [] }),
  );
  const accessResponse = await fetch(`${origin}/api/demo/access?datastar=${accessSignals}`);
  const access = await accessResponse.text();
  if (
    !accessResponse.ok ||
    !access.includes("selector #access-manager-permissions") ||
    !access.includes("Luis Ortiz access loaded from the backend") ||
    !access.includes("audit:read")
  ) {
    throw new Error("The self-hosted Access Manager stream contract failed.");
  }
  const auditSignals = encodeURIComponent(
    JSON.stringify({ auditLogMember: "all", auditLogPage: 1, auditLogQuery: "" }),
  );
  const auditResponse = await fetch(`${origin}/api/demo/access/audit?datastar=${auditSignals}`);
  const audit = await auditResponse.text();
  if (
    !auditResponse.ok ||
    !audit.includes("selector #audit-log-rows") ||
    !audit.includes("selector #audit-log-pagination") ||
    !audit.includes("Amina Yusuf")
  ) {
    throw new Error("The self-hosted Audit Log stream contract failed.");
  }
  const signals = encodeURIComponent(JSON.stringify({ controlPlaneMessage: "Ready" }));
  const streamResponse = await fetch(`${origin}/api/demo/runtime/stream?datastar=${signals}`);
  const stream = await streamResponse.text();
  if (
    !streamResponse.ok ||
    !stream.includes("event: datastar-patch-elements") ||
    !stream.includes("selector #runtime-log-entries") ||
    !stream.includes("appended 3 log entries")
  ) {
    throw new Error("The self-hosted Datastar log stream contract failed.");
  }
  const policy = page.headers.get("content-security-policy");
  if (
    !policy?.includes("script-src 'self' 'unsafe-eval'") ||
    !page.headers.get("x-content-type-options") ||
    page.headers.get("origin-agent-cluster") !== "?1"
  ) {
    throw new Error("The self-hosted server is missing security headers.");
  }
  const traversal = await fetch(`${origin}/..%2fpackage.json`);
  if (traversal.status !== 400) {
    throw new Error("The self-hosted server did not reject path traversal.");
  }
  const browser = await chromium.launch();
  try {
    const browserPage = await browser.newPage();
    const pageErrors = [];
    browserPage.on("pageerror", (error) => pageErrors.push(error));
    await browserPage.goto(`${origin}/`);
    await browserPage
      .getByRole("heading", { name: "Polished UI behavior for Datastar applications." })
      .waitFor({ state: "visible" });
    if (pageErrors.length > 0) {
      throw new Error(
        `The framework home page failed during initialization:\n${pageErrors
          .map((error) => error.stack ?? error.message)
          .join("\n")}`,
      );
    }
    await browserPage.goto(`${origin}/components/lab/`);
    await browserPage.getByRole("button", { name: "Increment and disappear" }).click();
    await browserPage.getByRole("button", { name: "Refresh operations" }).click();
    await browserPage.getByRole("button", { name: "Refresh snapshot" }).click();
    await browserPage.getByRole("button", { name: "Stream 3 logs" }).click();
    await browserPage
      .locator('[data-block="project-browser"] [data-part="page"][data-page="2"]')
      .click();
    if (
      (await browserPage.getByRole("status", { name: "Current count: 1" }).textContent()) !== "1"
    ) {
      throw new Error("The self-hosted CSP blocked the expression runtime.");
    }
    await browserPage
      .locator(".operations-message")
      .filter({ hasText: "revision 2" })
      .waitFor({ state: "visible" });
    await browserPage
      .locator(".control-plane-message")
      .filter({ hasText: "Datastar stream 2 appended 3 log entries" })
      .waitFor({ state: "visible" });
    if ((await browserPage.locator("#runtime-log-viewer [data-part='entry']").count()) !== 6) {
      throw new Error("The self-hosted browser did not apply the Datastar log stream.");
    }
    if (pageErrors.length > 0) {
      throw new Error(
        `The self-hosted browser emitted page errors:\n${pageErrors
          .map((error) => error.stack ?? error.message)
          .join("\n")}`,
      );
    }
    await browserPage
      .locator('[data-block="project-browser"] [data-row-id="accessibility-lab"]')
      .waitFor({ state: "visible" });
    const accessManager = browserPage.locator('[data-block="access-manager"]');
    await accessManager.getByRole("combobox", { name: "Team member" }).selectOption("luis");
    await accessManager
      .locator('#access-manager-permissions[data-value=\'["components:read","audit:read"]\']')
      .waitFor({ state: "visible" });
    await accessManager
      .getByRole("listbox", { name: "Available permissions" })
      .selectOption("members:invite");
    await accessManager.getByRole("button", { name: "Add →" }).click();
    await accessManager.getByRole("button", { name: "Save access", exact: true }).click();
    await accessManager
      .locator('[data-text="$accessManagerMessage"]')
      .filter({ hasText: "Luis Ortiz access saved" })
      .waitFor({ state: "visible" });
    const auditLog = browserPage.locator('[data-block="audit-log"]');
    await auditLog
      .locator('#audit-log-rows [data-row-id="access-audit-4"]')
      .filter({ hasText: "Luis Ortiz" })
      .waitFor({ state: "visible" });
    await auditLog
      .locator('[data-part="change-summary"]')
      .filter({ hasText: "Added Invite members" })
      .waitFor({ state: "visible" });
  } finally {
    await browser.close();
  }
  process.stdout.write(
    "self-hosted proof: home=passed, docs-route=passed, docs-head=passed, agent-resources=passed, component-lab=passed, health=passed, operations=passed, runtime-snapshot=passed, profile-persistence=passed, invite-rotation=passed, project-browser-sse=passed, access-manager-sse=passed, audit-log-sse=passed, datastar-log-stream=passed, runtime-install=passed, browser-runtime=passed, browser-project-browser=passed, browser-access-manager=passed, browser-audit-log=passed, browser-page-errors=passed, security-headers=passed\n",
  );
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
}
