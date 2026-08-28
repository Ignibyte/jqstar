import type { SSEMessage } from "./types";

export class SSEParser {
  private buffer = "";
  private eventName = "";
  private dataLines: string[] = [];
  private lastEventId: string | undefined;
  private retry: number | undefined;

  feed(chunk: string): SSEMessage[] {
    this.buffer += chunk;
    const messages: SSEMessage[] = [];

    let newline = this.buffer.indexOf("\n");
    while (newline !== -1) {
      let line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      const message = this.processLine(line);
      if (message) messages.push(message);
      newline = this.buffer.indexOf("\n");
    }

    return messages;
  }

  finish(): SSEMessage[] {
    const messages: SSEMessage[] = [];
    if (this.buffer.length > 0) {
      let line = this.buffer;
      if (line.endsWith("\r")) line = line.slice(0, -1);
      this.buffer = "";
      const message = this.processLine(line);
      if (message) messages.push(message);
    }
    const final = this.dispatch();
    if (final) messages.push(final);
    return messages;
  }

  private processLine(line: string): SSEMessage | undefined {
    if (line === "") return this.dispatch();
    if (line.startsWith(":")) return undefined;

    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") this.eventName = value;
    else if (field === "data") this.dataLines.push(value);
    else if (field === "id" && !value.includes("\0")) this.lastEventId = value;
    else if (field === "retry" && /^\d+$/.test(value)) this.retry = Number(value);
    return undefined;
  }

  private dispatch(): SSEMessage | undefined {
    if (this.dataLines.length === 0) {
      this.eventName = "";
      this.retry = undefined;
      return undefined;
    }

    const message: SSEMessage = {
      event: this.eventName || "message",
      data: this.dataLines.join("\n"),
      ...(this.lastEventId !== undefined ? { id: this.lastEventId } : {}),
      ...(this.retry !== undefined ? { retry: this.retry } : {}),
    };
    this.eventName = "";
    this.dataLines = [];
    this.retry = undefined;
    return message;
  }
}

export function parseSSE(source: string): SSEMessage[] {
  const parser = new SSEParser();
  return [...parser.feed(source), ...parser.finish()];
}

export function sseDataFields(data: string): Map<string, string[]> {
  const fields = new Map<string, string[]>();
  for (const line of data.split("\n")) {
    const space = line.indexOf(" ");
    const key = space === -1 ? line : line.slice(0, space);
    const value = space === -1 ? "" : line.slice(space + 1);
    const existing = fields.get(key);
    if (existing) existing.push(value);
    else fields.set(key, [value]);
  }
  return fields;
}
