// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { currentCoverageThresholdRatchet } from "../scripts/quality/coverage-thresholds.mjs";

const roots = [];
const thresholds = {
  ratchet: {
    comparison: "immutable-delivery-base",
    firstBaseline: "establish-when-base-has-no-thresholds",
  },
  global: { lines: 90, statements: 90, functions: 80, branches: 70 },
  subsystems: { "src/fixture.ts": { lines: 90 } },
  stabilizationTargets: { "src/fixture.ts": { lines: 100 } },
};

function git(root, ...args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function commit(root) {
  git(root, "add", ".");
  git(root, "-c", "commit.gpgsign=false", "commit", "-qm", "fixture");
  return git(root, "rev-parse", "HEAD");
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "jqstar-coverage-history-"));
  roots.push(root);
  git(root, "init", "-q");
  git(root, "config", "user.name", "Coverage fixture");
  git(root, "config", "user.email", "coverage@example.invalid");
  await writeFile(join(root, "README.md"), "Coverage fixture\n");
  const initial = commit(root);
  await mkdir(join(root, "quality"));
  await writeFile(join(root, "quality/coverage-thresholds.json"), JSON.stringify(thresholds));
  return { root, initial, head: commit(root) };
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

it("checks local uncommitted thresholds against HEAD and refuses lower floors", async () => {
  const { root, head } = await fixture();
  expect(currentCoverageThresholdRatchet(thresholds, { base: null, head }, root)).toMatchObject({
    status: "pass",
    baseRevision: head,
  });
  const lowered = structuredClone(thresholds);
  lowered.global.lines = 89;
  await writeFile(join(root, "quality/coverage-thresholds.json"), JSON.stringify(lowered));
  const result = currentCoverageThresholdRatchet(lowered, { base: null, head }, root);
  expect(result.status).toBe("fail");
  expect(result.failures.join(" ")).toContain("weakens immutable-base value 90");
  for (const group of ["subsystems", "stabilizationTargets"]) {
    const removed = structuredClone(thresholds);
    delete removed[group]["src/fixture.ts"];
    expect(currentCoverageThresholdRatchet(removed, { head }, root).status).toBe("fail");
  }
});

it("uses an explicit review base and permits a first baseline only when that commit lacks one", async () => {
  const { root, initial, head } = await fixture();
  const stronger = structuredClone(thresholds);
  stronger.global.lines = 95;
  await writeFile(join(root, "quality/coverage-thresholds.json"), JSON.stringify(stronger));
  const current = commit(root);
  expect(
    currentCoverageThresholdRatchet(thresholds, { base: head, head: current }, root),
  ).toMatchObject({ status: "pass", baseRevision: head });
  expect(currentCoverageThresholdRatchet(thresholds, { head: current }, root).status).toBe("fail");
  expect(
    currentCoverageThresholdRatchet(thresholds, { base: initial, head: current }, root),
  ).toMatchObject({ status: "first-baseline", baseRevision: initial });
});

it("refuses missing, unreadable, and malformed historical evidence", async () => {
  const { root, head } = await fixture();
  expect(() => currentCoverageThresholdRatchet(thresholds, {}, root)).toThrow(
    "immutable Git base or HEAD",
  );
  expect(() =>
    currentCoverageThresholdRatchet(thresholds, { base: "missing-revision", head }, root),
  ).toThrow();
  await writeFile(join(root, "quality/coverage-thresholds.json"), "malformed-json");
  expect(() => currentCoverageThresholdRatchet(thresholds, { head: commit(root) }, root)).toThrow();
});
