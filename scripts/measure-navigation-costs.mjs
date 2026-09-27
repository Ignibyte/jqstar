import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "vite";

const root = resolve(".");
const directory = resolve(".git/jqstar/navigation-decision");
const consumer = join(directory, "consumer");
const prepared = JSON.parse(await readFile(join(directory, "build.json"), "utf8"));
const hash = (bytes, algorithm = "sha256", encoding = "hex") =>
  createHash(algorithm).update(bytes).digest(encoding);
const packages = [];

async function filesIn(directoryPath, prefix = "") {
  const files = [];
  for (const entry of await readdir(directoryPath, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory())
      files.push(...(await filesIn(join(directoryPath, entry.name), `${relative}/`)));
    else if (entry.isFile()) {
      const bytes = await readFile(join(directoryPath, entry.name));
      files.push({ path: relative, bytes: bytes.length, sha256: hash(bytes) });
    } else throw new Error("Unexpected symlink in the isolated installed package inventory.");
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

for (const [path, locked] of Object.entries(prepared.installedPackages)) {
  if (!path) continue;
  const manifest = JSON.parse(await readFile(join(consumer, path, "package.json"), "utf8"));
  const files = await filesIn(join(consumer, path));
  packages.push({
    path,
    name: manifest.name,
    version: manifest.version,
    integrity: locked.integrity,
    license: manifest.license,
    dependencies: manifest.dependencies ?? {},
    installedBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    files,
  });
}

const hosts = [];
for (const candidate of ["turbo-8.0.21", "turbo-8.0.23", "htmx-2.0.0", "htmx-2.0.10"]) {
  const pack = JSON.parse(
    await readFile(join(directory, "host-packages", `${candidate}.json`), "utf8"),
  )[0];
  const bytes = await readFile(join(directory, "host-packages", pack.filename));
  const alias = candidate.replaceAll(".", "-");
  const installed = packages.find((item) => item.path === `node_modules/${alias}`);
  if (`sha512-${hash(bytes, "sha512", "base64")}` !== installed.integrity)
    throw new Error("Host cost tarball differs from the installed comparison package.");
  hosts.push({
    candidate,
    filename: pack.filename,
    sha256: hash(bytes),
    integrity: installed.integrity,
    packedBytes: bytes.length,
    unpackedBytes: pack.unpackedSize,
    installedBytes: installed.installedBytes,
  });
}

const assets = join(directory, "cost-assets");
await mkdir(assets, { recursive: true });
const bundles = {};
for (const candidate of ["browser", ...hosts.map((host) => host.candidate)]) {
  const host = candidate.startsWith("turbo")
    ? "turbo"
    : candidate.startsWith("htmx")
      ? "htmx"
      : null;
  const alias = candidate.replaceAll(".", "-");
  const version = host ? candidate.slice(host.length + 1) : null;
  const hostImport =
    host === "turbo"
      ? `import * as host from ${JSON.stringify(alias)}; import { createTurboBridge } from "jquery-star/turbo";`
      : host === "htmx"
        ? `import host from ${JSON.stringify(`${alias}/dist/htmx.esm.js`)}; import { createHtmxBridge } from "jquery-star/htmx";`
        : "";
  const bridge =
    host === "turbo"
      ? `installed.star.use(createTurboBridge({ $, Turbo: host, version: ${JSON.stringify(version)} }));`
      : host === "htmx"
        ? `installed.star.use(createHtmxBridge({ $, htmx: host, version: ${JSON.stringify(version)} }));`
        : "";
  const entry = join(consumer, `cost-${candidate}.js`);
  await writeFile(
    entry,
    `import $ from "jquery"; import { installStarCore } from "jquery-star/core"; import { uiPlugin } from "jquery-star/ui"; ${hostImport}\nconst installed = installStarCore($); installed.star.use(uiPlugin); ${bridge}\ninstalled.star.boot();\n`,
  );
  const modules = new Set();
  await build({
    configFile: false,
    root: consumer,
    logLevel: "error",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    plugins: [
      {
        name: "navigation-cost-graph",
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
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  });
  const bytes = await readFile(join(assets, `${candidate}.js`));
  if ([...modules].some((path) => path.includes("test/fixtures/") || /^src\//.test(path)))
    throw new Error(
      "Production cost graph contains research instrumentation or repository source.",
    );
  bundles[candidate] = {
    rawBytes: bytes.length,
    gzipBytes: gzipSync(bytes).length,
    sha256: hash(bytes),
    modules: [...modules].sort(),
  };
}

const audit = JSON.parse(await readFile(join(directory, "audit.json"), "utf8"));
const result = {
  schema: "jqstar-navigation-costs/1",
  createdAt: new Date().toISOString(),
  collectorSha256: hash(await readFile(new URL(import.meta.url))),
  fixtureSha256: prepared.input.sha256,
  artifactSha256: prepared.tarball.sha256,
  packages,
  hosts,
  bundles,
  audit: { metadata: audit.metadata, vulnerabilities: audit.vulnerabilities },
};
const output = join(directory, `costs-${prepared.input.sha256}-${Date.now()}.json`);
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
console.log(`Navigation package and uninstrumented bundle cost evidence: ${output}`);
