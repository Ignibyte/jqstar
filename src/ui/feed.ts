import { registerAction } from "../registry";
import type {
  FeedCompleteOptions,
  FeedResetOptions,
  FeedState,
  FeedTarget,
  StarContext,
  StarFeedStatic,
} from "../types";

interface FeedRecord {
  cleanup: () => void;
  content: HTMLElement;
  cursor: string | undefined;
  defaultStatus: string;
  done: boolean;
  loading: boolean;
  more: HTMLButtonElement;
  observer: IntersectionObserver | undefined;
  pendingFocus: number | undefined;
  root: HTMLElement;
  sentinel: HTMLElement | undefined;
  status: HTMLElement | undefined;
}

interface FeedCollection {
  api: StarFeedStatic;
  enhance(root: ParentNode): void;
}

interface FeedEventDetail extends FeedState {
  added?: number;
  feed: HTMLElement;
  message?: string;
}

const records = new WeakMap<HTMLElement, FeedRecord>();
let feedId = 0;

function feedRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="feed"]') ? value : undefined;
}

function directPart<T extends HTMLElement = HTMLElement>(
  root: HTMLElement,
  part: string,
  required = true,
): T | undefined {
  const element = Array.from(root.children).find(
    (child): child is T => child instanceof HTMLElement && child.dataset.part === part,
  );
  if (!element && required) throw new Error(`Feed #${root.id} needs data-part="${part}".`);
  return element;
}

function items(record: FeedRecord): HTMLElement[] {
  return Array.from(record.content.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.dataset.part === "item" &&
      child.closest('[data-jqs="feed"]') === record.root,
  );
}

function state(record: FeedRecord): FeedState {
  return { cursor: record.cursor, done: record.done, loading: record.loading };
}

function emit(
  record: FeedRecord,
  name: "before-load" | "load" | "complete" | "error" | "reset",
  options: { added?: number; cancelable?: boolean; message?: string } = {},
): boolean {
  const detail: FeedEventDetail = {
    ...state(record),
    ...(options.added === undefined ? {} : { added: options.added }),
    ...(options.message === undefined ? {} : { message: options.message }),
    feed: record.root,
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:feed:${name}`, {
      bubbles: true,
      cancelable: options.cancelable ?? false,
      detail,
    }),
  );
}

function setStatus(record: FeedRecord, message: string): void {
  if (record.status) record.status.textContent = message;
}

function setSize(record: FeedRecord): number {
  const total = Number(record.root.dataset.total);
  if (Number.isInteger(total) && total >= 0) return total;
  return record.done ? items(record).length : -1;
}

function syncItems(record: FeedRecord): void {
  const entries = items(record);
  const size = setSize(record);
  entries.forEach((item, index) => {
    item.id ||= `${record.root.id}-item-${index + 1}`;
    if (item.tagName !== "ARTICLE") item.setAttribute("role", "article");
    if (!item.hasAttribute("tabindex")) item.tabIndex = 0;
    item.setAttribute("aria-posinset", String(index + 1));
    item.setAttribute("aria-setsize", String(size));
    const title = item.querySelector<HTMLElement>('[data-part="title"]');
    if (title && !item.hasAttribute("aria-label") && !item.hasAttribute("aria-labelledby")) {
      title.id ||= `${item.id}-title`;
      item.setAttribute("aria-labelledby", title.id);
    }
    const description = item.querySelector<HTMLElement>('[data-part="description"]');
    if (description && !item.hasAttribute("aria-describedby")) {
      description.id ||= `${item.id}-description`;
      item.setAttribute("aria-describedby", description.id);
    }
  });
}

function sync(record: FeedRecord): void {
  record.root.dataset.state = record.done ? "done" : record.loading ? "loading" : "idle";
  record.root.dataset.done = String(record.done);
  if (record.cursor === undefined) record.root.removeAttribute("data-cursor");
  else if (record.root.dataset.cursor !== record.cursor) record.root.dataset.cursor = record.cursor;
  record.content.setAttribute("aria-busy", String(record.loading));
  record.more.type = "button";
  const disabled = record.loading || record.done;
  if (record.more.disabled !== disabled) record.more.disabled = disabled;
  record.more.hidden = record.done;
  syncItems(record);
}

function begin(record: FeedRecord): boolean {
  if (record.loading || record.done) return false;
  if (!emit(record, "before-load", { cancelable: true })) return false;
  record.loading = true;
  setStatus(record, "Loading more items…");
  sync(record);
  emit(record, "load");
  return true;
}

function trigger(record: FeedRecord): HTMLElement {
  if (!record.loading && !record.done) record.more.click();
  return record.root;
}

function resetObserver(record: FeedRecord): void {
  record.observer?.disconnect();
  record.observer = undefined;
  if (
    record.done ||
    !record.sentinel ||
    !record.root.hasAttribute("data-auto") ||
    typeof IntersectionObserver === "undefined"
  )
    return;
  record.observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) trigger(record);
  });
  record.observer.observe(record.sentinel);
}

function focusItem(record: FeedRecord, index: number): void {
  const item = items(record)[index];
  if (!item) return;
  item.focus({ preventScroll: true });
  item.scrollIntoView?.({ block: "nearest" });
}

function focusable(element: HTMLElement): boolean {
  return (
    !element.hidden &&
    !element.hasAttribute("disabled") &&
    element.getAttribute("aria-hidden") !== "true" &&
    element.tabIndex >= 0
  );
}

function boundaryFocus(root: HTMLElement, direction: "before" | "after"): void {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((candidate) => !root.contains(candidate) && focusable(candidate));
  const relative = candidates.filter((candidate) => {
    const position = root.compareDocumentPosition(candidate);
    return direction === "after"
      ? Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING)
      : Boolean(position & Node.DOCUMENT_POSITION_PRECEDING);
  });
  (direction === "after" ? relative[0] : relative.at(-1))?.focus();
}

function wire(record: FeedRecord): () => void {
  const click = (event: MouseEvent): void => {
    if (begin(record)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const keydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || !(event.target instanceof Element)) return;
    const item = event.target.closest<HTMLElement>('[data-part="item"]');
    if (!item || item.parentElement !== record.content) return;
    const entries = items(record);
    const index = entries.indexOf(item);
    if (event.key === "PageDown" && !event.ctrlKey) {
      event.preventDefault();
      if (index < entries.length - 1) focusItem(record, index + 1);
      else if (!record.done) {
        record.pendingFocus = index + 1;
        trigger(record);
      }
      return;
    }
    if (event.key === "PageUp" && !event.ctrlKey) {
      event.preventDefault();
      focusItem(record, Math.max(0, index - 1));
      return;
    }
    if (event.ctrlKey && event.key === "End") {
      event.preventDefault();
      boundaryFocus(record.root, "after");
      return;
    }
    if (event.ctrlKey && event.key === "Home") {
      event.preventDefault();
      boundaryFocus(record.root, "before");
    }
  };
  record.more.addEventListener("click", click);
  record.content.addEventListener("keydown", keydown);
  return () => {
    record.more.removeEventListener("click", click);
    record.content.removeEventListener("keydown", keydown);
    record.observer?.disconnect();
  };
}

function enhanceFeed(root: HTMLElement): FeedRecord {
  root.id ||= `jqs-feed-${++feedId}`;
  const content = directPart(root, "content")!;
  const more = directPart(root, "more")!;
  if (!(more instanceof HTMLButtonElement))
    throw new Error(`Feed #${root.id} more part must be a button.`);
  const sentinel = directPart(root, "sentinel", false);
  const status = directPart(root, "status", false);
  content.setAttribute("role", "feed");
  if (!content.hasAttribute("aria-label") && !content.hasAttribute("aria-labelledby")) {
    const labelledby = root.getAttribute("aria-labelledby");
    if (labelledby) content.setAttribute("aria-labelledby", labelledby);
    else content.setAttribute("aria-label", root.getAttribute("aria-label") ?? "Results");
  }
  const existing = records.get(root);
  if (
    existing?.content === content &&
    existing.more === more &&
    existing.sentinel === sentinel &&
    existing.status === status
  ) {
    sync(existing);
    return existing;
  }
  existing?.cleanup();
  const record: FeedRecord = {
    cleanup: () => undefined,
    content,
    cursor: root.dataset.cursor,
    defaultStatus: status?.textContent ?? "",
    done: root.dataset.done === "true",
    loading: false,
    more,
    observer: undefined,
    pendingFocus: undefined,
    root,
    sentinel,
    status,
  };
  records.set(root, record);
  sync(record);
  record.cleanup = wire(record);
  resetObserver(record);
  return record;
}

function resolve(target: FeedTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? feedRoot(root.querySelector(target)) : feedRoot(target);
  if (resolved) return resolved;
  throw new Error(`Feed target did not match data-jqs="feed": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="feed"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="feed"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceAll(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="feed"]')));
  for (const element of elements) {
    const feed = feedRoot(element);
    if (feed) enhanceFeed(feed);
  }
}

export function createFeeds(): FeedCollection {
  const api: StarFeedStatic = {
    load: (target) => {
      const root = resolve(target);
      return trigger(records.get(root) ?? enhanceFeed(root));
    },
    complete: (target, options: FeedCompleteOptions = {}) => {
      const root = resolve(target);
      const record = records.get(root) ?? enhanceFeed(root);
      record.loading = false;
      if (options.cursor !== undefined) record.cursor = options.cursor;
      if (options.done !== undefined) record.done = options.done;
      sync(record);
      const added = options.added ?? 0;
      setStatus(
        record,
        record.done
          ? `All ${items(record).length} items loaded.`
          : added
            ? `${added} more item${added === 1 ? "" : "s"} loaded.`
            : record.defaultStatus,
      );
      emit(record, "complete", { added });
      if (record.pendingFocus !== undefined) {
        focusItem(record, record.pendingFocus);
        record.pendingFocus = undefined;
      }
      resetObserver(record);
      return root;
    },
    fail: (target, message) => {
      const root = resolve(target);
      const record = records.get(root) ?? enhanceFeed(root);
      record.loading = false;
      record.pendingFocus = undefined;
      sync(record);
      record.root.dataset.state = "error";
      setStatus(record, message);
      emit(record, "error", { message });
      return root;
    },
    reset: (target, options: FeedResetOptions = {}) => {
      const root = resolve(target);
      const record = records.get(root) ?? enhanceFeed(root);
      record.cursor = options.cursor;
      record.done = false;
      record.loading = false;
      record.pendingFocus = undefined;
      sync(record);
      setStatus(record, options.message ?? record.defaultStatus);
      emit(record, "reset");
      resetObserver(record);
      return root;
    },
    state: (target) => {
      const root = resolve(target);
      return state(records.get(root) ?? enhanceFeed(root));
    },
    focus: (target, index) => {
      const root = resolve(target);
      const record = records.get(root) ?? enhanceFeed(root);
      focusItem(record, Math.max(0, Math.floor(index)));
      return root;
    },
  };
  registerAction("ui.feed.load", (context) => api.load(controlled(context, context.args?.[0])));
  registerAction("ui.feed.complete", (context) => {
    const target = controlled(context, context.args?.[0]);
    const options = context.args?.find(
      (value) => value && typeof value === "object" && !Array.isArray(value),
    );
    return api.complete(target, (options as FeedCompleteOptions | undefined) ?? {});
  });
  registerAction("ui.feed.fail", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlled(context, explicit ? first : undefined);
    const message = explicit ? context.args?.[1] : first;
    return api.fail(target, typeof message === "string" ? message : "Could not load more items.");
  });
  registerAction("ui.feed.reset", (context) => {
    const target = controlled(context, context.args?.[0]);
    const options = context.args?.find(
      (value) => value && typeof value === "object" && !Array.isArray(value),
    );
    return api.reset(target, (options as FeedResetOptions | undefined) ?? {});
  });
  registerAction("ui.feed.focus", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlled(context, explicit ? first : undefined);
    const index = explicit ? context.args?.[1] : first;
    return api.focus(target, typeof index === "number" ? index : 0);
  });
  return { api, enhance: enhanceAll };
}
