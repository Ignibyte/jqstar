import { registerAction } from "../registry";
import type { CodeBlockTarget, StarCodeBlockStatic, StarContext } from "../types";

interface CodeBlockCollection {
  api: StarCodeBlockStatic;
  enhance(root: ParentNode): void;
}

interface CodeBlockRecord {
  code: HTMLElement;
  root: HTMLElement;
  status: HTMLElement | undefined;
}

interface CodeBlockEventDetail {
  codeBlock: HTMLElement;
  error?: unknown;
  text: string;
}

const records = new WeakMap<HTMLElement, CodeBlockRecord>();
let codeBlockId = 0;

function codeBlockRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="code-block"]')
    ? value
    : undefined;
}

function owned<T extends HTMLElement>(root: HTMLElement, selector: string): T | undefined {
  return Array.from(root.querySelectorAll<T>(selector)).find(
    (element) => element.closest('[data-jqs="code-block"]') === root,
  );
}

function enhanceCodeBlock(root: HTMLElement): CodeBlockRecord {
  root.id ||= `jqs-code-block-${++codeBlockId}`;
  const code = owned<HTMLElement>(root, '[data-part="code"]');
  if (!code) throw new Error(`Code Block #${root.id} needs a data-part="code" element.`);
  const status = owned<HTMLElement>(root, '[data-part="status"]');
  if (status) {
    status.id ||= `${root.id}-status`;
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
  }
  const copy = owned<HTMLButtonElement>(root, 'button[data-part="copy"]');
  if (copy) {
    copy.type = "button";
    if (status && copy.getAttribute("aria-describedby") !== status.id) {
      copy.setAttribute("aria-describedby", status.id);
    }
  }
  const record = { code, root, status };
  records.set(root, record);
  return record;
}

function recordFor(root: HTMLElement): CodeBlockRecord {
  return records.get(root) ?? enhanceCodeBlock(root);
}

function resolve(target: CodeBlockTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? codeBlockRoot(root.querySelector(target)) : codeBlockRoot(target);
  if (resolved) return resolved;
  throw new Error(`Code Block target did not match data-jqs="code-block": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="code-block"]')) return target;
  if (typeof target === "string") return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="code-block"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function emit(
  record: CodeBlockRecord,
  name: "before-copy" | "copy" | "error",
  text: string,
  options: { cancelable?: boolean; error?: unknown } = {},
): boolean {
  const detail: CodeBlockEventDetail = {
    codeBlock: record.root,
    error: options.error,
    text,
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:code-block:${name}`, {
      bubbles: true,
      cancelable: Boolean(options.cancelable),
      detail,
    }),
  );
}

function setStatus(record: CodeBlockRecord, message: string, state: "copied" | "error"): void {
  if (record.root.dataset.state !== state) record.root.dataset.state = state;
  if (record.status && record.status.textContent !== message) record.status.textContent = message;
}

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const control = document.createElement("textarea");
  control.value = text;
  control.setAttribute("readonly", "");
  control.style.position = "fixed";
  control.style.opacity = "0";
  document.body.append(control);
  control.select();
  const copied = typeof document.execCommand === "function" && document.execCommand("copy");
  control.remove();
  if (!copied) throw new Error("The Clipboard API is unavailable.");
}

async function copy(record: CodeBlockRecord): Promise<string> {
  const text = record.code.textContent ?? "";
  if (!emit(record, "before-copy", text, { cancelable: true })) return text;
  try {
    await writeClipboard(text);
    setStatus(record, "Copied to clipboard.", "copied");
    emit(record, "copy", text);
    return text;
  } catch (error) {
    setStatus(record, "Copy failed. Select the code and copy it manually.", "error");
    emit(record, "error", text, { error });
    throw error;
  }
}

function enhanceAll(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="code-block"]')));
  for (const element of elements) {
    const codeBlock = codeBlockRoot(element);
    if (codeBlock) enhanceCodeBlock(codeBlock);
  }
}

export function createCodeBlocks(): CodeBlockCollection {
  const api: StarCodeBlockStatic = {
    copy: (target) => copy(recordFor(resolve(target))),
    text: (target) => recordFor(resolve(target)).code.textContent ?? "",
  };
  registerAction("ui.code-block.copy", (context) =>
    api.copy(controlled(context, context.args?.[0])),
  );
  return { api, enhance: enhanceAll };
}
