import type { ActionRegistrar } from "../registry";
import { isElementNode, isHTMLElement, isHTMLTag } from "../dom";
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
import type {
  FeedCompleteOptions,
  FeedResetOptions,
  FeedState,
  FeedTarget,
  StarContext,
  StarFeedStatic,
} from "../types";

interface FeedRecord extends UIResources {
  busy: boolean;
  content: HTMLElement;
  cursor: string | undefined;
  defaultStatus: string;
  done: boolean;
  error: boolean;
  loading: boolean;
  more: HTMLButtonElement;
  observer: IntersectionObserver | undefined;
  observerAuto: boolean;
  observerDone: boolean;
  observerRevision: number;
  releaseIntersection: (() => void) | undefined;
  pendingFocus: number | undefined;
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
type Current = () => boolean;
const records = new WeakMap<HTMLElement, FeedRecord>();
const intents = new WeakMap<HTMLElement, number>();
const retained = new WeakMap<
  HTMLElement,
  Pick<FeedRecord, "content" | "status" | "defaultStatus" | "pendingFocus">
>();
const generated = new WeakMap<HTMLElement, Map<string, string | undefined>>();
const flags = new WeakMap<HTMLElement, Map<string, { authored: boolean; reflected: boolean }>>();
let feedId = 0;

function feedRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="feed"]') ? value : undefined;
}
function directPart(root: HTMLElement, part: string): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === part,
  );
}
function current(record: FeedRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    feedRoot(record.root) === record.root &&
    directPart(record.root, "content") === record.content &&
    directPart(record.root, "more") === record.more &&
    directPart(record.root, "status") === record.status &&
    directPart(record.root, "sentinel") === record.sentinel
  );
}
function items(record: FeedRecord): HTMLElement[] {
  return Array.from(record.content.children).filter(
    (child): child is HTMLElement =>
      isHTMLElement(child) &&
      child.dataset.part === "item" &&
      child.closest('[data-jqs="feed"]') === record.root,
  );
}
function itemPart(item: HTMLElement, name: string): HTMLElement | undefined {
  return Array.from(item.querySelectorAll(`[data-part="${name}"]`)).find(
    (element): element is HTMLElement => {
      if (!isHTMLElement(element) || element.closest('[data-part="item"]') !== item) return false;
      for (
        let parent = element.parentElement;
        parent && parent !== item;
        parent = parent.parentElement
      )
        if (parent.hasAttribute("data-jqs") && !parent.matches('button[data-jqs="button"]'))
          return false;
      return !element.hasAttribute("data-jqs") || element.matches('button[data-jqs="button"]');
    },
  );
}
function authoredFlag(element: HTMLElement, name: string): boolean {
  const present = element.hasAttribute(name),
    previous = flags.get(element)?.get(name);
  return previous?.reflected === present ? previous.authored : present;
}
function constrained(element: Element): boolean {
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (
      node.matches(
        '[inert],[aria-disabled="true"],[aria-hidden="true"],[data-disabled]:not([data-disabled="false"])',
      )
    )
      return true;
    if (isHTMLElement(node) && (authoredFlag(node, "disabled") || authoredFlag(node, "hidden")))
      return true;
  }
  return false;
}
function state(record: FeedRecord): FeedState {
  return { cursor: record.cursor, done: record.done, loading: record.loading };
}
function operation(record: FeedRecord, allowed: Current = () => true) {
  const revision = record.revision,
    entries = items(record);
  const labels = entries.flatMap((item) => [
    itemPart(item, "title"),
    itemPart(item, "description"),
  ]);
  const parents = new Map(
    [
      record.root,
      record.content,
      record.more,
      record.status,
      record.sentinel,
      ...entries,
      ...labels,
    ]
      .filter(isHTMLElement)
      .map((element) => [element, element.parentElement]),
  );
  const attributes = new Map<HTMLElement, Map<string, string | null>>();
  const observe = (element: HTMLElement | undefined, names: string[]): void => {
    if (!element) return;
    const values = attributes.get(element) ?? new Map<string, string | null>();
    for (const name of names) values.set(name, element.getAttribute(name));
    attributes.set(element, values);
  };
  observe(record.root, [
    "id",
    "data-state",
    "data-cursor",
    "data-done",
    "data-auto",
    "data-total",
    "aria-label",
    "aria-labelledby",
  ]);
  observe(record.content, ["role", "aria-label", "aria-labelledby", "aria-busy"]);
  for (const element of [record.more, ...entries, ...labels])
    observe(element, [
      "id",
      "type",
      "tabindex",
      "role",
      "aria-label",
      "aria-labelledby",
      "aria-describedby",
      "aria-posinset",
      "aria-setsize",
    ]);
  for (const part of [record.root, record.more, record.content, ...entries, ...labels])
    for (let element = part; element; element = element.parentElement ?? undefined)
      observe(element, [
        "disabled",
        "hidden",
        "inert",
        "aria-disabled",
        "aria-hidden",
        "data-disabled",
      ]);
  const texts = new Map(
    labels.filter(isHTMLElement).map((element) => [element, element.textContent]),
  );
  if (record.status) texts.set(record.status, record.status.textContent);
  const source = (): boolean => {
    const present = items(record);
    const parts = present.flatMap((item) => [
      itemPart(item, "title"),
      itemPart(item, "description"),
    ]);
    return (
      present.length === entries.length &&
      present.every((item, index) => item === entries[index]) &&
      parts.length === labels.length &&
      parts.every((part, index) => part === labels[index]) &&
      [...parents].every(([element, parent]) => element.parentElement === parent) &&
      [...attributes].every(([element, values]) =>
        [...values].every(([name, value]) => element.getAttribute(name) === value),
      ) &&
      [...texts].every(([element, value]) => element.textContent === value)
    );
  };
  const valid = (): boolean => current(record, revision) && source() && allowed();
  const attribute = (element: HTMLElement, name: string, value: string | undefined): boolean => {
    if (!valid()) return false;
    const next = value ?? null;
    if (element.getAttribute(name) === next) return true;
    if (attributes.get(element)?.has(name)) attributes.get(element)?.set(name, next);
    if (next === null) element.removeAttribute(name);
    else element.setAttribute(name, next);
    return valid();
  };
  const text = (element: HTMLElement | undefined, value: string): boolean => {
    if (!valid()) return false;
    if (!element || element.textContent === value) return true;
    if (texts.has(element)) texts.set(element, value);
    element.textContent = value;
    return valid();
  };
  const write = (run: () => void): boolean => {
    if (!valid()) return false;
    run();
    return valid();
  };
  return { valid, attribute, text, write };
}
type Operation = ReturnType<typeof operation>;
function authored(element: HTMLElement, name: string): string | undefined {
  const value = element.getAttribute(name) || undefined;
  return value && generated.get(element)?.get(name) !== value ? value : undefined;
}
function generatedAttribute(
  op: Operation,
  element: HTMLElement,
  name: string,
  value?: string,
): boolean {
  if (!op.valid()) return false;
  if (authored(element, name)) return true;
  const values = generated.get(element) ?? new Map<string, string | undefined>();
  values.set(name, value);
  generated.set(element, values);
  return op.attribute(element, name, value);
}
function reflectFlag(op: Operation, element: HTMLElement, name: string, value: boolean): boolean {
  if (!op.valid()) return false;
  const authored = authoredFlag(element, name),
    reflected = authored || value;
  const values = flags.get(element) ?? new Map<string, { authored: boolean; reflected: boolean }>();
  values.set(name, { authored, reflected });
  flags.set(element, values);
  return op.attribute(element, name, reflected ? "" : undefined);
}
function identifier(
  record: FeedRecord,
  op: Operation,
  element: HTMLElement,
  preferred: string,
): boolean {
  if (element.id) return op.valid();
  const occupied = new Set(
    Array.from(record.root.querySelectorAll("[id]"), (element) => element.id),
  );
  let candidate = preferred,
    suffix = 1;
  while (occupied.has(candidate) || record.document.getElementById(candidate))
    candidate = `${preferred}-${++suffix}`;
  return op.attribute(element, "id", candidate);
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
    new (record.window as Window & typeof globalThis).CustomEvent(`jquery-star:feed:${name}`, {
      bubbles: true,
      cancelable: options.cancelable ?? false,
      detail,
    }),
  );
}
function sync(record: FeedRecord, op: Operation): void {
  const { root, content, more } = record;
  if (!root.id && !identifier(record, op, root, `jqs-feed-${++feedId}`)) return;
  if (!op.attribute(content, "role", "feed")) return;
  const rootLabel = root.getAttribute("aria-labelledby") || undefined;
  if (
    !generatedAttribute(
      op,
      content,
      "aria-labelledby",
      authored(content, "aria-label") ? undefined : rootLabel,
    )
  )
    return;
  if (
    !generatedAttribute(
      op,
      content,
      "aria-label",
      content.hasAttribute("aria-labelledby")
        ? undefined
        : (root.getAttribute("aria-label") ?? "Results"),
    )
  )
    return;
  if (
    !op.attribute(
      root,
      "data-state",
      record.done ? "done" : record.loading ? "loading" : record.error ? "error" : "idle",
    )
  )
    return;
  if (!op.attribute(root, "data-done", String(record.done))) return;
  if (!op.attribute(root, "data-cursor", record.cursor)) return;
  if (!op.attribute(content, "aria-busy", String(record.loading))) return;
  if (!op.attribute(more, "type", "button")) return;
  if (!reflectFlag(op, more, "disabled", record.loading || record.done)) return;
  if (!reflectFlag(op, more, "hidden", record.done)) return;
  const entries = items(record),
    total = Number(root.dataset.total);
  const size = Number.isInteger(total) && total >= 0 ? total : record.done ? entries.length : -1;
  for (const [index, item] of entries.entries()) {
    if (!item.id && !identifier(record, op, item, `${root.id}-item-${index + 1}`)) return;
    if (item.tagName !== "ARTICLE" && !op.attribute(item, "role", "article")) return;
    if (!item.hasAttribute("tabindex") && !op.attribute(item, "tabindex", "0")) return;
    if (!op.attribute(item, "aria-posinset", String(index + 1))) return;
    if (!op.attribute(item, "aria-setsize", String(size))) return;
    const title = itemPart(item, "title"),
      description = itemPart(item, "description");
    if (title && !title.id && !identifier(record, op, title, `${item.id}-title`)) return;
    if (
      description &&
      !description.id &&
      !identifier(record, op, description, `${item.id}-description`)
    )
      return;
    if (
      !generatedAttribute(
        op,
        item,
        "aria-labelledby",
        authored(item, "aria-label") ? undefined : title?.id,
      )
    )
      return;
    if (!generatedAttribute(op, item, "aria-describedby", description?.id)) return;
  }
}
function disconnectObserver(record: FeedRecord): void {
  const release = record.releaseIntersection;
  record.releaseIntersection = undefined;
  record.observer = undefined;
  release?.();
}
function resetObserver(record: FeedRecord, valid: Current, force = true): void {
  const auto = record.root.hasAttribute("data-auto");
  if (!force && record.observerAuto === auto && record.observerDone === record.done) return;
  const revision = ++record.observerRevision;
  record.observerAuto = auto;
  record.observerDone = record.done;
  disconnectObserver(record);
  const available = (): boolean =>
    valid() &&
    current(record) &&
    record.observerRevision === revision &&
    record.root.hasAttribute("data-auto") === auto;
  if (!available()) return;
  const Observer = (record.window as Window & typeof globalThis).IntersectionObserver;
  const sentinel = record.sentinel;
  if (record.done || !sentinel || !auto || typeof Observer === "undefined") return;
  let observer: IntersectionObserver | undefined;
  const lifetime = { active: true };
  const release = (): void => {
    if (!lifetime.active) return;
    lifetime.active = false;
    record.cleanups.delete(release);
    if (record.releaseIntersection === release) {
      record.releaseIntersection = undefined;
      record.observer = undefined;
    }
    observer?.disconnect();
  };
  const acquired = (): boolean => lifetime.active && available();
  const retire = (): void => {
    if (lifetime.active) release();
    else observer?.disconnect();
  };
  record.cleanups.add(release);
  record.releaseIntersection = release;
  try {
    observer = new Observer((entries) => {
      if (
        lifetime.active &&
        observer !== undefined &&
        current(record) &&
        record.observerRevision === revision &&
        record.observer === observer &&
        record.root.hasAttribute("data-auto") &&
        entries.some((entry) => entry.isIntersecting)
      )
        request(record.root, (active, op) => trigger(active, op));
    });
    if (!acquired()) {
      retire();
      return;
    }
    record.observer = observer;
    observer.observe(sentinel);
    if (!acquired()) retire();
  } catch (error) {
    try {
      retire();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Feed observer setup and cleanup failed.", {
        cause: cleanupError,
      });
    }
    throw error;
  }
}
function focusItem(record: FeedRecord, index: number, op: Operation): void {
  const item = items(record)[index];
  if (!item || !op.valid()) return;
  if (op.write(() => item.focus({ preventScroll: true })))
    op.write(() => item.scrollIntoView?.({ block: "nearest" }));
}
function boundaryFocus(record: FeedRecord, direction: "before" | "after", op: Operation): void {
  const candidates = Array.from(
    record.document.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(
    (element): element is HTMLElement =>
      isHTMLElement(element) &&
      !record.root.contains(element) &&
      !constrained(element) &&
      element.tabIndex >= 0,
  );
  const relative = candidates.filter((element) =>
    Boolean(record.root.compareDocumentPosition(element) & (direction === "after" ? 4 : 2)),
  );
  const target = direction === "after" ? relative[0] : relative.at(-1);
  if (target) op.write(() => target.focus());
}
function request(
  root: HTMLElement,
  run: (record: FeedRecord, op: Operation) => void,
  allowed: Current = () => true,
): HTMLElement {
  const intent = (intents.get(root) ?? 0) + 1;
  intents.set(root, intent);
  if (!allowed()) return root;
  const record = enhanceFeed(root);
  if (!current(record) || intents.get(root) !== intent || !allowed()) return root;
  ++record.revision;
  const op = operation(record, () => intents.get(root) === intent && allowed());
  const busy = record.busy;
  record.busy = true;
  try {
    if (op.valid()) run(record, op);
  } finally {
    record.busy = busy;
  }
  return root;
}
function trigger(record: FeedRecord, op: Operation): void {
  if (
    !record.loading &&
    !record.done &&
    !record.more.disabled &&
    !record.more.hidden &&
    !constrained(record.more)
  )
    op.write(() => record.more.click());
}
function wire(record: FeedRecord, op: Operation): void {
  let acquisition: Current | undefined = op.valid;
  const valid = (): boolean => current(record) && (acquisition?.() ?? true);
  try {
    listenUI(record, valid, record.more, "click", (event) => {
      const outcome = { accepted: false };
      if (
        !event.defaultPrevented &&
        !constrained(record.more) &&
        !record.more.hidden &&
        !record.loading &&
        !record.done
      ) {
        request(
          record.root,
          (active, op) => {
            if (!emit(active, "before-load", { cancelable: true }) || !op.valid()) return;
            active.loading = true;
            active.error = false;
            if (!op.text(active.status, "Loading more items…")) return;
            sync(active, op);
            if (op.valid()) {
              emit(active, "load");
              outcome.accepted = op.valid();
            }
          },
          () => !event.defaultPrevented && !constrained(record.more),
        );
      }
      if (!outcome.accepted) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });
    listenUI(record, valid, record.content, "keydown", (event) => {
      const key = event as KeyboardEvent;
      if (key.defaultPrevented || !isElementNode(key.target) || constrained(key.target)) return;
      const item = key.target.closest('[data-part="item"]');
      if (
        !isHTMLElement(item) ||
        item.parentElement !== record.content ||
        key.target.closest('[data-jqs]:not([data-jqs="item"]):not(button[data-jqs="button"])') !==
          record.root
      )
        return;
      if (
        !(["PageDown", "PageUp"].includes(key.key) && !key.ctrlKey) &&
        !(["Home", "End"].includes(key.key) && key.ctrlKey)
      )
        return;
      key.preventDefault();
      request(
        record.root,
        (active, op) => {
          const entries = items(active),
            index = entries.indexOf(item);
          if (key.ctrlKey) {
            boundaryFocus(active, key.key === "Home" ? "before" : "after", op);
            return;
          }
          if (key.key === "PageUp") focusItem(active, Math.max(0, index - 1), op);
          else if (index < entries.length - 1) focusItem(active, index + 1, op);
          else if (!active.done) {
            active.pendingFocus = index + 1;
            trigger(active, op);
          }
        },
        () => !constrained(key.target as Element),
      );
    });
  } finally {
    acquisition = undefined;
  }
}
function enhanceFeed(root: HTMLElement): FeedRecord {
  const previous = records.get(root);
  if (previous && current(previous)) {
    if (previous.busy) return previous;
    const cursor = root.dataset.cursor,
      done = root.dataset.done === "true",
      loading = root.dataset.state === "loading",
      error = root.dataset.state === "error";
    if (
      cursor !== previous.cursor ||
      done !== previous.done ||
      loading !== previous.loading ||
      error !== previous.error
    ) {
      ++previous.revision;
      previous.cursor = cursor;
      previous.done = done;
      previous.loading = loading;
      previous.error = error;
    }
    const op = operation(previous);
    previous.busy = true;
    try {
      sync(previous, op);
      if (op.valid()) resetObserver(previous, op.valid, false);
    } catch (error) {
      failUISetup(previous, error);
    } finally {
      previous.busy = false;
    }
    return previous;
  }
  const saved = previous ?? retained.get(root);
  previous?.cleanup();
  const reentered = records.get(root);
  if (reentered) return reentered;
  if (previous && !uiActive(root)) return previous;
  const content = directPart(root, "content"),
    more = directPart(root, "more");
  if (!content) throw new Error(`Feed #${root.id} needs data-part="content".`);
  if (!isHTMLTag(more, "button")) throw new Error(`Feed #${root.id} more part must be a button.`);
  const status = directPart(root, "status");
  const record: FeedRecord = {
    ...uiResources(root),
    busy: true,
    content,
    more,
    status,
    sentinel: directPart(root, "sentinel"),
    cursor: root.dataset.cursor,
    done: root.dataset.done === "true",
    loading: root.dataset.state === "loading",
    error: root.dataset.state === "error",
    defaultStatus:
      saved && saved.status === status ? saved.defaultStatus : (status?.textContent ?? ""),
    pendingFocus: saved?.content === content ? saved.pendingFocus : undefined,
    observer: undefined,
    observerAuto: false,
    observerDone: false,
    observerRevision: 0,
    releaseIntersection: undefined,
  };
  record.cleanups.add(() => {
    retained.set(root, {
      content: record.content,
      status: record.status,
      defaultStatus: record.defaultStatus,
      pendingFocus: record.pendingFocus,
    });
    record.pendingFocus = undefined;
  });
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  const op = operation(record);
  let wired = false;
  try {
    sync(record, op);
    if (op.valid()) wire(record, op);
    wired = op.valid();
    if (op.valid()) resetObserver(record, op.valid);
  } catch (error) {
    failUISetup(record, error);
  } finally {
    record.busy = false;
    if (!wired && record.active) record.cleanup();
  }
  return record;
}
function resolve(owner: Document, target: FeedTarget, within: ParentNode = owner): HTMLElement {
  const root =
    typeof target === "string"
      ? feedRoot(
          isHTMLElement(within) && within.matches(target) ? within : within.querySelector(target),
        )
      : feedRoot(target);
  if (!root) throw new Error(`Feed target did not match data-jqs="feed": ${String(target)}`);
  if (root.ownerDocument !== owner || !uiActive(root))
    throw new Error("This Feed target is unavailable in its owning Document.");
  return root;
}
function controlled(owner: Document, context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target) || typeof target === "string")
    return resolve(owner, target, context.root);
  const root =
    feedRoot(context.element?.closest('[data-jqs="feed"]') ?? null) ?? feedRoot(context.root);
  if (root) return resolve(owner, root);
  throw new Error('Feed action needs a selector or an element inside data-jqs="feed".');
}
function complete(
  root: HTMLElement,
  options: FeedCompleteOptions,
  allowed: Current = () => true,
): HTMLElement {
  return request(
    root,
    (record, op) => {
      const cursor = options.cursor;
      if (!op.valid()) return;
      const done = options.done;
      if (!op.valid()) return;
      const added = options.added ?? 0;
      if (!op.valid()) return;
      record.loading = false;
      record.error = false;
      if (cursor !== undefined) record.cursor = cursor;
      if (done !== undefined) record.done = done;
      sync(record, op);
      if (
        !op.text(
          record.status,
          record.done
            ? `All ${items(record).length} items loaded.`
            : added
              ? `${added} more item${added === 1 ? "" : "s"} loaded.`
              : record.defaultStatus,
        )
      )
        return;
      if (
        !op.write(() => {
          emit(record, "complete", { added });
        })
      )
        return;
      const pending = record.pendingFocus;
      record.pendingFocus = undefined;
      if (pending !== undefined) focusItem(record, pending, op);
      if (op.valid()) resetObserver(record, op.valid);
    },
    allowed,
  );
}
function reset(
  root: HTMLElement,
  options: FeedResetOptions,
  allowed: Current = () => true,
): HTMLElement {
  return request(
    root,
    (record, op) => {
      const cursor = options.cursor;
      if (!op.valid()) return;
      const message = options.message ?? record.defaultStatus;
      if (!op.valid()) return;
      record.cursor = cursor;
      record.done = false;
      record.loading = false;
      record.error = false;
      record.pendingFocus = undefined;
      sync(record, op);
      if (!op.text(record.status, message)) return;
      if (
        op.write(() => {
          emit(record, "reset");
        })
      )
        resetObserver(record, op.valid);
    },
    allowed,
  );
}
function fail(root: HTMLElement, message: string, allowed: Current = () => true): HTMLElement {
  return request(
    root,
    (record, op) => {
      record.loading = false;
      record.error = true;
      record.pendingFocus = undefined;
      sync(record, op);
      if (op.text(record.status, message))
        op.write(() => {
          emit(record, "error", { message });
        });
    },
    allowed,
  );
}
export function createFeeds(registerAction: ActionRegistrar, owner: Document): FeedCollection {
  const api: StarFeedStatic = {
    load: (target) => request(resolve(owner, target), (record, op) => trigger(record, op)),
    complete: (target, options = {}) => complete(resolve(owner, target), options),
    reset: (target, options = {}) => reset(resolve(owner, target), options),
    fail: (target, message) => fail(resolve(owner, target), message),
    state: (target) => {
      const { root } = enhanceFeed(resolve(owner, target));
      return {
        cursor: root.dataset.cursor,
        done: root.dataset.done === "true",
        loading: root.dataset.state === "loading",
      };
    },
    focus: (target, index) =>
      request(resolve(owner, target), (record, op) =>
        focusItem(record, Math.max(0, Math.floor(index)), op),
      ),
  };
  const allowed = (context: StarContext, root: HTMLElement): boolean =>
    root.ownerDocument === owner &&
    uiActive(root) &&
    !constrained(root) &&
    context.root.ownerDocument === owner &&
    uiActive(context.root) &&
    !constrained(context.root) &&
    (!context.element ||
      (context.element.ownerDocument === owner &&
        uiActive(context.element) &&
        !constrained(context.element))) &&
    !(context.event && "defaultPrevented" in context.event && context.event.defaultPrevented) &&
    !(context.event && "isDefaultPrevented" in context.event && context.event.isDefaultPrevented());
  for (const name of ["complete", "reset"] as const)
    registerAction(`ui.feed.${name}`, (context) => {
      const root = controlled(owner, context, context.args?.[0]);
      const options = context.args?.find(
        (value) =>
          value && typeof value === "object" && !isElementNode(value) && !Array.isArray(value),
      );
      const permit = () => allowed(context, root);
      return name === "complete"
        ? complete(root, (options as FeedCompleteOptions | undefined) ?? {}, permit)
        : reset(root, (options as FeedResetOptions | undefined) ?? {}, permit);
    });
  registerAction("ui.feed.load", (context) => {
    const root = controlled(owner, context, context.args?.[0]);
    return request(
      root,
      (record, op) => trigger(record, op),
      () => allowed(context, root),
    );
  });
  registerAction("ui.feed.fail", (context) => {
    const first = context.args?.[0],
      explicit =
        isHTMLElement(first) ||
        (typeof first === "string" && (first.startsWith("#") || context.args?.length === 2));
    const root = controlled(owner, context, explicit ? first : undefined),
      message = explicit ? context.args?.[1] : first;
    return fail(root, typeof message === "string" ? message : "Could not load more items.", () =>
      allowed(context, root),
    );
  });
  registerAction("ui.feed.focus", (context) => {
    const first = context.args?.[0],
      explicit = isHTMLElement(first) || typeof first === "string";
    const root = controlled(owner, context, explicit ? first : undefined),
      index = explicit ? context.args?.[1] : first;
    return request(
      root,
      (record, op) =>
        focusItem(record, typeof index === "number" ? Math.max(0, Math.floor(index)) : 0, op),
      () => allowed(context, root),
    );
  });
  return {
    api,
    enhance(root) {
      for (const element of uiElements(root, '[data-jqs="feed"]')) {
        const feed = feedRoot(element);
        if (feed && feed.ownerDocument === owner) enhanceFeed(feed);
      }
    },
  };
}
