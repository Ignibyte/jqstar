import { isHTMLElement, isHTMLTag } from "../dom";
import type { ClipboardState, StarContext } from "../types";
import { writeClipboard } from "./clipboard-write";
import {
  acquireUIResource,
  failUISetup,
  ownUIRecord,
  releaseUIResources,
  uiActive,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";

type CopyKind = "clipboard" | "code-block";
type CopyTarget = string | HTMLElement;
interface CopyTask {
  text: string;
  trigger: HTMLButtonElement | undefined;
  state: "pending" | "copied" | "error" | "aborted";
  error?: unknown;
}
interface CopyRecord extends UIResources {
  kind: CopyKind;
  state: ClipboardState;
  message: string;
  task: CopyTask | undefined;
  trigger: HTMLButtonElement | undefined;
  status: HTMLElement | undefined;
  description: { trigger: HTMLButtonElement; id: string; owned: boolean } | undefined;
  held: { trigger: HTMLButtonElement; task: CopyTask; release(): void } | undefined;
  reset: { deadline: number; cancel(): void } | undefined;
}
interface CopySnapshot {
  kind: CopyKind;
  document: Document;
  state: ClipboardState;
  message: string;
  task: CopyTask | undefined;
  deadline: number | undefined;
}
const records = new WeakMap<HTMLElement, CopyRecord>();
const retained = new WeakMap<HTMLElement, CopySnapshot>();
const intents = new WeakMap<HTMLElement, number>();
const buttonVersions = new WeakMap<HTMLButtonElement, number>();
let copyId = 0;

function copyRoot(element: Element | null, kind: CopyKind): HTMLElement | undefined {
  return isHTMLElement(element) && element.dataset.jqs === kind ? element : undefined;
}
function owned(root: HTMLElement, selector: string): HTMLElement | undefined {
  return Array.from(root.querySelectorAll(selector)).find(
    (element): element is HTMLElement =>
      isHTMLElement(element) &&
      element.closest('[data-jqs]:not(button[data-jqs="button"])') === root,
  );
}
function triggerPart(record: CopyRecord): HTMLButtonElement | undefined {
  const element = owned(
    record.root,
    `button[data-part="${record.kind === "clipboard" ? "trigger" : "copy"}"]`,
  );
  return isHTMLTag(element, "button") ? element : undefined;
}
function current(record: CopyRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    !!copyRoot(record.root, record.kind)
  );
}
function currentTask(record: CopyRecord, task: CopyTask): boolean {
  return current(record) && record.task === task;
}
function intent(root: HTMLElement): number {
  const next = (intents.get(root) ?? 0) + 1;
  intents.set(root, next);
  return next;
}
function unavailable(record: CopyRecord): boolean {
  const selector =
    ':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),[inert]';
  return !!record.root.closest(selector) || !!triggerPart(record)?.closest(selector);
}
function readText(root: HTMLElement, kind: CopyKind): string {
  if (kind === "clipboard" && root.dataset.copyText !== undefined) return root.dataset.copyText;
  let source: Element | undefined | null;
  const selector = root.dataset.copyFrom;
  if (kind === "clipboard" && selector) {
    try {
      source = root.querySelector(selector) ?? root.ownerDocument.querySelector(selector);
    } catch {
      throw new Error(`Clipboard #${root.id} has an invalid data-copy-from selector: ${selector}`);
    }
    if (!isHTMLElement(source))
      throw new Error(`Clipboard #${root.id} could not find data-copy-from target: ${selector}`);
  } else source = owned(root, `[data-part="${kind === "clipboard" ? "value" : "code"}"]`);
  if (!source)
    throw new Error(
      kind === "clipboard"
        ? `Clipboard #${root.id} needs data-copy-text, data-copy-from, or a data-part="value" element.`
        : `Code Block #${root.id} needs a data-part="code" element.`,
    );
  return kind === "clipboard" &&
    (isHTMLTag(source, "input") || isHTMLTag(source, "textarea") || isHTMLTag(source, "select"))
    ? source.value
    : source.textContent;
}
function describe(trigger: HTMLElement, id: string, add: boolean): void {
  const tokens = new Set(
    (trigger.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean),
  );
  if (add) tokens.add(id);
  else tokens.delete(id);
  const value = [...tokens].join(" ");
  if (value) {
    if (trigger.getAttribute("aria-describedby") !== value)
      trigger.setAttribute("aria-describedby", value);
  } else trigger.removeAttribute("aria-describedby");
}
function releaseDescription(record: CopyRecord): void {
  const description = record.description;
  record.description = undefined;
  if (description?.owned) describe(description.trigger, description.id, false);
}
function outputs(record: CopyRecord): void {
  const revision = record.revision;
  const trigger = triggerPart(record);
  const status = owned(record.root, '[data-part="status"]');
  if (record.held && record.held.trigger !== trigger) record.held.release();
  if (!current(record, revision)) return;
  record.trigger = trigger;
  record.status = status;
  if (trigger && trigger.type !== "button") trigger.type = "button";
  if (!current(record, revision)) return;
  if (status) {
    status.id ||= `${record.root.id}-status`;
    if (status.getAttribute("aria-live") !== "polite") status.setAttribute("aria-live", "polite");
    if (status.getAttribute("aria-atomic") !== "true") status.setAttribute("aria-atomic", "true");
  }
  if (!current(record, revision)) return;
  const id = status?.id;
  const description = record.description;
  if (description?.trigger !== trigger || description?.id !== id) {
    releaseDescription(record);
    if (!current(record, revision)) return;
    if (description?.owned && trigger && trigger !== description.trigger && description.id !== id)
      describe(trigger, description.id, false);
  }
  if (!current(record, revision)) return;
  if (trigger && id) {
    record.description ??= {
      trigger,
      id,
      owned: !(trigger.getAttribute("aria-describedby") ?? "").split(/\s+/).includes(id),
    };
    describe(trigger, id, true);
  }
}
function publish(
  record: CopyRecord,
  state: ClipboardState,
  message: string,
  task = record.task,
): void {
  const revision = record.revision;
  if (!current(record, revision) || record.task !== task) return;
  record.state = state;
  record.message = message;
  if (record.root.dataset.state !== state) record.root.dataset.state = state;
  if (!current(record, revision) || record.task !== task) return;
  const status = owned(record.root, '[data-part="status"]');
  record.status = status;
  if (status && status.textContent !== message) status.textContent = message;
}
function holdTrigger(record: CopyRecord, task: CopyTask): void {
  if (record.kind !== "clipboard" || task.state !== "pending" || !currentTask(record, task)) return;
  const trigger = triggerPart(record);
  if (record.held?.trigger === trigger && record.held?.task === task) return;
  record.held?.release();
  if (!trigger || trigger.disabled || !currentTask(record, task)) return;
  const button = trigger;
  const version = (buttonVersions.get(button) ?? 0) + 1;
  buttonVersions.set(trigger, version);
  const held = { trigger, task, release };
  function release(): void {
    if (record.held === held) record.held = undefined;
    record.cleanups.delete(release);
    if (buttonVersions.get(button) === version && button.disabled) button.disabled = false;
  }
  record.held = held;
  acquireUIResource(
    record,
    () => currentTask(record, task) && record.held === held && triggerPart(record) === trigger,
    () => {
      trigger.disabled = true;
    },
    release,
  );
}
function scheduleReset(record: CopyRecord, task: CopyTask, deadline: number): void {
  const revision = record.revision;
  record.reset?.cancel();
  if (!current(record, revision) || !currentTask(record, task)) return;
  let handle: number | undefined;
  let active = true;
  const reset = { deadline, cancel };
  function cancel(): void {
    active = false;
    if (record.reset === reset) record.reset = undefined;
    record.cleanups.delete(cancel);
    const acquired = handle;
    handle = undefined;
    if (acquired !== undefined) record.window.clearTimeout(acquired);
  }
  const valid = (): boolean => active && currentTask(record, task) && record.reset === reset;
  record.reset = reset;
  acquireUIResource(
    record,
    valid,
    () => {
      handle = record.window.setTimeout(
        () => {
          const accepted = valid();
          const revision = record.revision;
          cancel();
          if (accepted && current(record, revision) && currentTask(record, task))
            publish(record, "idle", "", task);
        },
        Math.max(0, deadline - Date.now()),
      );
    },
    cancel,
  );
}
function resetAfterCopy(record: CopyRecord, task: CopyTask): void {
  if (record.kind !== "clipboard" || !currentTask(record, task)) return;
  const value = Number(record.root.dataset.resetDelay ?? 2000);
  const delay = Number.isFinite(value) && value >= 0 ? value : 2000;
  if (delay) scheduleReset(record, task, Date.now() + delay);
}
function emit(
  record: CopyRecord,
  name: "before-copy" | "copy" | "error",
  text: string,
  trigger?: HTMLElement,
  error?: unknown,
): boolean {
  const detail =
    record.kind === "clipboard"
      ? { clipboard: record.root, error, text, trigger }
      : { codeBlock: record.root, error, text };
  const Event = (record.window as Window & typeof globalThis).CustomEvent;
  return record.root.dispatchEvent(
    new Event(`jquery-star:${record.kind}:${name}`, {
      bubbles: true,
      cancelable: name === "before-copy",
      detail,
    }),
  );
}
function message(root: HTMLElement, kind: CopyKind, state: "copied" | "error"): string {
  if (state === "copied")
    return (
      (kind === "clipboard" ? root.dataset.successMessage : undefined) ?? "Copied to clipboard."
    );
  return kind === "clipboard"
    ? (root.dataset.errorMessage ?? "Copy failed. Select the text and copy it manually.")
    : "Copy failed. Select the code and copy it manually.";
}
function complete(
  root: HTMLElement,
  kind: CopyKind,
  task: CopyTask,
  state: "copied" | "error" | "aborted",
  error?: unknown,
): void {
  task.state = state;
  task.error = error;
  const record = records.get(root);
  if (!record || record.kind !== kind || !currentTask(record, task)) {
    const saved = retained.get(root);
    if (saved?.task === task && !(kind === "code-block" && state === "aborted")) {
      saved.state = state === "aborted" ? "idle" : state;
      saved.message = state === "aborted" ? "" : message(root, kind, state);
      if (kind === "clipboard" && state !== "aborted") {
        const value = Number(root.dataset.resetDelay ?? 2000);
        const delay = Number.isFinite(value) && value >= 0 ? value : 2000;
        saved.deadline = delay ? Date.now() + delay : undefined;
      }
    }
    return;
  }
  record.held?.release();
  if (!currentTask(record, task) || (kind === "code-block" && state === "aborted")) return;
  outputs(record);
  if (!currentTask(record, task)) return;
  publish(
    record,
    state === "aborted" ? "idle" : state,
    state === "aborted" ? "" : message(root, kind, state),
    task,
  );
  if (!currentTask(record, task) || state === "aborted") return;
  emit(record, state === "copied" ? "copy" : "error", task.text, task.trigger, error);
  if (currentTask(record, task)) resetAfterCopy(record, task);
}
function snapshot(record: CopyRecord): CopySnapshot {
  return {
    kind: record.kind,
    document: record.document,
    state: record.state,
    message: record.message,
    task: record.task,
    deadline: record.reset?.deadline,
  };
}
function enhance(root: HTMLElement, kind: CopyKind): CopyRecord {
  const previous = records.get(root);
  if (previous && previous.kind === kind && current(previous)) {
    readText(root, kind);
    outputs(previous);
    if (current(previous) && previous.task?.state === "pending")
      holdTrigger(previous, previous.task);
    return previous;
  }
  const saved = previous ? snapshot(previous) : retained.get(root);
  previous?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  if (previous && !uiActive(root)) return previous;
  root.id ||= `jqs-${kind}-${++copyId}`;
  const restore = saved?.kind === kind && saved.document !== root.ownerDocument;
  const record: CopyRecord = {
    ...uiResources(root),
    kind,
    state: restore ? saved.state : "idle",
    message: restore ? saved.message : (owned(root, '[data-part="status"]')?.textContent ?? ""),
    task: restore ? saved.task : undefined,
    trigger: undefined,
    status: undefined,
    description: undefined,
    held: undefined,
    reset: undefined,
  };
  record.cleanups.add(() => {
    const saved = snapshot(record);
    if (record.document === root.ownerDocument) {
      saved.task = undefined;
      if (saved.state === "copying") {
        saved.state = "idle";
        saved.message = "";
      }
    }
    retained.set(root, saved);
  });
  record.cleanups.add(() => releaseDescription(record));
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    const revision = record.revision;
    readText(root, kind);
    outputs(record);
    if (current(record, revision) && (kind === "clipboard" || record.state !== "idle"))
      publish(record, record.state, record.message);
    if (current(record, revision) && record.task) {
      if (record.task.state === "pending") holdTrigger(record, record.task);
      else if (restore && saved.deadline !== undefined)
        scheduleReset(record, record.task, saved.deadline);
    }
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}
function resolve(target: CopyTarget, kind: CopyKind, root: ParentNode = document): HTMLElement {
  const element =
    typeof target === "string"
      ? isHTMLElement(root) && root.matches(target)
        ? root
        : root.querySelector(target)
      : target;
  const result = copyRoot(element, kind);
  if (result) return result;
  throw new Error(`Copy target did not match data-jqs="${kind}".`);
}
export function createCopies(kind: CopyKind) {
  const copy = (target: CopyTarget, override?: string): Promise<string> => {
    const root = resolve(target, kind);
    const requested = intent(root);
    const record = enhance(root, kind);
    const text = override ?? readText(root, kind);
    const revision = ++record.revision;
    const valid = (): boolean => current(record, revision) && intents.get(root) === requested;
    const run = async (): Promise<string> => {
      if (!valid() || unavailable(record)) return text;
      if (!emit(record, "before-copy", text, record.trigger) || !valid() || unavailable(record))
        return text;
      const task: CopyTask = { text, trigger: record.trigger, state: "pending" };
      record.task = task;
      record.reset?.cancel();
      if (!valid() || !currentTask(record, task)) return text;
      try {
        if (kind === "clipboard")
          publish(record, "copying", root.dataset.copyingMessage ?? "Copying…", task);
        const writing = writeClipboard(
          record.window,
          text,
          () => valid() && currentTask(record, task) && !unavailable(record),
        );
        try {
          holdTrigger(record, task);
        } catch (error) {
          void writing.catch(() => undefined);
          throw error;
        }
        const accepted = await writing;
        complete(root, kind, task, accepted ? "copied" : "aborted");
        return text;
      } catch (error) {
        complete(root, kind, task, "error", error);
        throw error;
      } finally {
        if (record.held?.task === task) record.held.release();
      }
    };
    return run();
  };
  return {
    copy,
    text: (target: CopyTarget): string => {
      const root = resolve(target, kind);
      enhance(root, kind);
      return readText(root, kind);
    },
    state: (target: CopyTarget): ClipboardState => enhance(resolve(target, kind), kind).state,
    controlled: (context: StarContext, target?: unknown): HTMLElement => {
      if (isHTMLElement(target) || typeof target === "string")
        return resolve(target, kind, context.root);
      const closest =
        context.element?.closest(`[data-jqs="${kind}"]`) ??
        (isHTMLElement(context.root) && copyRoot(context.root, kind));
      if (isHTMLElement(closest)) return resolve(closest, kind, context.root);
      throw new Error(`ui.${kind} requires a selector or an element inside data-jqs="${kind}".`);
    },
    enhance: (root: ParentNode): void => {
      for (const element of uiElements(root, `[data-jqs="${kind}"]`)) {
        const target = copyRoot(element, kind);
        if (target) enhance(target, kind);
      }
    },
  };
}
