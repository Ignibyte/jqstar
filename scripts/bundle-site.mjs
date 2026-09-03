import { readFile, readdir, writeFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { constants, brotliCompressSync } from "node:zlib";

const siteRoot = resolve("demo-dist");
const output = resolve(siteRoot, "site.br");
const textExtensions = new Set([".css", ".html", ".js", ".json", ".svg", ".txt"]);

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? filesBelow(path) : [path];
    }),
  );
  return nested.flat();
}

const paths = (await filesBelow(siteRoot)).filter((path) => path !== output).sort();
const files = await Promise.all(
  paths.map(async (path) => {
    const source = await readFile(path);
    return [
      relative(siteRoot, path).split(sep).join("/"),
      textExtensions.has(extname(path).toLocaleLowerCase())
        ? `u${source.toString("utf8")}`
        : `b${source.toString("base64")}`,
    ];
  }),
);
const source = Buffer.from(JSON.stringify({ schema: "jqstar-site-bundle/2", files }));
const archive = brotliCompressSync(source, {
  params: {
    [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_GENERIC,
    [constants.BROTLI_PARAM_QUALITY]: 11,
    [constants.BROTLI_PARAM_SIZE_HINT]: source.length,
  },
});

await writeFile(output, archive);
process.stdout.write(
  `site bundle: ${files.length} files, ${source.length} source bytes, ${archive.length} archive bytes\n`,
);
