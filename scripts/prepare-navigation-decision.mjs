import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, ".git/jqstar/navigation-decision");
const consumer = join(output, "consumer");
const assets = join(output, "assets");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const aliases = ["turbo-8-0-21", "turbo-8-0-23", "htmx-2-0-0", "htmx-2-0-10"];

async function inventory(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await inventory(path)));
    else result.push({ path: path.slice(root.length + 1), sha256: hash(await readFile(path)) });
  }
  return result.sort((left, right) => left.path.localeCompare(right.path));
}
export async function navigationInputIdentity() {
  const paths = [
    "package.json",
    "package-lock.json",
    "vite.config.ts",
    "scripts/build-types.mjs",
    "scripts/prepare-navigation-decision.mjs",
    "scripts/measure-navigation-decision.mjs",
    "scripts/quality/navigation-evidence.mjs",
  ];
  const files = [
    ...(await inventory(join(root, "src"))),
    ...(await inventory(join(root, "test/fixtures/navigation-decision"))),
  ];
  for (const path of paths) files.push({ path, sha256: hash(await readFile(join(root, path))) });
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { sha256: hash(JSON.stringify(files)), files };
}
function command(executable, args, cwd = root) {
  return execFileSync(executable, args, { cwd, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
}

export async function prepareNavigationDecision({ force = false } = {}) {
  const input = await navigationInputIdentity();
  if (!force) {
    try {
      const cached = JSON.parse(await readFile(join(output, "build.json"), "utf8"));
      if (cached.input.sha256 === input.sha256) {
        for (const candidate of Object.values(cached.bundles)) {
          if (hash(await readFile(join(assets, candidate.filename))) !== candidate.sha256)
            throw new Error("Stale candidate bundle.");
        }
        if (hash(await readFile(cached.tarball.path)) !== cached.tarball.sha256)
          throw new Error("Stale package artifact.");
        return cached;
      }
    } catch {
      // Missing or mismatched artifacts require fresh exact-package preparation.
    }
  }
  await mkdir(consumer, { recursive: true });
  await mkdir(assets, { recursive: true });
  command("npm", ["run", "build:self-hosted"]);
  const packed = JSON.parse(
    command("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", output]),
  )[0];
  const tarballBytes = await readFile(join(output, packed.filename));
  const artifactFilename = packed.filename.replace(/\.tgz$/, `-${hash(tarballBytes)}.tgz`);
  const tarballPath = join(output, artifactFilename);
  await writeFile(tarballPath, tarballBytes);
  const rootPackage = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const rootLock = JSON.parse(await readFile(join(root, "package-lock.json"), "utf8"));
  const dependencies = {
    "jquery-star": `file:${tarballPath}`,
    jquery: rootLock.packages["node_modules/jquery"].version,
  };
  for (const alias of aliases) dependencies[alias] = rootPackage.devDependencies[alias];
  await writeFile(
    join(consumer, "package.json"),
    `${JSON.stringify({ name: "jqstar-navigation-research-consumer", private: true, type: "module", dependencies }, null, 2)}\n`,
  );
  command(
    "npm",
    ["install", "--ignore-scripts", "--no-fund", "--no-audit", "--legacy-peer-deps"],
    consumer,
  );
  const installedLock = JSON.parse(await readFile(join(consumer, "package-lock.json"), "utf8"));
  const packages = [];
  for (const alias of ["jquery", ...aliases]) {
    const expected = rootLock.packages[`node_modules/${alias}`];
    const actual = installedLock.packages[`node_modules/${alias}`];
    if (actual.version !== expected.version || actual.integrity !== expected.integrity)
      throw new Error(`Installed ${alias} differs from the reviewed root lock.`);
    const manifest = JSON.parse(
      await readFile(join(consumer, "node_modules", alias, "package.json"), "utf8"),
    );
    packages.push({
      alias,
      name: manifest.name,
      version: manifest.version,
      integrity: actual.integrity,
      license: manifest.license,
      dependencies: manifest.dependencies ?? {},
    });
  }
  const bundles = {};
  for (const candidate of [
    "browser-nojs",
    "browser",
    "turbo-8.0.21",
    "turbo-8.0.23",
    "htmx-2.0.0",
    "htmx-2.0.10",
  ]) {
    const host = candidate.startsWith("turbo")
      ? "turbo"
      : candidate.startsWith("htmx")
        ? "htmx"
        : "browser";
    const version = candidate.slice(host.length + 1);
    const alias = candidate.replaceAll(".", "-");
    const hostImport =
      host === "turbo"
        ? `import * as hostLibrary from ${JSON.stringify(alias)}; import { createTurboBridge } from "jquery-star/turbo";`
        : host === "htmx"
          ? `import hostLibrary from ${JSON.stringify(`${alias}/dist/htmx.esm.js`)}; import { createHtmxBridge } from "jquery-star/htmx";`
          : "";
    const factory =
      host === "turbo"
        ? `($) => createTurboBridge({ $, Turbo: hostLibrary, version: ${JSON.stringify(version)} })`
        : host === "htmx"
          ? `($) => createHtmxBridge({ $, htmx: hostLibrary, version: ${JSON.stringify(version)} })`
          : "undefined";
    const configuration =
      host === "htmx"
        ? `if (configured) hostLibrary.config.responseHandling = [{ code: "204", swap: false }, { code: "[2345]..", swap: true, error: false }];`
        : "";
    const entry = join(consumer, `${candidate}.js`);
    await writeFile(
      entry,
      `import $ from "jquery";\nimport { installStarCore } from "jquery-star/core";\nimport { uiPlugin } from "jquery-star/ui";\nimport { configured } from "/navigation/configuration.js";\nimport { bootNavigationFixture } from ${JSON.stringify(join(root, "test/fixtures/navigation-decision/bootstrap.js"))};\n${hostImport}\n${configuration}\nbootNavigationFixture({ $, installStarCore, uiPlugin, host: ${JSON.stringify(host)}, configured, createBridge: ${factory} });\n`,
    );
    const modules = new Set();
    await build({
      configFile: false,
      root: consumer,
      logLevel: "error",
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
      plugins: [
        {
          name: "navigation-installed-graph",
          generateBundle(_options, bundle) {
            for (const chunk of Object.values(bundle))
              if (chunk.type === "chunk") {
                for (const module of Object.keys(chunk.modules))
                  modules.add(module.replace(`${root}/`, ""));
              }
          },
        },
      ],
      build: {
        outDir: assets,
        emptyOutDir: false,
        minify: "terser",
        target: "es2022",
        lib: { entry, formats: ["es"], fileName: () => `${candidate}.js` },
        rollupOptions: {
          external: ["/navigation/configuration.js"],
          output: { inlineDynamicImports: true },
        },
      },
    });
    const bytes = await readFile(join(assets, `${candidate}.js`));
    if ([...modules].some((path) => /(?:^|\/)src\//.test(path) && !path.includes("node_modules")))
      throw new Error(
        "Navigation comparison resolved repository source instead of installed jQStar.",
      );
    if (![...modules].some((path) => path.includes("consumer/node_modules/jquery-star/dist/")))
      throw new Error("The candidate graph lacks installed jQStar.");
    bundles[candidate] = {
      filename: `${candidate}.js`,
      rawBytes: bytes.length,
      gzipBytes: gzipSync(bytes).length,
      sha256: hash(bytes),
      modules: [...modules].sort(),
    };
  }
  const result = {
    schema: "jqstar-navigation-build/1",
    input,
    assets,
    tarball: {
      path: tarballPath,
      filename: artifactFilename,
      sha256: hash(await readFile(tarballPath)),
      integrity: packed.integrity,
      packedBytes: packed.size,
      unpackedBytes: packed.unpackedSize,
    },
    packages,
    installedPackages: installedLock.packages,
    bundles,
  };
  if ((await navigationInputIdentity()).sha256 !== input.sha256)
    throw new Error("Navigation inputs changed during preparation.");
  await writeFile(join(output, "build.json"), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const result = await prepareNavigationDecision({ force: process.argv.includes("--force") });
  console.log(
    `Prepared installed navigation candidates from ${result.tarball.filename} (${result.tarball.sha256}).`,
  );
}
