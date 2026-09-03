import type { ActionRegistrar } from "../registry";
import type { ClipboardState, ClipboardTarget, StarClipboardStatic, StarContext } from "../types";
import { writeClipboard } from "./clipboard-write";

interface ClipboardCollection {
  api: StarClipboardStatic;
  enhance(root: ParentNode): void;
}

interface ClipboardRecord {
  resetTimer: ReturnType<typeof setTimeout> | undefined;
  root: HTMLElement;
  source: HTMLElement | undefined;
  state: ClipboardState;
  status: HTMLElement | undefined;
  trigger: HTMLButtonElement | undefined;
}

interface ClipboardEventDetail {
  clipboard: HTMLElement;
  error?: unknown;
  text: string;
  trigger?: HTMLElement | undefined;
}

const records = new WeakMap<HTMLElement, ClipboardRecord>();
let clipboardId = 0;

function clipboardRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="clipboard"]')
    ? value
    : undefined;
}

function owned<T extends HTMLElement>(root: HTMLElement, selector: string): T | undefined {
  return Array.from(root.querySelectorAll<T>(selector)).find(
    (element) => element.closest('[data-jqs="clipboard"]') === root,
  );
}

function selectedSource(root: HTMLElement): HTMLElement | undefined {
  const selector = root.dataset.copyFrom;
  if (!selector) return owned(root, '[data-part="value"]');
  let source: Element | null;
  try {
    source = root.querySelector(selector) ?? document.querySelector(selector);
  } catch {
    throw new Error(`Clipboard #${root.id} has an invalid data-copy-from selector: ${selector}`);
  }
  if (!(source instanceof HTMLElement)) {
    throw new Error(`Clipboard #${root.id} could not find data-copy-from target: ${selector}`);
  }
  return source;
}

function elementText(source: HTMLElement): string {
  if (
    source instanceof HTMLInputElement ||
    source instanceof HTMLTextAreaElement ||
    source instanceof HTMLSelectElement
  ) {
    return source.value;
  }
  return source.textContent ?? "";
}

function text(record: ClipboardRecord): string {
  return record.root.dataset.copyText ?? (record.source ? elementText(record.source) : "");
}

function resetDelay(root: HTMLElement): number {
  const value = Number(root.dataset.resetDelay ?? 2000);
  return Number.isFinite(value) && value >= 0 ? value : 2000;
}

function setState(record: ClipboardRecord, state: ClipboardState, message: string): void {
  record.state = state;
  record.root.dataset.state = state;
  if (record.status) record.status.textContent = message;
}

function scheduleReset(record: ClipboardRecord): void {
  if (record.resetTimer !== undefined) clearTimeout(record.resetTimer);
  const delay = resetDelay(record.root);
  if (delay === 0) return;
  record.resetTimer = setTimeout(() => {
    record.resetTimer = undefined;
    if (!record.root.isConnected) return;
    setState(record, "idle", "");
  }, delay);
}

function enhanceClipboard(root: HTMLElement): ClipboardRecord {
  root.id ||= `jqs-clipboard-${++clipboardId}`;
  const source = selectedSource(root);
  if (!source && root.dataset.copyText === undefined) {
    throw new Error(
      `Clipboard #${root.id} needs data-copy-text, data-copy-from, or a data-part="value" element.`,
    );
  }
  const trigger = owned<HTMLButtonElement>(root, 'button[data-part="trigger"]');
  const status = owned<HTMLElement>(root, '[data-part="status"]');
  if (trigger) trigger.type = "button";
  if (status) {
    status.id ||= `${root.id}-status`;
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    if (trigger) trigger.setAttribute("aria-describedby", status.id);
  }
  const existing = records.get(root);
  if (existing) {
    existing.source = source;
    existing.status = status;
    existing.trigger = trigger;
    root.dataset.state = existing.state;
    return existing;
  }
  const record: ClipboardRecord = {
    resetTimer: undefined,
    root,
    source,
    state: "idle",
    status,
    trigger,
  };
  records.set(root, record);
  root.dataset.state = record.state;
  return record;
}

function recordFor(root: HTMLElement): ClipboardRecord {
  return records.get(root) ?? enhanceClipboard(root);
}

function resolve(target: ClipboardTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? clipboardRoot(root.querySelector(target)) : clipboardRoot(target);
  if (resolved) return resolved;
  throw new Error(`Clipboard target did not match data-jqs="clipboard": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="clipboard"]')) return target;
  if (typeof target === "string") return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="clipboard"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function emit(
  record: ClipboardRecord,
  name: "before-copy" | "copy" | "error",
  copiedText: string,
  options: { cancelable?: boolean; error?: unknown; trigger?: HTMLElement | undefined } = {},
): boolean {
  const detail: ClipboardEventDetail = {
    clipboard: record.root,
    error: options.error,
    text: copiedText,
    trigger: options.trigger,
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:clipboard:${name}`, {
      bubbles: true,
      cancelable: Boolean(options.cancelable),
      detail,
    }),
  );
}

async function copy(
  record: ClipboardRecord,
  copiedText = text(record),
  trigger = record.trigger,
): Promise<string> {
  if (
    record.root.hasAttribute("disabled") ||
    record.root.getAttribute("aria-disabled") === "true" ||
    trigger?.disabled
  ) {
    return copiedText;
  }
  if (!emit(record, "before-copy", copiedText, { cancelable: true, trigger })) return copiedText;
  if (record.resetTimer !== undefined) clearTimeout(record.resetTimer);
  const originallyDisabled = trigger?.disabled ?? false;
  if (trigger) trigger.disabled = true;
  setState(record, "copying", record.root.dataset.copyingMessage ?? "Copying…");
  try {
    await writeClipboard(copiedText);
    setState(record, "copied", record.root.dataset.successMessage ?? "Copied to clipboard.");
    emit(record, "copy", copiedText, { trigger });
    scheduleReset(record);
    return copiedText;
  } catch (error) {
    setState(
      record,
      "error",
      record.root.dataset.errorMessage ?? "Copy failed. Select the text and copy it manually.",
    );
    emit(record, "error", copiedText, { error, trigger });
    scheduleReset(record);
    throw error;
  } finally {
    if (trigger) trigger.disabled = originallyDisabled;
  }
}

function enhanceAll(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="clipboard"]')));
  for (const element of elements) {
    const clipboard = clipboardRoot(element);
    if (clipboard) enhanceClipboard(clipboard);
  }
}

export function createClipboards(registerAction: ActionRegistrar): ClipboardCollection {
  const api: StarClipboardStatic = {
    copy: (target, copiedText) => copy(recordFor(resolve(target)), copiedText),
    state: (target) => recordFor(resolve(target)).state,
    text: (target) => text(recordFor(resolve(target))),
  };
  registerAction("ui.clipboard.copy", (context) => {
    const target = controlled(context, context.args?.[0]);
    const copiedText = context.args?.[1];
    return api.copy(target, typeof copiedText === "string" ? copiedText : undefined);
  });
  return { api, enhance: enhanceAll };
}
