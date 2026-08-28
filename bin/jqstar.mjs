#!/usr/bin/env node

import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultRegistryPath = join(packageRoot, "registry.json");
const configName = "jquery-star.json";

function fail(message) {
  throw new Error(message);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function readJson(path, label) {
  let source;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      fail(`${label} was not found: ${path}`);
    }
    throw error;
  }

  try {
    return JSON.parse(source);
  } catch {
    fail(`${label} is not valid JSON: ${path}`);
  }
}

function parseArguments(argv) {
  const positionals = [];
  const options = { cwd: process.cwd(), dryRun: false, force: false, json: false, type: "all" };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--cwd") {
      const value = argv[index + 1];
      if (!value) fail("--cwd needs a directory.");
      options.cwd = resolve(value);
      index += 1;
    } else if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--force") {
      options.force = true;
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--type") {
      const value = argv[index + 1];
      if (!value) fail("--type needs one of: all, component, block.");
      options.type = value;
      index += 1;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument?.startsWith("-")) {
      fail(`Unknown option: ${argument}`);
    } else if (argument) {
      positionals.push(argument);
    }
  }

  return { options, positionals };
}

function safeProjectPath(cwd, path) {
  const target = resolve(cwd, path);
  const fromRoot = relative(cwd, target);
  if (fromRoot === "" || fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
    fail(`Path must stay inside the project: ${path}`);
  }
  return target;
}

async function readConfig(cwd, required = false) {
  const path = join(cwd, configName);
  if (!(await exists(path))) {
    if (required) fail(`Run \`jqstar init\` first. Missing ${configName} in ${cwd}.`);
    return {
      path,
      value: { blocksOutput: "blocks/jquery-star", output: "components/jquery-star" },
    };
  }

  const value = await readJson(path, "Project configuration");
  if (!value || typeof value !== "object" || typeof value.output !== "string") {
    fail(`${configName} must contain a non-empty string "output".`);
  }
  if (!value.output.trim()) fail(`${configName} must contain a non-empty string "output".`);
  safeProjectPath(cwd, value.output);
  if (
    value.blocksOutput !== undefined &&
    (typeof value.blocksOutput !== "string" || !value.blocksOutput.trim())
  ) {
    fail(`${configName} "blocksOutput" must be a non-empty string when provided.`);
  }
  if (value.blocksOutput !== undefined) safeProjectPath(cwd, value.blocksOutput);
  if (value.registry !== undefined && typeof value.registry !== "string") {
    fail(`${configName} "registry" must be a string when provided.`);
  }
  return { path, value };
}

async function readRegistry(cwd, config) {
  const path = config.registry ? resolve(cwd, config.registry) : defaultRegistryPath;
  const registry = await readJson(path, "Component registry");
  if (!registry || !Array.isArray(registry.items)) {
    fail(`Component registry must contain an items array: ${path}`);
  }
  return { path, registry };
}

function itemMap(registry) {
  const map = new Map();
  for (const item of registry.items) {
    if (!item || typeof item.name !== "string" || map.has(item.name)) {
      fail("Every registry item needs a unique string name.");
    }
    map.set(item.name, item);
  }
  return map;
}

function help() {
  return `jQuery Star source registry

Usage:
  jqstar init [--cwd <directory>]
  jqstar list [--type <all|component|block>] [--json] [--cwd <directory>]
  jqstar add <item...> [--dry-run] [--force] [--cwd <directory>]
  jqstar doctor [--json] [--cwd <directory>]

Commands:
  init    Create jquery-star.json with project-local component and block directories.
  list    Show source items available in the configured registry.
  add     Copy component recipes or blocks into the project. Existing files are preserved.
  doctor  Check configuration, dependencies, and installed recipes.
`;
}

async function init(options) {
  const cwd = resolve(options.cwd);
  const path = join(cwd, configName);
  if ((await exists(path)) && !options.force) {
    fail(`${configName} already exists. Pass --force to replace it.`);
  }
  const value = {
    $schema: "./node_modules/jquery-star/schema/jquery-star.schema.json",
    blocksOutput: "blocks/jquery-star",
    output: "components/jquery-star",
  };
  if (!options.dryRun) {
    await mkdir(cwd, { recursive: true });
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }
  return { action: options.dryRun ? "would-create" : "created", path };
}

async function list(options) {
  if (!["all", "block", "component"].includes(options.type)) {
    fail("--type needs one of: all, component, block.");
  }
  const { value: config } = await readConfig(options.cwd);
  const { registry } = await readRegistry(options.cwd, config);
  return registry.items
    .filter((item) => {
      if (options.type === "all") return true;
      return options.type === "block"
        ? item.type === "registry:block"
        : item.type !== "registry:block";
    })
    .map(({ description, name, title, type }) => ({
      name,
      title: title ?? name,
      description: description ?? "",
      type,
    }));
}

function destinationPath(cwd, config, item, file, fileName) {
  if (file.target !== undefined) {
    if (typeof file.target !== "string" || !file.target.trim()) {
      fail(`Registry file target must be a non-empty string: ${file.path}`);
    }
    const target = file.target.startsWith("~/") ? file.target.slice(2) : file.target;
    return safeProjectPath(cwd, target);
  }
  const output =
    item.type === "registry:block" ? (config.blocksOutput ?? config.output) : config.output;
  return safeProjectPath(cwd, join(output, fileName));
}

async function add(names, options) {
  if (names.length === 0) fail("Add at least one component name.");
  const { value: config } = await readConfig(options.cwd, true);
  const { path: registryPath, registry } = await readRegistry(options.cwd, config);
  const registryRoot = dirname(registryPath);
  const items = itemMap(registry);
  const plans = [];

  for (const name of [...new Set(names)]) {
    const item = items.get(name);
    if (!item) fail(`Unknown component: ${name}. Run \`jqstar list\` to see available names.`);
    if (!Array.isArray(item.files) || item.files.length === 0) {
      fail(`Registry item has no files: ${name}`);
    }
    for (const file of item.files) {
      if (!file || typeof file.path !== "string") fail(`Invalid file entry for ${name}.`);
      const source = resolve(registryRoot, file.path);
      const sourceFromRoot = relative(registryRoot, source);
      if (sourceFromRoot.startsWith("..") || isAbsolute(sourceFromRoot)) {
        fail(`Registry file escapes its root: ${file.path}`);
      }
      if (!(await exists(source))) fail(`Registry source file was not found: ${source}`);
      const fileName = file.path.split(/[\\/]/).at(-1);
      if (!fileName) fail(`Registry file has no file name: ${file.path}`);
      const destination = destinationPath(options.cwd, config, item, file, fileName);
      plans.push({ component: name, destination, source });
    }
  }

  const conflicts = [];
  for (const plan of plans) {
    if ((await exists(plan.destination)) && !options.force) conflicts.push(plan.destination);
  }
  if (conflicts.length > 0) {
    fail(
      `Refusing to overwrite existing files:\n${conflicts.map((path) => `  ${path}`).join("\n")}`,
    );
  }

  if (!options.dryRun) {
    for (const plan of plans) {
      await mkdir(dirname(plan.destination), { recursive: true });
      await copyFile(plan.source, plan.destination);
    }
  }

  return plans.map((plan) => ({
    action: options.dryRun ? "would-copy" : "copied",
    component: plan.component,
    path: plan.destination,
  }));
}

async function doctor(options) {
  const checks = [];
  const packagePath = join(options.cwd, "package.json");
  const hasPackage = await exists(packagePath);
  checks.push({ check: "package.json", ok: hasPackage, detail: packagePath });

  let packageJson = {};
  if (hasPackage) packageJson = await readJson(packagePath, "package.json");
  const dependencies = {
    ...packageJson.devDependencies,
    ...packageJson.dependencies,
    ...packageJson.peerDependencies,
  };
  checks.push({
    check: "jquery",
    ok: typeof dependencies.jquery === "string",
    detail: dependencies.jquery ?? "not declared",
  });
  checks.push({
    check: "jquery-star",
    ok: typeof dependencies["jquery-star"] === "string" || options.cwd === packageRoot,
    detail:
      dependencies["jquery-star"] ??
      (options.cwd === packageRoot ? "current package" : "not declared"),
  });

  const configResult = await readConfig(options.cwd);
  const hasConfig = await exists(configResult.path);
  checks.push({ check: configName, ok: hasConfig, detail: configResult.path });
  const output = safeProjectPath(options.cwd, configResult.value.output);
  checks.push({ check: "component directory", ok: await exists(output), detail: output });
  return checks;
}

function printResult(command, result, options) {
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (command === "list") {
    for (const item of result)
      process.stdout.write(`${item.name.padEnd(18)} ${item.description}\n`);
    return;
  }
  if (command === "doctor") {
    for (const item of result) {
      process.stdout.write(`${item.ok ? "pass" : "fail"}  ${item.check}: ${item.detail}\n`);
    }
    if (result.some((item) => !item.ok)) process.exitCode = 1;
    return;
  }
  for (const item of Array.isArray(result) ? result : [result]) {
    process.stdout.write(`${item.action} ${item.path}\n`);
  }
}

async function main() {
  const { options, positionals } = parseArguments(process.argv.slice(2));
  const command = positionals.shift();
  if (options.help || !command || command === "help") {
    process.stdout.write(help());
    return;
  }

  if (command === "init") printResult(command, await init(options), options);
  else if (command === "list") printResult(command, await list(options), options);
  else if (command === "add") printResult(command, await add(positionals, options), options);
  else if (command === "doctor") printResult(command, await doctor(options), options);
  else fail(`Unknown command: ${command}\n\n${help()}`);
}

main().catch((error) => {
  process.stderr.write(`jqstar: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
