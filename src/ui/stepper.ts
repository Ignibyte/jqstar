import type { ActionRegistrar } from "../registry";
import type { StarContext, StarStepperStatic, StepperTarget } from "../types";

type Orientation = "horizontal" | "vertical";

interface StepperRecord {
  activeIndex: number;
  cleanup: () => void;
  completed: Set<string>;
  finished: boolean;
  lastValue: string;
  list: HTMLElement;
  panels: HTMLElement[];
  root: HTMLElement;
  steps: HTMLElement[];
  triggers: HTMLButtonElement[];
}

interface StepperEventDetail {
  index: number;
  previousIndex: number;
  previousValue: string;
  step: HTMLElement;
  stepper: HTMLElement;
  value: string;
}

interface StepperCollection {
  api: StarStepperStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, StepperRecord>();
let stepperId = 0;

function stepperRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="stepper"]') ? value : undefined;
}

function orientation(root: HTMLElement): Orientation {
  return root.dataset.orientation === "vertical" ? "vertical" : "horizontal";
}

function scopedParts(root: HTMLElement, part: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)).filter(
    (element) => element.parentElement?.closest("[data-jqs]") === root,
  );
}

function directPart(root: HTMLElement, part: string): HTMLElement | undefined {
  return scopedParts(root, part).find(
    (element) => element.parentElement === root || element.parentElement?.parentElement === root,
  );
}

function stepValue(step: HTMLElement): string {
  const value = step.dataset.value?.trim();
  if (!value) throw new Error(`Stepper step #${step.id} needs a non-empty data-value.`);
  return value;
}

function panelValue(panel: HTMLElement): string {
  const value = panel.dataset.value?.trim();
  if (!value) throw new Error(`Stepper panel #${panel.id} needs a non-empty data-value.`);
  return value;
}

function linear(root: HTMLElement): boolean {
  return root.hasAttribute("data-linear") && root.dataset.linear !== "false";
}

function disabled(step: HTMLElement): boolean {
  return step.dataset.disabled !== undefined || step.getAttribute("aria-disabled") === "true";
}

function currentValue(record: StepperRecord): string {
  return stepValue(record.steps[record.activeIndex]!);
}

function indexForValue(record: StepperRecord, value: string): number {
  const index = record.steps.findIndex((step) => stepValue(step) === value);
  if (index >= 0) return index;
  throw new Error(`Stepper #${record.root.id} has no step with value "${value}".`);
}

function locked(record: StepperRecord, index: number): boolean {
  if (!linear(record.root) || index <= record.activeIndex) return false;
  if (index === record.activeIndex + 1) return false;
  return !record.steps
    .slice(record.activeIndex, index)
    .every((step) => record.completed.has(stepValue(step)));
}

function available(record: StepperRecord, index: number): boolean {
  const step = record.steps[index];
  return Boolean(step && !disabled(step) && !locked(record, index));
}

function emit(
  record: StepperRecord,
  name: "before-change" | "change" | "invalid",
  previousIndex: number,
  cancelable = false,
): boolean {
  const step = record.steps[record.activeIndex]!;
  const previousStep = record.steps[previousIndex] ?? step;
  const detail: StepperEventDetail = {
    index: record.activeIndex,
    previousIndex,
    previousValue: stepValue(previousStep),
    step,
    stepper: record.root,
    value: currentValue(record),
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:stepper:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function emitComplete(record: StepperRecord, name: "before-complete" | "complete"): boolean {
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:stepper:${name}`, {
      bubbles: true,
      cancelable: name === "before-complete",
      detail: {
        step: record.steps[record.activeIndex],
        stepper: record.root,
        value: currentValue(record),
        values: record.steps.map(stepValue),
      },
    }),
  );
}

function render(record: StepperRecord): void {
  const value = currentValue(record);
  record.lastValue = value;
  if (record.root.dataset.value !== value) record.root.dataset.value = value;
  record.root.dataset.state = record.finished ? "complete" : "active";

  for (const [index, step] of record.steps.entries()) {
    const active = index === record.activeIndex;
    const complete = record.completed.has(stepValue(step));
    const trigger = record.triggers[index]!;
    const panel = record.panels[index]!;
    step.dataset.state = active ? "active" : complete ? "complete" : "upcoming";
    step.dataset.completed = String(complete);
    trigger.tabIndex = active ? 0 : -1;
    trigger.setAttribute("aria-controls", panel.id);
    if (active) trigger.setAttribute("aria-current", "step");
    else trigger.removeAttribute("aria-current");
    trigger.setAttribute("aria-disabled", String(disabled(step) || locked(record, index)));
    panel.hidden = !active;
    panel.dataset.state = active ? "active" : "inactive";
  }

  const previous = directPart(record.root, "previous");
  const next = directPart(record.root, "next");
  if (previous instanceof HTMLButtonElement && previous.disabled !== (record.activeIndex === 0)) {
    previous.disabled = record.activeIndex === 0;
  }
  if (next instanceof HTMLButtonElement && next.disabled !== record.finished) {
    next.disabled = record.finished;
  }
  const status = directPart(record.root, "status");
  if (status) {
    const label = record.triggers[record.activeIndex]?.textContent?.trim();
    status.textContent = `Step ${record.activeIndex + 1} of ${record.steps.length}${label ? `: ${label}` : ""}`;
  }
}

function firstInvalid(
  panel: HTMLElement,
): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | undefined {
  return Array.from(
    panel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      "input, select, textarea",
    ),
  ).find((control) => !control.disabled && !control.checkValidity());
}

function validateActive(record: StepperRecord): boolean {
  if (record.root.dataset.validate === "false") return true;
  const panel = record.panels[record.activeIndex]!;
  const invalid = firstInvalid(panel);
  const step = record.steps[record.activeIndex]!;
  if (!invalid) {
    delete step.dataset.error;
    return true;
  }
  step.dataset.error = "true";
  emit(record, "invalid", record.activeIndex);
  invalid.reportValidity();
  invalid.focus();
  return false;
}

function setComplete(record: StepperRecord, index: number, complete: boolean): HTMLElement {
  const step = record.steps[index];
  if (!step || disabled(step)) return record.root;
  const value = stepValue(step);
  if (complete) record.completed.add(value);
  else record.completed.delete(value);
  if (!complete) record.finished = false;
  render(record);
  return record.root;
}

function requestStep(record: StepperRecord, index: number, focus = false): HTMLElement {
  if (index === record.activeIndex || !available(record, index)) return record.root;
  const previousIndex = record.activeIndex;
  const completed = new Set(record.completed);
  if (linear(record.root) && index > previousIndex) {
    if (index !== previousIndex + 1 || !validateActive(record)) return record.root;
    record.completed.add(currentValue(record));
  }
  record.activeIndex = index;
  record.finished = false;
  if (!emit(record, "before-change", previousIndex, true)) {
    record.activeIndex = previousIndex;
    record.completed = completed;
    return record.root;
  }
  render(record);
  if (focus) record.triggers[index]?.focus();
  emit(record, "change", previousIndex);
  return record.root;
}

function nextStep(record: StepperRecord): HTMLElement {
  if (record.activeIndex < record.steps.length - 1) {
    return requestStep(record, record.activeIndex + 1, true);
  }
  if (!validateActive(record) || !emitComplete(record, "before-complete")) return record.root;
  record.completed.add(currentValue(record));
  record.finished = true;
  render(record);
  emitComplete(record, "complete");
  return record.root;
}

function moveFocus(record: StepperRecord, index: number, event: KeyboardEvent): void {
  const vertical = orientation(record.root) === "vertical";
  const previousKey = vertical ? "ArrowUp" : "ArrowLeft";
  const nextKey = vertical ? "ArrowDown" : "ArrowRight";
  if (![previousKey, nextKey, "Home", "End"].includes(event.key)) return;
  const indexes = record.steps
    .map((_, candidate) => candidate)
    .filter((candidate) => available(record, candidate));
  if (indexes.length === 0) return;
  const current = Math.max(0, indexes.indexOf(index));
  let target: number;
  if (event.key === previousKey) target = (current - 1 + indexes.length) % indexes.length;
  else if (event.key === nextKey) target = (current + 1) % indexes.length;
  else target = event.key === "Home" ? 0 : indexes.length - 1;
  event.preventDefault();
  const next = indexes[target];
  if (next !== undefined) {
    for (const [candidate, trigger] of record.triggers.entries()) {
      trigger.tabIndex = candidate === next ? 0 : -1;
    }
    record.triggers[next]?.focus();
  }
}

function wire(record: StepperRecord): () => void {
  const click = (event: MouseEvent): void => {
    const trigger =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('[data-part="trigger"]')
        : null;
    const index = trigger ? record.triggers.indexOf(trigger) : -1;
    if (index >= 0 && trigger?.getAttribute("aria-disabled") !== "true") {
      requestStep(record, index);
    }
  };
  const keydown = (event: KeyboardEvent): void => {
    const trigger =
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('[data-part="trigger"]')
        : null;
    const index = trigger ? record.triggers.indexOf(trigger) : -1;
    if (index >= 0) moveFocus(record, index, event);
  };
  const previous = directPart(record.root, "previous");
  const next = directPart(record.root, "next");
  const onPrevious = (): void => {
    requestStep(record, Math.max(0, record.activeIndex - 1), true);
  };
  const onNext = (): void => {
    nextStep(record);
  };
  record.list.addEventListener("click", click);
  record.list.addEventListener("keydown", keydown);
  previous?.addEventListener("click", onPrevious);
  next?.addEventListener("click", onNext);
  return () => {
    record.list.removeEventListener("click", click);
    record.list.removeEventListener("keydown", keydown);
    previous?.removeEventListener("click", onPrevious);
    next?.removeEventListener("click", onNext);
  };
}

function enhanceStepper(root: HTMLElement): StepperRecord {
  root.id ||= `jqs-stepper-${++stepperId}`;
  const list = directPart(root, "list");
  if (!list) throw new Error(`Stepper #${root.id} needs data-part="list".`);
  const steps = Array.from(list.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === "step",
  );
  if (steps.length === 0) throw new Error(`Stepper #${root.id} needs data-part="step" items.`);
  const triggers = steps.map((step, index) => {
    step.id ||= `${root.id}-step-${index + 1}`;
    const trigger = Array.from(step.children).find(
      (child): child is HTMLButtonElement =>
        child instanceof HTMLButtonElement && child.dataset.part === "trigger",
    );
    if (!trigger) throw new Error(`Stepper step #${step.id} needs a button data-part="trigger".`);
    trigger.type = "button";
    trigger.id ||= `${step.id}-trigger`;
    return trigger;
  });
  const panels = scopedParts(root, "panel");
  if (panels.length !== steps.length) {
    throw new Error(`Stepper #${root.id} needs one data-part="panel" for each step.`);
  }
  const panelByValue = new Map(panels.map((panel) => [panelValue(panel), panel]));
  const orderedPanels = steps.map((step, index) => {
    const panel = panelByValue.get(stepValue(step));
    if (!panel)
      throw new Error(`Stepper #${root.id} is missing the panel for "${stepValue(step)}".`);
    panel.id ||= `${root.id}-panel-${index + 1}`;
    panel.setAttribute("role", "group");
    panel.setAttribute("aria-labelledby", triggers[index]!.id);
    return panel;
  });
  if (new Set(steps.map(stepValue)).size !== steps.length) {
    throw new Error(`Stepper #${root.id} step values must be unique.`);
  }

  const existing = records.get(root);
  existing?.cleanup();
  const authored = root.dataset.value?.trim();
  const previousValue = existing ? currentValue(existing) : undefined;
  const patched = authored !== undefined && authored !== existing?.lastValue;
  const activeValue = patched ? authored : (previousValue ?? authored ?? stepValue(steps[0]!));
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => stepValue(step) === activeValue),
  );
  const completed = new Set(
    steps.filter((step) => step.dataset.completed === "true").map(stepValue),
  );
  if (!existing && linear(root)) {
    for (const step of steps.slice(0, activeIndex)) completed.add(stepValue(step));
  } else if (existing) {
    for (const value of existing.completed) {
      if (steps.some((step) => stepValue(step) === value)) completed.add(value);
    }
  }
  const record: StepperRecord = {
    activeIndex,
    cleanup: () => undefined,
    completed,
    finished: existing?.finished ?? false,
    lastValue: root.dataset.value ?? "",
    list,
    panels: orderedPanels,
    root,
    steps,
    triggers,
  };
  records.set(root, record);
  for (const part of ["previous", "next"] as const) {
    const button = directPart(root, part);
    if (button instanceof HTMLButtonElement && !button.hasAttribute("type")) button.type = "button";
  }
  const status = directPart(root, "status");
  if (status) {
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
  }
  render(record);
  record.cleanup = wire(record);
  return record;
}

function resolveStepper(target: StepperTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? stepperRoot(root.querySelector(target)) : stepperRoot(target);
  if (resolved) return resolved;
  throw new Error(`Stepper target did not match data-jqs="stepper": ${String(target)}`);
}

function controlledStepper(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="stepper"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) {
    return resolveStepper(target, context.root);
  }
  const closest = context.element?.closest('[data-jqs="stepper"]');
  return resolveStepper(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceSteppers(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="stepper"]')));
  for (const element of elements) {
    const stepper = stepperRoot(element);
    if (stepper) enhanceStepper(stepper);
  }
}

export function createSteppers(registerAction: ActionRegistrar): StepperCollection {
  const api: StarStepperStatic = {
    next: (target) => {
      const root = resolveStepper(target);
      return nextStep(records.get(root) ?? enhanceStepper(root));
    },
    previous: (target) => {
      const root = resolveStepper(target);
      const record = records.get(root) ?? enhanceStepper(root);
      return requestStep(record, Math.max(0, record.activeIndex - 1), true);
    },
    go: (target, value) => {
      const root = resolveStepper(target);
      const record = records.get(root) ?? enhanceStepper(root);
      return requestStep(record, indexForValue(record, value), true);
    },
    complete: (target, value, completed = true) => {
      const root = resolveStepper(target);
      const record = records.get(root) ?? enhanceStepper(root);
      const index = value === undefined ? record.activeIndex : indexForValue(record, value);
      return setComplete(record, index, completed);
    },
    value: (target) => {
      const root = resolveStepper(target);
      return currentValue(records.get(root) ?? enhanceStepper(root));
    },
  };
  for (const operation of ["next", "previous"] as const) {
    registerAction(`ui.stepper.${operation}`, (context) =>
      api[operation](controlledStepper(context, context.args?.[0])),
    );
  }
  registerAction("ui.stepper.go", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlledStepper(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    if (typeof value !== "string") throw new Error("ui.stepper.go needs a step value.");
    return api.go(target, value);
  });
  registerAction("ui.stepper.complete", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlledStepper(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    const completed = explicit ? context.args?.[2] : context.args?.[1];
    return api.complete(
      target,
      typeof value === "string" ? value : undefined,
      typeof completed === "boolean" ? completed : true,
    );
  });
  return { api, enhance: enhanceSteppers };
}
