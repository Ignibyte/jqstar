import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const guard = fileURLToPath(new URL("./doctor-effects-guard.mjs", import.meta.url));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function snapshot(root, prefix = "") {
  const result = {};
  for (const entry of (await readdir(join(root, prefix), { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(result, await snapshot(root, path));
    else result[path] = digest(await readFile(join(root, path)));
  }
  return result;
}

export async function doctorConsumer(cli, root) {
  await mkdir(root, { recursive: true });
  const env = { ...process.env, NODE_OPTIONS: "", JQSTAR_DOCTOR_READONLY: "1" };
  const execute = (args, readonly = true, overrides = {}) =>
    spawnSync(process.execPath, ["--import", guard, ...args], {
      cwd: root,
      env: { ...env, JQSTAR_DOCTOR_READONLY: readonly ? "1" : "0", ...overrides },
      encoding: "utf8",
      timeout: 15000,
      maxBuffer: 4 * 1024 * 1024,
    });
  for (const source of [
    "await fetch('http://127.0.0.1:1')",
    "(await import('node:child_process')).spawn('never-execute')",
    "await (await import('node:fs/promises')).writeFile('never-write', 'x')",
  ]) {
    const result = execute(["--input-type=module", "--eval", source]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /JQSTAR_DOCTOR_EFFECT_DENIED/u);
  }
  const run = (args, expected = 0, readonly = true) => {
    const result = execute([cli, "doctor", "--cwd", root, ...args], readonly);
    assert.equal(result.status, expected, `${result.stdout}\n${result.stderr}`);
    assert.equal(result.stderr, "");
    return JSON.parse(result.stdout);
  };
  const legacyChecks = await legacyConsumer(cli, root, execute);
  const missingRules = execute([cli, "doctor", "--packages", "--json", "--cwd", root], true, {
    JQSTAR_DOCTOR_FAIL_RULES: "1",
  });
  assert.equal(missingRules.status, 2);
  assert.equal(missingRules.stderr, "");
  const unavailable = JSON.parse(missingRules.stdout);
  assert.equal(unavailable.schema, "jqstar-doctor-report/1");
  assert.equal(unavailable.version, null);
  assert.equal(unavailable.rulesReviewedAt, null);
  assert.equal(unavailable.complete, false);
  assert.equal(unavailable.diagnostics[0].code, "JQS_INTERNAL_ERROR");
  assert(!missingRules.stdout.includes("private-installed-rules-canary"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      name: "installed-doctor-consumer",
      dependencies: { jquery: "^4.0.0", "jquery-star": "^1.1.0" },
    }),
  );
  const original = '{ "output": "components", "registry": "private-consumer-canary" }\n';
  await writeFile(join(root, "jquery-star.json"), original);
  await writeFile(join(root, ".pnp.cjs"), "throw new Error('Never evaluate application code');\n");
  const locks = [
    [
      "package-lock.json",
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          "node_modules/jquery": { version: "4.0.0" },
          "node_modules/jquery-star": { version: "1.1.0" },
        },
      }),
    ],
    [
      "pnpm-lock.yaml",
      "lockfileVersion: '9.0'\nimporters:\n  .:\n    dependencies:\n      jquery: {version: 4.0.0}\n      jquery-star: {version: 1.1.0}\npackages:\n  jquery@4.0.0: {}\n  jquery-star@1.1.0: {}\n",
    ],
    [
      "yarn.lock",
      '# yarn lockfile v1\n\njquery@^4.0.0:\n  version "4.0.0"\n\njquery-star@^1.1.0:\n  version "1.1.0"\n',
    ],
    [
      "yarn.lock",
      '__metadata:\n  version: 8\n"jquery@npm:^4.0.0":\n  version: 4.0.0\n"jquery-star@npm:^1.1.0":\n  version: 1.1.0\n',
    ],
  ];
  for (const [name, source] of locks) {
    await writeFile(join(root, name), source);
    const before = await snapshot(root);
    const result = run(["--packages", "--json"]);
    assert.equal(result.complete, true);
    assert(!result.diagnostics.some((entry) => entry.code === "JQS_METADATA_UNKNOWN"));
    assert(!JSON.stringify(result).includes("private-consumer-canary"));
    assert.deepEqual(await snapshot(root), before);
    await rm(join(root, name));
  }
  await writeFile(join(root, "package-lock.json"), locks[0][1].replace('"4.0.0"', '"3.7.1"'));
  assert(
    run(["--packages", "--json"], 1).diagnostics.some(({ code }) => code === "JQS_PACKAGE_VERSION"),
  );
  const beforePlan = await snapshot(root);
  const plan = run(["--upgrade-config", "--json"]);
  assert.deepEqual(await snapshot(root), beforePlan);
  assert(!JSON.stringify(plan).includes("private-consumer-canary"));
  await writeFile(join(root, "plan.json"), JSON.stringify(plan));
  const beforeApply = await snapshot(root);
  assert.equal(run(["--apply", "plan.json", "--json"], 0, false).action, "applied");
  const afterApply = await snapshot(root);
  const changed = Object.keys(afterApply)
    .filter((key) => afterApply[key] !== beforeApply[key])
    .sort();
  assert.deepEqual(changed, ["jquery-star.json", plan.backup, plan.journal].sort());
  assert.equal(run(["--apply", "plan.json", "--json"], 0, false).action, "no-op");
  assert.deepEqual(await snapshot(root), afterApply);
  assert.equal(run(["--rollback", plan.journal, "--json"], 0, false).action, "rolled-back");
  assert.equal(await readFile(join(root, "jquery-star.json"), "utf8"), original);
  return {
    legacyChecks,
    lockFormats: 4,
    effectCanaries: 3,
    readOnlySnapshots: 5,
    migration: "apply, no-op, exact-byte rollback",
  };
}

async function legacyConsumer(cli, root, execute) {
  const cwd = join(root, "legacy");
  await mkdir(cwd);
  const run = (args, { status = 0, readonly = true, directory = cwd } = {}) => {
    const result = execute([cli, ...args, "--cwd", directory], readonly);
    assert.equal(result.status, status, `${result.stdout}\n${result.stderr}`);
    if (status === 0) assert.equal(result.stderr, "");
    return result;
  };
  const checks = [];
  const packageRoot = join(dirname(cli), "..");
  const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  for (const option of ["--version", "-v"])
    assert.equal(run([option]).stdout, `${manifest.version}\n`);
  checks.push("version");
  const all = JSON.parse(run(["list", "--json"]).stdout);
  assert.equal(all.length, 109);
  assert(all.some(({ name }) => name === "button"));
  for (const [type, count] of [
    ["component", 102],
    ["block", 7],
  ])
    assert.equal(JSON.parse(run(["list", "--type", type, "--json"]).stdout).length, count);
  checks.push("registry-list-and-filters");
  const beforeInit = await snapshot(cwd);
  assert.match(run(["init", "--dry-run"]).stdout, /would-create/u);
  assert.deepEqual(await snapshot(cwd), beforeInit);
  run(["init"], { readonly: false });
  const config = await readFile(join(cwd, "jquery-star.json"), "utf8");
  assert.equal(JSON.parse(config).output, "components/jquery-star");
  assert.equal(JSON.parse(config).blocksOutput, "blocks/jquery-star");
  assert.match(run(["init"], { status: 1 }).stderr, /already exists/u);
  checks.push("init-and-init-dry-run");
  const beforeDryRun = await snapshot(cwd);
  assert.match(run(["add", "tabs", "--dry-run"]).stdout, /would-copy/u);
  assert.deepEqual(await snapshot(cwd), beforeDryRun);
  checks.push("add-dry-run");
  run(["add", "button", "dialog"], { readonly: false });
  const installedButton = await readFile(
    join(packageRoot, "registry/components/button.html"),
    "utf8",
  );
  const button = join(cwd, "components/jquery-star/button.html");
  assert.equal(await readFile(button, "utf8"), installedButton);
  assert.equal(
    await readFile(join(cwd, "components/jquery-star/dialog.html"), "utf8"),
    await readFile(join(packageRoot, "registry/components/dialog.html"), "utf8"),
  );
  checks.push("component-copy-bytes");
  const custom = "<!-- consumer-owned button -->\n";
  await writeFile(button, custom);
  assert.match(run(["add", "button"], { status: 1 }).stderr, /Refusing to overwrite/u);
  assert.equal(await readFile(button, "utf8"), custom);
  const block = JSON.parse(
    run(["add", "operations-dashboard", "--json"], { readonly: false }).stdout,
  );
  assert.equal(block.length, 15);
  assert.equal(block.find(({ component }) => component === "button").action, "skipped-existing");
  assert.equal(await readFile(button, "utf8"), custom);
  for (const extension of ["html", "ts"])
    assert.equal(
      await readFile(join(cwd, `blocks/jquery-star/operations-dashboard.${extension}`), "utf8"),
      await readFile(
        join(packageRoot, `registry/blocks/operations-dashboard.${extension}`),
        "utf8",
      ),
    );
  checks.push("block-dependencies-and-consumer-ownership");
  run(["add", "button", "--force"], { readonly: false });
  assert.equal(await readFile(button, "utf8"), installedButton);
  checks.push("explicit-force");
  const nested = JSON.parse(run(["add", "access-manager", "--json"], { readonly: false }).stdout);
  assert.equal(nested.filter(({ component }) => component === "button").length, 1);
  checks.push("nested-dependency-deduplication");
  const noDeps = join(cwd, "no-deps");
  await mkdir(noDeps);
  run(["init"], { readonly: false, directory: noDeps });
  const onlyBlock = JSON.parse(
    run(["add", "operations-dashboard", "--no-deps", "--json"], {
      readonly: false,
      directory: noDeps,
    }).stdout,
  );
  assert.equal(onlyBlock.length, 2);
  assert(onlyBlock.every(({ dependency }) => dependency === false));
  assert(!(await snapshot(noDeps))["components/jquery-star/button.html"]);
  checks.push("no-deps");
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({ dependencies: { jquery: "^4.0.0", "jquery-star": "^1.1.0" } }),
  );
  const beforeDoctor = await snapshot(cwd);
  const diagnostics = JSON.parse(run(["doctor", "--json"]).stdout);
  assert(diagnostics.length > 0 && diagnostics.every(({ ok }) => ok));
  assert.deepEqual(await snapshot(cwd), beforeDoctor);
  checks.push("legacy-registry-doctor");
  await writeFile(join(cwd, "jquery-star.json"), JSON.stringify({ output: "../outside" }));
  const beforePath = await snapshot(root);
  assert.match(run(["add", "button"], { status: 1 }).stderr, /Path must stay inside the project/u);
  assert.deepEqual(await snapshot(root), beforePath);
  checks.push("output-path-boundary");
  await writeFile(
    join(cwd, "jquery-star.json"),
    JSON.stringify({ output: "external-components", registry: "./registry.json" }),
  );
  await writeFile(join(cwd, "external.html"), "<section>External recipe</section>\n");
  await writeFile(
    join(cwd, "registry.json"),
    JSON.stringify({
      items: [
        {
          name: "external",
          type: "registry:block",
          files: [{ path: "external.html", type: "registry:file" }],
        },
      ],
    }),
  );
  run(["add", "external"], { readonly: false });
  assert.equal(
    await readFile(join(cwd, "external-components/external.html"), "utf8"),
    "<section>External recipe</section>\n",
  );
  checks.push("legacy-external-registry");
  await writeFile(
    join(cwd, "registry.json"),
    JSON.stringify({
      items: [
        {
          name: "a",
          type: "registry:item",
          registryDependencies: ["b"],
          files: [{ path: "a.html" }],
        },
        {
          name: "b",
          type: "registry:item",
          registryDependencies: ["a"],
          files: [{ path: "b.html" }],
        },
      ],
    }),
  );
  const beforeCycle = await snapshot(cwd);
  assert.match(run(["add", "a"], { status: 1 }).stderr, /Registry dependency cycle: a -> b -> a/u);
  assert.deepEqual(await snapshot(cwd), beforeCycle);
  checks.push("dependency-cycle-refusal");
  return checks;
}
