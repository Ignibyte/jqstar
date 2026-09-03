import { access, readFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fail, qualityPaths, repositoryRoot } from "./static-lib.mjs";

const markdownLink = /!?(?:\[[^\]]*\])\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
const htmlLink = /\b(?:href|src)=["']([^"']+)["']/gi;

function anchorSlug(value) {
  return decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function extractLinks(source, extension) {
  const expression = extension === ".md" ? markdownLink : htmlLink;
  return [...source.matchAll(expression)].map((match) => match[1]).filter(Boolean);
}

export function markdownAnchors(source) {
  return new Set(
    source
      .split("\n")
      .map((line) => /^(?: {0,3})#{1,6}\s+(.+?)\s*#*\s*$/.exec(line)?.[1])
      .filter(Boolean)
      .map(anchorSlug),
  );
}

export async function checkLocalLinks(files, root = repositoryRoot) {
  const errors = [];
  for (const path of files) {
    const absolute = resolve(root, path);
    const source = await readFile(absolute, "utf8");
    for (const raw of extractLinks(source, extname(path))) {
      if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(raw)) {
        try {
          new URL(raw);
        } catch {
          errors.push(`${path}: invalid external URL ${raw}`);
        }
        continue;
      }
      if (extname(path) === ".html" && /^(?:%BASE_URL%|\/|\?|#)/.test(raw)) continue;
      const [targetPart = "", fragment] = raw.split("#", 2);
      const decodedTarget = decodeURIComponent(targetPart);
      const target = resolve(dirname(absolute), decodedTarget || ".");
      try {
        await access(target);
      } catch {
        errors.push(`${path}: missing local link target ${raw}`);
        continue;
      }
      if (fragment && (extname(target) === ".md" || (!decodedTarget && extname(path) === ".md"))) {
        const targetSource = decodedTarget ? await readFile(target, "utf8") : source;
        if (!markdownAnchors(targetSource).has(anchorSlug(fragment))) {
          errors.push(`${path}: missing Markdown anchor ${raw}`);
        }
      }
    }
  }
  return errors;
}

async function main() {
  const files = (await qualityPaths()).filter((path) => /\.(?:md|html)$/.test(path));
  if (files.length === 0) throw new Error("Link validation selected no Markdown or HTML files.");
  const errors = await checkLocalLinks(files);
  if (errors.length > 0) return fail(errors);
  process.stdout.write(`links: ${files.length} files checked\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
