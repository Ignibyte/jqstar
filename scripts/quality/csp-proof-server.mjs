import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";

export const cspPolicy =
  "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; report-uri /csp-report";

export async function createCSPProofHandler({ root, installedPackage, jqueryModule }) {
  const paths = new Map([
    ["/csp", join(root, "e2e/fixtures/csp-proof/index.html")],
    ["/csp-app.js", join(root, "e2e/fixtures/csp-proof/app.js")],
    ["/csp-bootstrap.js", join(root, "e2e/fixtures/csp-proof/bootstrap.js")],
    ["/csp-proof.css", join(root, "e2e/fixtures/csp-proof/style.css")],
    ["/axe.js", join(root, "node_modules/axe-core/axe.min.js")],
    ["/jquery-module.js", jqueryModule],
  ]);
  for (const filename of await readdir(join(installedPackage, "dist"))) {
    if (filename.endsWith(".js"))
      paths.set(`/${filename}`, join(installedPackage, "dist", filename));
  }
  const assets = new Map();
  const manifest = [];
  for (const [path, filename] of paths) {
    const body = await readFile(filename);
    const contentType = filename.endsWith(".html")
      ? "text/html; charset=utf-8"
      : filename.endsWith(".css")
        ? "text/css; charset=utf-8"
        : "text/javascript; charset=utf-8";
    assets.set(path, { body, contentType });
    manifest.push({
      path,
      bytes: body.length,
      sha256: createHash("sha256").update(body).digest("hex"),
    });
  }
  const cspReports = [];
  const handle = async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (!url.pathname.startsWith("/csp") && !assets.has(url.pathname)) return false;
    response.setHeader("Content-Security-Policy", cspPolicy);
    if (url.pathname === "/csp-report" && request.method === "POST") {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 4_096) {
          response.writeHead(413).end();
          return true;
        }
        chunks.push(chunk);
      }
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const item = body?.["csp-report"] ?? body;
        if (cspReports.length < 32 && item && typeof item === "object") {
          cspReports.push({
            blockedURI: item["blocked-uri"] === "eval" ? "eval" : "redacted",
            disposition: item.disposition === "enforce" ? "enforce" : "unknown",
            effectiveDirective: String(item["effective-directive"] ?? "unknown").slice(0, 80),
          });
        }
      } catch {
        // Browser report bodies are supplemental and vary by engine.
      }
      response.writeHead(204).end();
      return true;
    }
    if (url.pathname === "/csp-destination" || url.pathname === "/csp-form") {
      if (request.method !== "GET") {
        response.writeHead(405, { Allow: "GET" }).end();
        return true;
      }
      const escapedName = (url.searchParams.get("name") ?? "")
        .slice(0, 200)
        .replace(
          /[&<>"']/gu,
          (character) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character],
        );
      const heading = url.pathname === "/csp-form" ? "Native form received" : "Native destination";
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(
        `<!doctype html><html lang="en"><meta charset="utf-8"><title>${heading}</title><main><h1>${heading}</h1><p id="received-name">${escapedName}</p><a href="/csp">Back to proof</a></main></html>`,
      );
      return true;
    }
    if (url.pathname === "/csp-json") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ count: 4, serverMessage: "generic" }));
      return true;
    }
    if (url.pathname === "/csp-html") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end('<section id="replace" data-text="$count + \':\' + $serverMessage"></section>');
      return true;
    }
    if (url.pathname === "/csp-datastar") {
      const sdkResponse = ServerSentEventGenerator.stream((stream) => {
        stream.patchSignals(JSON.stringify({ count: 8, serverMessage: "sdk" }));
        stream.patchElements("<li data-text=\"'SDK patch'\"></li>", {
          selector: "#stream",
          mode: "append",
        });
      });
      for (const [name, value] of sdkResponse.headers) response.setHeader(name, value);
      response.setHeader("Content-Security-Policy", cspPolicy);
      response.writeHead(sdkResponse.status);
      response.end(Buffer.from(await sdkResponse.arrayBuffer()));
      return true;
    }
    if (url.pathname === "/csp-redirect") {
      response.writeHead(302, { Location: "/csp-json" }).end();
      return true;
    }
    if (url.pathname === "/csp-error") {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("not found");
      return true;
    }
    if (url.pathname === "/csp-slow") {
      const timer = setTimeout(() => {
        if (!response.writableEnded) {
          response.writeHead(204).end();
        }
      }, 5_000);
      request.once("close", () => clearTimeout(timer));
      return true;
    }

    const asset = assets.get(url.pathname);
    if (!asset) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("not found");
      return true;
    }
    response.writeHead(200, { "Content-Type": asset.contentType });
    response.end(asset.body);
    return true;
  };
  return { handle, reports: cspReports, manifest, policy: cspPolicy };
}
