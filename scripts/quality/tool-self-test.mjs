import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { repositoryRoot, run } from "./static-lib.mjs";

const architectureSabotage = [
  {
    id: "no-circular",
    files: { "src/a.ts": "import './b';\n", "src/b.ts": "import './a';\n" },
  },
  { id: "no-unresolved", files: { "src/a.ts": "import './missing';\n" } },
  {
    id: "no-unresolved-built-smoke",
    files: {
      "src/green.ts": "export {};\n",
      "scripts/smoke-built.mjs": "import '../dist/unexpected.js';\n",
    },
  },
  {
    id: "no-production-to-tests",
    files: { "src/a.ts": "import '../test/a';\n", "test/a.ts": "export {};\n" },
  },
  {
    id: "no-runtime-to-application-source",
    files: { "src/a.ts": "import '../example/a';\n", "example/a.ts": "export {};\n" },
  },
  {
    id: "no-server-to-ui",
    files: { "server/a.ts": "import '../src/ui/a';\n", "src/ui/a.ts": "export {};\n" },
  },
  {
    id: "no-core-to-ui-except-compatibility-runtime",
    files: { "src/core.ts": "import './ui/a';\n", "src/ui/a.ts": "export {};\n" },
  },
  {
    id: "no-ui-to-request-or-expression-internals",
    files: { "src/ui/a.ts": "import '../fetch';\n", "src/fetch.ts": "export {};\n" },
  },
  {
    id: "no-production-dev-dependencies",
    files: {
      "src/a.ts": "import 'vitest';\n",
      "package.json": JSON.stringify({ devDependencies: { vitest: "^3.2.4" } }),
    },
  },
];

async function writeFixture(root, files) {
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { moduleResolution: "bundler" } }),
  );
  for (const directory of ["src", "server", "test", "example", "scripts"]) {
    await mkdir(join(root, directory), { recursive: true });
  }
  for (const [path, source] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, source);
  }
}

async function selfTestArchitecture(root) {
  const config = resolve(repositoryRoot, ".dependency-cruiser.cjs");
  for (const fixture of architectureSabotage) {
    const fixtureRoot = join(root, fixture.id);
    await mkdir(fixtureRoot);
    await writeFixture(fixtureRoot, fixture.files);
    await symlink(
      resolve(repositoryRoot, "node_modules"),
      join(fixtureRoot, "node_modules"),
      "dir",
    );
    const red = await run(
      resolve(repositoryRoot, "node_modules/.bin/depcruise"),
      ["src", "server", "test", "example", "scripts", "--config", config, "--output-type", "err"],
      { capture: true, cwd: fixtureRoot },
    );
    assert.notEqual(red.code, 0, `${fixture.id} sabotage stayed green`);
    assert(
      `${red.stdout}\n${red.stderr}`.includes(fixture.id),
      `${fixture.id} was not the rejecting rule: ${red.stdout}${red.stderr}`,
    );
  }
  const greenRoot = join(root, "architecture-green");
  await mkdir(greenRoot);
  await writeFixture(greenRoot, {
    "src/a.ts": "import './b';\n",
    "src/b.ts": "export {};\n",
    "scripts/smoke-built.mjs":
      "import '../dist/jquery-star.js';\nimport '../dist/jquery-star.umd.cjs';\n",
  });
  const green = await run(
    resolve(repositoryRoot, "node_modules/.bin/depcruise"),
    ["src", "scripts", "--config", config, "--output-type", "err"],
    { capture: true, cwd: greenRoot },
  );
  assert.equal(green.code, 0, `architecture green fixture failed: ${green.stdout}${green.stderr}`);
}

async function selfTestSemgrep(root) {
  const fixtureRoot = join(root, "semgrep");
  await writeFixture(fixtureRoot, {
    "src/dynamic.ts": "eval('unsafe');\n",
    "src/global.ts": "window.jqstarOwned = {};\n",
    "src/private.ts": "import thing from 'jquery-star/src/private';\nvoid thing;\n",
    "src/test-import.ts": "import { test } from 'vitest';\nvoid test;\n",
    "scripts/shell.ts":
      "import { spawn } from 'node:child_process';\nspawn('x', [], { shell: true });\n",
    "server/event.ts": "export const event = 'event: datastar-patch';\n",
  });
  const red = await run(
    "semgrep",
    [
      "scan",
      "--config",
      resolve(repositoryRoot, ".semgrep.yml"),
      "--error",
      "--strict",
      "--metrics",
      "off",
      "--json",
      ".",
    ],
    { capture: true, cwd: fixtureRoot },
  );
  assert.notEqual(red.code, 0, "Semgrep sabotage stayed green");
  const report = JSON.parse(red.stdout);
  const found = new Set(report.results.map((result) => result.check_id));
  for (const id of [
    "jqstar.dynamic-eval-outside-trusted-engine",
    "jqstar.production-test-import",
    "jqstar.unowned-global-write",
    "jqstar.shell-command-interpolation",
    "jqstar.handwritten-datastar-event",
    "jqstar.private-package-entry",
  ]) {
    assert(
      [...found].some((foundId) => foundId.endsWith(id)),
      `${id} sabotage stayed green; found ${[...found].join(", ")}; ${red.stderr}`,
    );
  }
  await rm(fixtureRoot, { recursive: true, force: true });
  await mkdir(fixtureRoot);
  await writeFixture(fixtureRoot, { "src/green.ts": "export const safe = true;\n" });
  const green = await run(
    "semgrep",
    [
      "scan",
      "--config",
      resolve(repositoryRoot, ".semgrep.yml"),
      "--error",
      "--strict",
      "--metrics",
      "off",
      ".",
    ],
    { capture: true, cwd: fixtureRoot },
  );
  assert.equal(green.code, 0, `Semgrep green fixture failed: ${green.stdout}${green.stderr}`);
}

async function selfTestGitleaks(root) {
  const fixtureRoot = join(root, "gitleaks");
  await mkdir(fixtureRoot);
  const plantedSecret = "sk_live_" + "51H8ZKJ4P2Q7W9N6M3R5T8V1";
  await writeFile(join(fixtureRoot, "credentials.env"), `STRIPE_SECRET_KEY=${plantedSecret}\n`);
  const args = [
    "dir",
    ".",
    "--config",
    resolve(repositoryRoot, ".gitleaks.toml"),
    "--no-banner",
    "--no-color",
    "--redact",
    "--verbose",
  ];
  const red = await run("gitleaks", args, { capture: true, cwd: fixtureRoot });
  assert.notEqual(red.code, 0, "gitleaks secret sabotage stayed green");
  const diagnostic = `${red.stdout}\n${red.stderr}`;
  assert(diagnostic.includes("REDACTED"), "gitleaks diagnostic did not redact the secret");
  assert(!diagnostic.includes(plantedSecret), "gitleaks diagnostic exposed the planted secret");
  await rm(join(fixtureRoot, "credentials.env"));
  await writeFile(join(fixtureRoot, "green.txt"), "no credentials here\n");
  const green = await run("gitleaks", args, { capture: true, cwd: fixtureRoot });
  assert.equal(green.code, 0, `gitleaks green fixture failed: ${green.stdout}${green.stderr}`);

  const historyRoot = join(root, "gitleaks-history");
  await mkdir(historyRoot);
  const git = async (...gitArgs) => {
    const result = await run("git", gitArgs, { capture: true, cwd: historyRoot });
    assert.equal(
      result.code,
      0,
      `git ${gitArgs.join(" ")} failed: ${result.stdout}${result.stderr}`,
    );
  };
  await git("init", "--initial-branch=main");
  await git("config", "user.name", "jQStar quality fixture");
  await git("config", "user.email", "quality-fixture@example.invalid");
  await writeFile(join(historyRoot, "source.txt"), "clean source history\n");
  await git("add", "source.txt");
  await git("commit", "-m", "Create clean source history");
  await git("switch", "--orphan", "pages");
  await rm(join(historyRoot, "source.txt"), { force: true });
  await writeFile(join(historyRoot, "generated.env"), `STRIPE_SECRET_KEY=${plantedSecret}\n`);
  await git("add", "--all");
  await git("commit", "-m", "Publish generated site");
  await git("switch", "main");

  const historyArgs = [
    "git",
    ".",
    "--log-opts=HEAD",
    "--config",
    resolve(repositoryRoot, ".gitleaks.toml"),
    "--no-banner",
    "--no-color",
    "--redact",
    "--verbose",
  ];
  const sourceHistoryGreen = await run("gitleaks", historyArgs, {
    capture: true,
    cwd: historyRoot,
  });
  assert.equal(
    sourceHistoryGreen.code,
    0,
    `orphan deployment ref contaminated source history: ${sourceHistoryGreen.stdout}${sourceHistoryGreen.stderr}`,
  );

  await writeFile(join(historyRoot, "credentials.env"), `STRIPE_SECRET_KEY=${plantedSecret}\n`);
  await git("add", "credentials.env");
  await git("commit", "-m", "Plant source-history secret");
  const sourceHistoryRed = await run("gitleaks", historyArgs, {
    capture: true,
    cwd: historyRoot,
  });
  assert.notEqual(sourceHistoryRed.code, 0, "gitleaks HEAD-history sabotage stayed green");
  const historyDiagnostic = `${sourceHistoryRed.stdout}\n${sourceHistoryRed.stderr}`;
  assert(historyDiagnostic.includes("REDACTED"), "gitleaks history diagnostic was not redacted");
  assert(!historyDiagnostic.includes(plantedSecret), "gitleaks history exposed the planted secret");
}

const root = await mkdtemp(join(tmpdir(), "jqstar-tool-self-test-"));
try {
  await selfTestArchitecture(root);
  await selfTestSemgrep(root);
  await selfTestGitleaks(root);
} finally {
  await rm(root, { recursive: true, force: true });
}
process.stdout.write(
  `external tool self-test: ${architectureSabotage.length} architecture rules, 6 Semgrep rules, and gitleaks proved red/green\n`,
);
