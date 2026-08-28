import { spawnSync } from "node:child_process";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const result = spawnSync(npm, ["pack", "--dry-run", "--json"], {
  cwd: process.cwd(),
  encoding: "utf8",
});

if (result.status !== 0) {
  throw new Error(`npm pack --dry-run failed:\n${result.stderr}`);
}

const report = JSON.parse(result.stdout);
const files = new Set(report[0]?.files?.map((file) => file.path));
const required = [
  "bin/jqstar.mjs",
  "deploy/jqstar.env.example",
  "deploy/jqstar.service",
  "dist/jquery-star.js",
  "dist/jquery-star-ui.css",
  "docs/SELF_HOSTING.md",
  "registry.json",
  "registry/blocks/operations-dashboard.html",
  "registry/blocks/operations-dashboard.ts",
  "registry/blocks/profile-settings.html",
  "registry/blocks/profile-settings.ts",
  "registry/blocks/project-browser.html",
  "registry/blocks/project-browser.ts",
  "registry/components/button.html",
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

process.stdout.write(`package contents proof: ${files.size} files, registry and CLI passed\n`);
