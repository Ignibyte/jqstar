import { describe, expect, it } from "vitest";
import { parseSSE, SSEParser, sseDataFields } from "../src/sse";

describe("SSE parser", () => {
  it("parses chunked CRLF messages, comments, ids, retries, and multiline data", () => {
    const parser = new SSEParser();
    const messages = [
      ...parser.feed(": heartbeat\r\nevent: datastar-patch-sign"),
      ...parser.feed("als\r\nid: patch-1\r\nretry: 1500\r\ndata: signals {count: 1}\r"),
      ...parser.feed("\n\r\nevent: custom\ndata: first\ndata: second\n\n"),
      ...parser.finish(),
    ];

    expect(messages).toEqual([
      {
        event: "datastar-patch-signals",
        data: "signals {count: 1}",
        id: "patch-1",
        retry: 1500,
      },
      {
        event: "custom",
        data: "first\nsecond",
        id: "patch-1",
      },
    ]);
  });

  it("flushes a final unterminated event and ignores empty events", () => {
    expect(parseSSE("\n\nevent: message\ndata: final")).toEqual([
      { event: "message", data: "final" },
    ]);
  });

  it("groups repeated Datastar data fields", () => {
    const fields = sseDataFields(
      [
        "selector #feed",
        "mode append",
        "elements <div>",
        "elements   Item",
        "elements </div>",
      ].join("\n"),
    );

    expect(fields.get("selector")).toEqual(["#feed"]);
    expect(fields.get("elements")?.join("\n")).toBe("<div>\n  Item\n</div>");
  });
});
