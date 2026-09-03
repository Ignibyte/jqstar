import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { parseSSE, SSEParser, sseDataFields } from "../../src/sse";
import regressions from "./regressions.json";
import { assertProperty } from "./helpers";

const lineText = fc.string({
  unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789 -_:"),
  maxLength: 40,
});
const fieldKey = fc.string({
  unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz"),
  minLength: 1,
  maxLength: 12,
});

function splitAtSizes(source: string, sizes: number[]): string[] {
  const chunks = [];
  let offset = 0;
  let index = 0;
  while (offset < source.length) {
    const size = sizes[index % sizes.length] ?? 1;
    chunks.push(source.slice(offset, offset + size));
    offset += size;
    index += 1;
  }
  return chunks;
}

function parseChunks(chunks: string[]) {
  const parser = new SSEParser();
  return [...chunks.flatMap((chunk) => parser.feed(chunk)), ...parser.finish()];
}

describe("SSE properties", () => {
  it("parses the same messages across arbitrary transport chunk boundaries", () => {
    assertProperty(
      "sse-chunk-boundaries",
      fc.property(
        fc.array(lineText, { minLength: 1, maxLength: 12 }),
        fc.array(fc.integer({ min: 1, max: 17 }), { minLength: 1, maxLength: 12 }),
        fc.boolean(),
        (data, sizes, useCrlf) => {
          const newline = useCrlf ? "\r\n" : "\n";
          const source = `${data.map((value) => `data: ${value}`).join(newline)}${newline}${newline}`;
          expect(parseChunks(splitAtSizes(source, sizes))).toEqual(parseSSE(source));
        },
      ),
    );
  });

  it("retains repeated data-field order", () => {
    assertProperty(
      "sse-data-fields",
      fc.property(
        fc.array(fc.tuple(fieldKey, lineText), { minLength: 1, maxLength: 30 }),
        (entries) => {
          const source = entries.map(([key, value]) => `${key} ${value}`).join("\n");
          const expected = new Map<string, string[]>();
          for (const [key, value] of entries) {
            const values = expected.get(key) ?? [];
            values.push(value);
            expected.set(key, values);
          }
          expect(sseDataFields(source)).toEqual(expected);
        },
      ),
    );
  });

  it("permanently replays the CRLF split regression", () => {
    const regression = regressions["sse-crlf-boundary"];
    expect(parseChunks(splitAtSizes(regression.source, regression.chunks))).toEqual([
      { event: "update", data: "first\nsecond" },
    ]);
  });
});
