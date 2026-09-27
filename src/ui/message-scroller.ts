import { isElementNode, isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import {
  acquireUIResource,
  failUISetup,
  listenUI,
  ownUIRecord,
  releaseUIResources,
  uiCurrent,
  uiElements,
  uiResources,
} from "./lifecycle";
import type { UIResources } from "./lifecycle";
import type {
  MessageScrollerLatestOptions,
  MessageScrollerTarget,
  StarContext,
  StarMessageScrollerStatic,
} from "../types";

interface MessageScrollerRecord extends UIResources {
  followAttribute: string | undefined;
  content: HTMLElement;
  following: boolean;
  knownMessages: WeakSet<Element>;
  latest: HTMLButtonElement;
  pending: { handle: number | undefined } | undefined;
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

const retained = new WeakMap<
  HTMLElement,
  {
    followAttribute: string | undefined;
    following: boolean;
    unread: number;
    knownMessages: WeakSet<Element>;
  }
>();
const records = new WeakMap<HTMLElement, MessageScrollerRecord>();
let messageScrollerId = 0;

function messageScrollerRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="message-scroller"]') ? value : undefined;
}

function directPart<T extends HTMLElement = HTMLElement>(root: HTMLElement, part: string): T {
  const element = Array.from(root.children).find(
    (child): child is T => isHTMLElement(child) && child.dataset.part === part,
  );
  if (!element) throw new Error(`Message Scroller #${root.id} needs data-part="${part}".`);
  return element;
}

function contentPart(viewport: HTMLElement): HTMLElement {
  const content = Array.from(viewport.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === "content",
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
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:message-scroller:${name}`,
      { bubbles: true, detail },
    ),
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

function current(record: MessageScrollerRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    record.root.querySelector(':scope > [data-part="viewport"]') === record.viewport &&
    record.viewport.querySelector(':scope > [data-part="content"]') === record.content &&
    record.root.querySelector(':scope > [data-part="latest"]') === record.latest
  );
}

function clearPending(record: MessageScrollerRecord): void {
  const pending = record.pending;
  record.pending = undefined;
  if (pending?.handle !== undefined) record.window.clearTimeout(pending.handle);
}

function scrollLatest(
  record: MessageScrollerRecord,
  options: MessageScrollerLatestOptions = {},
): HTMLElement {
  if (!current(record)) return record.root;
  const revision = ++record.revision;
  clearPending(record);
  if (!current(record, revision)) return record.root;
  const top = record.viewport.scrollHeight;
  try {
    record.viewport.scrollTo({ top, behavior: options.behavior ?? "auto" });
  } catch {
    if (!current(record, revision)) return record.root;
    record.viewport.scrollTop = top;
  }
  if (!current(record, revision)) return record.root;
  if (record.viewport.scrollTop !== top) record.viewport.scrollTop = top;
  if (!current(record, revision)) return record.root;
  record.following = true;
  record.unread = 0;
  sync(record);
  if (current(record, revision)) emit(record, "latest");
  return record.root;
}

function setFollowing(record: MessageScrollerRecord, following: boolean): HTMLElement {
  if (!current(record)) return record.root;
  const revision = ++record.revision;
  if (record.following === following && (!following || record.unread === 0)) return record.root;
  if (following) return scrollLatest(record);
  clearPending(record);
  if (!current(record, revision)) return record.root;
  record.following = false;
  sync(record);
  if (current(record, revision)) emit(record, "unfollow");
  return record.root;
}

function addedMessages(record: MessageScrollerRecord, mutations: MutationRecord[]): number {
  let added = 0;
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!isElementNode(node)) continue;
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

function schedule(record: MessageScrollerRecord): void {
  if (!current(record)) return;
  const revision = record.revision;
  clearPending(record);
  if (!current(record, revision)) return;
  const pending = { handle: undefined as number | undefined };
  record.pending = pending;
  try {
    pending.handle = record.window.setTimeout(() => {
      if (!current(record) || record.pending !== pending) return;
      record.pending = undefined;
      if (record.root.isConnected && record.following) scrollLatest(record);
    }, 0);
  } catch (error) {
    if (record.pending === pending) record.pending = undefined;
    throw error;
  }
  if (!current(record, revision) || record.pending !== pending)
    record.window.clearTimeout(pending.handle);
}

function observe(record: MessageScrollerRecord): void {
  const holder: { observer?: MutationObserver } = {};
  const disconnect = (): void => holder.observer?.disconnect();
  acquireUIResource(
    record,
    () => current(record),
    () => {
      holder.observer = new (record.window as Window & typeof globalThis).MutationObserver(
        (mutations) => {
          if (!current(record)) return;
          const added = addedMessages(record, mutations);
          if (!added) return;
          const revision = ++record.revision;
          if (record.following) schedule(record);
          else {
            record.unread += added;
            sync(record);
          }
          if (current(record, revision)) emit(record, "messages", added);
        },
      );
      if (!current(record)) return;
      holder.observer.observe(record.content, { childList: true, subtree: true });
    },
    disconnect,
  );
}

function wire(record: MessageScrollerRecord): void {
  const listen = listenUI.bind(undefined, record, () => current(record));
  const scroll = (): void => {
    if (!current(record)) return;
    const following = nearLatest(record);
    if (following === record.following && (!following || record.unread === 0)) return;
    const revision = ++record.revision;
    if (!following) clearPending(record);
    if (!current(record, revision)) return;
    record.following = following;
    if (following) record.unread = 0;
    sync(record);
    if (current(record, revision)) emit(record, following ? "follow" : "unfollow");
  };
  const latest = (): void => {
    const revision = record.revision + 1;
    scrollLatest(record, { behavior: "smooth" });
    if (current(record, revision)) record.viewport.focus({ preventScroll: true });
  };
  listen(record.viewport, "scroll", scroll, { passive: true });
  listen(record.latest, "click", latest);
}

function enhanceMessageScroller(root: HTMLElement): MessageScrollerRecord {
  root.id ||= `jqs-message-scroller-${++messageScrollerId}`;
  const viewport = directPart(root, "viewport");
  const content = contentPart(viewport);
  const latest = directPart<HTMLButtonElement>(root, "latest");
  if (!isHTMLTag(latest, "button"))
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
    existing &&
    current(existing) &&
    existing.viewport === viewport &&
    existing.content === content &&
    existing.latest === latest
  ) {
    if (existing.followAttribute !== root.dataset.follow) {
      existing.revision += 1;
      existing.followAttribute = root.dataset.follow;
      existing.following = root.dataset.follow !== "false";
      if (existing.following) {
        existing.unread = 0;
        schedule(existing);
      } else clearPending(existing);
    }
    if (current(existing)) sync(existing);
    return existing;
  }
  existing?.cleanup();
  const reentered = records.get(root);
  if (reentered) return reentered;
  const previous = retained.get(root);
  const sameFollow = previous?.followAttribute === root.dataset.follow;
  const record: MessageScrollerRecord = {
    ...uiResources(root),
    followAttribute: root.dataset.follow,
    content,
    following: previous && sameFollow ? previous.following : root.dataset.follow !== "false",
    knownMessages: previous?.knownMessages ?? new WeakSet(),
    latest,
    pending: undefined,
    unread: previous?.unread ?? 0,
    viewport,
  };
  for (const message of messages(record)) record.knownMessages.add(message);
  record.cleanups.add(() => clearPending(record));
  record.cleanup = ownUIRecord(records, root, record, () => {
    retained.set(root, {
      followAttribute: record.followAttribute,
      following: record.following,
      unread: record.unread,
      knownMessages: record.knownMessages,
    });
    releaseUIResources(record);
  });
  try {
    observe(record);
    if (current(record)) sync(record);
    wire(record);
    if (current(record) && record.following) schedule(record);
  } catch (error) {
    failUISetup(record, error);
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
  if (isHTMLElement(target)) return resolve(target, context.root);
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="message-scroller"]');
  return resolve(isHTMLElement(closest) ? closest : String(target));
}

function enhanceAll(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="message-scroller"]')) {
    const scroller = messageScrollerRoot(element);
    if (scroller) enhanceMessageScroller(scroller);
  }
}

function recordFor(root: HTMLElement): MessageScrollerRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceMessageScroller(root);
}

export function createMessageScrollers(registerAction: ActionRegistrar): MessageScrollerCollection {
  const api: StarMessageScrollerStatic = {
    latest: (target, options) => {
      const root = resolve(target);
      return scrollLatest(recordFor(root), options);
    },
    follow: (target, following = true) => {
      const root = resolve(target);
      return setFollowing(recordFor(root), following);
    },
    isFollowing: (target) => {
      const root = resolve(target);
      return recordFor(root).following;
    },
    unread: (target) => {
      const root = resolve(target);
      return recordFor(root).unread;
    },
  };
  registerAction("ui.message-scroller.latest", (context) =>
    api.latest(controlled(context, context.args?.[0]), { behavior: "smooth" }),
  );
  registerAction("ui.message-scroller.follow", (context) => {
    const first = context.args?.[0];
    const explicit = isHTMLElement(first) || (typeof first === "string" && first.startsWith("#"));
    const target = controlled(context, explicit ? first : undefined);
    const following = explicit ? context.args?.[1] : first;
    return api.follow(target, typeof following === "boolean" ? following : true);
  });
  return { api, enhance: enhanceAll };
}
