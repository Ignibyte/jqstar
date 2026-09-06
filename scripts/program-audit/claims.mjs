import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { safeRelativePath, sha256 } from "./contracts.mjs";

// Capture authored units before consulting available tests. Human review must classify
// supporting text and map every actual promise; extraction alone cannot prove claim coverage.
function markdownUnits(source) {
  const units = [];
  const lines = source.match(/[^\n]*\n|[^\n]+$/gu) ?? [];
  let start = 0;
  let offset = 0;
  let fence = null;
  for (const line of lines) {
    const marker = /^\s{0,3}(`{3,}|~{3,})/u.exec(line)?.[1];
    if (marker && fence === null) fence = marker;
    else if (marker && fence && marker[0] === fence[0] && marker.length >= fence.length)
      fence = null;
    if (!line.trim() && fence === null) {
      if (source.slice(start, offset).trim()) units.push({ start, end: offset });
      start = offset + line.length;
    }
    offset += line.length;
  }
  assert(fence === null, "Unclosed Markdown code fence in claim input");
  if (source.slice(start).trim()) units.push({ start, end: source.length });
  return units;
}

function htmlUnits(source) {
  const dom = new JSDOM(source, { includeNodeLocations: true });
  const { document, NodeFilter } = dom.window;
  const selector = "h1,h2,h3,h4,h5,h6,p,li,dt,dd,tr,figcaption,pre,title,meta";
  const units = [];
  try {
    for (const node of document.querySelectorAll(selector)) {
      if (node.parentElement?.closest(selector)) continue;
      const location = dom.nodeLocation(node);
      if (location) units.push({ start: location.startOffset, end: location.endOffset });
    }
    const walker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || node.parentElement?.closest(`${selector},script,style`))
        continue;
      const location = dom.nodeLocation(node);
      if (location) units.push({ start: location.startOffset, end: location.endOffset });
    }
    return units.sort((a, b) => a.start - b.start);
  } finally {
    dom.window.close();
  }
}

export function extractClaimCandidates(path, source) {
  safeRelativePath(path);
  assert(path.endsWith(".md") || path.endsWith(".html"), "Unsupported claim source format");
  assert(Buffer.byteLength(source) <= 2 * 1024 * 1024, "Claim input exceeds the audit bound");
  const digest = sha256(source);
  const occurrences = new Map();
  const units = path.endsWith(".html") ? htmlUnits(source) : markdownUnits(source);
  return units.map(({ start, end }) => {
    const text = source.slice(start, end).trim();
    const key = sha256(text);
    const occurrence = (occurrences.get(key) ?? 0) + 1;
    occurrences.set(key, occurrence);
    return {
      id: `claim:${path}:${key.slice(0, 20)}:${occurrence}`,
      owner: "0033",
      source: path,
      sourceSha256: digest,
      line: source.slice(0, start).split("\n").length,
      text,
      disposition: "unreviewed",
    };
  });
}

export function discoverClaimPaths(paths) {
  return paths
    .filter(
      (path) =>
        (path.endsWith(".md") &&
          (!path.includes("/") || path.startsWith("docs/") || path.startsWith("etc/")) &&
          (!path.startsWith("docs/tickets/") ||
            ["docs/tickets/README.md", "docs/tickets/ROADMAP.md"].includes(path))) ||
        (path.startsWith("example/") && path.endsWith(".html")),
    )
    .sort();
}
