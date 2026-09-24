import { isElementNode, isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { ColorPickerTarget, StarColorPickerStatic, StarContext } from "../types";
import {
  failUISetup,
  listenUI,
  listenUIReset,
  ownUIRecord,
  releaseUIResources,
  uiActive,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";

interface ColorTextState {
  composing: boolean;
  invalid: boolean;
  reflected: string;
}
interface ColorPickerRecord extends UIResources {
  form: HTMLFormElement | null;
  control: HTMLInputElement;
  text: HTMLInputElement | undefined;
  textState: ColorTextState | undefined;
  preview: HTMLElement | undefined;
  status: HTMLElement | undefined;
  nativeEvent?: Event;
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
const reflected = new WeakMap<HTMLElement, string>();
const textStates = new WeakMap<HTMLInputElement, ColorTextState>();
const disabledStates = new WeakMap<HTMLElement, { authored: boolean; reflected: boolean }>();
let colorPickerId = 0;

function colorPickerRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="color-picker"]') ? value : undefined;
}
function directPart(root: HTMLElement, part: string): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === part,
  );
}
function directControl(root: HTMLElement): HTMLInputElement {
  const control = directPart(root, "control");
  if (!isHTMLTag(control, "input"))
    throw new Error(`Color Picker #${root.id} needs a direct input[data-part="control"].`);
  if (control.type !== "color")
    throw new Error(`Color Picker #${root.id} control must use type="color".`);
  return control;
}
function directText(root: HTMLElement): HTMLInputElement | undefined {
  const text = directPart(root, "value");
  return isHTMLTag(text, "input") ? text : undefined;
}
function current(record: ColorPickerRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    record.root.matches('[data-jqs="color-picker"]') &&
    directPart(record.root, "control") === record.control &&
    record.control.type === "color" &&
    directText(record.root) === record.text &&
    directPart(record.root, "preview") === record.preview &&
    directPart(record.root, "status") === record.status &&
    record.control.form === record.form
  );
}
function unavailable(record: ColorPickerRecord): boolean {
  return (
    record.control.matches(":disabled") ||
    record.control.readOnly ||
    record.root.hasAttribute("disabled") ||
    record.root.dataset.disabled !== undefined
  );
}
function constraints(control: HTMLInputElement): string {
  return JSON.stringify([
    control.type,
    control.getAttribute("alpha"),
    control.getAttribute("colorspace"),
  ]);
}
function normalize(control: HTMLInputElement, value: string): string | undefined {
  const candidate = value.trim();
  if (!candidate) return undefined;
  const probe = control.cloneNode() as HTMLInputElement;
  probe.value = candidate;
  if (!probe.checkValidity()) return undefined;
  const normalized = probe.value;
  if (/^#[\da-f]{6}$/i.test(candidate) || normalized.toLowerCase() === candidate.toLowerCase())
    return normalized;
  const css = control.ownerDocument.defaultView?.CSS;
  if (!css?.supports("color", candidate)) return undefined;
  const style = control.ownerDocument.createElement("span").style;
  style.color = candidate;
  if (/^(?:inherit|initial|unset|revert|revert-layer)$|\b(?:var|currentcolor)\b/i.test(style.color))
    return undefined;
  probe.value = "not-a-color";
  const fallback = probe.value;
  probe.value = "rgb(1, 2, 3)";
  return probe.value !== fallback ? normalized : undefined;
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
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:color-picker:${name}`,
      { bubbles: true, cancelable, detail },
    ),
  );
}
function status(record: ColorPickerRecord, message?: string): void {
  if (record.status)
    record.status.textContent = message ?? `Selected color ${record.control.value}.`;
}
function syncDisabled(element: HTMLInputElement | HTMLButtonElement, unavailable: boolean): void {
  let state = disabledStates.get(element);
  if (!state) {
    state = { authored: element.disabled, reflected: element.disabled };
    disabledStates.set(element, state);
  } else if (element.disabled !== state.reflected) state.authored = element.disabled;
  state.reflected = state.authored || unavailable;
  if (element.disabled !== state.reflected) element.disabled = state.reflected;
}
function sync(record: ColorPickerRecord, replaceDraft = false): void {
  record.value = record.control.value;
  reflected.set(record.root, record.value);
  if (record.root.dataset.value !== record.value) record.root.dataset.value = record.value;
  const disabled = unavailable(record);
  if (record.text && record.textState) {
    if (
      replaceDraft ||
      (!record.textState.composing && record.text.value === record.textState.reflected)
    ) {
      record.textState.invalid = false;
      record.text.removeAttribute("aria-invalid");
      if (record.text.value !== record.value) record.text.value = record.value;
      record.textState.reflected = record.value;
    }
    syncDisabled(record.text, disabled);
  }
  record.root.dataset.state = disabled
    ? "disabled"
    : record.textState?.invalid
      ? "invalid"
      : "ready";
  record.root.style.setProperty("--jqs-color-value", record.value);
  if (record.preview) {
    record.preview.style.backgroundColor = record.value;
    record.preview.setAttribute("role", "img");
    record.preview.setAttribute("aria-label", `Selected color ${record.value}`);
  }
  for (const swatch of record.root.querySelectorAll('button[data-part="swatch"]')) {
    if (!isHTMLTag(swatch, "button") || swatch.closest("[data-jqs]") !== record.root) continue;
    const value = swatch.dataset.value ?? "";
    const selected = value.toLowerCase() === record.value.toLowerCase();
    swatch.type = "button";
    swatch.setAttribute("aria-pressed", String(selected));
    swatch.dataset.state = selected ? "selected" : "unselected";
    swatch.style.setProperty("--jqs-swatch-value", value);
    if (!swatch.hasAttribute("aria-label")) swatch.setAttribute("aria-label", `Use color ${value}`);
    syncDisabled(swatch, disabled);
  }
  if (!record.textState?.invalid) status(record);
}
function commit(record: ColorPickerRecord, value: string, native = false): HTMLElement {
  const revision = ++record.revision;
  if (!current(record, revision) || unavailable(record)) return record.root;
  const original = record.control.value;
  const previousValue = native ? record.value : original;
  const signature = constraints(record.control);
  let rootValue = record.root.dataset.value;
  const next = normalize(record.control, value);
  const valid = (): boolean =>
    current(record, revision) &&
    !unavailable(record) &&
    constraints(record.control) === signature &&
    record.root.dataset.value === rootValue;
  if (!valid() || record.control.value !== original) return record.root;
  if (next === undefined) {
    record.root.dataset.state = "invalid";
    if (record.textState) record.textState.invalid = true;
    record.text?.setAttribute("aria-invalid", "true");
    status(record, `${value || "Empty value"} is not supported by this color input.`);
    emit(record, "invalid", value, previousValue);
    return record.root;
  }
  if (next === previousValue) {
    sync(record, true);
    return record.root;
  }
  const accepted = emit(record, "before-change", next, previousValue, true);
  if (!valid() || record.control.value !== original) return record.root;
  if (!accepted) {
    if (native) record.control.value = previousValue;
    sync(record, true);
    return record.root;
  }
  record.control.value = next;
  sync(record, true);
  rootValue = record.root.dataset.value;
  if (!native) {
    for (const type of ["input", "change"]) {
      const event = new (record.window as Window & typeof globalThis).Event(type, {
        bubbles: true,
      });
      record.nativeEvent = event;
      try {
        record.control.dispatchEvent(event);
      } finally {
        if (record.nativeEvent === event) delete record.nativeEvent;
      }
      if (!valid() || record.control.value !== next) return record.root;
    }
  }
  if (valid() && record.control.value === next) emit(record, "change", next, previousValue);
  return record.root;
}
function wire(record: ColorPickerRecord): void {
  const listen = listenUI.bind(undefined, record, () => current(record));
  const native = (event: Event): void => {
    if (event === record.nativeEvent) return;
    if (unavailable(record)) {
      const previousValue = record.value;
      record.revision += 1;
      sync(record, true);
      if (record.value !== previousValue) emit(record, "change", record.value, previousValue);
    } else commit(record, record.control.value, true);
  };
  const textChange = (): void => {
    if (
      record.text &&
      !record.text.matches(":disabled") &&
      !record.text.readOnly &&
      !record.textState?.composing
    )
      commit(record, record.text.value);
  };
  listen(record.control, "input", native);
  listen(record.control, "change", native);
  listen(record.text, "change", textChange);
  listen(record.text, "compositionstart", () => {
    if (record.textState) record.textState.composing = true;
  });
  listen(record.text, "compositionend", () => {
    if (record.textState) record.textState.composing = false;
  });
  listen(record.text, "keydown", (event) => {
    const key = event as KeyboardEvent;
    if (
      key.key === "Enter" &&
      !key.isComposing &&
      !record.textState?.composing &&
      !key.altKey &&
      !key.ctrlKey &&
      !key.metaKey &&
      !key.shiftKey
    ) {
      event.preventDefault();
      textChange();
    }
  });
  listen(record.root, "click", (event) => {
    if (!isElementNode(event.target)) return;
    const swatch = event.target.closest('button[data-part="swatch"]');
    if (
      isHTMLTag(swatch, "button") &&
      swatch.closest("[data-jqs]") === record.root &&
      !swatch.matches(":disabled") &&
      swatch.dataset.value !== undefined
    )
      commit(record, swatch.dataset.value);
  });
  listenUIReset(
    record,
    () => current(record),
    record.form,
    () => {
      const previousValue = record.value;
      sync(record, true);
      if (record.value !== previousValue) emit(record, "change", record.value, previousValue);
    },
  );
}
function enhanceColorPicker(root: HTMLElement): ColorPickerRecord {
  const existing = records.get(root);
  if (existing && current(existing)) {
    if (existing.resetRevision === existing.revision && root.dataset.value === reflected.get(root))
      return existing;
    const patched = root.dataset.value !== undefined && root.dataset.value !== reflected.get(root);
    if (patched) {
      const value = normalize(existing.control, root.dataset.value ?? "");
      existing.revision += 1;
      if (value !== undefined) existing.control.value = value;
    } else if (existing.control.value !== existing.value) existing.revision += 1;
    sync(existing, patched);
    return existing;
  }
  existing?.cleanup();
  if (existing && !uiActive(root)) return existing;
  const replacement = records.get(root);
  if (replacement) return replacement;
  root.id ||= `jqs-color-picker-${++colorPickerId}`;
  const control = directControl(root);
  const text = directText(root);
  control.id ||= `${root.id}-control`;
  let textState: ColorTextState | undefined;
  if (text) {
    text.type = "text";
    text.autocomplete = "off";
    text.spellcheck = false;
    if (!text.hasAttribute("aria-label")) text.setAttribute("aria-label", "Color value");
    textState = textStates.get(text);
    if (!textState) {
      textState = { composing: false, invalid: false, reflected: text.value };
      textStates.set(text, textState);
    }
  }
  const statusElement = directPart(root, "status");
  if (statusElement) {
    statusElement.setAttribute("aria-live", "polite");
    statusElement.setAttribute("aria-atomic", "true");
  }
  const patched = root.dataset.value !== undefined && root.dataset.value !== reflected.get(root);
  if (patched) {
    const value = normalize(control, root.dataset.value ?? "");
    if (value !== undefined) control.value = value;
  }
  const record: ColorPickerRecord = {
    ...uiResources(root),
    form: control.form,
    control,
    text,
    textState,
    preview: directPart(root, "preview"),
    status: statusElement,
    value: control.value,
  };
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    sync(record, patched);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}
function recordFor(root: HTMLElement): ColorPickerRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceColorPicker(root);
}
function resolve(target: ColorPickerTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? colorPickerRoot(
          isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target),
        )
      : colorPickerRoot(target);
  if (resolved) return resolved;
  throw new Error(`Color Picker target did not match data-jqs="color-picker": ${String(target)}`);
}
function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolve(target, context.root);
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="color-picker"]');
  return resolve(isHTMLElement(closest) ? closest : String(target), context.root);
}
function enhanceAll(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="color-picker"]')) {
    const component = colorPickerRoot(element);
    if (component) enhanceColorPicker(component);
  }
}
export function createColorPickers(registerAction: ActionRegistrar): ColorPickerCollection {
  const api: StarColorPickerStatic = {
    set: (target, value) => commit(recordFor(resolve(target)), value),
    value: (target) => recordFor(resolve(target)).control.value,
  };
  registerAction("ui.color-picker.set", (context) => {
    const first = context.args?.[0];
    const explicit = (context.args?.length ?? 0) > 1;
    const target = controlled(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    if (typeof value !== "string") throw new Error("ui.color-picker.set needs a CSS color value.");
    return api.set(target, value);
  });
  return { api, enhance: enhanceAll };
}
