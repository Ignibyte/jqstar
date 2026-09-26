import { isElementNode, isHTMLElement, isHTMLTag, isNode } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { CarouselTarget, StarCarouselStatic, StarContext } from "../types";
import {
  failUISetup,
  listenUI,
  ownUIRecord,
  releaseUIResources,
  uiCurrent,
  uiElements,
  uiResources,
} from "./lifecycle";
import type { UIResources } from "./lifecycle";

type Orientation = "horizontal" | "vertical";
type PauseReason = "focus" | "hover" | "user";

interface CarouselRecord extends UIResources {
  bindings: (HTMLElement | undefined)[];
  delay: number | undefined;
  content: HTMLElement;
  index: number;
  pauseReasons: Set<PauseReason>;
  pointerStart: { id: number; position: number } | undefined;
  slides: HTMLElement[];
  timer: { handle: number | undefined } | undefined;
}

interface CarouselEventDetail {
  carousel: HTMLElement;
  index: number;
  previousIndex: number;
  previousValue: string;
  slide: HTMLElement;
  value: string;
}

interface CarouselCollection {
  api: StarCarouselStatic;
  enhance(root: ParentNode): void;
}

const pausedRoots = new WeakMap<HTMLElement, boolean>();
const records = new WeakMap<HTMLElement, CarouselRecord>();
let carouselId = 0;

function carouselRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="carousel"]') ? value : undefined;
}

function orientation(root: HTMLElement): Orientation {
  return root.dataset.orientation === "vertical" ? "vertical" : "horizontal";
}

function directPart(root: HTMLElement, part: string): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === part,
  );
}

function carouselSlides(root: HTMLElement, content: HTMLElement): HTMLElement[] {
  return Array.from(content.querySelectorAll<HTMLElement>('[data-part="slide"]')).filter(
    (slide) => slide.closest('[data-jqs="carousel"]') === root,
  );
}

function slideValue(slide: HTMLElement, index: number): string {
  return slide.dataset.value?.trim() || String(index + 1);
}

function looping(root: HTMLElement): boolean {
  return root.hasAttribute("data-loop") && root.dataset.loop !== "false";
}

function autoplayDelay(root: HTMLElement): number | undefined {
  const delay = Number(root.dataset.autoplay);
  return Number.isFinite(delay) && delay >= 1000 ? delay : undefined;
}

function prefersReducedMotion(window: Window): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function indicatorElements(record: CarouselRecord): HTMLElement[] {
  return Array.from(record.root.querySelectorAll<HTMLElement>('[data-part="indicator"]')).filter(
    (indicator) => indicator.closest('[data-jqs="carousel"]') === record.root,
  );
}

function currentValue(record: CarouselRecord): string {
  return slideValue(record.slides[record.index]!, record.index);
}

function emit(
  record: CarouselRecord,
  name: "before-change" | "change",
  previousIndex: number,
  cancelable = false,
  index = record.index,
): boolean {
  const slide = record.slides[index]!;
  const previousSlide = record.slides[previousIndex] ?? slide;
  const detail: CarouselEventDetail = {
    carousel: record.root,
    index,
    previousIndex,
    previousValue: slideValue(previousSlide, previousIndex),
    slide,
    value: slideValue(slide, index),
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(`jquery-star:carousel:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function emitRotation(record: CarouselRecord, name: "pause" | "play"): void {
  record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(`jquery-star:carousel:${name}`, {
      bubbles: true,
      detail: { carousel: record.root, value: currentValue(record) },
    }),
  );
}

function isPlaying(record: CarouselRecord): boolean {
  return record.timer !== undefined;
}

function render(record: CarouselRecord): void {
  const value = currentValue(record);
  if (record.root.dataset.value !== value) record.root.dataset.value = value;
  record.root.dataset.state = "ready";
  record.root.dataset.rotation = autoplayDelay(record.root)
    ? isPlaying(record)
      ? "playing"
      : "paused"
    : "idle";
  record.content.setAttribute("aria-live", isPlaying(record) ? "off" : "polite");

  for (const [index, slide] of record.slides.entries()) {
    const active = index === record.index;
    slide.hidden = !active;
    slide.dataset.state = active ? "active" : "inactive";
    slide.setAttribute("aria-hidden", String(!active));
  }

  const previous = directPart(record.root, "previous");
  const next = directPart(record.root, "next");
  const atStart = record.index === 0;
  const atEnd = record.index === record.slides.length - 1;
  const disablePrevious = !looping(record.root) && atStart;
  const disableNext = !looping(record.root) && atEnd;
  if (isHTMLTag(previous, "button") && previous.disabled !== disablePrevious)
    previous.disabled = disablePrevious;
  if (isHTMLTag(next, "button") && next.disabled !== disableNext) next.disabled = disableNext;

  for (const [index, indicator] of indicatorElements(record).entries()) {
    const target = indicator.dataset.value
      ? record.slides.findIndex(
          (slide, slideIndex) => slideValue(slide, slideIndex) === indicator.dataset.value,
        )
      : index;
    const active = target === record.index;
    indicator.dataset.state = active ? "active" : "inactive";
    indicator.setAttribute("aria-current", String(active));
  }
  const status = directPart(record.root, "status");
  if (status) status.textContent = `Slide ${record.index + 1} of ${record.slides.length}`;
  const rotation = directPart(record.root, "rotation");
  if (rotation) {
    rotation.dataset.state = isPlaying(record) ? "playing" : "paused";
    rotation.setAttribute(
      "aria-label",
      isPlaying(record) ? "Stop slide rotation" : "Start slide rotation",
    );
  }
}

function bindings(root: HTMLElement): (HTMLElement | undefined)[] {
  return [
    directPart(root, "previous"),
    directPart(root, "next"),
    directPart(root, "rotation"),
    ...Array.from(root.querySelectorAll<HTMLElement>('[data-part="indicator"]')).filter(
      (element) => element.closest('[data-jqs="carousel"]') === root,
    ),
  ];
}

function sameParts<T>(before: T[], after: T[]): boolean {
  return before.length === after.length && before.every((part, index) => part === after[index]);
}

function current(record: CarouselRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    directPart(record.root, "content") === record.content &&
    sameParts(record.bindings, bindings(record.root)) &&
    sameParts(record.slides, carouselSlides(record.root, record.content))
  );
}

function clearTimer(record: CarouselRecord): void {
  const timer = record.timer;
  record.timer = undefined;
  if (timer?.handle !== undefined) record.window.clearTimeout(timer.handle);
}

function targetIndex(record: CarouselRecord, index: number): number {
  if (looping(record.root)) {
    return (index + record.slides.length) % record.slides.length;
  }
  return Math.max(0, Math.min(record.slides.length - 1, index));
}

function schedule(record: CarouselRecord): void {
  if (!current(record)) return;
  const revision = record.revision;
  clearTimer(record);
  if (!current(record, revision)) return;
  const delay = autoplayDelay(record.root);
  const reduced = prefersReducedMotion(record.window);
  if (!current(record, revision)) return;
  if (!delay || record.pauseReasons.size > 0 || reduced) {
    render(record);
    return;
  }
  const timer = { handle: undefined as number | undefined };
  record.timer = timer;
  try {
    timer.handle = record.window.setTimeout(() => {
      if (!current(record) || record.timer !== timer) return;
      record.timer = undefined;
      const nextRevision = record.revision + 1;
      change(record, record.index + 1, false);
      if (current(record, nextRevision) && !isPlaying(record)) schedule(record);
    }, delay);
  } catch (error) {
    if (record.timer === timer) record.timer = undefined;
    throw error;
  }
  if (!current(record, revision) || record.timer !== timer) {
    record.window.clearTimeout(timer.handle);
    return;
  }
  render(record);
}

function setPaused(record: CarouselRecord, reason: PauseReason, paused: boolean): void {
  if (!current(record) || (reason !== "user" && record.pauseReasons.has(reason) === paused)) return;
  const revision = ++record.revision;
  const wasPlaying = isPlaying(record);
  if (paused) record.pauseReasons.add(reason);
  else record.pauseReasons.delete(reason);
  schedule(record);
  if (!current(record, revision)) return;
  const playing = isPlaying(record);
  if (wasPlaying !== playing) emitRotation(record, playing ? "play" : "pause");
}

function play(record: CarouselRecord): void {
  if (!current(record)) return;
  const revision = ++record.revision;
  const wasPlaying = isPlaying(record);
  record.pauseReasons.clear();
  schedule(record);
  if (current(record, revision) && !wasPlaying && isPlaying(record)) emitRotation(record, "play");
}

function change(record: CarouselRecord, index: number, user = true): HTMLElement {
  if (!current(record)) return record.root;
  const revision = ++record.revision;
  const next = targetIndex(record, index);
  if (next === record.index) {
    if (user) setPaused(record, "user", true);
    return record.root;
  }
  const previousIndex = record.index;
  const previousSlide = record.slides[previousIndex];
  const restoreContentFocus =
    previousSlide !== undefined && previousSlide.contains(record.document.activeElement);
  const accepted = emit(record, "before-change", previousIndex, true, next);
  if (!current(record, revision)) return record.root;
  if (!accepted) return record.root;
  record.index = next;
  if (user) record.pauseReasons.add("user");
  render(record);
  if (!current(record, revision)) return record.root;
  if (restoreContentFocus) record.content.focus();
  if (!current(record, revision)) return record.root;
  emit(record, "change", previousIndex);
  if (current(record, revision)) schedule(record);
  return record.root;
}

function indexForValue(record: CarouselRecord, value: string | number): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    if (value >= 0 && value < record.slides.length) return value;
  } else {
    const index = record.slides.findIndex(
      (slide, candidate) => slideValue(slide, candidate) === String(value),
    );
    if (index >= 0) return index;
  }
  throw new Error(`Carousel #${record.root.id} has no slide "${String(value)}".`);
}

function interactiveTarget(target: EventTarget | null): boolean {
  return (
    isElementNode(target) &&
    Boolean(target.closest("a, button, input, select, textarea, [contenteditable='true']"))
  );
}

function wire(record: CarouselRecord): void {
  const listen = listenUI.bind(undefined, record, () => current(record));
  const previous = directPart(record.root, "previous");
  const next = directPart(record.root, "next");
  const rotation = directPart(record.root, "rotation");
  const onPrevious = (): void => void change(record, record.index - 1);
  const onNext = (): void => void change(record, record.index + 1);
  const onRotation = (): void => {
    if (isPlaying(record)) setPaused(record, "user", true);
    else play(record);
  };
  listen(previous, "click", onPrevious);
  listen(next, "click", onNext);
  listen(rotation, "click", onRotation);

  for (const [index, indicator] of indicatorElements(record).entries()) {
    if (isHTMLTag(indicator, "button") && !indicator.hasAttribute("type")) {
      indicator.type = "button";
    }
    const click = (): void => {
      const target = indicator.dataset.value
        ? indexForValue(record, indicator.dataset.value)
        : index;
      change(record, target);
    };
    listen(indicator, "click", click);
  }

  const keydown = (event: KeyboardEvent): void => {
    if (interactiveTarget(event.target)) return;
    const vertical = orientation(record.root) === "vertical";
    const previousKey = vertical ? "ArrowUp" : "ArrowLeft";
    const nextKey = vertical ? "ArrowDown" : "ArrowRight";
    if (![previousKey, nextKey, "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === previousKey) change(record, record.index - 1);
    else if (event.key === nextKey) change(record, record.index + 1);
    else change(record, event.key === "Home" ? 0 : record.slides.length - 1);
  };
  listen(record.content, "keydown", keydown as EventListener);

  const pointerenter = (): void => setPaused(record, "hover", true);
  const pointerleave = (): void => setPaused(record, "hover", false);
  const focusin = (): void => setPaused(record, "focus", true);
  const focusout = (event: FocusEvent): void => {
    if (isNode(event.relatedTarget) && record.root.contains(event.relatedTarget)) return;
    setPaused(record, "focus", false);
  };
  listen(record.root, "pointerenter", pointerenter);
  listen(record.root, "pointerleave", pointerleave);
  listen(record.root, "focusin", focusin);
  listen(record.root, "focusout", focusout as EventListener);

  const pointerdown = (event: PointerEvent): void => {
    if (!current(record) || event.button !== 0 || interactiveTarget(event.target)) return;
    record.pointerStart = {
      id: event.pointerId,
      position: orientation(record.root) === "vertical" ? event.clientY : event.clientX,
    };
  };
  const pointerup = (event: PointerEvent): void => {
    if (!current(record)) return;
    const start = record.pointerStart;
    record.pointerStart = undefined;
    if (!start || start.id !== event.pointerId) return;
    const position = orientation(record.root) === "vertical" ? event.clientY : event.clientX;
    const distance = position - start.position;
    if (Math.abs(distance) >= 40) change(record, record.index + (distance < 0 ? 1 : -1));
  };
  const pointercancel = (): void => {
    record.pointerStart = undefined;
  };
  listen(record.content, "pointerdown", pointerdown as EventListener);
  listen(record.content, "pointerup", pointerup as EventListener);
  listen(record.content, "pointercancel", pointercancel);
}

function enhanceCarousel(root: HTMLElement): CarouselRecord {
  root.id ||= `jqs-carousel-${++carouselId}`;
  if (!root.hasAttribute("role")) root.setAttribute("role", "region");
  root.setAttribute("aria-roledescription", "carousel");
  const content = directPart(root, "content");
  if (!content) throw new Error(`Carousel #${root.id} needs a direct data-part="content".`);
  content.tabIndex = content.hasAttribute("tabindex") ? content.tabIndex : 0;
  const slides = carouselSlides(root, content);
  if (slides.length === 0)
    throw new Error(`Carousel #${root.id} needs data-part="slide" children.`);

  const existing = records.get(root);
  const controls = bindings(root);
  if (
    existing &&
    current(existing) &&
    existing.content === content &&
    sameParts(existing.slides, slides) &&
    sameParts(existing.bindings, controls)
  ) {
    const authored = root.dataset.value?.trim();
    const index = slides.findIndex((slide, index) => slideValue(slide, index) === authored);
    const delay = autoplayDelay(root);
    const changed = index >= 0 && index !== existing.index;
    if (changed || delay !== existing.delay) {
      existing.revision += 1;
      if (changed) existing.index = index;
      existing.delay = delay;
      schedule(existing);
    }
    if (current(existing)) render(existing);
    return existing;
  }
  existing?.cleanup();
  const reentered = records.get(root);
  if (reentered) return reentered;
  const authored = root.dataset.value?.trim();
  const previousValue = existing ? currentValue(existing) : undefined;
  const patched = authored !== undefined && authored !== previousValue;
  const authoredIndex = slides.findIndex((slide, index) => slideValue(slide, index) === authored);
  const previousIndex = slides.findIndex(
    (slide, index) => slideValue(slide, index) === previousValue,
  );
  const markedIndex = slides.findIndex(
    (slide) => slide.dataset.state === "active" || slide.getAttribute("aria-current") === "true",
  );
  const index = patched
    ? Math.max(0, authoredIndex)
    : Math.max(0, previousIndex, authoredIndex, markedIndex);
  const pauseReasons = new Set<PauseReason>(
    existing?.document === root.ownerDocument
      ? existing.pauseReasons
      : pausedRoots.get(root)
        ? ["user"]
        : [],
  );
  if (root.contains(root.ownerDocument.activeElement)) pauseReasons.add("focus");
  else pauseReasons.delete("focus");
  const record: CarouselRecord = {
    ...uiResources(root),
    bindings: controls,
    delay: autoplayDelay(root),
    content,
    index,
    pauseReasons,
    pointerStart: undefined,
    slides,
    timer: undefined,
  };
  record.cleanups.add(() => clearTimer(record));
  record.cleanup = ownUIRecord(records, root, record, () => {
    pausedRoots.set(root, record.pauseReasons.has("user"));
    record.pointerStart = undefined;
    releaseUIResources(record);
  });
  try {
    if (!record.active) return record;
    for (const [slideIndex, slide] of slides.entries()) {
      slide.id ||= `${root.id}-slide-${slideIndex + 1}`;
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "slide");
      if (!slide.hasAttribute("aria-label") && !slide.hasAttribute("aria-labelledby")) {
        slide.setAttribute("aria-label", `${slideIndex + 1} of ${slides.length}`);
      }
    }
    for (const [part, label] of [
      ["previous", "Previous slide"],
      ["next", "Next slide"],
    ] as const) {
      const control = directPart(root, part);
      if (isHTMLTag(control, "button") && !control.hasAttribute("type")) control.type = "button";
      if (control && !control.hasAttribute("aria-label")) control.setAttribute("aria-label", label);
    }
    const rotation = directPart(root, "rotation");
    if (isHTMLTag(rotation, "button") && !rotation.hasAttribute("type")) rotation.type = "button";
    const status = directPart(root, "status");
    if (status) {
      status.setAttribute("aria-live", "polite");
      status.setAttribute("aria-atomic", "true");
    }
    wire(record);
    if (current(record)) schedule(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function resolveCarousel(target: CarouselTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? carouselRoot(root.querySelector(target)) : carouselRoot(target);
  if (resolved) return resolved;
  throw new Error(`Carousel target did not match data-jqs="carousel": ${String(target)}`);
}

function controlledCarousel(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveCarousel(target, context.root);
  if (typeof target === "string" && target.startsWith("#")) {
    return resolveCarousel(target, context.root);
  }
  const closest = context.element?.closest('[data-jqs="carousel"]');
  return resolveCarousel(isHTMLElement(closest) ? closest : String(target));
}

function enhanceCarousels(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="carousel"]')) {
    const carousel = carouselRoot(element);
    if (carousel) enhanceCarousel(carousel);
  }
}

function recordFor(root: HTMLElement): CarouselRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceCarousel(root);
}

export function createCarousels(registerAction: ActionRegistrar): CarouselCollection {
  const api: StarCarouselStatic = {
    next: (target) => {
      const root = resolveCarousel(target);
      const record = recordFor(root);
      return change(record, record.index + 1);
    },
    previous: (target) => {
      const root = resolveCarousel(target);
      const record = recordFor(root);
      return change(record, record.index - 1);
    },
    go: (target, value) => {
      const root = resolveCarousel(target);
      const record = recordFor(root);
      return change(record, indexForValue(record, value));
    },
    play: (target) => {
      const root = resolveCarousel(target);
      play(recordFor(root));
      return root;
    },
    pause: (target) => {
      const root = resolveCarousel(target);
      const record = recordFor(root);
      setPaused(record, "user", true);
      return root;
    },
    value: (target) => {
      const root = resolveCarousel(target);
      return currentValue(recordFor(root));
    },
  };
  for (const operation of ["next", "previous", "play", "pause"] as const) {
    registerAction(`ui.carousel.${operation}`, (context) =>
      api[operation](controlledCarousel(context, context.args?.[0])),
    );
  }
  registerAction("ui.carousel.go", (context) => {
    const first = context.args?.[0];
    const explicit = isHTMLElement(first) || (typeof first === "string" && first.startsWith("#"));
    const target = controlledCarousel(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    if (typeof value !== "string" && typeof value !== "number") {
      throw new Error("ui.carousel.go needs a slide value or zero-based index.");
    }
    return api.go(target, value);
  });
  return { api, enhance: enhanceCarousels };
}
