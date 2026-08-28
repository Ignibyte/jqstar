import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const child = spawn(process.execPath, ["server-dist/index.mjs"], {
  cwd: process.cwd(),
  env: { ...process.env, JQS_HOST: "127.0.0.1", JQS_PORT: "0" },
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
  if (!page.ok || !html.includes("Self-hosting operations console")) {
    throw new Error("The self-hosted server did not serve the production demo.");
  }
  const healthResponse = await fetch(`${origin}/health`);
  const health = await healthResponse.json();
  if (!healthResponse.ok || health.status !== "healthy" || health.components !== 90) {
    throw new Error("The self-hosted health contract failed.");
  }
  const operationsResponse = await fetch(`${origin}/api/demo/operations`);
  const operations = await operationsResponse.json();
  if (!operationsResponse.ok || operations.revision !== 1 || operations.components !== 90) {
    throw new Error("The self-hosted operations contract failed.");
  }
  const policy = page.headers.get("content-security-policy");
  if (
    !policy?.includes("script-src 'self' 'unsafe-eval'") ||
    !page.headers.get("x-content-type-options")
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
    await browserPage.goto(`${origin}/`);
    await browserPage.getByRole("button", { name: "Increment and disappear" }).click();
    await browserPage.getByRole("button", { name: "Refresh operations" }).click();
    if (
      (await browserPage.getByRole("status", { name: "Current count: 1" }).textContent()) !== "1"
    ) {
      throw new Error("The self-hosted CSP blocked the expression runtime.");
    }
    await browserPage
      .locator(".operations-message")
      .filter({ hasText: "revision 2" })
      .waitFor({ state: "visible" });
  } finally {
    await browser.close();
  }
  process.stdout.write(
    "self-hosted proof: page=passed, health=passed, operations=passed, browser-runtime=passed, security-headers=passed\n",
  );
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
}
