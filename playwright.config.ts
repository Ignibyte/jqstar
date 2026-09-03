import { defineConfig, devices } from "@playwright/test";
import { join, resolve } from "node:path";

const networkProofPort = Number(process.env.JQS_NETWORK_PROOF_PORT ?? 4174);
const interoperabilityPort = Number(process.env.JQS_INTEROP_PORT ?? 4175);
const artifactDirectory = resolve(
  process.env.JQS_PLAYWRIGHT_ARTIFACT_DIRECTORY ?? ".git/jqstar/standalone/playwright",
);
const selfTest = process.env.JQS_PLAYWRIGHT_SELF_TEST;

const requiredProjects = [
  {
    name: "desktop-chromium",
    grepInvert: /@(mobile|motion|color|zoom|nojs|selftest|webmcp-native)/,
    use: { ...devices["Desktop Chrome"] },
  },
  {
    name: "desktop-firefox",
    grepInvert: /@(mobile|motion|color|zoom|nojs|selftest|webmcp-native)/,
    use: { ...devices["Desktop Firefox"] },
  },
  {
    name: "desktop-webkit",
    grepInvert: /@(mobile|motion|color|zoom|nojs|selftest|webmcp-native)/,
    use: { ...devices["Desktop Safari"] },
  },
  {
    name: "webmcp-chromium",
    testMatch: /webmcp-native\.spec\.ts/,
    use: {
      ...devices["Desktop Chrome"],
      launchOptions: { args: ["--enable-features=WebMCP"] },
    },
  },
  {
    name: "mobile-touch",
    testMatch: /quality-contracts\.spec\.ts/,
    grep: /@mobile/,
    use: { ...devices["Pixel 7"] },
  },
  {
    name: "reduced-motion",
    testMatch: /quality-contracts\.spec\.ts/,
    grep: /@motion/,
    use: {
      ...devices["Desktop Chrome"],
      contextOptions: { reducedMotion: "reduce" as const },
    },
  },
  {
    name: "forced-colors",
    testMatch: /quality-contracts\.spec\.ts/,
    grep: /@color/,
    use: {
      ...devices["Desktop Chrome"],
      contextOptions: { forcedColors: "active" as const },
    },
  },
  {
    name: "zoom-reflow",
    testMatch: /quality-contracts\.spec\.ts/,
    grep: /@zoom/,
    use: { ...devices["Desktop Chrome"] },
  },
  {
    name: "javascript-disabled",
    testMatch: /quality-contracts\.spec\.ts/,
    grep: /@nojs/,
    use: { ...devices["Desktop Chrome"], javaScriptEnabled: false },
  },
];

if (selfTest && selfTest !== "retry-pass") {
  throw new Error(`Unsupported JQS_PLAYWRIGHT_SELF_TEST value: ${selfTest}`);
}

export default defineConfig({
  testDir: "./e2e",
  outputDir: join(artifactDirectory, "test-results"),
  fullyParallel: true,
  failOnFlakyTests: true,
  forbidOnly: Boolean(process.env.CI),
  maxFailures: process.env.CI ? 1 : 0,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["list"],
    ["json", { outputFile: join(artifactDirectory, "results.json") }],
    ["html", { open: "never", outputFolder: join(artifactDirectory, "html") }],
  ],
  timeout: Number(process.env.JQS_E2E_TIMEOUT ?? 60_000),
  workers: Number(process.env.JQS_E2E_WORKERS ?? 1),
  use: {
    baseURL: "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: selfTest
    ? [
        {
          name: "quality-selftest",
          testMatch: /quality-contracts\.spec\.ts/,
          grep: /@selftest/,
          use: { ...devices["Desktop Chrome"] },
        },
      ]
    : requiredProjects,
  webServer: [
    {
      command: "npm run demo -- --host 127.0.0.1 --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "node e2e/fixtures/network-proof-server.mjs",
      url: `http://127.0.0.1:${networkProofPort}/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "node e2e/fixtures/interoperability-server.mjs",
      url: `http://127.0.0.1:${interoperabilityPort}/health`,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
