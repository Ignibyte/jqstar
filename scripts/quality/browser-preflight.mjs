import { chromium, firefox, webkit } from "@playwright/test";

const engines = { chromium, firefox, webkit };
const name = process.argv[2];
const browserType = engines[name];
const json = process.argv.includes("--json");

if (!browserType) {
  throw new Error(`browser preflight requires one of: ${Object.keys(engines).join(", ")}`);
}

const browser = await browserType.launch({ timeout: 30_000 });
try {
  const page = await browser.newPage();
  await page.goto("data:text/html,<title>jQStar browser preflight</title><p>ready</p>", {
    timeout: 10_000,
    waitUntil: "load",
  });
  if ((await page.textContent("p")) !== "ready") {
    throw new Error(`${name} browser preflight did not render its inert page`);
  }
  const version = browser.version();
  process.stdout.write(
    json
      ? `${JSON.stringify({ name, version })}\n`
      : `${name} browser preflight passed (${version})\n`,
  );
} finally {
  await browser.close();
}
