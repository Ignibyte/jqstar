import { isElementNode, isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { FileUploadTarget, StarContext, StarFileUploadStatic } from "../types";
import {
  failUISetup,
  listenUI,
  ownUIRecord,
  releaseUIResources,
  uiActive,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";

interface FileUploadRecord extends UIResources {
  control: HTMLInputElement;
  form: HTMLFormElement | null;
  list: HTMLElement | undefined;
  status: HTMLElement | undefined;
  dropzone: HTMLElement | undefined;
  dragDepth: number;
  files: File[];
  renderedSignature: string;
  rows: Element[];
  removes: HTMLButtonElement[];
  message: string | undefined;
}
interface FileUploadCollection {
  api: StarFileUploadStatic;
  enhance(root: ParentNode): void;
}
interface FileUploadEventDetail {
  accepted?: File[];
  files: File[];
  previousFiles?: File[];
  rejected?: Array<{ file: File; reason: string }>;
  upload: HTMLElement;
}
type RetainedUpload = Pick<
  FileUploadRecord,
  "control" | "list" | "dragDepth" | "renderedSignature" | "rows" | "removes" | "message" | "files"
>;
const records = new WeakMap<HTMLElement, FileUploadRecord>();
const retained = new WeakMap<HTMLElement, RetainedUpload>();
let uploadId = 0;
function uploadRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="file-upload"]') ? value : undefined;
}
function scopedPart(root: HTMLElement, part: string): HTMLElement | undefined {
  return Array.from(root.querySelectorAll(`[data-part="${part}"]`)).find(
    (element): element is HTMLElement =>
      isHTMLElement(element) && element.parentElement?.closest("[data-jqs]") === root,
  );
}
function controlFor(root: HTMLElement): HTMLInputElement {
  const control = scopedPart(root, "control");
  if (!isHTMLTag(control, "input") || control.type !== "file")
    throw new Error(`File Upload #${root.id} needs input[type="file"][data-part="control"].`);
  return control;
}
function current(record: FileUploadRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    record.root.matches('[data-jqs="file-upload"]') &&
    scopedPart(record.root, "control") === record.control &&
    record.control.type === "file" &&
    record.control.form === record.form &&
    scopedPart(record.root, "list") === record.list &&
    scopedPart(record.root, "status") === record.status &&
    scopedPart(record.root, "dropzone") === record.dropzone
  );
}
function disabled(record: FileUploadRecord): boolean {
  return (
    record.control.matches(":disabled") ||
    record.root.hasAttribute("disabled") ||
    record.root.dataset.disabled !== undefined
  );
}
function nativeFiles(control: HTMLInputElement): File[] {
  return Array.from(control.files ?? []);
}
function sameFiles(left: File[], right: File[]): boolean {
  return left.length === right.length && left.every((file, index) => file === right[index]);
}
function signature(files: File[]): string {
  return JSON.stringify(files.map((file) => [file.name, file.size, file.lastModified, file.type]));
}
function constraints(record: FileUploadRecord): string {
  return JSON.stringify([
    record.control.accept,
    record.control.multiple,
    record.root.dataset.maxFiles,
    record.root.dataset.maxSize,
  ]);
}
function writeFiles(record: FileUploadRecord, files: File[], valid: () => boolean): boolean {
  if (!valid()) return false;
  if (sameFiles(nativeFiles(record.control), files)) return true;
  const Transfer = (record.window as Window & typeof globalThis).DataTransfer;
  if (typeof Transfer === "function") {
    const transfer = new Transfer();
    if (!valid()) return false;
    for (const file of files) {
      transfer.items.add(file);
      if (!valid()) return false;
    }
    const list = transfer.files;
    if (!valid()) return false;
    record.control.files = list;
  } else {
    const override = Object.getOwnPropertyDescriptor(record.control, "files");
    if (override?.configurable && Array.isArray(override.value)) {
      Object.defineProperty(record.control, "files", { ...override, value: [...files] });
    } else if (files.length === 0) record.control.value = "";
    else
      throw new Error("File Upload needs native DataTransfer support to replace selected files.");
  }
  return sameFiles(nativeFiles(record.control), files);
}
function maxFiles(record: FileUploadRecord): number {
  const nativeLimit = record.control.multiple ? Number.POSITIVE_INFINITY : 1;
  const value = Number(record.root.dataset.maxFiles);
  return Number.isFinite(value) && value > 0
    ? Math.min(nativeLimit, Math.floor(value))
    : nativeLimit;
}
function maxSize(record: FileUploadRecord): number {
  const value = Number(record.root.dataset.maxSize);
  return Number.isFinite(value) && value > 0 ? value : Number.POSITIVE_INFINITY;
}

function accepts(file: File, accept: string): boolean {
  if (!accept.trim()) return true;
  return accept
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .some((rule) => {
      const name = file.name.toLowerCase();
      const type = file.type.toLowerCase();
      if (rule.startsWith(".")) return name.endsWith(rule);
      if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
      return type === rule;
    });
}

function validateFiles(
  record: FileUploadRecord,
  candidates: File[],
): { accepted: File[]; rejected: Array<{ file: File; reason: string }> } {
  const accepted: File[] = [];
  const rejected: Array<{ file: File; reason: string }> = [];
  const limit = maxFiles(record);
  const size = maxSize(record);
  const accept = record.control.accept;
  for (const file of candidates) {
    let reason = "";
    if (accepted.length >= limit)
      reason = `Only ${limit} file${limit === 1 ? " is" : "s are"} allowed.`;
    else if (file.size > size)
      reason = `${file.name} is larger than the ${formatBytes(size)} limit.`;
    else if (!accepts(file, accept)) reason = `${file.name} is not an accepted file type.`;
    if (reason) rejected.push({ file, reason });
    else accepted.push(file);
  }
  return { accepted, rejected };
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "unlimited";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function emit(
  record: FileUploadRecord,
  name: "before-change" | "change" | "reject",
  detail: Omit<FileUploadEventDetail, "upload">,
  cancelable = false,
): boolean {
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:file-upload:${name}`,
      {
        bubbles: true,
        cancelable,
        detail: {
          ...detail,
          files: [...detail.files],
          ...(detail.accepted ? { accepted: [...detail.accepted] } : {}),
          ...(detail.previousFiles ? { previousFiles: [...detail.previousFiles] } : {}),
          ...(detail.rejected ? { rejected: detail.rejected.map((entry) => ({ ...entry })) } : {}),
          upload: record.root,
        },
      },
    ),
  );
}
function render(record: FileUploadRecord): void {
  if (!current(record)) return;
  const revision = record.revision;
  const unavailable = disabled(record);
  record.root.dataset.state =
    record.dragDepth > 0 && !unavailable
      ? "dragging"
      : record.message
        ? "invalid"
        : record.files.length
          ? "ready"
          : "empty";
  record.root.dataset.count = String(record.files.length);
  record.root.setAttribute("aria-disabled", String(unavailable));
  if (isHTMLTag(record.dropzone, "label")) record.dropzone.htmlFor = record.control.id;
  if (record.status) {
    record.status.setAttribute("aria-live", "polite");
    record.status.setAttribute("aria-atomic", "true");
    record.status.textContent =
      record.message ??
      (record.files.length
        ? `${record.files.length} file${record.files.length === 1 ? "" : "s"} selected.`
        : "No files selected.");
  }
  for (const remove of record.removes)
    if (remove.disabled !== unavailable) remove.disabled = unavailable;
  const list = record.list;
  if (!list || !current(record, revision)) return;
  const nextSignature = signature(record.files);
  if (
    record.renderedSignature === nextSignature &&
    record.rows.length === list.children.length &&
    record.rows.every((row, index) => list.children[index] === row)
  )
    return;
  list.replaceChildren();
  if (!current(record, revision)) return;
  record.renderedSignature = nextSignature;
  record.rows = [];
  record.removes = [];
  for (const [index, file] of record.files.entries()) {
    const item = record.document.createElement("li");
    item.dataset.part = "item";
    item.dataset.index = String(index);
    const name = record.document.createElement("span");
    name.dataset.part = "name";
    name.textContent = file.name;
    const size = record.document.createElement("span");
    size.dataset.part = "size";
    size.textContent = formatBytes(file.size);
    const remove = record.document.createElement("button");
    remove.type = "button";
    remove.dataset.part = "remove";
    remove.dataset.index = String(index);
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${file.name}`);
    remove.disabled = unavailable;
    item.append(name, size, remove);
    list.append(item);
    if (!current(record, revision)) return;
    record.rows.push(item);
    record.removes.push(remove);
  }
}
function request(record: FileUploadRecord) {
  const revision = ++record.revision;
  let observed = nativeFiles(record.control);
  const signature = constraints(record);
  const valid = (): boolean =>
    current(record, revision) &&
    !disabled(record) &&
    constraints(record) === signature &&
    sameFiles(nativeFiles(record.control), observed);
  return {
    revision,
    valid,
    observe: () => {
      observed = nativeFiles(record.control);
    },
  };
}
function commit(
  record: FileUploadRecord,
  files: File[],
  previousFiles: File[],
  operation: ReturnType<typeof request>,
  message?: string,
): HTMLElement {
  if (!operation.valid()) return record.root;
  const changed = !sameFiles(files, previousFiles);
  if (changed) {
    const accepted = emit(record, "before-change", { files, previousFiles }, true);
    if (!operation.valid()) return record.root;
    if (!accepted) {
      if (writeFiles(record, previousFiles, operation.valid)) {
        operation.observe();
        if (operation.valid()) {
          record.files = nativeFiles(record.control);
          render(record);
        }
      }
      return record.root;
    }
  }
  if (!writeFiles(record, files, operation.valid)) return record.root;
  operation.observe();
  if (!operation.valid()) return record.root;
  record.files = nativeFiles(record.control);
  record.message = message;
  render(record);
  if (!changed || !operation.valid()) return record.root;
  emit(record, "change", { files: record.files, previousFiles });
  if (!operation.valid()) return record.root;
  record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).Event("input", { bubbles: true }),
  );
  if (operation.valid())
    record.root.dispatchEvent(
      new (record.window as Window & typeof globalThis).Event("change", { bubbles: true }),
    );
  return record.root;
}
function acceptSelection(record: FileUploadRecord, selected: File[], append: boolean): HTMLElement {
  const operation = request(record);
  if (!operation.valid()) return record.root;
  const previousFiles = append ? nativeFiles(record.control) : [...record.files];
  const candidates = append && record.control.multiple ? [...previousFiles, ...selected] : selected;
  const result = validateFiles(record, candidates);
  if (result.rejected.length) {
    emit(record, "reject", {
      accepted: result.accepted,
      files: result.accepted,
      rejected: result.rejected,
    });
    if (!operation.valid()) return record.root;
  }
  return commit(record, result.accepted, previousFiles, operation, result.rejected[0]?.reason);
}
function setFiles(record: FileUploadRecord, files: File[]): HTMLElement {
  const operation = request(record);
  return commit(record, files, nativeFiles(record.control), operation);
}
function removeFile(record: FileUploadRecord, target: number | string): HTMLElement {
  const operation = request(record);
  if (!operation.valid()) return record.root;
  const files = nativeFiles(record.control);
  const index =
    typeof target === "number" ? target : files.findIndex((file) => file.name === target);
  if (!Number.isInteger(index) || index < 0 || index >= files.length) return record.root;
  return commit(
    record,
    files.filter((_, candidate) => candidate !== index),
    files,
    operation,
  );
}
function wire(record: FileUploadRecord): void {
  const listen = listenUI.bind(undefined, record, () => current(record));
  const owned = (event: Event): boolean =>
    isElementNode(event.target) && event.target.closest("[data-jqs]") === record.root;
  listen(record.control, "change", () => {
    acceptSelection(record, nativeFiles(record.control), false);
  });
  listen(record.root, "click", (event) => {
    if (!owned(event) || !isElementNode(event.target)) return;
    const remove = event.target.closest('button[data-part="remove"]');
    if (
      !isHTMLTag(remove, "button") ||
      !record.list?.contains(remove) ||
      remove.matches(":disabled")
    )
      return;
    const index = record.removes.indexOf(remove);
    if (index >= 0) removeFile(record, index);
  });
  listen(record.root, "dragenter", (event) => {
    if (
      !owned(event) ||
      disabled(record) ||
      !(event as DragEvent).dataTransfer?.types.includes("Files")
    )
      return;
    event.preventDefault();
    record.dragDepth += 1;
    render(record);
  });
  listen(record.root, "dragover", (event) => {
    const transfer = (event as DragEvent).dataTransfer;
    if (!owned(event) || disabled(record) || !transfer?.types.includes("Files")) return;
    event.preventDefault();
    transfer.dropEffect = "copy";
  });
  listen(record.root, "dragleave", (event) => {
    if (!owned(event)) return;
    event.preventDefault();
    record.dragDepth = Math.max(0, record.dragDepth - 1);
    render(record);
  });
  listen(record.root, "drop", (event) => {
    const transfer = (event as DragEvent).dataTransfer;
    if (!owned(event) || disabled(record) || !transfer?.types.includes("Files")) return;
    event.preventDefault();
    record.dragDepth = 0;
    acceptSelection(record, Array.from(transfer.files), true);
  });
  listen(record.form ?? undefined, "reset", (event) => {
    const revision = ++record.revision;
    record.resetRevision = revision;
    record.window.queueMicrotask(() => {
      if (!current(record, revision)) return;
      delete record.resetRevision;
      if (event.defaultPrevented) return;
      record.files = nativeFiles(record.control);
      record.message = undefined;
      record.dragDepth = 0;
      render(record);
    });
  });
}
function enhanceFileUpload(root: HTMLElement): FileUploadRecord {
  const existing = records.get(root);
  if (existing && current(existing)) {
    if (existing.resetRevision === existing.revision) return existing;
    const files = nativeFiles(existing.control);
    if (!sameFiles(existing.files, files)) {
      existing.revision += 1;
      existing.files = files;
      existing.message = undefined;
    }
    render(existing);
    return existing;
  }
  existing?.cleanup();
  if (existing && !uiActive(root)) return existing;
  const replacement = records.get(root);
  if (replacement) return replacement;
  root.id ||= `jqs-file-upload-${++uploadId}`;
  const control = controlFor(root);
  control.id ||= `${root.id}-control`;
  const list = scopedPart(root, "list");
  const prior = retained.get(root);
  retained.delete(root);
  const sameControl = prior?.control === control;
  const sameList = sameControl && prior.list === list;
  const record: FileUploadRecord = {
    ...uiResources(root),
    control,
    form: control.form,
    list,
    status: scopedPart(root, "status"),
    dropzone: scopedPart(root, "dropzone"),
    dragDepth: sameControl ? prior.dragDepth : 0,
    files: nativeFiles(control),
    renderedSignature: sameList ? prior.renderedSignature : "",
    rows: sameList ? prior.rows : [],
    removes: sameList ? prior.removes : [],
    message:
      sameControl && sameFiles(prior.files, nativeFiles(control)) ? prior.message : undefined,
  };
  record.cleanup = ownUIRecord(records, root, record, () => {
    const adopted = record.document !== root.ownerDocument;
    retained.set(root, {
      control: record.control,
      list: record.list,
      dragDepth: adopted ? record.dragDepth : 0,
      renderedSignature: record.renderedSignature,
      rows: record.rows,
      removes: record.removes,
      message: record.message,
      files: record.files,
    });
    releaseUIResources(record);
  });
  record.cleanups.add(() => {
    if (record.document === root.ownerDocument && record.dragDepth) {
      record.dragDepth = 0;
      if (!records.has(root)) root.dataset.state = record.files.length ? "ready" : "empty";
    }
  });
  try {
    wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    render(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}
function recordFor(root: HTMLElement): FileUploadRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceFileUpload(root);
}
function resolveUpload(target: FileUploadTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? uploadRoot(isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target))
      : uploadRoot(target);
  if (resolved) return resolved;
  throw new Error(`File Upload target did not match data-jqs="file-upload": ${String(target)}`);
}

function controlledUpload(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveUpload(target, context.root);
  if (typeof target === "string" && target.startsWith("#"))
    return resolveUpload(target, context.root);
  const closest = context.element?.closest('[data-jqs="file-upload"]');
  return resolveUpload(isHTMLElement(closest) ? closest : String(target), context.root);
}

function enhanceFileUploads(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="file-upload"]')) {
    const upload = uploadRoot(element);
    if (upload) enhanceFileUpload(upload);
  }
}

export function createFileUploads(registerAction: ActionRegistrar): FileUploadCollection {
  const api: StarFileUploadStatic = {
    clear: (target) => {
      const root = resolveUpload(target);
      return setFiles(recordFor(root), []);
    },
    remove: (target, file) => {
      const root = resolveUpload(target);
      return removeFile(recordFor(root), file);
    },
    files: (target) => {
      const root = resolveUpload(target);
      return nativeFiles(recordFor(root).control);
    },
  };
  registerAction("ui.fileUpload.clear", (context) =>
    api.clear(controlledUpload(context, context.args?.[0])),
  );
  registerAction("ui.fileUpload.remove", (context) => {
    const first = context.args?.[0];
    const explicit = isHTMLElement(first) || (typeof first === "string" && first.startsWith("#"));
    const target = controlledUpload(context, explicit ? first : undefined);
    const file = explicit ? context.args?.[1] : first;
    if (typeof file !== "string" && typeof file !== "number")
      throw new Error("ui.fileUpload.remove needs a file name or index.");
    return api.remove(target, file);
  });
  return { api, enhance: enhanceFileUploads };
}
