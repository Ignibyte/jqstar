import { registerAction } from "../registry";
import type { CarouselTarget, StarCarouselStatic, StarContext } from "../types";

type Orientation = "horizontal" | "vertical";
type PauseReason = "focus" | "hover" | "user";

interface CarouselRecord {
  cleanup: () => void;
  content: HTMLElement;
  index: number;
  pauseReasons: Set<PauseReason>;
  pointerStart: { id: number; position: number } | undefined;
  root: HTMLElement;
  slides: HTMLElement[];
  timer: number | undefined;
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

const records = new WeakMap<HTMLElement, CarouselRecord>();
let carouselId = 0;

function carouselRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="carousel"]') ? value : undefined;
}

function orientation(root: HTMLElement): Orientation {
  return root.dataset.orientation === "vertical" ? "vertical" : "horizontal";
}

function directPart(root: HTMLElement, part: string): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === part,
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

function prefersReducedMotion(): boolean {
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
): boolean {
  const slide = record.slides[record.index]!;
  const previousSlide = record.slides[previousIndex] ?? slide;
  const detail: CarouselEventDetail = {
    carousel: record.root,
    index: record.index,
    previousIndex,
    previousValue: slideValue(previousSlide, previousIndex),
    slide,
    value: currentValue(record),
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:carousel:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function emitRotation(record: CarouselRecord, name: "pause" | "play"): void {
  record.root.dispatchEvent(
    new CustomEvent(`jquery-star:carousel:${name}`, {
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
  if (previous instanceof HTMLButtonElement) previous.disabled = !looping(record.root) && atStart;
  if (next instanceof HTMLButtonElement) next.disabled = !looping(record.root) && atEnd;

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

function clearTimer(record: CarouselRecord): void {
  if (record.timer !== undefined) window.clearTimeout(record.timer);
  record.timer = undefined;
}

function targetIndex(record: CarouselRecord, index: number): number {
  if (looping(record.root)) {
    return (index + record.slides.length) % record.slides.length;
  }
  return Math.max(0, Math.min(record.slides.length - 1, index));
}

function schedule(record: CarouselRecord): void {
  clearTimer(record);
  const delay = autoplayDelay(record.root);
  if (!delay || record.pauseReasons.size > 0 || prefersReducedMotion()) {
    render(record);
    return;
  }
  record.timer = window.setTimeout(() => {
    record.timer = undefined;
    change(record, record.index + 1, false);
    schedule(record);
  }, delay);
  render(record);
}

function setPaused(record: CarouselRecord, reason: PauseReason, paused: boolean): void {
  const wasPlaying = isPlaying(record);
  if (paused) record.pauseReasons.add(reason);
  else record.pauseReasons.delete(reason);
  schedule(record);
  const playing = isPlaying(record);
  if (wasPlaying !== playing) emitRotation(record, playing ? "play" : "pause");
}

function change(record: CarouselRecord, index: number, user = true): HTMLElement {
  const next = targetIndex(record, index);
  if (next === record.index) {
    if (user) setPaused(record, "user", true);
    return record.root;
  }
  const previousIndex = record.index;
  const previousSlide = record.slides[previousIndex];
  const restoreContentFocus =
    previousSlide !== undefined &&
    document.activeElement instanceof Node &&
    previousSlide.contains(document.activeElement);
  record.index = next;
  if (!emit(record, "before-change", previousIndex, true)) {
    record.index = previousIndex;
    return record.root;
  }
  if (user) record.pauseReasons.add("user");
  render(record);
  if (restoreContentFocus) record.content.focus();
  emit(record, "change", previousIndex);
  schedule(record);
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
    target instanceof Element &&
    Boolean(target.closest("a, button, input, select, textarea, [contenteditable='true']"))
  );
}

function wire(record: CarouselRecord): () => void {
  const cleanups: Array<() => void> = [];
  const previous = directPart(record.root, "previous");
  const next = directPart(record.root, "next");
  const rotation = directPart(record.root, "rotation");
  const onPrevious = (): void => void change(record, record.index - 1);
  const onNext = (): void => void change(record, record.index + 1);
  const onRotation = (): void => {
    if (isPlaying(record)) setPaused(record, "user", true);
    else {
      const wasPlaying = isPlaying(record);
      record.pauseReasons.clear();
      schedule(record);
      if (!wasPlaying && isPlaying(record)) emitRotation(record, "play");
    }
  };
  previous?.addEventListener("click", onPrevious);
  next?.addEventListener("click", onNext);
  rotation?.addEventListener("click", onRotation);
  cleanups.push(
    () => previous?.removeEventListener("click", onPrevious),
    () => next?.removeEventListener("click", onNext),
    () => rotation?.removeEventListener("click", onRotation),
  );

  for (const [index, indicator] of indicatorElements(record).entries()) {
    if (indicator instanceof HTMLButtonElement && !indicator.hasAttribute("type")) {
      indicator.type = "button";
    }
    const click = (): void => {
      const target = indicator.dataset.value
        ? indexForValue(record, indicator.dataset.value)
        : index;
      change(record, target);
    };
    indicator.addEventListener("click", click);
    cleanups.push(() => indicator.removeEventListener("click", click));
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
  record.content.addEventListener("keydown", keydown);
  cleanups.push(() => record.content.removeEventListener("keydown", keydown));

  const pointerenter = (): void => setPaused(record, "hover", true);
  const pointerleave = (): void => setPaused(record, "hover", false);
  const focusin = (): void => setPaused(record, "focus", true);
  const focusout = (event: FocusEvent): void => {
    if (event.relatedTarget instanceof Node && record.root.contains(event.relatedTarget)) return;
    setPaused(record, "focus", false);
  };
  record.root.addEventListener("pointerenter", pointerenter);
  record.root.addEventListener("pointerleave", pointerleave);
  record.root.addEventListener("focusin", focusin);
  record.root.addEventListener("focusout", focusout);
  cleanups.push(
    () => record.root.removeEventListener("pointerenter", pointerenter),
    () => record.root.removeEventListener("pointerleave", pointerleave),
    () => record.root.removeEventListener("focusin", focusin),
    () => record.root.removeEventListener("focusout", focusout),
  );

  const pointerdown = (event: PointerEvent): void => {
    if (event.button !== 0 || interactiveTarget(event.target)) return;
    record.pointerStart = {
      id: event.pointerId,
      position: orientation(record.root) === "vertical" ? event.clientY : event.clientX,
    };
  };
  const pointerup = (event: PointerEvent): void => {
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
  record.content.addEventListener("pointerdown", pointerdown);
  record.content.addEventListener("pointerup", pointerup);
  record.content.addEventListener("pointercancel", pointercancel);
  cleanups.push(
    () => record.content.removeEventListener("pointerdown", pointerdown),
    () => record.content.removeEventListener("pointerup", pointerup),
    () => record.content.removeEventListener("pointercancel", pointercancel),
  );
  return () => {
    clearTimer(record);
    cleanups.forEach((cleanup) => cleanup());
  };
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
  existing?.cleanup();
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
  const record: CarouselRecord = {
    cleanup: () => undefined,
    content,
    index,
    pauseReasons: new Set(existing?.pauseReasons ?? []),
    pointerStart: undefined,
    root,
    slides,
    timer: undefined,
  };
  records.set(root, record);
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
    if (control instanceof HTMLButtonElement && !control.hasAttribute("type"))
      control.type = "button";
    if (control && !control.hasAttribute("aria-label")) control.setAttribute("aria-label", label);
  }
  const rotation = directPart(root, "rotation");
  if (rotation instanceof HTMLButtonElement && !rotation.hasAttribute("type"))
    rotation.type = "button";
  const status = directPart(root, "status");
  if (status) {
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
  }
  record.cleanup = wire(record);
  schedule(record);
  return record;
}

function resolveCarousel(target: CarouselTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? carouselRoot(root.querySelector(target)) : carouselRoot(target);
  if (resolved) return resolved;
  throw new Error(`Carousel target did not match data-jqs="carousel": ${String(target)}`);
}

function controlledCarousel(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="carousel"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) {
    return resolveCarousel(target, context.root);
  }
  const closest = context.element?.closest('[data-jqs="carousel"]');
  return resolveCarousel(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceCarousels(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="carousel"]')));
  for (const element of elements) {
    const carousel = carouselRoot(element);
    if (carousel) enhanceCarousel(carousel);
  }
}

export function createCarousels(): CarouselCollection {
  const api: StarCarouselStatic = {
    next: (target) => {
      const root = resolveCarousel(target);
      const record = records.get(root) ?? enhanceCarousel(root);
      return change(record, record.index + 1);
    },
    previous: (target) => {
      const root = resolveCarousel(target);
      const record = records.get(root) ?? enhanceCarousel(root);
      return change(record, record.index - 1);
    },
    go: (target, value) => {
      const root = resolveCarousel(target);
      const record = records.get(root) ?? enhanceCarousel(root);
      return change(record, indexForValue(record, value));
    },
    play: (target) => {
      const root = resolveCarousel(target);
      const record = records.get(root) ?? enhanceCarousel(root);
      const wasPlaying = isPlaying(record);
      record.pauseReasons.clear();
      schedule(record);
      if (!wasPlaying && isPlaying(record)) emitRotation(record, "play");
      return root;
    },
    pause: (target) => {
      const root = resolveCarousel(target);
      const record = records.get(root) ?? enhanceCarousel(root);
      setPaused(record, "user", true);
      return root;
    },
    value: (target) => {
      const root = resolveCarousel(target);
      return currentValue(records.get(root) ?? enhanceCarousel(root));
    },
  };
  for (const operation of ["next", "previous", "play", "pause"] as const) {
    registerAction(`ui.carousel.${operation}`, (context) =>
      api[operation](controlledCarousel(context, context.args?.[0])),
    );
  }
  registerAction("ui.carousel.go", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlledCarousel(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    if (typeof value !== "string" && typeof value !== "number") {
      throw new Error("ui.carousel.go needs a slide value or zero-based index.");
    }
    return api.go(target, value);
  });
  return { api, enhance: enhanceCarousels };
}
