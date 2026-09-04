import { access, readFile, readdir } from "node:fs/promises";

const base = "/jqstar/";
const agentArtifacts = [
  "demo-dist/docs/agents/index.html",
  "demo-dist/llms.txt",
  "demo-dist/llms-full.txt",
  "demo-dist/jqstar-agent-index.json",
];

for (const path of [
  "demo-dist/index.html",
  "demo-dist/docs/csp/index.html",
  "demo-dist/docs/compatibility/index.html",
  "demo-dist/docs/migration/index.html",
  "demo-dist/docs/security/index.html",
  "demo-dist/docs/download/index.html",
  "demo-dist/docs/interoperability/index.html",
  "demo-dist/docs/ecosystem/index.html",
  ...agentArtifacts,
]) {
  await access(path);
}

const [home, guide, llms, full, indexSource] = await Promise.all([
  readFile("demo-dist/index.html", "utf8"),
  ...agentArtifacts.map((path) => readFile(path, "utf8")),
]);
const index = JSON.parse(indexSource);
if (
  home.includes("%BASE_URL%") ||
  guide.includes("%BASE_URL%") ||
  !home.includes(`${base}llms.txt`) ||
  !guide.includes(`${base}jqstar-agent-index.json`) ||
  !llms.includes("https://ignibyte.github.io/jqstar/docs/agents/") ||
  !full.includes("@starfederation/datastar-sdk") ||
  index.schema !== "jqstar-agent-index/1"
) {
  throw new Error("The static Pages agent surfaces failed their base-path contract.");
}

const scripts = (await readdir("demo-dist/assets"))
  .filter((path) => path.endsWith(".js"))
  .map((path) => `demo-dist/assets/${path}`);
const scriptSource = (await Promise.all(scripts.map((path) => readFile(path, "utf8")))).join("\n");
if (!scriptSource.includes(`${base}jqstar-agent-index.json`)) {
  throw new Error("The static Pages runtime does not load the base-path agent index.");
}

process.stdout.write(
  "static Pages proof: base-path=passed, agent-guide=passed, text-corpus=passed, json-index=passed, runtime-url=passed\n",
);
