import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { build } from "vite";

const root = process.cwd();
const fixture = resolve(root, "test/fixtures/resource-strategy");
const external = resolve(fixture, "external");
const output = resolve(
  process.env.JQS_RESOURCE_BUILD_DIRECTORY ?? ".git/jqstar/resource-strategy/build",
);
const lock = JSON.parse(await readFile(resolve(external, "package-lock.json"), "utf8"));
const expected = lock.packages["node_modules/@tanstack/query-core"];
if (
  expected.version !== "5.102.8" ||
  expected.integrity !==
    "sha512-ZNjkJ33CqvPNec/6lZBnHqLc3EVGPZ9ySLhYahU9TcuRFdmwXewuj0c4hwSWcGHqEUwcSrKeZ+oGcvPBqXcQcg=="
) {
  throw new Error("Research dependency differs from the reviewed exact package.");
}
let installed;
try {
  installed = JSON.parse(
    await readFile(resolve(external, "node_modules/@tanstack/query-core/package.json"), "utf8"),
  );
} catch {
  installed = null;
}
if (installed?.version !== expected.version) {
  const install = spawnSync(
    "npm",
    ["ci", "--prefix", external, "--ignore-scripts", "--no-fund", "--no-audit"],
    { stdio: "inherit" },
  );
  if (install.status !== 0) throw new Error("Exact research fixture installation failed.");
}
if (process.argv.includes("--install-only")) {
  console.log(`Verified private research dependency ${expected.version}.`);
  process.exit(0);
}
await mkdir(output, { recursive: true });
const entries = {
  baseline: "baseline-entry.ts",
  server: "server-entry.ts",
  external: "external/entry.ts",
  native: "native-entry.ts",
};
const reports = {};
for (const [strategy, entry] of Object.entries(entries)) {
  const modules = [];
  await build({
    configFile: false,
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    logLevel: "error",
    resolve: {
      alias: [
        { find: /^jquery-star\/core$/, replacement: resolve(root, "src/core.ts") },
        { find: /^jquery-star\/stores$/, replacement: resolve(root, "src/stores.ts") },
        { find: /^jquery-star\/datastar$/, replacement: resolve(root, "src/datastar.ts") },
      ],
    },
    plugins: [
      {
        name: "resource-research-graph",
        generateBundle(_options, bundle) {
          for (const chunk of Object.values(bundle)) {
            if (chunk.type === "chunk")
              modules.push(...Object.keys(chunk.modules).map((id) => id.replace(`${root}/`, "")));
          }
        },
      },
    ],
    build: {
      outDir: output,
      emptyOutDir: false,
      minify: "terser",
      target: "es2022",
      lib: { entry: resolve(fixture, entry), formats: ["es"], fileName: () => `${strategy}.js` },
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  });
  const bytes = await readFile(resolve(output, `${strategy}.js`));
  reports[strategy] = {
    raw: bytes.length,
    gzip: gzipSync(bytes).length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    modules: modules.sort(),
  };
}
await writeFile(resolve(output, "graphs.json"), `${JSON.stringify(reports, null, 2)}\n`);
console.log(`Prepared three isolated research bundles and a shared baseline in ${output}`);
