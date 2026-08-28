import { registerAction } from "../registry";
import type { ColorPickerTarget, StarColorPickerStatic, StarContext } from "../types";

interface ColorPickerRecord {
  cleanup: () => void;
  control: HTMLInputElement;
  root: HTMLElement;
  text: HTMLInputElement | undefined;
  value: string;
}

interface ColorPickerCollection {
  api: StarColorPickerStatic;
  enhance(root: ParentNode): void;
}

interface ColorPickerEventDetail {
  colorPicker: HTMLElement;
  control: HTMLInputElement;
  previousValue: string;
  value: string;
}

const records = new WeakMap<HTMLElement, ColorPickerRecord>();
let colorPickerId = 0;

function colorPickerRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="color-picker"]')
    ? value
    : undefined;
}

function directControl(root: HTMLElement): HTMLInputElement {
  const control = Array.from(root.children).find(
    (child): child is HTMLInputElement =>
      child instanceof HTMLInputElement && child.dataset.part === "control",
  );
  if (!control)
    throw new Error(`Color Picker #${root.id} needs a direct input[data-part="control"].`);
  if (control.type !== "color")
    throw new Error(`Color Picker #${root.id} control must use type="color".`);
  return control;
}

function directText(root: HTMLElement): HTMLInputElement | undefined {
  const value = Array.from(root.children).find(
    (child): child is HTMLInputElement =>
      child instanceof HTMLInputElement && child.dataset.part === "value",
  );
  return value;
}

function unavailable(record: ColorPickerRecord): boolean {
  return (
    record.control.disabled ||
    record.root.hasAttribute("disabled") ||
    record.root.dataset.disabled !== undefined
  );
}

function normalize(control: HTMLInputElement, value: string): string | undefined {
  const candidate = value.trim();
  if (!candidate) return undefined;
  const probe = control.cloneNode() as HTMLInputElement;
  const sentinel = "#010203";
  probe.value = sentinel;
  probe.value = candidate;
  if (!probe.checkValidity()) return undefined;
  const normalized = probe.value;
  if (/^#[\da-f]{6}$/i.test(candidate)) return normalized;
  if (normalized.toLocaleLowerCase() === candidate.toLocaleLowerCase()) return normalized;
  const supportsColor = typeof CSS !== "undefined" && CSS.supports?.("color", candidate);
  const modernControl = control.hasAttribute("alpha") || control.hasAttribute("colorspace");
  return supportsColor && modernControl ? normalized : undefined;
}

function emit(
  record: ColorPickerRecord,
  name: "before-change" | "change" | "invalid",
  value: string,
  previousValue: string,
  cancelable = false,
): boolean {
  const detail: ColorPickerEventDetail = {
    colorPicker: record.root,
    control: record.control,
    previousValue,
    value,
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:color-picker:${name}`, { bubbles: true, cancelable, detail }),
  );
}

function status(record: ColorPickerRecord, message?: string): void {
  const element = Array.from(record.root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.dataset.part === "status",
  );
  if (element) element.textContent = message ?? `Selected color ${record.control.value}.`;
}

function sync(record: ColorPickerRecord): void {
  record.value = record.control.value;
  if (record.root.dataset.value !== record.value) record.root.dataset.value = record.value;
  record.root.dataset.state = unavailable(record) ? "disabled" : "ready";
  record.root.style.setProperty("--jqs-color-value", record.value);
  if (record.text && record.text.value !== record.value) record.text.value = record.value;
  if (record.text) record.text.disabled = unavailable(record);
  const preview = Array.from(record.root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.dataset.part === "preview",
  );
  if (preview) {
    preview.style.backgroundColor = record.value;
    preview.setAttribute("role", "img");
    preview.setAttribute("aria-label", `Selected color ${record.value}`);
  }
  for (const swatch of record.root.querySelectorAll<HTMLButtonElement>('[data-part="swatch"]')) {
    const value = swatch.dataset.value ?? "";
    const selected = value.toLocaleLowerCase() === record.value.toLocaleLowerCase();
    swatch.type = "button";
    swatch.setAttribute("aria-pressed", String(selected));
    swatch.dataset.state = selected ? "selected" : "unselected";
    swatch.style.setProperty("--jqs-swatch-value", value);
    if (!swatch.hasAttribute("aria-label")) swatch.setAttribute("aria-label", `Use color ${value}`);
    if (swatch.disabled !== unavailable(record)) swatch.disabled = unavailable(record);
  }
  status(record);
}

function commit(record: ColorPickerRecord, value: string, dispatchNative = true): HTMLElement {
  if (unavailable(record)) return record.root;
  const next = normalize(record.control, value);
  if (!next) {
    record.root.dataset.state = "invalid";
    if (record.text) record.text.setAttribute("aria-invalid", "true");
    status(record, `${value || "Empty value"} is not supported by this color input.`);
    emit(record, "invalid", value, record.value);
    return record.root;
  }
  const previousValue = record.value;
  if (next === previousValue) {
    sync(record);
    return record.root;
  }
  if (!emit(record, "before-change", next, previousValue, true)) {
    record.control.value = previousValue;
    sync(record);
    return record.root;
  }
  record.control.value = next;
  record.value = next;
  if (record.text) record.text.removeAttribute("aria-invalid");
  sync(record);
  if (dispatchNative) {
    record.control.dispatchEvent(new Event("input", { bubbles: true }));
    record.control.dispatchEvent(new Event("change", { bubbles: true }));
  }
  emit(record, "change", next, previousValue);
  return record.root;
}

function wire(record: ColorPickerRecord): () => void {
  const native = (): void => {
    const next = record.control.value;
    record.control.value = record.value;
    commit(record, next, false);
  };
  const textChange = (): void => {
    if (record.text) commit(record, record.text.value);
  };
  const textKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      textChange();
    }
  };
  const click = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const swatch = event.target.closest<HTMLElement>('[data-part="swatch"]');
    if (swatch?.dataset.value) commit(record, swatch.dataset.value);
  };
  const reset = (): void => {
    window.setTimeout(() => {
      const previousValue = record.value;
      record.value = record.control.value;
      sync(record);
      if (previousValue !== record.value) emit(record, "change", record.value, previousValue);
    }, 0);
  };
  record.control.addEventListener("input", native);
  record.text?.addEventListener("change", textChange);
  record.text?.addEventListener("keydown", textKeydown);
  record.root.addEventListener("click", click);
  record.control.form?.addEventListener("reset", reset);
  return () => {
    record.control.removeEventListener("input", native);
    record.text?.removeEventListener("change", textChange);
    record.text?.removeEventListener("keydown", textKeydown);
    record.root.removeEventListener("click", click);
    record.control.form?.removeEventListener("reset", reset);
  };
}

function enhanceColorPicker(root: HTMLElement): ColorPickerRecord {
  root.id ||= `jqs-color-picker-${++colorPickerId}`;
  const control = directControl(root);
  const text = directText(root);
  control.id ||= `${root.id}-control`;
  if (text) {
    text.type = "text";
    text.autocomplete = "off";
    text.spellcheck = false;
    if (!text.hasAttribute("aria-label")) text.setAttribute("aria-label", "Color value");
  }
  const statusElement = Array.from(root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.dataset.part === "status",
  );
  if (statusElement) {
    statusElement.setAttribute("aria-live", "polite");
    statusElement.setAttribute("aria-atomic", "true");
  }
  const existing = records.get(root);
  if (existing?.control === control && existing.text === text) {
    if (root.dataset.value !== undefined && root.dataset.value !== existing.value) {
      const value = normalize(control, root.dataset.value);
      if (value) control.value = value;
    }
    sync(existing);
    return existing;
  }
  existing?.cleanup();
  if (root.dataset.value !== undefined) {
    const value = normalize(control, root.dataset.value);
    if (value) control.value = value;
  }
  const record: ColorPickerRecord = {
    cleanup: () => undefined,
    control,
    root,
    text,
    value: control.value,
  };
  records.set(root, record);
  sync(record);
  record.cleanup = wire(record);
  return record;
}

function resolve(target: ColorPickerTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? colorPickerRoot(root.querySelector(target))
      : colorPickerRoot(target);
  if (resolved) return resolved;
  throw new Error(`Color Picker target did not match data-jqs="color-picker": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="color-picker"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="color-picker"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceAll(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="color-picker"]')));
  for (const element of elements) {
    const component = colorPickerRoot(element);
    if (component) enhanceColorPicker(component);
  }
}

export function createColorPickers(): ColorPickerCollection {
  const api: StarColorPickerStatic = {
    set: (target, value) => {
      const root = resolve(target);
      return commit(records.get(root) ?? enhanceColorPicker(root), value);
    },
    value: (target) => {
      const root = resolve(target);
      return (records.get(root) ?? enhanceColorPicker(root)).control.value;
    },
  };
  registerAction("ui.color-picker.set", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlled(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    if (typeof value !== "string") throw new Error("ui.color-picker.set needs a CSS color value.");
    return api.set(target, value);
  });
  return { api, enhance: enhanceAll };
}
