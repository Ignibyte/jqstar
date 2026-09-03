import type { ActionRegistrar } from "../registry";
import type { FileUploadTarget, StarContext, StarFileUploadStatic } from "../types";

interface FileUploadRecord {
  cleanup: () => void;
  control: HTMLInputElement;
  dragDepth: number;
  files: File[];
  renderedSignature: string;
  root: HTMLElement;
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

const records = new WeakMap<HTMLElement, FileUploadRecord>();
let uploadId = 0;

function uploadRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="file-upload"]')
    ? value
    : undefined;
}

function scopedPart(root: HTMLElement, part: string): HTMLElement | undefined {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)).find(
    (element) => element.parentElement?.closest("[data-jqs]") === root,
  );
}

function controlFor(root: HTMLElement): HTMLInputElement {
  const control = scopedPart(root, "control");
  if (!(control instanceof HTMLInputElement) || control.type !== "file") {
    throw new Error(`File Upload #${root.id} needs input[type="file"][data-part="control"].`);
  }
  return control;
}

function disabled(record: FileUploadRecord): boolean {
  return (
    record.control.disabled ||
    record.root.hasAttribute("disabled") ||
    record.root.dataset.disabled !== undefined
  );
}

function fileKey(file: File): string {
  return `${file.name}\u0000${file.size}\u0000${file.lastModified}\u0000${file.type}`;
}

function signature(files: File[]): string {
  return files.map(fileKey).join("\u0001");
}

function fileList(files: File[]): FileList | undefined {
  if (typeof DataTransfer === "undefined") return undefined;
  try {
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    return transfer.files;
  } catch {
    return undefined;
  }
}

function writeFiles(control: HTMLInputElement, files: File[]): void {
  const next = fileList(files);
  try {
    if (next) control.files = next;
    else Object.defineProperty(control, "files", { configurable: true, value: files });
  } catch {
    Object.defineProperty(control, "files", { configurable: true, value: next ?? files });
  }
}

function maxFiles(record: FileUploadRecord): number {
  const value = Number(record.root.dataset.maxFiles);
  if (Number.isFinite(value) && value > 0) return Math.floor(value);
  return record.control.multiple ? Number.POSITIVE_INFINITY : 1;
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
    new CustomEvent(`jquery-star:file-upload:${name}`, {
      bubbles: true,
      cancelable,
      detail: { ...detail, upload: record.root },
    }),
  );
}

function render(record: FileUploadRecord, message?: string): void {
  const nextSignature = signature(record.files);
  record.root.dataset.state =
    record.dragDepth > 0 ? "dragging" : record.files.length ? "ready" : "empty";
  record.root.dataset.count = String(record.files.length);
  record.root.setAttribute("aria-disabled", String(disabled(record)));
  const dropzone = scopedPart(record.root, "dropzone");
  if (dropzone?.tagName === "LABEL") dropzone.setAttribute("for", record.control.id);
  const status = scopedPart(record.root, "status");
  if (status) {
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    status.textContent =
      message ??
      (record.files.length
        ? `${record.files.length} file${record.files.length === 1 ? "" : "s"} selected.`
        : "No files selected.");
  }
  for (const remove of record.root.querySelectorAll<HTMLButtonElement>('[data-part="remove"]')) {
    if (remove.disabled !== disabled(record)) remove.disabled = disabled(record);
  }
  if (record.renderedSignature === nextSignature) return;
  record.renderedSignature = nextSignature;
  const list = scopedPart(record.root, "list");
  if (!list) return;
  list.replaceChildren();
  for (const [index, file] of record.files.entries()) {
    const item = document.createElement("li");
    item.dataset.part = "item";
    item.dataset.index = String(index);
    const name = document.createElement("span");
    name.dataset.part = "name";
    name.textContent = file.name;
    const size = document.createElement("span");
    size.dataset.part = "size";
    size.textContent = formatBytes(file.size);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.part = "remove";
    remove.dataset.index = String(index);
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${file.name}`);
    remove.disabled = disabled(record);
    item.append(name, size, remove);
    list.append(item);
  }
}

function setFiles(record: FileUploadRecord, files: File[], message?: string): HTMLElement {
  const previousFiles = [...record.files];
  if (signature(files) === signature(previousFiles)) {
    writeFiles(record.control, files);
    render(record, message);
    return record.root;
  }
  if (!emit(record, "before-change", { files, previousFiles }, true)) {
    writeFiles(record.control, previousFiles);
    return record.root;
  }
  record.files = [...files];
  writeFiles(record.control, record.files);
  render(record, message);
  emit(record, "change", { files: [...record.files], previousFiles });
  record.root.dispatchEvent(new Event("input", { bubbles: true }));
  record.root.dispatchEvent(new Event("change", { bubbles: true }));
  return record.root;
}

function acceptSelection(record: FileUploadRecord, selected: File[], append: boolean): HTMLElement {
  if (disabled(record)) return record.root;
  const candidates = append && record.control.multiple ? [...record.files, ...selected] : selected;
  const result = validateFiles(record, candidates);
  if (result.rejected.length) {
    emit(record, "reject", {
      accepted: result.accepted,
      files: result.accepted,
      rejected: result.rejected,
    });
    record.root.dataset.state = "invalid";
  }
  const message = result.rejected[0]?.reason;
  const root = setFiles(record, result.accepted, message);
  if (result.rejected.length) root.dataset.state = "invalid";
  return root;
}

function removeFile(record: FileUploadRecord, target: number | string): HTMLElement {
  const index =
    typeof target === "number" ? target : record.files.findIndex((file) => file.name === target);
  if (index < 0 || index >= record.files.length || disabled(record)) return record.root;
  return setFiles(
    record,
    record.files.filter((_, candidate) => candidate !== index),
  );
}

function wire(record: FileUploadRecord): () => void {
  const change = (): void => {
    acceptSelection(record, Array.from(record.control.files ?? []), false);
  };
  const click = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const remove = event.target.closest<HTMLElement>('[data-part="remove"]');
    if (!remove) return;
    removeFile(record, Number(remove.dataset.index));
  };
  const dragenter = (event: DragEvent): void => {
    if (disabled(record) || !event.dataTransfer?.types.includes("Files")) return;
    event.preventDefault();
    record.dragDepth += 1;
    render(record);
  };
  const dragover = (event: DragEvent): void => {
    if (disabled(record) || !event.dataTransfer?.types.includes("Files")) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  };
  const dragleave = (event: DragEvent): void => {
    event.preventDefault();
    record.dragDepth = Math.max(0, record.dragDepth - 1);
    render(record);
  };
  const drop = (event: DragEvent): void => {
    if (disabled(record)) return;
    event.preventDefault();
    record.dragDepth = 0;
    acceptSelection(record, Array.from(event.dataTransfer?.files ?? []), true);
  };
  const reset = (): void => {
    queueMicrotask(() => {
      record.files = Array.from(record.control.files ?? []);
      record.renderedSignature = "__reset__";
      render(record);
    });
  };
  record.control.addEventListener("change", change);
  record.root.addEventListener("click", click);
  record.root.addEventListener("dragenter", dragenter);
  record.root.addEventListener("dragover", dragover);
  record.root.addEventListener("dragleave", dragleave);
  record.root.addEventListener("drop", drop);
  record.control.form?.addEventListener("reset", reset);
  return () => {
    record.control.removeEventListener("change", change);
    record.root.removeEventListener("click", click);
    record.root.removeEventListener("dragenter", dragenter);
    record.root.removeEventListener("dragover", dragover);
    record.root.removeEventListener("dragleave", dragleave);
    record.root.removeEventListener("drop", drop);
    record.control.form?.removeEventListener("reset", reset);
  };
}

function enhanceFileUpload(root: HTMLElement): FileUploadRecord {
  root.id ||= `jqs-file-upload-${++uploadId}`;
  const control = controlFor(root);
  control.id ||= `${root.id}-control`;
  const existing = records.get(root);
  existing?.cleanup();
  const sameControl = existing?.control === control;
  const files = Array.from(control.files ?? []);
  const record: FileUploadRecord = {
    cleanup: () => undefined,
    control,
    dragDepth: existing?.dragDepth ?? 0,
    files: files.length || !sameControl ? files : [...(existing?.files ?? [])],
    renderedSignature: existing?.renderedSignature ?? "__initial__",
    root,
  };
  records.set(root, record);
  render(record);
  record.cleanup = wire(record);
  return record;
}

function resolveUpload(target: FileUploadTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? uploadRoot(root.querySelector(target)) : uploadRoot(target);
  if (resolved) return resolved;
  throw new Error(`File Upload target did not match data-jqs="file-upload": ${String(target)}`);
}

function controlledUpload(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="file-upload"]')) return target;
  if (typeof target === "string" && target.startsWith("#"))
    return resolveUpload(target, context.root);
  const closest = context.element?.closest('[data-jqs="file-upload"]');
  return resolveUpload(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceFileUploads(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="file-upload"]')));
  for (const element of elements) {
    const upload = uploadRoot(element);
    if (upload) enhanceFileUpload(upload);
  }
}

export function createFileUploads(registerAction: ActionRegistrar): FileUploadCollection {
  const api: StarFileUploadStatic = {
    clear: (target) => {
      const root = resolveUpload(target);
      return setFiles(records.get(root) ?? enhanceFileUpload(root), []);
    },
    remove: (target, file) => {
      const root = resolveUpload(target);
      return removeFile(records.get(root) ?? enhanceFileUpload(root), file);
    },
    files: (target) => {
      const root = resolveUpload(target);
      return [...(records.get(root) ?? enhanceFileUpload(root)).files];
    },
  };
  registerAction("ui.fileUpload.clear", (context) =>
    api.clear(controlledUpload(context, context.args?.[0])),
  );
  registerAction("ui.fileUpload.remove", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlledUpload(context, explicit ? first : undefined);
    const file = explicit ? context.args?.[1] : first;
    if (typeof file !== "string" && typeof file !== "number")
      throw new Error("ui.fileUpload.remove needs a file name or index.");
    return api.remove(target, file);
  });
  return { api, enhance: enhanceFileUploads };
}
