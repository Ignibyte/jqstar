import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, cp, mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import {
  assertExactCheckSet,
  initializeChecks,
  prepareIndependentWorkspaces,
  recordCheck,
  releaseCheckNames,
  reportStatus,
} from "./quality/package-release-contracts.mjs";
import { evaluateCurrentBudgetRatchet } from "./quality/budget-ratchet.mjs";
import { withOwnedTemporaryDirectory } from "./quality/lib/owned-temporary-directory.mjs";
import { runChild } from "./quality/lib/process.mjs";

const source = process.cwd();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const runDirectory = resolve(
  process.env.JQS_QUALITY_RUN_DIRECTORY ?? ".git/jqstar/standalone/ticket-0044",
);
const output = join(runDirectory, "release-report.json");
const runId = process.env.JQS_QUALITY_RUN_ID ?? "ticket-0044-standalone";
const sabotage = process.env.JQS_QUALITY_SABOTAGE ?? "";
const excludedRoots = new Set([
  ".git",
  "coverage",
  "demo-dist",
  "dist",
  "node_modules",
  "playwright-report",
  "server-dist",
  "test-results",
]);
const report = {
  schema: "jqstar-release-quality/1",
  runId,
  mode: "release",
  checks: initializeChecks(releaseCheckNames),
  environment: {},
  provenance: {},
  status: "error",
};

function execute(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? source,
    encoding: "utf8",
    env: { ...process.env, ...options.env },
    maxBuffer: 40 * 1024 * 1024,
  });
}

function command(name, executable, args, options = {}) {
  const result = execute(executable, args, options);
  if (result.status !== 0) {
    throw new Error(
      `${name} failed with exit ${String(result.status)}\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }
  return result;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const record = (name, work) => recordCheck(report, name, work);

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

async function installedBrowserVersions(workspace) {
  const browsers = {};
  const preflight = join(workspace, "scripts/quality/browser-preflight.mjs");
  for (const name of ["chromium", "firefox", "webkit"]) {
    const result = await runChild({
      command: process.execPath,
      args: [preflight, name, "--json"],
      cwd: workspace,
      timeoutMs: 45_000,
      env: process.env,
    });
    const output = `${result.stdout}${result.stderr}`.trim();
    if (result.spawnError) {
      throw new Error(
        `Installed ${name} browser probe could not start: ${result.spawnError.message}`,
      );
    }
    if (result.timedOut) {
      throw new Error(`Installed ${name} browser probe exceeded its 45-second process deadline.`);
    }
    if (result.signal || result.exitCode !== 0) {
      throw new Error(
        `Installed ${name} browser probe failed (${result.signal ?? `exit ${String(result.exitCode)}`}): ${output}`,
      );
    }
    const record = JSON.parse(result.stdout);
    assert(
      record?.name === name && typeof record.version === "string" && record.version.length > 0,
      `Installed ${name} browser probe returned invalid version evidence.`,
    );
    browsers[name] = { version: record.version };
  }
  return browsers;
}

async function files(directory, prefix = "") {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...(await files(path, name)));
    else if (entry.isFile())
      result.push({ path: name, bytes: (await stat(path)).size, sha256: await sha256(path) });
  }
  return result.sort((left, right) => left.path.localeCompare(right.path));
}

function pack(workspace, destination) {
  const result = command(
    "npm pack",
    npm,
    ["pack", "--ignore-scripts", "--json", "--pack-destination", destination],
    { cwd: workspace },
  );
  const metadata = JSON.parse(result.stdout)[0];
  assert(metadata?.filename, "npm pack returned no filename.");
  return { metadata, tarball: join(destination, metadata.filename) };
}

async function extract(tarball, destination) {
  await mkdir(destination, { recursive: true });
  command("extract release tarball", "tar", ["-xzf", tarball, "-C", destination]);
  return join(destination, "package");
}

async function proveSelfHosted(extracted) {
  const child = spawn(process.execPath, ["server-dist/index.mjs"], {
    cwd: extracted,
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
  const origin = await new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Packed server startup timed out.\n${stderr}`)),
      10_000,
    );
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      const match = String(chunk).match(/listening on (http:\/\/[^\s]+)/u);
      if (!match) return;
      clearTimeout(timeout);
      resolvePromise(match[1]);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Packed server exited with ${String(code)}.\n${stderr}`));
    });
  });
  try {
    const healthResponse = await fetch(`${origin}/health`);
    const health = await healthResponse.json();
    assert(healthResponse.ok && health.status === "healthy", "Packed server health check failed.");
    const page = await (await fetch(`${origin}/`)).text();
    assert(
      page.includes("Polished UI behavior for") && page.includes("Datastar applications."),
      "Packed server did not serve the bundled framework website.",
    );
    const docs = await (await fetch(`${origin}/docs/components/dialog/`)).text();
    assert(
      docs.includes("Dialog · jQStar Components"),
      "Packed server did not serve a docs route.",
    );
    for (const [path, contentType, marker] of [
      ["/docs/agents/", "text/html; charset=utf-8", "Agent-first parity:"],
      ["/llms.txt", "text/plain; charset=utf-8", "# jQStar"],
      ["/llms-full.txt", "text/plain; charset=utf-8", "@starfederation/datastar-sdk"],
      ["/jqstar-agent-index.json", "application/json; charset=utf-8", '"jqstar-agent-index/1"'],
    ]) {
      const response = await fetch(`${origin}${path}`);
      const body = await response.text();
      const head = await fetch(`${origin}${path}`, { method: "HEAD" });
      assert(
        response.ok &&
          response.headers.get("content-type") === contentType &&
          body.includes(marker) &&
          head.ok &&
          head.headers.get("content-type") === contentType,
        `Packed server agent resource check failed for ${path}.`,
      );
    }
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolvePromise) => child.once("exit", resolvePromise));
  }
  return { origin, agentCorpus: "served", health: "healthy", staticDemo: "served" };
}

await withOwnedTemporaryDirectory({ prefix: "jqstar-release-quality-" }, async (temporary) => {
  const workspaceOne = join(temporary, "workspace-one");
  const workspaceTwo = join(temporary, "workspace-two");
  const copyWorkspace = (destination) =>
    cp(source, destination, {
      recursive: true,
      filter(path) {
        const name = relative(source, path).split(/[\\/]/u)[0];
        return name === "" || !excludedRoots.has(name);
      },
    });

  await record("clean-install", async () => {
    await prepareIndependentWorkspaces([workspaceOne, workspaceTwo], copyWorkspace, (workspace) => {
      command("clean npm install", npm, ["ci", "--no-audit", "--no-fund"], {
        cwd: workspace,
      });
    });
    return {
      installs: 2,
      sourceNodeModulesShared: false,
      workspaces: ["workspace-one", "workspace-two"],
    };
  });

  let firstPack;
  let secondPack;
  let firstManifest;
  let secondManifest;
  let extracted;
  await record("reproducible-build", async () => {
    const budgets = JSON.parse(await readFile("config/quality-budgets.json", "utf8"));
    const budgetRatchet = await evaluateCurrentBudgetRatchet(budgets);
    assert(
      budgetRatchet.status !== "fail",
      `Quality budget ratchet failed: ${budgetRatchet.failures.join(" ")}`,
    );
    const firstDirectory = join(temporary, "pack-one");
    const secondDirectory = join(temporary, "pack-two");
    await mkdir(firstDirectory, { recursive: true });
    await mkdir(secondDirectory, { recursive: true });

    command("first self-hosted build", npm, ["run", "build:self-hosted"], {
      cwd: workspaceOne,
    });
    firstPack = pack(workspaceOne, firstDirectory);
    const firstExtracted = await extract(firstPack.tarball, join(temporary, "extract-one"));
    firstManifest = await files(firstExtracted);

    command("second self-hosted build", npm, ["run", "build:self-hosted"], {
      cwd: workspaceTwo,
    });
    secondPack = pack(workspaceTwo, secondDirectory);
    extracted = await extract(secondPack.tarball, join(temporary, "extract-two"));
    secondManifest = await files(extracted);
    if (sabotage === "artifact-manifest") secondManifest[0].sha256 = "0".repeat(64);

    const firstByPath = new Map(firstManifest.map((entry) => [entry.path, entry]));
    const secondByPath = new Map(secondManifest.map((entry) => [entry.path, entry]));
    const generatedOutputChanges = new Set([...firstByPath.keys(), ...secondByPath.keys()]).size
      ? [...new Set([...firstByPath.keys(), ...secondByPath.keys()])].filter(
          (path) =>
            JSON.stringify(firstByPath.get(path)) !== JSON.stringify(secondByPath.get(path)),
        ).length
      : 0;
    assert(
      generatedOutputChanges <= budgets.generatedOutputs.changedFiles,
      `Packed file manifests differ between clean builds (${generatedOutputChanges} changed; budget ${budgets.generatedOutputs.changedFiles}).`,
    );
    assert(
      JSON.stringify(firstManifest) === JSON.stringify(secondManifest),
      "Packed file manifests differ between clean builds.",
    );
    const firstChecksum = await sha256(firstPack.tarball);
    let secondChecksum = await sha256(secondPack.tarball);
    if (sabotage === "artifact-checksum") secondChecksum = "0".repeat(64);
    assert(firstChecksum === secondChecksum, "Tarball checksums differ between clean builds.");
    await writeJson(join(runDirectory, "artifact-manifest.json"), {
      schema: "jqstar-artifact-manifest/1",
      package: secondPack.metadata.filename,
      sha256: secondChecksum,
      files: secondManifest,
    });
    return {
      files: secondManifest.length,
      budgetRatchet,
      generatedOutputBudget: budgets.generatedOutputs.changedFiles,
      generatedOutputChanges,
      independentlyMaterializedWorkspaces: 2,
      sha256: secondChecksum,
    };
  });

  await record("sbom", async () => {
    const result = command("CycloneDX SBOM", npm, ["sbom", "--sbom-format", "cyclonedx"], {
      cwd: workspaceTwo,
    });
    const sbom = JSON.parse(result.stdout);
    assert(
      sbom.bomFormat === "CycloneDX" && Array.isArray(sbom.components),
      "npm sbom returned an invalid document.",
    );
    await writeJson(join(runDirectory, "sbom.cdx.json"), sbom);
    return { components: sbom.components.length, specVersion: sbom.specVersion };
  });

  await record("licenses", async () => {
    const result = command(
      "production license inventory",
      npx,
      ["--no-install", "license-checker-rseidelsohn", "--production", "--json"],
      { cwd: workspaceTwo },
    );
    const inventory = JSON.parse(result.stdout);
    const forbidden = Object.entries(inventory).filter(([, value]) =>
      /(?:^|\W)(?:AGPL|SSPL|GPL)(?:\W|$)/iu.test(String(value.licenses ?? "")),
    );
    assert(
      forbidden.length === 0,
      `Forbidden production licenses: ${forbidden.map(([name]) => name).join(", ")}`,
    );
    await writeJson(join(runDirectory, "licenses.json"), inventory);
    return { packages: Object.keys(inventory).length, forbidden: 0 };
  });

  await record("provenance-eligibility", async () => {
    const manifest = JSON.parse(await readFile(join(workspaceTwo, "package.json"), "utf8"));
    const workflowsDirectory = join(workspaceTwo, ".github", "workflows");
    let workflowText = "";
    try {
      for (const entry of await readdir(workflowsDirectory)) {
        if (/\.ya?ml$/u.test(entry))
          workflowText += await readFile(join(workflowsDirectory, entry), "utf8");
      }
    } catch {
      workflowText = "";
    }
    const repositoryEligible = /^git\+https:\/\/github\.com\//u.test(
      manifest.repository?.url ?? "",
    );
    const oidcEligible = /id-token:\s*write/u.test(workflowText);
    const publishEligible = /npm\s+publish[^\n]*--provenance/u.test(workflowText);
    report.provenance = {
      eligible: repositoryEligible && oidcEligible && publishEligible,
      oidcEligible,
      publishEligible,
      repositoryEligible,
      note: "Eligibility only; this gate never publishes.",
    };
    return report.provenance;
  });

  await record("supported-toolchain", async () => {
    const npmVersion = command("npm version", npm, ["--version"]).stdout.trim();
    const playwrightVersion = command(
      "Playwright version",
      npx,
      ["--no-install", "playwright", "--version"],
      { cwd: workspaceTwo },
    ).stdout.trim();
    const typescriptVersion = command(
      "TypeScript version",
      npx,
      ["--no-install", "tsc", "--version"],
      { cwd: workspaceTwo },
    ).stdout.trim();
    const browsers = await installedBrowserVersions(workspaceTwo);
    report.environment = {
      node: process.version,
      npm: npmVersion,
      playwright: playwrightVersion,
      typescript: typescriptVersion,
      browsers,
    };
    return report.environment;
  });

  await record("packed-self-hosted", async () => {
    assert(extracted && secondPack, "The reproducible tarball was not extracted.");
    for (const path of ["demo-dist/site.br", "server-dist/index.mjs", "registry.json"]) {
      await access(join(extracted, path));
    }
    const installedConsumer = join(temporary, "installed-release-consumer");
    await mkdir(installedConsumer, { recursive: true });
    await writeFile(
      join(installedConsumer, "package.json"),
      `${JSON.stringify({ name: "jqstar-release-consumer", private: true }, null, 2)}\n`,
    );
    command(
      "install packed release",
      npm,
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--omit=dev", secondPack.tarball],
      { cwd: installedConsumer },
    );
    return proveSelfHosted(join(installedConsumer, "node_modules", "jquery-star"));
  });

  assertExactCheckSet(report.checks, releaseCheckNames);
  report.status = reportStatus(report.checks);
  await writeJson(output, report);
  if (report.status !== "pass") {
    const failures = report.checks
      .filter((check) => check.status !== "pass")
      .map((check) => `${check.name}: ${check.detail}`)
      .join("\n");
    process.stderr.write(`Release quality failed. Evidence: ${output}\n${failures}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `release quality: ${report.checks.length} checks passed; artifact ${secondPack.metadata.filename}; evidence ${output}\n`,
    );
  }
});
