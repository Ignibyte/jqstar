import { registerAction } from "../registry";
import type {
  MessageScrollerLatestOptions,
  MessageScrollerTarget,
  StarContext,
  StarMessageScrollerStatic,
} from "../types";

interface MessageScrollerRecord {
  cleanup: () => void;
  content: HTMLElement;
  following: boolean;
  knownMessages: WeakSet<Element>;
  latest: HTMLButtonElement;
  observer: MutationObserver;
  pending: number | undefined;
  root: HTMLElement;
  unread: number;
  viewport: HTMLElement;
}

interface MessageScrollerCollection {
  api: StarMessageScrollerStatic;
  enhance(root: ParentNode): void;
}

interface MessageScrollerEventDetail {
  added?: number;
  following: boolean;
  messageScroller: HTMLElement;
  unread: number;
}

const records = new WeakMap<HTMLElement, MessageScrollerRecord>();
let messageScrollerId = 0;

function messageScrollerRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="message-scroller"]')
    ? value
    : undefined;
}

function directPart<T extends HTMLElement = HTMLElement>(root: HTMLElement, part: string): T {
  const element = Array.from(root.children).find(
    (child): child is T => child instanceof HTMLElement && child.dataset.part === part,
  );
  if (!element) throw new Error(`Message Scroller #${root.id} needs data-part="${part}".`);
  return element;
}

function contentPart(viewport: HTMLElement): HTMLElement {
  const content = Array.from(viewport.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.dataset.part === "content",
  );
  if (!content)
    throw new Error(`Message Scroller viewport #${viewport.id} needs data-part="content".`);
  return content;
}

function messages(record: MessageScrollerRecord): Element[] {
  return Array.from(record.content.querySelectorAll('[data-jqs="message"]')).filter(
    (message) => message.closest('[data-jqs="message-scroller"]') === record.root,
  );
}

function threshold(record: MessageScrollerRecord): number {
  const value = Number(record.root.dataset.threshold);
  return Number.isFinite(value) && value >= 0 ? value : 48;
}

function nearLatest(record: MessageScrollerRecord): boolean {
  return (
    record.viewport.scrollHeight - record.viewport.clientHeight - record.viewport.scrollTop <=
    threshold(record)
  );
}

function emit(
  record: MessageScrollerRecord,
  name: "follow" | "unfollow" | "latest" | "messages",
  added?: number,
): void {
  const detail: MessageScrollerEventDetail = {
    ...(added === undefined ? {} : { added }),
    following: record.following,
    messageScroller: record.root,
    unread: record.unread,
  };
  record.root.dispatchEvent(
    new CustomEvent(`jquery-star:message-scroller:${name}`, { bubbles: true, detail }),
  );
}

function sync(record: MessageScrollerRecord): void {
  record.root.dataset.state = record.following ? "following" : "paused";
  record.root.dataset.unread = String(record.unread);
  const hidden = record.following && record.unread === 0;
  if (record.latest.hidden !== hidden) record.latest.hidden = hidden;
  const label = record.latest.querySelector<HTMLElement>('[data-part="latest-label"]');
  if (label) label.textContent = record.unread ? `Latest (${record.unread})` : "Latest";
  record.latest.setAttribute(
    "aria-label",
    record.unread
      ? `Scroll to latest message, ${record.unread} unread`
      : "Scroll to latest message",
  );
}

function scrollLatest(
  record: MessageScrollerRecord,
  options: MessageScrollerLatestOptions = {},
): HTMLElement {
  if (record.pending !== undefined) window.clearTimeout(record.pending);
  record.pending = undefined;
  const top = record.viewport.scrollHeight;
  try {
    record.viewport.scrollTo({ top, behavior: options.behavior ?? "auto" });
  } catch {
    record.viewport.scrollTop = top;
  }
  if (record.viewport.scrollTop !== top) record.viewport.scrollTop = top;
  record.following = true;
  record.unread = 0;
  sync(record);
  emit(record, "latest");
  return record.root;
}

function setFollowing(record: MessageScrollerRecord, following: boolean): HTMLElement {
  if (record.following === following && (!following || record.unread === 0)) return record.root;
  if (!following && record.pending !== undefined) {
    window.clearTimeout(record.pending);
    record.pending = undefined;
  }
  record.following = following;
  if (following) {
    record.unread = 0;
    scrollLatest(record);
  } else {
    sync(record);
    emit(record, "unfollow");
  }
  return record.root;
}

function addedMessages(record: MessageScrollerRecord, mutations: MutationRecord[]): number {
  let added = 0;
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      const candidates = [
        ...(node.matches('[data-jqs="message"]') ? [node] : []),
        ...Array.from(node.querySelectorAll('[data-jqs="message"]')),
      ];
      for (const message of candidates) {
        if (
          message.closest('[data-jqs="message-scroller"]') === record.root &&
          !record.knownMessages.has(message)
        ) {
          record.knownMessages.add(message);
          added += 1;
        }
      }
    }
  }
  return added;
}

function observe(record: MessageScrollerRecord): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    const added = addedMessages(record, mutations);
    if (!added) return;
    if (record.following) {
      if (record.pending !== undefined) window.clearTimeout(record.pending);
      record.pending = window.setTimeout(() => {
        record.pending = undefined;
        scrollLatest(record);
      }, 0);
    } else {
      record.unread += added;
      sync(record);
    }
    emit(record, "messages", added);
  });
  observer.observe(record.content, { childList: true, subtree: true });
  return observer;
}

function wire(record: MessageScrollerRecord): () => void {
  const scroll = (): void => {
    const following = nearLatest(record);
    if (following === record.following && (!following || record.unread === 0)) return;
    record.following = following;
    if (following) record.unread = 0;
    sync(record);
    emit(record, following ? "follow" : "unfollow");
  };
  const latest = (): void => {
    scrollLatest(record, { behavior: "smooth" });
    record.viewport.focus({ preventScroll: true });
  };
  record.viewport.addEventListener("scroll", scroll, { passive: true });
  record.latest.addEventListener("click", latest);
  return () => {
    record.viewport.removeEventListener("scroll", scroll);
    record.latest.removeEventListener("click", latest);
    record.observer.disconnect();
    if (record.pending !== undefined) window.clearTimeout(record.pending);
  };
}

function enhanceMessageScroller(root: HTMLElement): MessageScrollerRecord {
  root.id ||= `jqs-message-scroller-${++messageScrollerId}`;
  const viewport = directPart(root, "viewport");
  const content = contentPart(viewport);
  const latest = directPart<HTMLButtonElement>(root, "latest");
  if (!(latest instanceof HTMLButtonElement))
    throw new Error(`Message Scroller #${root.id} latest part must be a button.`);
  viewport.id ||= `${root.id}-viewport`;
  viewport.tabIndex = viewport.hasAttribute("tabindex") ? viewport.tabIndex : 0;
  viewport.setAttribute("role", "log");
  if (!viewport.hasAttribute("aria-label") && !viewport.hasAttribute("aria-labelledby"))
    viewport.setAttribute("aria-label", "Messages");
  latest.type = "button";
  latest.setAttribute("aria-controls", viewport.id);
  const existing = records.get(root);
  if (
    existing?.viewport === viewport &&
    existing.content === content &&
    existing.latest === latest
  ) {
    sync(existing);
    return existing;
  }
  existing?.cleanup();
  const record: MessageScrollerRecord = {
    cleanup: () => undefined,
    content,
    following: root.dataset.follow !== "false",
    knownMessages: new WeakSet(),
    latest,
    observer: {} as MutationObserver,
    pending: undefined,
    root,
    unread: 0,
    viewport,
  };
  for (const message of messages(record)) record.knownMessages.add(message);
  record.observer = observe(record);
  records.set(root, record);
  sync(record);
  record.cleanup = wire(record);
  if (record.following) {
    record.pending = window.setTimeout(() => {
      record.pending = undefined;
      scrollLatest(record);
    }, 0);
  }
  return record;
}

function resolve(target: MessageScrollerTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? messageScrollerRoot(root.querySelector(target))
      : messageScrollerRoot(target);
  if (resolved) return resolved;
  throw new Error(
    `Message Scroller target did not match data-jqs="message-scroller": ${String(target)}`,
  );
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="message-scroller"]'))
    return target;
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="message-scroller"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceAll(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="message-scroller"]')));
  for (const element of elements) {
    const scroller = messageScrollerRoot(element);
    if (scroller) enhanceMessageScroller(scroller);
  }
}

export function createMessageScrollers(): MessageScrollerCollection {
  const api: StarMessageScrollerStatic = {
    latest: (target, options) => {
      const root = resolve(target);
      return scrollLatest(records.get(root) ?? enhanceMessageScroller(root), options);
    },
    follow: (target, following = true) => {
      const root = resolve(target);
      return setFollowing(records.get(root) ?? enhanceMessageScroller(root), following);
    },
    isFollowing: (target) => {
      const root = resolve(target);
      return (records.get(root) ?? enhanceMessageScroller(root)).following;
    },
    unread: (target) => {
      const root = resolve(target);
      return (records.get(root) ?? enhanceMessageScroller(root)).unread;
    },
  };
  registerAction("ui.message-scroller.latest", (context) =>
    api.latest(controlled(context, context.args?.[0]), { behavior: "smooth" }),
  );
  registerAction("ui.message-scroller.follow", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlled(context, explicit ? first : undefined);
    const following = explicit ? context.args?.[1] : first;
    return api.follow(target, typeof following === "boolean" ? following : true);
  });
  return { api, enhance: enhanceAll };
}
