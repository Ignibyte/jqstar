import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { brotliDecompressSync } from "node:zlib";

import { assertExactPackageDocumentationPaths } from "./quality/package-release-contracts.mjs";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
// test:package completes the mandatory build before this smoke. Avoid a redundant prepack writing
// build logs into npm's JSON stdout; installed and release gates still pack the real artifact.
const result = spawnSync(npm, ["pack", "--ignore-scripts", "--dry-run", "--json"], {
  cwd: process.cwd(),
  encoding: "utf8",
});

if (result.status !== 0) {
  throw new Error(`npm pack --ignore-scripts --dry-run failed:\n${result.stderr}`);
}

const report = JSON.parse(result.stdout);
const files = new Set(report[0]?.files?.map((file) => file.path));
assertExactPackageDocumentationPaths([...files]);
const required = [
  "bin/jqstar.mjs",
  "demo-dist/site.br",
  "deploy/jqstar.env.example",
  "deploy/jqstar.service",
  "dist/core.cjs",
  "dist/core.d.cts",
  "dist/core.d.ts",
  "dist/core.js",
  "dist/csp.cjs",
  "dist/csp.d.cts",
  "dist/csp.d.ts",
  "dist/csp.js",
  "dist/datastar.cjs",
  "dist/datastar.d.cts",
  "dist/datastar.d.ts",
  "dist/datastar.js",
  "dist/datastar-testing.cjs",
  "dist/datastar-testing.d.cts",
  "dist/datastar-testing.d.ts",
  "dist/datastar-testing.js",
  "dist/index.d.cts",
  "dist/index.d.ts",
  "dist/htmx.cjs",
  "dist/htmx.d.cts",
  "dist/htmx.d.ts",
  "dist/htmx.js",
  "dist/jquery-star.cjs",
  "dist/jquery-star.js",
  "dist/jquery-star.umd.cjs",
  "dist/jquery-star-ui.css",
  "dist/testing.cjs",
  "dist/testing.d.cts",
  "dist/testing.d.ts",
  "dist/testing.js",
  "dist/turbo.cjs",
  "dist/turbo.d.cts",
  "dist/turbo.d.ts",
  "dist/turbo.js",
  "dist/ui.cjs",
  "dist/ui.d.cts",
  "dist/ui.d.ts",
  "dist/ui.js",
  "docs/BACKEND.md",
  "docs/COMPONENT_ARCHITECTURE.md",
  "docs/CSP_EXPRESSIONS.md",
  "docs/INTEROPERABILITY.md",
  "docs/SELF_HOSTING.md",
  "SECURITY.md",
  "registry.json",
  "registry/blocks/operations-dashboard.html",
  "registry/blocks/operations-dashboard.ts",
  "registry/blocks/profile-settings.html",
  "registry/blocks/profile-settings.ts",
  "registry/blocks/project-browser.html",
  "registry/blocks/project-browser.ts",
  "registry/blocks/access-manager.html",
  "registry/blocks/access-manager.ts",
  "registry/blocks/audit-log.html",
  "registry/blocks/audit-log.ts",
  "registry/components/button.html",
  "registry/components/transfer-list.html",
  "registry/components/split-button.html",
  "registry/components/command-palette.html",
  "registry/components/form.html",
  "registry/components/hover-card.html",
  "registry/components/range-calendar.html",
  "registry/components/date-range-picker.html",
  "registry/components/async-form.html",
  "registry/components/number-field.html",
  "registry/components/password-field.html",
  "registry/components/tags-input.html",
  "registry/components/input-otp.html",
  "registry/components/resizable.html",
  "registry/components/scroll-area.html",
  "registry/components/context-menu.html",
  "registry/components/menubar.html",
  "registry/components/tree.html",
  "registry/components/sidebar.html",
  "registry/components/carousel.html",
  "registry/components/toolbar.html",
  "registry/components/stepper.html",
  "registry/components/sortable.html",
  "registry/components/file-upload.html",
  "registry/components/multi-select.html",
  "registry/components/time-picker.html",
  "registry/components/color-picker.html",
  "registry/components/rating.html",
  "registry/components/message.html",
  "registry/components/message-scroller.html",
  "registry/components/search-field.html",
  "registry/components/item.html",
  "registry/components/feed.html",
  "registry/components/questionnaire.html",
  "registry/components/attachment.html",
  "registry/components/bubble.html",
  "registry/components/aspect-ratio.html",
  "registry/components/chart.html",
  "registry/components/direction.html",
  "registry/components/marker.html",
  "registry/components/table.html",
  "registry/components/typography.html",
  "registry/components/stat.html",
  "registry/components/timeline.html",
  "registry/components/status.html",
  "registry/components/code-block.html",
  "registry/components/browser-mockup.html",
  "registry/components/diff.html",
  "registry/components/log-viewer.html",
  "registry/components/json-viewer.html",
  "registry/components/countdown.html",
  "registry/components/connection-status.html",
  "registry/components/terminal.html",
  "registry/components/radial-progress.html",
  "registry/components/indicator.html",
  "registry/components/dock.html",
  "registry/components/swap.html",
  "registry/components/key-value.html",
  "registry/components/clipboard.html",
  "registry/components/editable.html",
  "schema/jquery-star.schema.json",
];
const missing = required.filter((path) => !files.has(path));

if (missing.length > 0) {
  throw new Error(`The npm package is missing distribution files:\n${missing.join("\n")}`);
}
if ([...files].some((path) => path.startsWith("dist/types/"))) {
  throw new Error("The npm package contains intermediate declaration files.");
}

const siteBundle = JSON.parse(
  brotliDecompressSync(await readFile("demo-dist/site.br")).toString("utf8"),
);
const bundledFiles = new Map(siteBundle.files);
for (const path of [
  "docs/agents/index.html",
  "docs/compatibility/index.html",
  "docs/migration/index.html",
  "docs/security/index.html",
  "docs/download/index.html",
  "docs/ecosystem/index.html",
  "llms.txt",
  "llms-full.txt",
  "jqstar-agent-index.json",
]) {
  if (!bundledFiles.has(path)) throw new Error(`The packaged site bundle is missing ${path}.`);
}
const bundledIndexValue = bundledFiles.get("jqstar-agent-index.json");
const bundledIndex = JSON.parse(bundledIndexValue.slice(1));
if (
  siteBundle.schema !== "jqstar-site-bundle/2" ||
  !bundledIndexValue.startsWith("u") ||
  bundledIndex.schema !== "jqstar-agent-index/1"
) {
  throw new Error("The packaged site bundle contains an invalid agent index.");
}

process.stdout.write(
  `package contents proof: ${files.size} files, registry, CLI, and agent corpus passed\n`,
);
