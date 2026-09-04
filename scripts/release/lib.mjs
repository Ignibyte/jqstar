import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

const ticketName = /^[0-9]{4}-[a-z0-9-]+\.md$/u;
const criterionDeclaration = /^- \[([ x])\] \[(AC-[0-9]{2})\]/gmu;
const evidenceRow = /^\|\s*(AC-[0-9]{2})\s*\|(.+)$/gmu;
const stableVersion = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${String(process.pid)}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

export async function sha(path, algorithm = "sha256", encoding = "hex") {
  return createHash(algorithm)
    .update(await readFile(path))
    .digest(encoding);
}

export function repositoryPath(root, path) {
  const absoluteRoot = resolve(root);
  const absolutePath = resolve(path);
  const local = relative(absoluteRoot, absolutePath);
  assert(
    local !== "" && local !== ".." && !local.startsWith(`..${sep}`),
    "Path is outside the repository.",
  );
  return local.split(sep).join("/");
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env,
    maxBuffer: options.maxBuffer ?? 64 * 1024 * 1024,
    stdio: options.stdio ?? "pipe",
  });
  if (result.error) throw new Error(`${options.label ?? command} could not start.`);
  if (result.status !== 0) {
    const detail = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    throw new Error(
      `${options.label ?? command} failed with exit ${String(result.status)}${detail ? `: ${detail}` : "."}`,
    );
  }
  return String(result.stdout ?? "");
}

export function git(root, args, options = {}) {
  return run("git", args, { ...options, cwd: root, label: options.label ?? `git ${args[0]}` });
}

export async function loadReleaseContract(root) {
  const path = resolve(root, "quality/release-contract.json");
  const contract = await readJson(path);
  assert(
    contract.schema === "jqstar-release-contract/1",
    "Release contract schema is unsupported.",
  );
  return { contract, path };
}

function section(source, heading, nextHeadingPattern) {
  const start = source.indexOf(heading);
  assert(start >= 0, `Ticket is missing ${heading}.`);
  const afterHeading = start + heading.length;
  const remainder = source.slice(afterHeading);
  const endMatch = remainder.match(nextHeadingPattern);
  return endMatch ? remainder.slice(0, endMatch.index) : remainder;
}

function collectMatches(source, expression, map) {
  expression.lastIndex = 0;
  return [...source.matchAll(expression)].map(map);
}

function frontMatterValue(source, name) {
  const match = source.match(new RegExp(`^${name}: (.+)$`, "mu"));
  assert(match, `Ticket is missing ${name} front matter.`);
  return match[1].trim();
}

function collectEvidenceRows(source) {
  return collectMatches(source, evidenceRow, (match) => {
    const cells = match[2]
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    const result = cells.find((cell) => cell === "Pass" || cell === "Approved-Disposition");
    return { id: match[1], result };
  });
}

export async function auditPrerequisiteTickets(root, contract) {
  const directory = resolve(root, "docs/tickets");
  const names = (await readdir(directory)).filter((name) => ticketName.test(name));
  const tickets = [];
  let criterionCount = 0;

  for (const id of contract.prerequisites.tickets) {
    const matches = names.filter((name) => name.startsWith(`${id}-`));
    assert(matches.length === 1, `Prerequisite ${id} must resolve to exactly one ticket.`);
    const path = resolve(directory, matches[0]);
    const source = await readFile(path, "utf8");
    const ticketId = frontMatterValue(source, "id");
    const status = frontMatterValue(source, "status");
    assert(ticketId === id, `Prerequisite ${id} front matter does not match its filename.`);
    assert(
      status === contract.prerequisites.requiredStatus,
      `Prerequisite ${id} has status ${status}; expected ${contract.prerequisites.requiredStatus}.`,
    );

    const criteriaSource = section(source, "### Acceptance criteria", /^### /mu);
    const declarations = collectMatches(criteriaSource, criterionDeclaration, (match) => ({
      checked: match[1] === "x",
      id: match[2],
    }));
    assert(declarations.length > 0, `Prerequisite ${id} has no acceptance criteria.`);
    assert(
      new Set(declarations.map((criterion) => criterion.id)).size === declarations.length,
      `Prerequisite ${id} repeats an acceptance criterion ID.`,
    );
    const evidenceSource = section(source, "### Acceptance evidence", /^### /mu);
    const rows = collectEvidenceRows(evidenceSource);
    assert(
      rows.length === declarations.length,
      `Prerequisite ${id} evidence count does not match.`,
    );
    assert(
      new Set(rows.map((criterion) => criterion.id)).size === rows.length,
      `Prerequisite ${id} repeats an acceptance evidence ID.`,
    );
    const rowById = new Map(rows.map((row) => [row.id, row]));
    for (const declaration of declarations) {
      const row = rowById.get(declaration.id);
      assert(row, `Prerequisite ${id} has no evidence for ${declaration.id}.`);
      const expectedResult = declaration.checked ? "Pass" : "Approved-Disposition";
      assert(
        row.result === expectedResult,
        `Prerequisite ${id} ${declaration.id} is ${String(row.result)}; expected ${expectedResult}.`,
      );
    }
    assert(/^Status: Complete$/mu.test(source), `Prerequisite ${id} has no completion status.`);

    criterionCount += rows.length;
    tickets.push({
      id,
      path: repositoryPath(root, path),
      status,
      sha256: await sha(path),
      criteria: rows,
    });
  }

  return {
    required: contract.prerequisites.tickets.length,
    audited: tickets.length,
    criterionCount,
    tickets,
  };
}

function major(version) {
  const match = String(version).match(/^[^0-9]*([0-9]+)(?:\.|$)/u);
  return match ? Number(match[1]) : Number.NaN;
}

function outputLines(output) {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function inspectCandidateSource(
  root,
  contract,
  environment = process.env,
  runtime = {},
) {
  const manifestPath = resolve(root, "package.json");
  const lockfilePath = resolve(root, "package-lock.json");
  const manifest = await readJson(manifestPath);
  const lockfile = await readJson(lockfilePath);
  const branch = git(root, ["branch", "--show-current"], { label: "branch inspection" }).trim();
  const commit = git(root, ["rev-parse", "HEAD"], { label: "commit inspection" }).trim();
  const tree = git(root, ["rev-parse", "HEAD^{tree}"], { label: "tree inspection" }).trim();
  const sourceDateEpoch = Number(
    git(root, ["show", "-s", "--format=%ct", "HEAD"], {
      label: "commit timestamp inspection",
    }).trim(),
  );
  const workingTree = git(root, ["status", "--porcelain=v1", "--untracked-files=all"], {
    label: "working tree inspection",
  });
  const shallow = git(root, ["rev-parse", "--is-shallow-repository"], {
    label: "shallow repository inspection",
  }).trim();
  const submodules = git(root, ["submodule", "status", "--recursive"], {
    label: "submodule inspection",
  });
  const ignoredProductionInputs = outputLines(
    git(
      root,
      [
        "ls-files",
        "--others",
        "--ignored",
        "--exclude-standard",
        "--",
        "src",
        "server",
        "registry",
        "example",
        "bin",
        "deploy",
      ],
      { label: "ignored production input inspection" },
    ),
  );
  const tag = spawnSync(
    "git",
    ["rev-parse", "--verify", `refs/tags/${contract.source.expectedTag}`],
    {
      cwd: root,
      encoding: "utf8",
    },
  );
  const nodeVersion = runtime.nodeVersion ?? process.version;
  const npmVersion =
    runtime.npmVersion ??
    run(process.platform === "win32" ? "npm.cmd" : "npm", ["--version"], {
      cwd: root,
      label: "npm version inspection",
    }).trim();
  const lockfileRoot = lockfile.packages?.[""];
  const manifestLockFields = [
    "name",
    "version",
    "license",
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
    "peerDependenciesMeta",
    "bin",
    "engines",
  ];
  const normalizedLockMetadata = Object.fromEntries(
    manifestLockFields
      .filter((name) => manifest[name] !== undefined || lockfileRoot?.[name] !== undefined)
      .map((name) => [name, lockfileRoot?.[name]]),
  );
  const normalizedManifestMetadata = Object.fromEntries(
    manifestLockFields
      .filter((name) => manifest[name] !== undefined || lockfileRoot?.[name] !== undefined)
      .map((name) => [name, manifest[name]]),
  );

  const failures = [];
  if (workingTree !== "") failures.push("working tree is not clean");
  if (!commit) failures.push("source commit is missing");
  if (shallow !== "false") failures.push("repository is shallow");
  if (branch !== contract.source.expectedBranch)
    failures.push("branch does not match the release contract");
  if (tag.status === 0) failures.push("expected release tag already exists");
  if (submodules && outputLines(submodules).some((line) => /^[-+U]/u.test(line))) {
    failures.push("submodules are not at committed revisions");
  }
  if (ignoredProductionInputs.length > 0) failures.push("ignored production inputs are present");
  if (manifest.name !== contract.package.name)
    failures.push("package name does not match the release contract");
  if (!stableVersion.test(manifest.version) || manifest.version !== contract.version) {
    failures.push("package version does not match the release contract");
  }
  if (lockfile.version !== manifest.version || lockfileRoot?.version !== manifest.version) {
    failures.push("lockfile root version does not match package.json");
  }
  if (JSON.stringify(normalizedLockMetadata) !== JSON.stringify(normalizedManifestMetadata)) {
    failures.push("lockfile root metadata does not match package.json");
  }
  if (major(nodeVersion) < major(contract.support.node))
    failures.push("Node version is unsupported");
  if (major(npmVersion) < major(contract.support.npm)) failures.push("npm version is unsupported");
  if (!Number.isSafeInteger(sourceDateEpoch) || sourceDateEpoch <= 0) {
    failures.push("commit timestamp is invalid");
  }
  assert(failures.length === 0, `Candidate preflight failed: ${failures.join("; ")}.`);

  return {
    identity: {
      package: manifest.name,
      version: manifest.version,
      branch,
      commit,
      tree,
      sourceDateEpoch,
      packageJsonSha256: await sha(manifestPath),
      lockfileSha256: await sha(lockfilePath),
      contractSha256: await sha(resolve(root, "quality/release-contract.json")),
    },
    preflight: {
      cleanWorkingTree: true,
      committedSource: true,
      nonShallow: true,
      expectedBranch: true,
      tagAbsent: true,
      submodulesClean: true,
      lockfileClean: true,
      ignoredProductionInputs,
      environmentNames: contract.candidate.environmentNames.filter((name) =>
        Object.hasOwn(environment, name),
      ),
      redacted: true,
    },
    environment: {
      node: nodeVersion,
      npm: npmVersion,
      platform: runtime.platform ?? process.platform,
      architecture: runtime.architecture ?? process.arch,
    },
  };
}

export async function fileManifest(directory) {
  const entries = [];
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const child = resolve(path, entry.name);
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) {
        const metadata = await stat(child);
        entries.push({
          path: repositoryPath(directory, child),
          mode: (metadata.mode & 0o7777).toString(8).padStart(4, "0"),
          bytes: metadata.size,
          sha256: await sha(child),
        });
      }
    }
  }
  await visit(directory);
  return entries.toSorted((left, right) => left.path.localeCompare(right.path));
}

export async function validateQualityReport(root, path, mode, requiredGates) {
  const absolutePath = resolve(root, path);
  const report = await readJson(absolutePath);
  assert(report.schema === "jqstar-quality-report/1", `${mode} quality report schema is invalid.`);
  assert(report.mode === mode, `Expected ${mode} quality report; received ${String(report.mode)}.`);
  assert(report.status === "pass", `${mode} quality report did not pass.`);
  assert(
    report.startFingerprint?.digest === report.endFingerprint?.digest &&
      report.startFingerprint?.fileCount === report.endFingerprint?.fileCount,
    `${mode} quality report tree changed during execution.`,
  );
  const gates = report.gates.map(({ id, status }) => ({ id, status }));
  assert(
    JSON.stringify(gates.map(({ id }) => id)) === JSON.stringify(requiredGates),
    `${mode} quality report gate set does not match the release contract.`,
  );
  assert(
    gates.every(({ status }) => status === "pass"),
    `${mode} quality report has a non-pass gate.`,
  );
  return {
    mode,
    command: mode === "delivery" ? "npm run check" : "npm run quality:full-audit",
    report: repositoryPath(root, absolutePath),
    sha256: await sha(absolutePath),
    status: "pass",
    gates,
  };
}

export function makeRunId(date = new Date(), pid = process.pid) {
  return `${date
    .toISOString()
    .replace(/:/gu, "-")
    .replace(/\.(?=[0-9]{3}Z$)/u, "-")}-${String(pid)}`;
}

export function releaseRunDirectory(root, contract, runId) {
  return resolve(root, contract.candidate.outputRoot, runId);
}

export function readOptions(arguments_, names) {
  const allowed = new Set(names);
  const options = {};
  for (let index = 0; index < arguments_.length; index += 1) {
    const name = arguments_[index];
    assert(name.startsWith("--") && allowed.has(name.slice(2)), `Unknown release option ${name}.`);
    const value = arguments_[index + 1];
    assert(value && !value.startsWith("--"), `Release option ${name} needs a value.`);
    options[name.slice(2)] = value;
    index += 1;
  }
  return options;
}

export async function latestReleaseRun(root, contract) {
  const pointer = await readJson(resolve(root, contract.candidate.outputRoot, "latest-run.json"));
  assert(
    typeof pointer.runId === "string" && pointer.runId.length > 0,
    "Latest release run pointer is invalid.",
  );
  return pointer.runId;
}

export async function writeLatestReleaseRun(root, contract, runId, stage) {
  await writeJson(resolve(root, contract.candidate.outputRoot, "latest-run.json"), {
    schema: "jqstar-release-run-pointer/1",
    runId,
    stage,
  });
}

export function assertRedacted(value) {
  function visit(current) {
    if (typeof current === "string") {
      assert(
        !/(?:^|[\s="'(]|file:\/\/)(?:\/(?:Users|home|private|tmp)\/|[A-Za-z]:[\\/])/u.test(current),
        "Report contains an absolute private path.",
      );
      return;
    }
    if (Array.isArray(current)) {
      for (const entry of current) visit(entry);
      return;
    }
    if (!current || typeof current !== "object") return;
    for (const [name, entry] of Object.entries(current)) {
      if (/(?:^|_)(?:token|password|secret|credential)s?$/iu.test(name)) {
        assert(entry === "absent" || entry === false, "Report contains a credential-like field.");
      }
      visit(entry);
    }
  }
  visit(value);
  return value;
}
