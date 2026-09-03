import { createServer } from "node:http";

const attempts = new Map();
const host = "127.0.0.1";
const port = Number(process.env.JQS_NETWORK_PROOF_PORT ?? 4174);

function headers(contentType) {
  return {
    "Access-Control-Allow-Headers": "Content-Type, Datastar-Request",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Type": contentType,
  };
}

function json(response, status, body) {
  response.writeHead(status, headers("application/json; charset=utf-8"));
  response.end(JSON.stringify(body));
}

function event(response, lines) {
  response.write(`${lines.join("\n")}\n\n`);
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);
  if (request.method === "OPTIONS") {
    response.writeHead(204, headers("text/plain; charset=utf-8"));
    response.end();
    return;
  }
  if (url.pathname === "/health") {
    json(response, 200, { status: "ready" });
    return;
  }
  if (url.pathname !== "/network") {
    json(response, 404, { error: "not found" });
    return;
  }

  const scenario = url.searchParams.get("case");
  if (scenario === "delay") {
    await new Promise((resolve) => setTimeout(resolve, 250));
    json(response, 200, { networkState: "delayed" });
    return;
  }
  if (scenario === "disconnect") {
    response.writeHead(200, headers("text/event-stream; charset=utf-8"));
    response.write('event: datastar-patch-signals\ndata: signals {"networkState":"');
    response.socket?.destroy();
    return;
  }
  if (scenario === "malformed") {
    response.writeHead(200, headers("text/event-stream; charset=utf-8"));
    event(response, ["event: datastar-patch-signals", "data: this-is-not-a-signal-patch"]);
    response.end();
    return;
  }
  if (scenario === "retry") {
    const key = url.searchParams.get("token") ?? "default";
    const attempt = (attempts.get(key) ?? 0) + 1;
    attempts.set(key, attempt);
    if (process.env.JQS_QUALITY_SABOTAGE === "network-fixture") {
      json(response, 200, { networkState: "retry-detector-sabotaged" });
      return;
    }
    if (attempt === 1) {
      response.socket?.destroy();
      return;
    }
    json(response, 200, { networkState: `retried-${attempt}` });
    return;
  }
  if (scenario === "redirect") {
    response.writeHead(302, {
      ...headers("text/plain; charset=utf-8"),
      Location: "/network?case=ok",
    });
    response.end("redirecting");
    return;
  }
  if (scenario === "conflict") {
    json(response, 409, { error: "revision conflict" });
    return;
  }
  if (scenario === "partial") {
    response.writeHead(200, headers("text/event-stream; charset=utf-8"));
    event(response, [
      "event: datastar-patch-signals",
      'data: signals {"networkState":"partial-one"}',
    ]);
    await new Promise((resolve) => setTimeout(resolve, 30));
    event(response, [
      "event: datastar-patch-elements",
      "data: selector #quality-network-feed",
      "data: mode append",
      "data: elements <li>partial-two</li>",
    ]);
    response.end();
    return;
  }
  json(response, 200, { networkState: "redirected" });
});

server.listen(port, host, () => {
  process.stdout.write(`network proof server listening on http://${host}:${port}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
