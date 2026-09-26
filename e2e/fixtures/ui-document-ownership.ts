import { createRenderAdapter, installStarCore } from "../../src/core";
import { uiPlugin } from "../../src/ui";
import { kernelForDocument } from "../../src/kernel";

type RealmKind = "countdown" | "carousel" | "message-scroller" | "dialog";
type RealmMode = "explicit" | "automatic" | "action" | "adopted";
type Factory = (owner: Window) => JQueryStatic;

export function exerciseStagedListenerCancellation(
  factory: Factory,
  mode:
    | "ordinary"
    | "method"
    | "method-nonfunction"
    | "capture"
    | "once"
    | "passive"
    | "signal"
    | "native-return"
    | "native-throw",
) {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow as Window & typeof globalThis;
  const star = installStarCore(factory(owner), { document: owner.document }).star;
  const target = owner.document.createElement("section");
  owner.document.body.append(target);
  const add = target.addEventListener;
  const options: AddEventListenerOptions = {};
  let cancel: () => void = () => undefined;
  let nativeCalls = 0;
  let deliveries = 0;
  let during = 0;
  let rejected = false;
  try {
    if (mode === "method" || mode === "method-nonfunction") {
      Object.defineProperty(target, "addEventListener", {
        configurable: true,
        get() {
          cancel();
          if (mode === "method-nonfunction") return undefined;
          return function (this: HTMLElement, ...args: Parameters<typeof add>) {
            nativeCalls++;
            add.apply(this, args);
          };
        },
      });
    } else if (mode === "native-return" || mode === "native-throw") {
      target.addEventListener = function (...args: Parameters<typeof add>) {
        nativeCalls++;
        add.apply(this, args);
        cancel();
        target.dispatchEvent(new owner.Event("probe"));
        during = deliveries;
        if (mode === "native-throw") throw new Error("late staged setup");
      };
    } else {
      target.addEventListener = function (...args: Parameters<typeof add>) {
        nativeCalls++;
        add.apply(this, args);
      };
      if (mode !== "ordinary") {
        Object.defineProperty(options, mode, {
          get() {
            cancel();
            return mode === "signal" ? undefined : false;
          },
        });
      }
    }
    try {
      star.use({
        name: "probe.staged-listener",
        version: "1.0.0",
        apiVersion: "^0.1.0",
        install(registrar) {
          cancel = registrar.documentHost.listen(target, "probe", () => deliveries++, options);
        },
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "late staged setup") throw error;
      rejected = true;
    }
    if (mode === "ordinary") {
      target.dispatchEvent(new owner.Event("probe"));
      during = deliveries;
      cancel();
      deliveries = 0;
    }
    target.dispatchEvent(new owner.Event("probe"));
    return {
      nativeCalls,
      during,
      after: deliveries,
      rejected,
      listenerResources: kernelForDocument(owner.document)
        ?.resourceSummary()
        .filter((resource) => resource.kind === "listener").length,
    };
  } finally {
    Reflect.deleteProperty(target, "addEventListener");
    star.dispose();
    frame.remove();
  }
}

export function exerciseStagedListenerDuplicate(factory: Factory, cancelDuringSecond: boolean) {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow as Window & typeof globalThis;
  const star = installStarCore(factory(owner), { document: owner.document }).star;
  const target = owner.document.createElement("section");
  owner.document.body.append(target);
  const add = target.addEventListener;
  let first: () => void = () => undefined;
  let second: () => void = () => undefined;
  let nativeCalls = 0;
  let deliveries = 0;
  const callback = () => deliveries++;
  try {
    target.addEventListener = function (...args: Parameters<typeof add>) {
      nativeCalls++;
      if (cancelDuringSecond && nativeCalls === 2) second();
      add.apply(this, args);
    };
    star.use({
      name: "probe.staged-duplicate",
      version: "1.0.0",
      apiVersion: "^0.1.0",
      install(registrar) {
        first = registrar.documentHost.listen(target, "probe", callback);
        second = registrar.documentHost.listen(target, "probe", callback);
      },
    });
    target.dispatchEvent(new owner.Event("probe"));
    const beforeRelease = deliveries;
    if (cancelDuringSecond) second();
    else first();
    target.dispatchEvent(new owner.Event("probe"));
    const afterRelease = deliveries;
    first();
    second();
    return { nativeCalls, beforeRelease, afterRelease };
  } finally {
    target.addEventListener = add;
    star.dispose();
    frame.remove();
  }
}

function createRealm(factory: Factory) {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow;
  if (!owner) throw new Error("Missing independent frame window.");
  const jquery = factory(owner);
  const installed = installStarCore(jquery, { document: owner.document });
  return {
    frame,
    owner,
    jquery,
    installed,
    star: installed.star,
    ui: installed.star.use(uiPlugin),
  };
}

export function exerciseDocumentListenerAcquisition(
  factory: Factory,
  mode:
    | "capture-mutation"
    | "late-disposal"
    | "setup-throw"
    | "late-throw"
    | "option-disposal"
    | "method-disposal",
) {
  const realm = createRealm(factory);
  const owner = realm.owner as Window & typeof globalThis;
  const host = required(kernelForDocument(owner.document)).documentHost;
  const target = owner.document.createElement("section");
  owner.document.body.append(target);
  const add = target.addEventListener;
  let deliveries = 0,
    rejected = false,
    entered = false,
    nativeAdded = false;
  try {
    if (["late-disposal", "setup-throw", "late-throw"].includes(mode)) {
      target.addEventListener = function (...args: Parameters<typeof add>) {
        entered = true;
        if (mode !== "setup-throw") realm.star.dispose();
        add.apply(this, args);
        nativeAdded = true;
        if (mode !== "late-disposal") throw new Error("Native listener setup failed.");
      };
    }
    if (mode === "method-disposal") {
      Object.defineProperty(target, "addEventListener", {
        configurable: true,
        get() {
          entered = true;
          realm.star.dispose();
          return function (this: HTMLElement, ...args: Parameters<typeof add>) {
            nativeAdded = true;
            add.apply(this, args);
          };
        },
      });
    }
    const options: AddEventListenerOptions =
      mode === "option-disposal"
        ? {
            get capture() {
              entered = true;
              realm.star.dispose();
              return true;
            },
          }
        : { capture: true };
    let release: (() => void) | undefined;
    try {
      release = host.listen(target, "probe", () => deliveries++, options);
    } catch {
      rejected = true;
    }
    if (mode === "capture-mutation") options.capture = false;
    release?.();
    target.dispatchEvent(new owner.Event("probe"));
    return { deliveries, rejected, entered, nativeAdded };
  } finally {
    realm.star.dispose();
    realm.frame.remove();
  }
}

export function exerciseDocumentListenerIdentity(
  factory: Factory,
  mode: "duplicate" | "once" | "abort" | "cleanup" | "nested-before" | "nested-after",
) {
  const realm = createRealm(factory);
  const owner = realm.owner as Window & typeof globalThis;
  const host = required(kernelForDocument(owner.document)).documentHost;
  const target = owner.document.createElement("section");
  owner.document.body.append(target);
  const add = target.addEventListener,
    remove = target.removeEventListener;
  const controller = new owner.AbortController();
  let deliveries = 0,
    receivers = true;
  let newer: () => void = () => undefined;
  const callback = function (this: EventTarget) {
    deliveries++;
    receivers &&= this === target;
  };
  try {
    if (mode.startsWith("nested")) {
      target.addEventListener = function (...args: Parameters<typeof add>) {
        target.addEventListener = add;
        if (mode === "nested-before") add.apply(this, args);
        newer = host.listen(target, "probe", callback, { once: false });
        if (mode === "nested-after") add.apply(this, args);
      };
    }
    const old = host.listen(target, "probe", callback, {
      once: mode === "once" || mode.startsWith("nested"),
      signal: controller.signal,
    });
    if (mode === "once") target.dispatchEvent(new owner.Event("probe"));
    if (mode === "abort") controller.abort();
    if (mode === "cleanup") {
      target.removeEventListener = function (...args: Parameters<typeof remove>) {
        target.removeEventListener = remove;
        newer = host.listen(target, "probe", callback);
        remove.apply(this, args);
      };
    } else if (!mode.startsWith("nested")) newer = host.listen(target, "probe", callback);
    const initial = deliveries;
    if (mode === "duplicate") target.dispatchEvent(new owner.Event("probe"));
    old();
    target.dispatchEvent(new owner.Event("probe"));
    target.dispatchEvent(new owner.Event("probe"));
    const beforeRelease = deliveries;
    newer();
    target.dispatchEvent(new owner.Event("probe"));
    return { initial, beforeRelease, deliveries, receivers };
  } finally {
    realm.star.dispose();
    realm.frame.remove();
  }
}

export function exerciseDocumentListenerOptions(factory: Factory) {
  const realm = createRealm(factory);
  const owner = realm.owner as Window & typeof globalThis;
  const host = required(kernelForDocument(owner.document)).documentHost;
  const element = owner.document.createElement("section");
  owner.document.body.append(element);
  const rows: Array<{ target: string; mode: number; native: boolean; owned: boolean }> = [];
  try {
    const choices = [
      undefined,
      false,
      true,
      {},
      { passive: false },
      { passive: true },
      Object.defineProperty({}, "passive", { value: undefined }) as AddEventListenerOptions,
    ];
    for (const [name, target] of Object.entries({
      window: owner,
      document: owner.document,
      body: owner.document.body,
      element,
    })) {
      for (const [mode, options] of choices.entries()) {
        const listener = (event: Event) => event.preventDefault();
        target.addEventListener("wheel", listener, options);
        const native = new owner.Event("wheel", { cancelable: true });
        target.dispatchEvent(native);
        target.removeEventListener("wheel", listener, typeof options === "boolean" && options);
        const release = host.listen(target, "wheel", listener, options);
        const owned = new owner.Event("wheel", { cancelable: true });
        target.dispatchEvent(owned);
        release();
        rows.push({
          target: name,
          mode,
          native: native.defaultPrevented,
          owned: owned.defaultPrevented,
        });
      }
    }
    const reads: string[] = [],
      receivers: boolean[] = [];
    const signal = new owner.AbortController().signal;
    const options = {
      get capture() {
        reads.push("capture");
        receivers.push(this === options);
        return true;
      },
      get once() {
        reads.push("once");
        receivers.push(this === options);
        return true;
      },
      get passive() {
        reads.push("passive");
        receivers.push(this === options);
        return false;
      },
      get signal() {
        reads.push("signal");
        receivers.push(this === options);
        return signal;
      },
    };
    let calls = 0;
    const release = host.listen(element, "probe", () => calls++, options);
    element.dispatchEvent(new owner.Event("probe"));
    element.dispatchEvent(new owner.Event("probe"));
    release();
    return { rows, reads, receivers, calls };
  } finally {
    realm.star.dispose();
    realm.frame.remove();
  }
}

export function exerciseDocumentListenerGetter(
  factory: Factory,
  key: "method" | "capture" | "once" | "passive" | "signal",
  previous: boolean,
) {
  const realm = createRealm(factory);
  const owner = realm.owner as Window & typeof globalThis;
  const host = required(kernelForDocument(owner.document)).documentHost;
  const target = owner.document.createElement("section");
  owner.document.body.append(target);
  const add = target.addEventListener;
  let entered = false,
    deliveries = 0;
  let newer: () => void = () => undefined;
  const callback = () => deliveries++;
  try {
    const first = previous ? host.listen(target, "probe", callback) : () => undefined;
    const reenter = () => {
      if (entered) return;
      entered = true;
      newer = host.listen(target, "probe", callback);
    };
    const options: AddEventListenerOptions = {};
    if (key === "method") {
      Object.defineProperty(target, "addEventListener", {
        get() {
          reenter();
          return add;
        },
      });
    } else {
      Object.defineProperty(options, key, {
        get() {
          reenter();
          return key === "signal" ? undefined : false;
        },
      });
    }
    const older = host.listen(target, "probe", callback, options);
    older();
    target.dispatchEvent(new owner.Event("probe"));
    const beforeRelease = deliveries;
    newer();
    first();
    target.dispatchEvent(new owner.Event("probe"));
    return { entered, beforeRelease, deliveries };
  } finally {
    realm.star.dispose();
    realm.frame.remove();
  }
}

export async function exerciseFirstScopeObserver(factory: Factory, throws: boolean) {
  const realm = createRealm(factory);
  const owner = realm.owner as Window & typeof globalThis;
  const kernel = required(kernelForDocument(owner.document));
  const prototype = owner.MutationObserver.prototype;
  const observe = prototype.observe;
  const disconnect = prototype.disconnect;
  let entered = false;
  const candidates = new WeakSet<MutationObserver>();
  let disconnects = 0;
  let deliveries = 0;
  let rejected = false;
  try {
    const root = owner.document.createElement("section");
    owner.document.body.append(root);
    prototype.disconnect = function () {
      if (candidates.has(this)) disconnects++;
      disconnect.call(this);
    };
    prototype.observe = function (...args) {
      if (!entered) {
        entered = true;
        candidates.add(this);
        realm.star.dispose();
        observe.apply(this, args);
        if (throws) throw new Error("late native observe failure");
      } else observe.apply(this, args);
    };
    try {
      kernel.documentHost.observe(root, () => deliveries++, { childList: true });
    } catch {
      rejected = true;
    }
    root.append(owner.document.createElement("i"));
    await new Promise<void>((resolve) => owner.setTimeout(resolve, 0));
    return { entered, rejected, deliveries, disconnects };
  } finally {
    prototype.observe = observe;
    prototype.disconnect = disconnect;
    realm.star.dispose();
    realm.frame.remove();
  }
}

export function exerciseFirstScopeController(
  factory: Factory,
  kind: "resizable" | "replacement" | "pagination" | "stepper",
) {
  const realm = createRealm(factory);
  const owner = realm.owner as Window & typeof globalThis;
  const kernel = required(kernelForDocument(owner.document));
  const prototype = owner.MutationObserver.prototype;
  const observe = prototype.observe;
  let entered = false;
  try {
    const root =
      kind === "pagination"
        ? navigationRoot(owner, "pagination")
        : kind === "stepper"
          ? disclosureStepRoot(owner, "stepper")
          : owner.document.createElement("section");
    if (kind === "resizable" || kind === "replacement") {
      root.dataset.jqs = "resizable";
      root.dataset.value = "[50,50]";
      root.innerHTML =
        '<div data-part="panel"></div><div data-part="handle"></div><div data-part="panel"></div>';
    }
    owner.document.body.append(root);
    prototype.observe = function (...args) {
      if (!entered) {
        entered = true;
        if (kind === "replacement")
          root.replaceChildren(...Array.from(root.children, (part) => part.cloneNode(true)));
        if (kind === "pagination") realm.ui.pagination.goTo(root, 2);
        else if (kind === "stepper") realm.ui.stepper.go(root, "b");
        else realm.ui.resizable.set(root, [70, 30]);
      }
      observe.apply(this, args);
    };
    realm.ui.enhance(root);
    const value =
      kind === "pagination"
        ? realm.ui.pagination.page(root)
        : kind === "stepper"
          ? root.dataset.value
          : realm.ui.resizable.value(root);
    if (kind === "pagination") required(root.querySelector<HTMLElement>('[data-page="1"]')).click();
    else if (kind === "stepper")
      required(root.querySelector<HTMLElement>('[data-part="previous"]')).click();
    else
      required(root.querySelector<HTMLElement>('[data-part="handle"]')).dispatchEvent(
        new owner.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
      );
    const nativeValue =
      kind === "pagination"
        ? realm.ui.pagination.page(root)
        : kind === "stepper"
          ? root.dataset.value
          : realm.ui.resizable.value(root);
    const observers = kernel
      .resourceSummary()
      .filter(({ owner }) => owner === "document:resource-removal").length;
    return { entered, value, nativeValue, observers };
  } finally {
    prototype.observe = observe;
    realm.star.dispose();
    realm.frame.remove();
  }
}

let finishNativeLayout: (() => void) | undefined;
export function beginNativeLayoutInteraction(factory: Factory, kind: "resizable" | "sortable") {
  finishNativeLayout?.();
  const source = createRealm(factory),
    destination = createRealm(factory);
  const app = source.owner.document.createElement("form");
  app.innerHTML =
    kind === "resizable"
      ? '<section data-jqs="resizable" data-value="[50,50]" style="display:grid;width:600px;height:120px"><div data-part="panel">First</div><div data-part="handle" aria-label="Resize panels" style="background:#888;touch-action:none"></div><div data-part="panel">Second</div></section>'
      : '<section data-jqs="sortable" data-name="order"><ol data-part="list"><li data-part="item" data-value="a" style="height:60px"><button data-part="handle" style="width:220px;height:40px">Move A</button></li><li data-part="item" data-value="b" style="height:60px"><button data-part="handle" style="width:220px;height:40px">Move B</button></li><li data-part="item" data-value="c" style="height:60px"><button data-part="handle" style="width:220px;height:40px">Move C</button></li></ol><p data-part="status"></p></section>';
  const root = required(app.querySelector<HTMLElement>("section"));
  source.owner.document.body.append(app);
  source.ui.enhance(root);
  destination.owner.document.body.append(destination.owner.document.adoptNode(app));
  destination.ui.enhance(root);
  source.star.dispose();
  source.frame.remove();
  destination.frame.id = "native-layout-frame";
  destination.frame.style.cssText =
    "position:fixed;inset:0;width:900px;height:350px;background:white;z-index:99999";
  const owner = destination.owner as Window & typeof globalThis;
  root.dataset.eventOwner = "true";
  for (const name of kind === "resizable"
    ? ["resize-start", "change", "resize-end"]
    : ["grab", "change", "drop"]) {
    root.addEventListener("jquery-star:" + kind + ":" + name, (event) => {
      if (!(event instanceof owner.CustomEvent)) root.dataset.eventOwner = "false";
      root.setAttribute("data-proof-" + name, "true");
    });
  }
  const handle = required(root.querySelector<HTMLElement>('[data-part="handle"]'));
  if (kind === "resizable")
    handle.addEventListener("pointerdown", (event) => {
      root.dataset.trusted = String(event.isTrusted);
      root.dataset.captured = String(handle.hasPointerCapture(event.pointerId));
      root.dataset.pointerId = String(event.pointerId);
    });
  else
    root.addEventListener("dragstart", (event) => {
      root.dataset.trusted = String(event.isTrusted);
      root.dataset.transfer = event.dataTransfer?.getData("text/plain") ?? "";
    });
  finishNativeLayout = () => {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  };
}
export function endNativeLayoutInteraction(): void {
  const release = finishNativeLayout;
  finishNativeLayout = undefined;
  release?.();
}

export async function exerciseLayoutOwnership(
  factory: Factory,
  kind: "resizable" | "sortable",
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory),
    destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("form");
    app.innerHTML =
      kind === "resizable"
        ? '<section id="realm-layout" data-jqs="resizable" data-value="[50,50]"><div data-part="panel" data-min="20" data-max="80"></div><div data-part="handle" aria-label="Resize panels"></div><div data-part="panel"></div></section>'
        : '<section id="realm-layout" data-jqs="sortable" data-name="order"><ol data-part="list"><li data-part="item" data-value="a"><button data-part="handle">Move A</button><button data-part="down">Down</button></li><li data-part="item" data-value="#b"><button data-part="handle">Move B</button><button data-part="down">Down</button></li><li data-part="item" data-value="c"><button data-part="handle">Move C</button><button data-part="down">Down</button></li></ol><p data-part="status"></p></section>';
    const root = required(app.querySelector<HTMLElement>("section"));
    source.owner.document.body.append(app);
    const original = required(root.querySelector<HTMLElement>('[data-part="handle"]'));
    let active = source,
      rejectedPreviousOwner = true;
    if (mode === "adopted" || mode === "disposed-first" || mode === "facade") {
      if (kind === "resizable") source.ui.resizable.set(root, [25, 75]);
      else source.ui.sortable.move(root, "c", 0);
      if (mode === "disposed-first") source.star.dispose();
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui[kind].value(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Owner rejection. */
      }
      if (mode === "facade") active.ui[kind].value(root);
      else active.ui.enhance(root);
      source.star.dispose();
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else active.ui.enhance(root);
    const owner = active.owner as Window & typeof globalThis;
    const value = () => JSON.stringify(active.ui[kind].value(root));
    const baseline = kind === "resizable" ? "[50,50]" : '["a","#b","c"]';
    const changed = kind === "resizable" ? "[25,75]" : '["#b","a","c"]';
    const enhancedBeforeFacade =
      kind === "resizable"
        ? original.getAttribute("role") === "separator"
        : root.dataset.state === "idle" && app.querySelectorAll('input[name="order"]').length === 3;
    const retained =
      root.contains(original) &&
      value() ===
        (active === source ? baseline : kind === "resizable" ? "[25,75]" : '["c","a","#b"]');
    const reset = () => {
      root.dataset.value = baseline;
      active.ui.enhance(root);
    };
    reset();
    const events: boolean[] = [];
    root.addEventListener("jquery-star:" + kind + ":change", (event) =>
      events.push(event instanceof owner.CustomEvent),
    );
    const instance = required(active.jquery(root).star().star("instance"));
    const action = kind === "resizable" ? "ui.resizable.set" : "ui.sortable.move";
    const args = kind === "resizable" ? [[25, 75]] : ["a", 1];
    const change = async () => {
      if (mode === "action") await instance.run(action, { args: ["#realm-layout", ...args] });
      else if (kind === "resizable") active.ui.resizable.set(root, [25, 75]);
      else active.ui.sortable.move(root, "a", 1);
    };
    const key = (target: HTMLElement, key: string) =>
      target.dispatchEvent(
        new owner.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );
    original.addEventListener("keydown", (event) => event.preventDefault(), {
      once: true,
      capture: true,
    });
    key(original, kind === "resizable" ? "ArrowRight" : " ");
    const canceledKey = value() === baseline && root.dataset.state !== "sorting";
    const canceled = new owner.MouseEvent("click", { cancelable: true });
    canceled.preventDefault();
    await instance.run(action, { args, event: canceled });
    const jqCanceled = active.jquery.Event("click");
    jqCanceled.preventDefault();
    await instance.run(action, { args, event: jqCanceled });
    const canceledAction = value() === baseline;
    root.setAttribute("inert", "");
    key(original, kind === "resizable" ? "ArrowRight" : " ");
    await instance.run(action, { args });
    const constrained = value() === baseline && root.dataset.state !== "sorting";
    root.removeAttribute("inert");
    await change();
    const programmatic = value() === changed;
    reset();
    let nativeControl = false,
      preview = true,
      persisted = true;
    if (kind === "resizable") {
      key(original, "ArrowRight");
      nativeControl = value() === "[55,45]";
      key(original, "End");
      nativeControl &&= value() === "[80,20]";
      key(original, "Enter");
      nativeControl &&= value() === "[20,80]";
      key(original, "Enter");
      nativeControl &&= value() === "[80,20]";
      root.dataset.storageKey = "owner-layout";
      active.ui.resizable.set(root, [35, 65]);
      persisted = owner.localStorage.getItem("jquery-star:resizable:owner-layout") === "[35,65]";
      owner.localStorage.removeItem("jquery-star:resizable:owner-layout");
      delete root.dataset.storageKey;
    } else {
      key(original, " ");
      key(original, "End");
      preview =
        value() === '["#b","c","a"]' &&
        JSON.stringify(new owner.FormData(app).getAll("order")) === baseline;
      active.ui.enhance(root);
      preview &&= root.dataset.state === "sorting";
      key(original, "Escape");
      preview &&= value() === baseline;
      await instance.run("ui.sortable.up", { args: ["#b"] });
      nativeControl = value() === '["#b","a","c"]';
      persisted = JSON.stringify(new owner.FormData(app).getAll("order")) === value();
    }
    reset();
    const newer = kind === "resizable" ? "[70,30]" : '["c","a","#b"]';
    root.addEventListener(
      "jquery-star:" + kind + ":before-change",
      () => {
        if (kind === "resizable") active.ui.resizable.set(root, [70, 30]);
        else active.ui.sortable.move(root, "c", 0);
      },
      { once: true },
    );
    await change();
    const newerRequest = value() === newer;
    reset();
    root.addEventListener(
      "jquery-star:" + kind + ":before-change",
      () => {
        root.dataset.value = newer;
      },
      { once: true },
    );
    await change();
    const patchedState = root.dataset.value === newer && value() === newer;
    reset();
    const part =
      kind === "resizable"
        ? original
        : required(root.querySelector<HTMLElement>('[data-part="list"]'));
    const replacement = part.cloneNode(true) as HTMLElement;
    part.replaceWith(replacement);
    await change();
    const currentParts = value() === changed;
    key(original, kind === "resizable" ? "ArrowRight" : " ");
    const retiredPart = value() === changed && root.dataset.state !== "sorting";
    const target =
      kind === "resizable"
        ? replacement
        : required(root.querySelector<HTMLElement>('[data-part="list"]'));
    const nativeAdd = target.addEventListener,
      nativeRemove = target.removeEventListener;
    let bindings = 0;
    target.addEventListener = function (...args: Parameters<typeof nativeAdd>) {
      ++bindings;
      nativeAdd.apply(this, args);
    };
    target.removeEventListener = function (...args: Parameters<typeof nativeRemove>) {
      ++bindings;
      nativeRemove.apply(this, args);
    };
    active.ui.enhance(root);
    active.ui.enhance(root);
    const stable = bindings === 0;
    target.addEventListener = nativeAdd;
    target.removeEventListener = nativeRemove;
    const preserve = createRenderAdapter(active.installed).begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    await preserve.commit();
    reset();
    const currentHandle = required(root.querySelector<HTMLElement>('[data-part="handle"]'));
    key(currentHandle, kind === "resizable" ? "ArrowRight" : " ");
    const preserved =
      kind === "resizable" ? value() === "[55,45]" : root.dataset.state === "sorting";
    if (kind === "sortable") key(currentHandle, "Escape");
    const removal = createRenderAdapter(active.installed).begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      active.ui[kind].value(root);
    } catch {
      rejectedRemovedRoot = true;
    }
    const frozen = root.outerHTML;
    key(currentHandle, kind === "resizable" ? "ArrowRight" : " ");
    const retired = root.outerHTML === frozen;
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      retained,
      rejectedPreviousOwner,
      canceledKey,
      canceledAction,
      constrained,
      programmatic,
      nativeControl,
      preview,
      persisted,
      newerRequest,
      patchedState,
      currentParts,
      retiredPart,
      stable,
      preserved,
      rejectedRemovedRoot,
      retired,
      ownerEvents: events.length > 0 && events.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseExternalFloatingToggles(factory: Factory) {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow as Window & typeof globalThis;
  const star = installStarCore(factory(owner), { document: owner.document }).star;
  const ui = star.use(uiPlugin);
  const waitToggle = (content: HTMLElement): Promise<boolean> =>
    new Promise((resolve) => {
      const onToggle = (): void => {
        owner.clearTimeout(timer);
        resolve(true);
      };
      const timer = owner.setTimeout(() => {
        content.removeEventListener("toggle", onToggle);
        resolve(false);
      }, 1000);
      content.addEventListener("toggle", onToggle, { once: true });
    });
  try {
    const result: Record<string, boolean> = {};
    for (const kind of ["popover", "hoverCard"] as const) {
      const name = kind === "hoverCard" ? "hover-card" : kind;
      const root = owner.document.createElement("div");
      root.dataset.jqs = name;
      root.innerHTML =
        '<button data-part="trigger">Open</button><div data-part="content"><button>Inside</button></div>';
      owner.document.body.append(root);
      const trigger = required(root.querySelector<HTMLElement>('[data-part="trigger"]'));
      const content = required(root.querySelector<HTMLElement>('[data-part="content"]'));
      const events: string[] = [];
      for (const event of ["open", "close"])
        root.addEventListener(`jquery-star:${name}:${event}`, () => events.push(event));
      ui.enhance(root);

      const firstToggle = waitToggle(content);
      ui[kind].open(root);
      const firstDelivered = await firstToggle;
      result[`${name}Initial`] =
        firstDelivered &&
        content.matches(":popover-open") &&
        root.dataset.state === "open" &&
        trigger.getAttribute("aria-expanded") === "true";

      const hideToggle = waitToggle(content);
      content.hidePopover();
      const hideDelivered = await hideToggle;
      result[`${name}ExternalHide`] =
        hideDelivered &&
        !content.matches(":popover-open") &&
        root.dataset.state === "closed" &&
        content.dataset.state === "closed" &&
        trigger.getAttribute("aria-expanded") === "false";

      const showToggle = waitToggle(content);
      content.showPopover();
      const showDelivered = await showToggle;
      result[`${name}ExternalShow`] =
        showDelivered &&
        content.matches(":popover-open") &&
        root.dataset.state === "open" &&
        content.dataset.state === "open" &&
        trigger.getAttribute("aria-expanded") === "true" &&
        events.join(",") === "open";

      const outsideToggle = waitToggle(content);
      owner.document.body.dispatchEvent(new owner.Event("pointerdown", { bubbles: true }));
      const outsideDelivered = await outsideToggle;
      result[`${name}Outside`] =
        outsideDelivered &&
        !content.matches(":popover-open") &&
        root.dataset.state === "closed" &&
        events.join(",") === "open,close";
    }
    return result;
  } finally {
    star.dispose();
    frame.remove();
  }
}

export async function exerciseFeedOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory),
    destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<button id="before-feed">Before</button><section id="realm-feed" data-jqs="feed" data-cursor="one" aria-label="Results"><div data-part="content"><article data-jqs="item" data-part="item"><h2 data-part="title">First</h2><p data-part="description">First result</p></article><article data-jqs="item" data-part="item"><h2 data-part="title">Second</h2></article></div><button data-part="more">More</button><div data-part="sentinel"></div><p data-part="status">Ready</p></section><button id="after-feed">After</button>';
    source.owner.document.body.append(app);
    const root = required(app.querySelector<HTMLElement>("section"));
    const content = required(root.querySelector<HTMLElement>('[data-part="content"]'));
    const first = required(content.querySelector<HTMLElement>("article"));
    const originalMore = required(root.querySelector<HTMLButtonElement>('[data-part="more"]'));
    originalMore.setAttribute("data-on:click", "@appendRealmItems");
    let active = source,
      rejectedPreviousOwner = true;
    if (mode === "adopted" || mode === "disposed-first" || mode === "facade") {
      source.ui.feed.complete(root, { cursor: "retained" });
      if (mode === "disposed-first") source.star.dispose();
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.feed.state(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected owner rejection. */
      }
      if (mode === "facade") active.ui.feed.state(root);
      else active.ui.enhance(root);
      source.star.dispose();
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else active.ui.enhance(root);
    const enhancedBeforeFacade =
      root.dataset.state === "idle" && content.getAttribute("role") === "feed";
    const retained =
      root.querySelector("button") === originalMore &&
      content.firstElementChild === first &&
      active.ui.feed.state(root).cursor === (active === source ? "one" : "retained");
    const owner = active.owner as Window & typeof globalThis,
      api = active.ui.feed;
    const events: boolean[] = [];
    for (const name of ["before-load", "load", "complete", "error", "reset"])
      root.addEventListener(`jquery-star:feed:${name}`, (event) =>
        events.push(event instanceof owner.CustomEvent),
      );
    let authoredLoads = 0,
      automatic = false;
    let completeAutomatic: (() => void) | undefined;
    active.star.action("appendRealmItems", () => {
      ++authoredLoads;
      const item = owner.document.createElement("article");
      item.dataset.jqs = "item";
      item.dataset.part = "item";
      item.innerHTML = `<h2 data-part="title">Result ${authoredLoads + 2}</h2>`;
      content.append(item);
      api.complete(root, { cursor: String(authoredLoads + 1), added: 1, done: automatic });
      if (automatic) completeAutomatic?.();
    });
    const instance = required(
      active
        .jquery(mode === "action" ? root : app)
        .star()
        .star("instance"),
    );
    await active.star.whenEnhanced();
    originalMore.addEventListener("click", (event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
    originalMore.click();
    await active.star.whenEnhanced();
    const canceledClick = authoredLoads === 0 && !api.state(root).loading;
    first.focus();
    first.addEventListener("keydown", (event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
    first.dispatchEvent(
      new owner.KeyboardEvent("keydown", { key: "PageDown", bubbles: true, cancelable: true }),
    );
    const canceledKey = owner.document.activeElement === first;
    const canceled = new owner.MouseEvent("click", { cancelable: true });
    canceled.preventDefault();
    const cursorBefore = api.state(root).cursor;
    await instance.run("ui.feed.complete", {
      args: ["#realm-feed", { cursor: "canceled", done: true }],
      event: canceled,
    });
    const canceledAction = api.state(root).cursor === cursorBefore && !api.state(root).done;
    root.setAttribute("inert", "");
    originalMore.click();
    await instance.run("ui.feed.load", { args: [root] });
    const constrained = authoredLoads === 0 && !api.state(root).loading;
    api.complete(root, { cursor: "programmatic" });
    const programmatic = api.state(root).cursor === "programmatic";
    root.removeAttribute("inert");
    api.reset(root, { cursor: "one" });
    const keyboard = (target: HTMLElement, key: string, ctrlKey = false): void => {
      target.dispatchEvent(
        new owner.KeyboardEvent("keydown", { key, ctrlKey, bubbles: true, cancelable: true }),
      );
    };
    keyboard(first, "PageDown");
    const second = required(content.querySelectorAll<HTMLElement>("article")[1]);
    const forward = owner.document.activeElement === second;
    keyboard(second, "PageUp");
    const backward = owner.document.activeElement === first;
    keyboard(first, "End", true);
    const end = owner.document.activeElement === app.querySelector("#after-feed");
    keyboard(first, "Home", true);
    const boundaryKeys = end && owner.document.activeElement === app.querySelector("#before-feed");
    if (mode === "action") await instance.run("ui.feed.load", { args: ["#realm-feed"] });
    else api.load(root);
    await active.star.whenEnhanced();
    const authoredLoad =
      authoredLoads === 1 && content.children.length === 3 && api.state(root).cursor === "2";
    keyboard(required(content.lastElementChild) as HTMLElement, "PageDown");
    await active.star.whenEnhanced();
    const pendingFocus =
      authoredLoads === 2 &&
      content.children.length === 4 &&
      owner.document.activeElement === content.lastElementChild;
    const title = required(first.querySelector<HTMLElement>('[data-part="title"]'));
    const replacementTitle = owner.document.createElement("h2");
    replacementTitle.dataset.part = "title";
    replacementTitle.id = "current-feed-title";
    replacementTitle.textContent = "Updated first result";
    title.replaceWith(replacementTitle);
    second.setAttribute("aria-label", "Authored second article");
    active.ui.enhance(root);
    const labels =
      first.getAttribute("aria-labelledby") === replacementTitle.id &&
      first.getAttribute("aria-describedby") ===
        first.querySelector('[data-part="description"]')?.id &&
      second.getAttribute("aria-label") === "Authored second article" &&
      !second.hasAttribute("aria-labelledby");
    const retainedArticle = required(content.lastElementChild);
    const retainedArticleId = retainedArticle.id;
    second.remove();
    const appendedArticle = owner.document.createElement("article");
    appendedArticle.dataset.part = "item";
    appendedArticle.innerHTML = '<h2 data-part="title">Appended after removal</h2>';
    content.append(appendedArticle);
    api.complete(root, { added: 1 });
    const articleIds = Array.from(root.querySelectorAll("[id]"), (element) => element.id);
    const articleIdentity =
      retainedArticle.id === retainedArticleId &&
      new Set(articleIds).size === articleIds.length &&
      owner.document.getElementById(required(appendedArticle.getAttribute("aria-labelledby"))) ===
        appendedArticle.querySelector("h2");
    api.fail(root, "Try again");
    active.ui.enhance(root);
    const errorState =
      root.dataset.state === "error" &&
      root.querySelector('[data-part="status"]')?.textContent === "Try again";
    api.reset(root, { cursor: "reset", message: "Ready again" });
    const resetState = root.dataset.state === "idle" && api.state(root).cursor === "reset";
    root.dataset.cursor = "patched";
    root.dataset.done = "true";
    const patchedState =
      api.state(root).cursor === "patched" && api.state(root).done && originalMore.hidden;
    api.reset(root);
    const beforeReplacement = authoredLoads;
    const replacement = originalMore.cloneNode(true) as HTMLButtonElement;
    root.addEventListener(
      "jquery-star:feed:before-load",
      () => originalMore.replaceWith(replacement),
      { once: true },
    );
    api.load(root);
    await active.star.whenEnhanced();
    originalMore.click();
    const currentParts =
      authoredLoads === beforeReplacement &&
      root.querySelector('[data-part="more"]') === replacement;
    const beforeNewer = authoredLoads;
    root.addEventListener(
      "jquery-star:feed:before-load",
      () => api.reset(root, { cursor: "newer" }),
      { once: true },
    );
    api.load(root);
    const newerRequest =
      authoredLoads === beforeNewer &&
      api.state(root).cursor === "newer" &&
      !api.state(root).loading;
    api.complete(root, {
      get cursor() {
        api.reset(root, { cursor: "getter" });
        return "older";
      },
    });
    const getterOrdering = api.state(root).cursor === "getter";
    const before = root.outerHTML;
    active.ui.enhance(root);
    active.ui.enhance(root);
    const stable = root.outerHTML === before;
    let nativeObservers = 0;
    const deliveredEntries: IntersectionObserverEntry[] = [];
    const NativeObserver = owner.IntersectionObserver;
    class TrackingObserver extends NativeObserver {
      constructor(callback: IntersectionObserverCallback) {
        super((entries, observer) => {
          deliveredEntries.push(...entries);
          callback(entries, observer);
        });
        ++nativeObservers;
      }
    }
    Object.defineProperty(owner, "IntersectionObserver", {
      configurable: true,
      value: TrackingObserver,
    });
    active.frame.style.cssText =
      "position:fixed;top:0;left:0;width:400px;height:300px;z-index:10000";
    required(root.querySelector<HTMLElement>('[data-part="sentinel"]')).style.cssText =
      "position:fixed;bottom:0;left:0;width:10px;height:10px";
    automatic = true;
    const automaticCompletion = new Promise<void>((resolve) => {
      completeAutomatic = resolve;
    });
    root.dataset.auto = "";
    active.ui.enhance(root);
    active.ui.enhance(root);
    const observerStable = nativeObservers === 1;
    await automaticCompletion;
    // Native delivery uses the callback realm in Chromium and the observer realm in Firefox/WebKit.
    const nativeObserver =
      observerStable &&
      deliveredEntries.length > 0 &&
      deliveredEntries.some((entry) => entry.isIntersecting) &&
      deliveredEntries.every(
        (entry) =>
          [owner.IntersectionObserverEntry, IntersectionObserverEntry].some(
            (Entry) => entry instanceof Entry,
          ) && entry.target === root.querySelector('[data-part="sentinel"]'),
      ) &&
      api.state(root).done;
    root.removeAttribute("data-auto");
    automatic = false;
    api.reset(root);
    const preserve = createRenderAdapter(active.installed).begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    await preserve.commit();
    const priorLoads = authoredLoads;
    replacement.click();
    await active.star.whenEnhanced();
    const preserved = authoredLoads === priorLoads + 1 && !api.state(root).loading;
    const removal = createRenderAdapter(active.installed).begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      api.state(root);
    } catch {
      rejectedRemovedRoot = true;
    }
    const frozen = root.outerHTML;
    replacement.click();
    keyboard(first, "PageDown");
    const retired = root.outerHTML === frozen;
    root.remove();
    await removal.commit();
    return {
      retained,
      enhancedBeforeFacade,
      rejectedPreviousOwner,
      canceledClick,
      canceledKey,
      canceledAction,
      constrained,
      programmatic,
      forward,
      backward,
      boundaryKeys,
      authoredLoad,
      pendingFocus,
      labels,
      articleIdentity,
      errorState,
      resetState,
      patchedState,
      currentParts,
      newerRequest,
      getterOrdering,
      stable,
      nativeObserver,
      preserved,
      rejectedRemovedRoot,
      retired,
      ownerEvents: events.length > 0 && events.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseToastOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory),
    destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<button id="outside">Outside</button><div data-jqs="toast-viewport"><div id="realm-toast" data-jqs="toast" data-duration="0"><p data-part="title">Saved</p><p data-part="description">Current version</p><button data-part="close">Close</button><button data-part="action" data-alt-text="Open history">Undo</button></div></div>';
    source.owner.document.body.append(app);
    const root = required(app.querySelector<HTMLElement>('[data-jqs="toast"]'));
    const viewport = required(app.querySelector<HTMLElement>('[data-jqs="toast-viewport"]'));
    const originalClose = required(root.querySelector<HTMLButtonElement>('[data-part="close"]'));
    let active = source,
      rejectedPreviousOwner = true;
    if (mode === "adopted" || mode === "disposed-first" || mode === "facade") {
      source.ui.enhance(root);
      if (mode === "disposed-first") source.star.dispose();
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.toast.dismiss(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected owner rejection. */
      }
      if (mode === "facade") {
        root.addEventListener(
          "jquery-star:toast:before-dismiss",
          (event) => event.preventDefault(),
          { once: true },
        );
        active.ui.toast.dismiss(root);
      } else active.ui.enhance(root);
      source.star.dispose();
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else active.ui.enhance(root);
    const retained = root.querySelector('[data-part="close"]') === originalClose;
    const enhancedBeforeFacade =
      root.dataset.state === "open" && root.getAttribute("role") === "group";
    const owner = active.owner as Window & typeof globalThis;
    const events: boolean[] = [];
    for (const name of ["before-dismiss", "dismiss"])
      root.addEventListener(`jquery-star:toast:${name}`, (event) =>
        events.push(event instanceof owner.CustomEvent),
      );
    const api = active.ui.toast;
    const instance =
      mode === "action" ? required(active.jquery(root).star().star("instance")) : undefined;
    const dismiss = async (): Promise<void> => {
      if (instance) await instance.run("ui.toast.dismiss", { args: ["#realm-toast"] });
      else api.dismiss(root);
    };
    originalClose.addEventListener("click", (event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
    originalClose.click();
    const canceledClose = root.isConnected && root.dataset.state === "open";
    root.addEventListener("keydown", (event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
    originalClose.dispatchEvent(
      new owner.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    const canceledEscape = root.isConnected;
    const outside = required(app.querySelector<HTMLButtonElement>("#outside"));
    outside.focus();
    owner.document.addEventListener("keydown", (event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
    outside.dispatchEvent(
      new owner.KeyboardEvent("keydown", { key: "F8", bubbles: true, cancelable: true }),
    );
    const canceledF8 = owner.document.activeElement === outside;
    outside.dispatchEvent(
      new owner.KeyboardEvent("keydown", { key: "F8", bubbles: true, cancelable: true }),
    );
    const hotkey = owner.document.activeElement === viewport;
    root.setAttribute("inert", "");
    originalClose.click();
    if (instance) await instance.run("ui.toast.dismiss", { args: [root] });
    const constrained = root.isConnected;
    root.removeAttribute("inert");
    const nested = owner.document.createElement("div");
    nested.dataset.jqs = "custom";
    nested.innerHTML = '<button data-part="action">Nested</button>';
    root.append(nested);
    active.ui.enhance(root);
    required(nested.querySelector("button")).click();
    const nestedIgnored = root.isConnected;
    const replacement = originalClose.cloneNode(true) as HTMLButtonElement;
    root.addEventListener(
      "jquery-star:toast:before-dismiss",
      () => originalClose.replaceWith(replacement),
      { once: true },
    );
    await dismiss();
    originalClose.click();
    const currentParts =
      root.isConnected && root.querySelector('[data-part="close"]') === replacement;
    active.ui.enhance(root);
    const announcement = required(viewport.querySelector('[data-part="announcer"]'));
    const before = root.outerHTML;
    active.ui.enhance(root);
    active.ui.enhance(root);
    const stable =
      root.outerHTML === before &&
      viewport.querySelector('[data-part="announcer"]') === announcement;
    const text = api.show({
      description: "<strong>Plain text</strong>",
      duration: false,
      viewport,
    });
    const safeText =
      !text.querySelector("strong") && text.textContent.includes("<strong>Plain text</strong>");
    let dismissals = 0;
    text.addEventListener("jquery-star:toast:dismiss", () => (dismissals += 1));
    text.addEventListener("jquery-star:toast:before-dismiss", () => api.dismiss(text), {
      once: true,
    });
    api.dismiss(text);
    const newerRequest = !text.isConnected && dismissals === 1;
    const preserve = createRenderAdapter(active.installed).begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    await preserve.commit();
    replacement.focus();
    const preserved = root.dataset.state === "open" && owner.document.activeElement === replacement;
    await dismiss();
    const operated = !root.isConnected && root.dataset.state === "closed";
    const recoveryFocus = owner.document.activeElement === viewport;
    const separateAnnouncement = announcement.isConnected;
    const outgoing = api.show({ description: "Outgoing", duration: false, viewport });
    const close = required(outgoing.querySelector<HTMLButtonElement>('[data-part="close"]'));
    const removal = createRenderAdapter(active.installed).begin(app);
    removal.beforeRemove(outgoing);
    let rejectedRemovedRoot = false;
    try {
      api.dismiss(outgoing);
    } catch {
      rejectedRemovedRoot = true;
    }
    const retiredBefore = outgoing.outerHTML;
    close.click();
    const retired = outgoing.outerHTML === retiredBefore;
    outgoing.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      retained,
      rejectedPreviousOwner,
      canceledClose,
      canceledEscape,
      canceledF8,
      hotkey,
      constrained,
      nestedIgnored,
      currentParts,
      stable,
      safeText,
      newerRequest,
      preserved,
      operated,
      recoveryFocus,
      separateAnnouncement,
      rejectedRemovedRoot,
      retired,
      ownerEvents: events.length > 0 && events.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseQuestionnaireOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory),
    destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<form><section id="realm-questionnaire" data-jqs="questionnaire" data-value="first"><fieldset data-part="item" data-name="one" data-value="first" data-required><legend>Direction</legend><label data-part="choice" data-shortcut="a"><input type="radio" data-part="control" name="one" value="alpha" checked>Alpha</label><label data-part="choice" data-shortcut="b"><input type="radio" data-part="control" name="one" value="beta">Beta</label><input data-part="freeform"><p data-part="description">Choose a direction</p><p data-part="error"></p></fieldset><fieldset data-part="item" data-name="two" data-value="second" data-multiple data-required data-min="1" data-max="2" data-skippable><legend>Constraints</legend><input type="checkbox" data-part="control" name="two" value="accessible"><input type="checkbox" data-part="control" name="two" value="portable"><p data-part="error"></p></fieldset><fieldset data-part="item" data-name="three" data-value="third"><legend>Delivery</legend><input data-part="freeform"><p data-part="error"></p></fieldset><button data-part="previous">Previous</button><button data-part="next">Next</button><button data-part="skip">Skip</button><button data-part="reset">Reset</button><button data-part="submit">Submit</button><progress data-part="progress"></progress><p data-part="status"></p></section></form>';
    source.owner.document.body.append(app);
    const form = required(app.querySelector("form")),
      root = required(app.querySelector<HTMLElement>("section"));
    let preventNextSubmit = false;
    form.addEventListener(
      "submit",
      (event) => {
        if (preventNextSubmit) event.preventDefault();
      },
      true,
    );
    const alpha = required(root.querySelector<HTMLInputElement>('[value="alpha"]')),
      beta = required(root.querySelector<HTMLInputElement>('[value="beta"]'));
    let active = source,
      retained = true,
      rejectedPreviousOwner = true;
    const adopted = mode === "adopted" || mode === "disposed-first" || mode === "facade";
    if (adopted) {
      source.ui.questionnaire.answer(root, "one", "beta");
      source.ui.questionnaire.go(root, "second");
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.questionnaire.value(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected owner rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") active.ui.questionnaire.value(root);
      else active.ui.enhance(root);
      source.star.dispose();
      retained = beta.checked && root.dataset.value === "second";
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else active.ui.enhance(root);
    const enhancedBeforeFacade = root.dataset.state === "active";
    const constructors = active.owner as Window & typeof globalThis;
    const events: boolean[] = [],
      nativeEvents: boolean[] = [];
    for (const name of ["change", "answer-change", "skip", "reset", "submit"])
      root.addEventListener(`jquery-star:questionnaire:${name}`, (event) =>
        events.push(event instanceof constructors.CustomEvent),
      );
    alpha.addEventListener("input", (event) =>
      nativeEvents.push(event instanceof constructors.Event),
    );
    beta.addEventListener("input", (event) =>
      nativeEvents.push(event instanceof constructors.Event),
    );
    const api = active.ui.questionnaire;
    if (mode === "action") {
      const instance = required(active.jquery(root).star().star("instance"));
      await instance.run("ui.questionnaire.answer", {
        args: ["#realm-questionnaire", "one", "beta"],
      });
      await instance.run("ui.questionnaire.go", { args: ["#realm-questionnaire", "second"] });
    } else {
      api.answer(root, "one", "beta");
      api.go(root, "second");
    }
    const operated = beta.checked && root.dataset.value === "second";
    let invalid = 0;
    root.addEventListener("jquery-star:questionnaire:invalid", () => {
      invalid += 1;
    });
    api.next(root);
    const requiredValidation = invalid === 1 && root.dataset.value === "second";
    const next = required(root.querySelector<HTMLButtonElement>('[data-part="next"]')),
      skip = required(root.querySelector<HTMLButtonElement>('[data-part="skip"]'));
    skip.click();
    const skippedValue =
      root.dataset.value === "third" && new constructors.FormData(form).get("two") === "__skipped";
    api.answer(root, "two", ["accessible", "portable"]);
    api.answer(root, "three", "Native delivery");
    const choices = new constructors.FormData(form).getAll("two");
    const nativeSubmission =
      choices.length === 2 &&
      choices[0] === "accessible" &&
      choices[1] === "portable" &&
      new constructors.FormData(form).get("three") === "Native delivery";
    const collision = active.owner.document.createElement("input");
    collision.name = "requestSubmit";
    form.append(collision);
    const shadowed = (form as unknown as Record<string, unknown>).requestSubmit === collision;
    const prevent = (event: Event): void => event.preventDefault();
    form.addEventListener("submit", prevent);
    api.submit(root);
    const submitted = shadowed && root.dataset.state === "submitted";
    api.go(root, "first");
    preventNextSubmit = true;
    api.submit(root);
    preventNextSubmit = false;
    const canceledSubmit = root.dataset.state === "active";
    root.addEventListener(
      "jquery-star:questionnaire:before-change",
      (event) => {
        event.preventDefault();
      },
      { once: true },
    );
    next.click();
    const canceledNavigation = root.dataset.value === "first";
    const key = new constructors.KeyboardEvent("keydown", {
      key: "a",
      bubbles: true,
      cancelable: true,
    });
    key.preventDefault();
    root.dispatchEvent(key);
    const canceledShortcut = beta.checked;
    root.dispatchEvent(
      new constructors.KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true }),
    );
    const keyboard = alpha.checked;
    root.setAttribute("inert", "");
    next.dispatchEvent(new constructors.MouseEvent("click", { bubbles: true, cancelable: true }));
    const constraints = root.dataset.value === "first";
    root.removeAttribute("inert");
    api.answer(root, "one", "beta");
    api.go(root, "third");
    form.addEventListener("reset", prevent, { once: true });
    form.reset();
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const canceledReset = beta.checked && root.dataset.value === "third";
    form.reset();
    api.answer(root, "one", "beta");
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const newerReset = beta.checked;
    form.reset();
    active.ui.enhance(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const acceptedReset = alpha.checked && root.dataset.value === "first";
    const old = required(root.querySelector<HTMLFieldSetElement>('[data-value="second"]'));
    const replacement = old.cloneNode(true) as HTMLFieldSetElement;
    old.replaceWith(replacement);
    api.answer(root, "two", "portable");
    const currentParts =
      required(replacement.querySelector<HTMLInputElement>('[value="portable"]')).checked &&
      !required(old.querySelector<HTMLInputElement>('[value="portable"]')).checked;
    root.addEventListener(
      "jquery-star:questionnaire:before-change",
      () => {
        api.go(root, "third");
      },
      { once: true },
    );
    api.next(root);
    const newerRequest = root.dataset.value === "third";
    api.go(root, "first");
    const first = required(root.querySelector<HTMLFieldSetElement>("fieldset"));
    const firstBefore = first;
    active.ui.enhance(root);
    active.ui.enhance(root);
    const stable = firstBefore === root.querySelector("fieldset");
    const preserve = createRenderAdapter(active.installed).begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    form.append(root);
    await preserve.commit();
    next.click();
    const preserved = root.dataset.value === "second";
    const removal = createRenderAdapter(active.installed).begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      api.next(root);
    } catch {
      rejectedRemovedRoot = true;
    }
    const prior = root.outerHTML;
    next.click();
    const retired = root.outerHTML === prior;
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      retained,
      rejectedPreviousOwner,
      operated,
      requiredValidation,
      skippedValue,
      nativeSubmission,
      submitted,
      canceledSubmit,
      canceledNavigation,
      canceledShortcut,
      keyboard,
      constraints,
      canceledReset,
      newerReset,
      acceptedReset,
      currentParts,
      newerRequest,
      stable,
      preserved,
      rejectedRemovedRoot,
      retired,
      ownerEvents: events.length > 0 && events.every(Boolean),
      nativeEvents: nativeEvents.length > 0 && nativeEvents.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseFormOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<form id="realm-form" data-jqs="form"><div data-jqs="field"><input name="first" required aria-describedby="authored"><p data-part="message" hidden></p></div><input name="second"><button type="submit">Save</button><p data-part="server-message" hidden></p></form><div data-jqs="field"><input name="external" form="realm-form" required><p data-part="message" hidden></p></div>';
    source.owner.document.body.append(app);
    const form = required(app.querySelector("form"));
    let first = required(form.querySelector<HTMLInputElement>('[name="first"]'));
    const external = required(app.querySelector<HTMLInputElement>('[name="external"]'));
    let active = source;
    let retained = true;
    let rejectedPreviousOwner = true;
    if (mode === "adopted" || mode === "disposed-first" || mode === "facade") {
      source.ui.form.setErrors(form, { first: "Retained" }, { focus: false });
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.form.valid(form);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected owner rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") active.ui.form.valid(form);
      else active.ui.enhance(form);
      source.star.dispose();
      retained = first.validationMessage === "Retained";
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else active.ui.enhance(form);
    const constructors = active.owner as Window & typeof globalThis;
    const event = (type: string): Event =>
      new constructors.Event(type, { bubbles: type !== "invalid", cancelable: true });
    first.dispatchEvent(event("invalid"));
    const enhancedBeforeFacade = first.getAttribute("aria-invalid") === "true";
    const events: boolean[] = [];
    for (const name of ["invalid", "server-invalid", "before-submit", "submit", "reset"])
      form.addEventListener(`jquery-star:form:${name}`, (value) =>
        events.push(value instanceof constructors.CustomEvent),
      );
    first.value = "Ready";
    external.value = "Associated";
    first.dispatchEvent(event("input"));
    const action =
      mode === "action" ? required(active.jquery(form).star().star("instance")) : undefined;
    if (action)
      await action.run("ui.form.set-errors", { args: ["#realm-form", { first: "Rejected" }] });
    else active.ui.form.setErrors(form, { first: "Rejected" }, { focus: false });
    const operated = first.validationMessage === "Rejected";
    first.dispatchEvent(event("input"));
    active.ui.form.setErrors(form, { external: "External rejection" }, { focus: false });
    external.dispatchEvent(event("input"));
    const association =
      !external.validity.customError && external.getAttribute("aria-invalid") === null;
    const nativeSubmission =
      new constructors.FormData(form).get("first") === "Ready" &&
      new constructors.FormData(form).get("external") === "Associated";
    let submitted = 0;
    form.addEventListener("jquery-star:form:submit", () => {
      submitted += 1;
    });
    const prevent = (value: Event): void => value.preventDefault();
    form.addEventListener("submit", prevent);
    constructors.HTMLFormElement.prototype.requestSubmit.call(form);
    const nativeSubmit = submitted === 1;
    form.addEventListener("submit", prevent, { capture: true, once: true });
    constructors.HTMLFormElement.prototype.requestSubmit.call(form);
    const canceledSubmit = submitted === 1;
    active.ui.form.setErrors(form, { first: "Keep" }, { focus: false });
    form.addEventListener("reset", prevent, { once: true });
    active.ui.form.reset(form);
    await Promise.resolve();
    const canceledReset = first.validationMessage === "Keep" && first.value === "Ready";
    active.ui.form.reset(form);
    active.ui.form.setErrors(form, { first: "Newer" }, { focus: false });
    await Promise.resolve();
    const newerReset = first.validationMessage === "Newer";
    active.ui.form.reset(form);
    active.ui.enhance(form);
    await Promise.resolve();
    const acceptedReset =
      first.value === "" &&
      !first.validity.customError &&
      first.getAttribute("aria-describedby") === "authored";
    const shadowed: boolean[] = [];
    for (const name of ["reset", "checkValidity", "reportValidity", "elements"] as const) {
      const control = active.owner.document.createElement("input");
      control.name = name;
      form.append(control);
      shadowed.push((form as unknown as Record<string, unknown>)[name] === control);
    }
    const nativeValidity =
      !active.ui.form.valid(form) &&
      !active.ui.form.validate(form, { focus: false }) &&
      !active.ui.form.validate(form, { focus: false, report: true });
    first.value = "Edited";
    active.ui.form.reset(form);
    await Promise.resolve();
    const nativeNames = shadowed.every(Boolean) && nativeValidity && first.value === "";
    const old = first;
    first = active.owner.document.createElement("input");
    first.name = "first";
    first.required = true;
    old.replaceWith(first);
    active.ui.form.setErrors(form, { first: "Current" }, { focus: false });
    const currentParts = first.validationMessage === "Current" && !old.validity.customError;
    form.addEventListener(
      "jquery-star:form:server-invalid",
      () => {
        active.ui.form.setErrors(form, { first: "Newest" }, { focus: false });
      },
      { once: true },
    );
    active.ui.form.setErrors(form, { first: "Older" }, { focus: false });
    const newerRequest = first.validationMessage === "Newest";
    first.value = "Ready";
    first.dispatchEvent(event("input"));
    form.setAttribute("inert", "");
    form.dispatchEvent(event("submit"));
    const constrained = submitted === 1;
    form.removeAttribute("inert");
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [form] });
    preserve.beforeRemove(form);
    form.remove();
    app.prepend(form);
    await preserve.commit();
    external.value = "Associated";
    active.ui.form.setErrors(form, { first: "Preserved" }, { focus: false });
    first.dispatchEvent(event("input"));
    const preserved = !first.validity.customError && first.value === "Ready";
    const removal = adapter.begin(app);
    removal.beforeRemove(form);
    let rejectedRemovedRoot = false;
    try {
      active.ui.form.valid(form);
    } catch {
      rejectedRemovedRoot = true;
    }
    const prior = form.outerHTML;
    first.dispatchEvent(event("invalid"));
    const retired = form.outerHTML === prior;
    form.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      retained,
      rejectedPreviousOwner,
      operated,
      association,
      nativeSubmission,
      nativeSubmit,
      canceledSubmit,
      canceledReset,
      newerReset,
      acceptedReset,
      nativeNames,
      currentParts,
      newerRequest,
      constrained,
      preserved,
      rejectedRemovedRoot,
      retired,
      ownerEvents: events.length > 0 && events.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseTimePickerOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<form><section id="realm-time" data-jqs="time-picker"><button type="button" data-part="decrement">Earlier</button><input data-part="control" type="time" name="time" value="09:00" min="08:00" max="18:00" step="900"><button type="button" data-part="increment">Later</button><button type="button" data-part="preset" data-value="13:30">Afternoon</button><span data-part="status"></span></section></form>';
    source.owner.document.body.append(app);
    const form = required(app.querySelector("form"));
    const root = required(app.querySelector<HTMLElement>("section"));
    const control = required(root.querySelector("input"));
    const increment = required(root.querySelector<HTMLButtonElement>('[data-part="increment"]'));
    let active = source;
    let rejectedPreviousOwner = true;
    let retainedNativeValue = true;
    const adopted = mode === "adopted" || mode === "disposed-first" || mode === "facade";
    if (adopted) {
      source.ui.enhance(root);
      source.ui.timePicker.set(root, "10:00");
      control.value = "11:00";
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.timePicker.value(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected document ownership rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") active.ui.timePicker.value(root);
      else active.ui.enhance(root);
      source.star.dispose();
      retainedNativeValue = control.value === "11:00";
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else active.ui.enhance(root);
    const enhancedBeforeFacade = root.dataset.state === "ready";
    const constructors = active.owner as Window & typeof globalThis;
    const native: boolean[] = [];
    const component: boolean[] = [];
    control.addEventListener("input", (event) => native.push(event instanceof constructors.Event));
    control.addEventListener("change", (event) => native.push(event instanceof constructors.Event));
    root.addEventListener("jquery-star:time-picker:change", (event) =>
      component.push(event instanceof constructors.CustomEvent),
    );
    if (mode === "action") {
      const action = active.owner.document.createElement("button");
      action.type = "button";
      action.setAttribute("data-on:click", "@ui.time-picker.set('#realm-time', '10:30')");
      root.append(action);
      active.jquery(root).star();
      action.click();
    } else increment.click();
    const expected = mode === "action" ? "10:30" : adopted ? "11:15" : "09:15";
    const operated = control.value === expected && root.dataset.value === expected;
    const nativeSubmission = new constructors.FormData(form).get("time") === expected;
    control.readOnly = true;
    active.ui.timePicker.increment(root);
    const readonly = control.value === expected;
    control.readOnly = false;
    form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
    form.reset();
    active.ui.enhance(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const canceledReset = control.value === expected && root.dataset.value === expected;
    form.reset();
    active.ui.enhance(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const acceptedReset = control.value === "09:00" && root.dataset.value === "09:00";
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    form.append(root);
    await preserve.commit();
    increment.click();
    const retainedAfterPreservation = root.dataset.value === "09:15";
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      active.ui.timePicker.increment(root);
    } catch {
      rejectedRemovedRoot = true;
    }
    increment.click();
    const releasedNativeBinding = control.value === "09:15";
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      retainedNativeValue,
      rejectedPreviousOwner,
      operated,
      nativeSubmission,
      readonly,
      canceledReset,
      acceptedReset,
      retainedAfterPreservation,
      rejectedRemovedRoot,
      releasedNativeBinding,
      receivedOwnerEvents: component.length > 0 && component.every(Boolean),
      receivedNativeEvents: native.length >= 2 && native.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

function createRoot(owner: Window, kind: RealmKind): HTMLElement {
  const root = owner.document.createElement(kind === "dialog" ? "dialog" : "section");
  root.id = "realm-sample";
  root.dataset.jqs = kind;
  if (kind === "countdown") {
    root.dataset.duration = "30";
    root.dataset.paused = "true";
    root.innerHTML = '<span data-part="seconds"></span>';
  } else if (kind === "carousel") {
    root.innerHTML =
      '<div data-part="content"><div data-part="slide" data-value="a">A</div><div data-part="slide" data-value="b">B</div></div><button data-part="next">Next</button>';
  } else if (kind === "message-scroller") {
    root.dataset.follow = "false";
    root.innerHTML =
      '<div data-part="viewport" style="height:40px;overflow:auto"><div data-part="content" style="height:200px"></div></div><button data-part="latest">Latest</button>';
  } else
    root.innerHTML = '<h2 data-part="title">Frame dialog</h2><button autofocus>Confirm</button>';
  return root;
}

function operate(
  ui: ReturnType<typeof uiPlugin.install>,
  kind: RealmKind,
  root: HTMLElement,
): void {
  if (kind === "countdown") ui.countdown.start(root, 12);
  else if (kind === "carousel") ui.carousel.next(root);
  else if (kind === "message-scroller") ui.messageScroller.latest(root);
  else ui.dialog.open(root as HTMLDialogElement);
}

function value(
  ui: ReturnType<typeof uiPlugin.install>,
  kind: RealmKind,
  root: HTMLElement,
): boolean {
  if (kind === "countdown")
    return ui.countdown.state(root).remaining > 0 && !ui.countdown.state(root).paused;
  if (kind === "carousel") return ui.carousel.value(root) === "b";
  if (kind === "message-scroller") return ui.messageScroller.isFollowing(root);
  return (root as HTMLDialogElement).open;
}

export async function exerciseDocumentOwnership(
  factory: Factory,
  kind: RealmKind,
  mode: RealmMode,
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const root = createRoot(source.owner, kind);
    const app = source.owner.document.createElement("main");
    app.append(root);
    source.owner.document.body.append(app);
    let active = source;
    let rejectedPreviousOwner = true;
    if (mode === "adopted") {
      source.ui.enhance(root);
      operate(source.ui, kind, root);
      const moved = destination.owner.document.adoptNode(app);
      destination.owner.document.body.append(moved);
      active = destination;
      try {
        operate(source.ui, kind, root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected old-owner rejection. */
      }
      active.ui.enhance(root);
    } else if (mode === "automatic") await source.star.whenEnhanced();
    else source.ui.enhance(root);
    const enhancedBeforeFacade = root.dataset.state !== undefined;
    const received: boolean[] = [];
    const eventName =
      kind === "countdown"
        ? "start"
        : kind === "carousel"
          ? "change"
          : kind === "message-scroller"
            ? "latest"
            : "open";
    root.addEventListener(`jquery-star:${kind}:${eventName}`, (event) => {
      received.push(event instanceof (active.owner as Window & typeof globalThis).CustomEvent);
    });
    if (mode === "action") {
      const button = active.owner.document.createElement("button");
      const expression =
        kind === "countdown"
          ? "@ui.countdown.start(12)"
          : kind === "carousel"
            ? "@ui.carousel.go('b')"
            : kind === "message-scroller"
              ? "@ui.message-scroller.latest()"
              : "@ui.dialog.open()";
      button.setAttribute("data-on:click", expression);
      if (kind === "dialog") {
        button.setAttribute("aria-controls", root.id);
        app.prepend(button);
      } else root.append(button);
      active.jquery(app).star();
      button.click();
      await active.star.whenEnhanced();
    } else {
      if (mode === "adopted" && kind === "carousel") active.ui.carousel.go(root, "a");
      if (mode === "adopted" && kind === "dialog")
        active.ui.dialog.close(root as HTMLDialogElement);
      operate(active.ui, kind, root);
    }
    const operated = value(active.ui, kind, root);
    if (mode === "adopted") source.star.dispose();
    const afterOldDisposal = value(active.ui, kind, root);
    const adapter = createRenderAdapter(active.installed);
    const preserved = adapter.begin(app, { preserveRoots: [root] });
    const preservedRoot = preserved.preservedWithin(root)[0] === root;
    preserved.beforeRemove(root);
    root.remove();
    app.append(root);
    await preserved.commit();
    const retainedAfterPreservation =
      value(active.ui, kind, root) && (kind !== "dialog" || root.matches(":modal"));
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      operate(active.ui, kind, root);
    } catch {
      rejectedRemovedRoot = true;
    }
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      operated,
      afterOldDisposal,
      rejectedPreviousOwner,
      preservedRoot,
      rejectedRemovedRoot,
      retainedAfterPreservation,
      receivedOwnerEvents: received.length > 0 && received.every(Boolean),
    };
  } finally {
    destination.star.dispose();
    source.star.dispose();
    destination.frame.remove();
    source.frame.remove();
  }
}

export async function exerciseCarouselFocusAdoption(factory: Factory, userPaused: boolean) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    const root = createRoot(source.owner, "carousel");
    root.dataset.autoplay = "1000";
    source.owner.document.body.append(root);
    source.ui.enhance(root);
    root.querySelector<HTMLButtonElement>("button")?.focus();
    if (userPaused) source.ui.carousel.pause(root);
    const before = root.dataset.rotation;
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    const after = root.dataset.rotation;
    return { before, after };
  } finally {
    destination.star.dispose();
    source.star.dispose();
    destination.frame.remove();
    source.frame.remove();
  }
}

type NativeFieldKind = "number-field" | "password-field" | "search-field" | "rating";

export async function exerciseNativeElementActionTargets(factory: Factory) {
  const realm = createRealm(factory);
  const app = realm.owner.document.createElement("main");
  try {
    await realm.star.whenEnhanced();
    app.innerHTML = `
      <div id="action-number" data-jqs="number-field">
        <button data-part="decrement">Earlier</button>
        <input data-part="control" type="number" value="1" min="1" max="5" step="2">
        <button data-part="increment">Later</button>
      </div>
      <div id="action-time" data-jqs="time-picker">
        <button data-part="decrement">Earlier</button>
        <input data-part="control" type="time" value="09:00" min="08:00" max="18:00" step="900">
        <button data-part="increment">Later</button>
      </div>
      <fieldset id="action-rating" data-jqs="rating">
        <input data-part="control" type="radio" name="action-rating" value="1" checked>
        <input data-part="control" type="radio" name="action-rating" value="2">
      </fieldset>
      <button id="action-toggle" data-jqs="toggle">Preview</button>
      <div id="action-group" data-jqs="toggle-group" data-type="multiple" data-value="bold">
        <button data-part="item" data-value="bold">Bold</button>
        <button data-part="item" data-value="italic">Italic</button>
      </div>
      <div id="action-toolbar" data-jqs="toolbar">
        <button data-part="item" data-value="bold">Bold</button>
        <button data-part="item" data-value="italic">Italic</button>
      </div>
      <div id="action-password" data-jqs="password-field">
        <input data-part="control" type="password" value="secret">
        <button data-part="toggle">Reveal</button>
      </div>
      <div id="action-sidebar" data-jqs="sidebar" data-collapsible="icon" data-value="expanded">
        <aside data-part="panel">Navigation</aside>
        <div data-part="content"><button data-part="trigger">Toggle navigation</button></div>
        <button data-part="backdrop">Close navigation</button>
      </div>
      <form id="action-native-form">
        <div id="action-otp" data-jqs="input-otp" data-length="3">
          <input data-part="control" type="text" name="code">
          <div data-part="slots"></div>
        </div>
        <div id="action-search" data-jqs="search-field">
          <input data-part="control" type="search" name="query">
        </div>
        <div id="action-tags" data-jqs="tags-input" data-name="skills">
          <ul data-part="list"></ul>
          <input data-part="control" type="text">
        </div>
        <div id="action-stepper" data-jqs="stepper">
          <ol data-part="list">
            <li data-part="step" data-value="profile"><button data-part="trigger">Profile</button></li>
            <li data-part="step" data-value="review"><button data-part="trigger">Review</button></li>
          </ol>
          <section data-part="panel" data-value="profile">Profile</section>
          <section data-part="panel" data-value="review">Review</section>
        </div>
        <div id="action-multi" data-jqs="multi-select">
          <select data-part="control" name="teams" multiple>
            <option value="design" selected>Design</option>
            <option value="api">API</option>
            <option value="docs">Docs</option>
          </select>
        </div>
        <div id="action-color" data-jqs="color-picker">
          <input data-part="control" type="color" name="accent" value="#112233">
          <input data-part="value" type="text">
          <span data-part="preview"></span>
        </div>
        <div id="action-editable" data-jqs="editable" data-select-on-edit>
          <div data-part="display"><span data-part="preview">Original</span><button data-part="edit">Edit</button></div>
          <div data-part="editor"><input data-part="control" name="displayName" value="Original" required></div>
          <span data-part="status"></span>
        </div>
      </form>`;
    realm.owner.document.body.append(app);
    realm.ui.enhance(app);
    const instance = required(realm.jquery(app).star().star("instance"));
    const number = required(app.querySelector<HTMLElement>("#action-number"));
    const time = required(app.querySelector<HTMLElement>("#action-time"));
    const rating = required(app.querySelector<HTMLElement>("#action-rating"));
    const toggle = required(app.querySelector<HTMLButtonElement>("#action-toggle"));
    const group = required(app.querySelector<HTMLElement>("#action-group"));
    const toolbar = required(app.querySelector<HTMLElement>("#action-toolbar"));
    const password = required(app.querySelector<HTMLElement>("#action-password"));
    const sidebar = required(app.querySelector<HTMLElement>("#action-sidebar"));
    const form = required(app.querySelector<HTMLFormElement>("#action-native-form"));
    const otp = required(app.querySelector<HTMLElement>("#action-otp"));
    const search = required(app.querySelector<HTMLElement>("#action-search"));
    const tags = required(app.querySelector<HTMLElement>("#action-tags"));
    const stepper = required(app.querySelector<HTMLElement>("#action-stepper"));
    const multi = required(app.querySelector<HTMLElement>("#action-multi"));
    const color = required(app.querySelector<HTMLElement>("#action-color"));
    const editable = required(app.querySelector<HTMLElement>("#action-editable"));
    const formData = (): FormData => new (realm.owner as Window & typeof globalThis).FormData(form);

    await instance.run("ui.number-field.increment", { args: [number, 1] });
    const numberExplicit = realm.ui.numberField.value(number) === 3;
    await instance.run("ui.number-field.decrement", {
      element: required(number.querySelector("input")),
      args: [1],
    });
    const numberImplicit = realm.ui.numberField.value(number) === 1;
    await instance.run("ui.time-picker.increment", { args: [time, 1] });
    const timeExplicit = realm.ui.timePicker.value(time) === "09:15";
    await instance.run("ui.rating.set", { args: [rating, "2"] });
    const ratingExplicit = realm.ui.rating.value(rating) === "2";
    await instance.run("ui.toggle.press", { args: [toggle, true] });
    const toggleExplicit = realm.ui.toggle.pressed(toggle);
    await instance.run("ui.toggle-group.select", { args: [group, "italic"] });
    const groupExplicit = JSON.stringify(realm.ui.toggleGroup.value(group)) === '["bold","italic"]';
    await instance.run("ui.toolbar.focus", { args: [toolbar, "italic"] });
    const toolbarItem = required(toolbar.querySelector('[data-value="italic"]'));
    const toolbarExplicit =
      realm.ui.toolbar.value(toolbar) === "italic" &&
      realm.owner.document.activeElement === toolbarItem;
    const passwordControl = required(password.querySelector<HTMLInputElement>("input"));
    const sidebarTrigger = required(
      sidebar.querySelector<HTMLButtonElement>('[data-part="trigger"]'),
    );
    await instance.run("ui.password-field.show", { args: [password] });
    const passwordExplicit = passwordControl.type === "text" && passwordControl.value === "secret";
    await instance.run("ui.password-field.hide", { element: passwordControl });
    const passwordImplicit = passwordControl.type === "password";
    await instance.run("ui.sidebar.close", { args: [sidebar] });
    const sidebarExplicit = !realm.ui.sidebar.value(sidebar);
    await instance.run("ui.sidebar.open", { element: sidebarTrigger });
    const sidebarImplicit = realm.ui.sidebar.value(sidebar);

    await instance.run("ui.input-otp.set", { args: [otp, "123"] });
    const otpExplicit = realm.ui.inputOTP.value(otp) === "123" && formData().get("code") === "123";
    await instance.run("ui.input-otp.set", {
      element: required(otp.querySelector("input")),
      args: ["456"],
    });
    const otpImplicit = realm.ui.inputOTP.value(otp) === "456";
    await instance.run("ui.search-field.set", { args: [search, "component"] });
    const searchExplicit =
      realm.ui.searchField.value(search) === "component" && formData().get("query") === "component";
    await instance.run("ui.tags-input.add", { args: [tags, "Datastar"] });
    const tagsExplicit =
      JSON.stringify(realm.ui.tagsInput.value(tags)) === '["Datastar"]' &&
      JSON.stringify(formData().getAll("skills")) === '["Datastar"]';
    await instance.run("ui.stepper.go", { args: [stepper, "review"] });
    await instance.run("ui.stepper.complete", { args: [stepper, "review", true] });
    const stepperExplicit =
      realm.ui.stepper.value(stepper) === "review" &&
      stepper
        .querySelector('[data-part="step"][data-value="review"]')
        ?.getAttribute("data-completed") === "true";
    await instance.run("ui.multi-select.set", { args: [multi, ["api"]] });
    await instance.run("ui.multi-select.select", { args: [multi, "docs", true] });
    const multiExplicit =
      JSON.stringify(realm.ui.multiSelect.value(multi)) === '["api","docs"]' &&
      JSON.stringify(formData().getAll("teams")) === '["api","docs"]';
    const colorControl = required(color.querySelector<HTMLInputElement>('[data-part="control"]'));
    const colorText = required(color.querySelector<HTMLInputElement>('[data-part="value"]'));
    await instance.run("ui.color-picker.set", { args: [color, "#445566"] });
    const colorExplicit =
      colorControl.value === "#445566" && formData().get("accent") === "#445566";
    await instance.run("ui.color-picker.set", { element: colorText, args: ["#778899"] });
    const colorImplicit = colorControl.value === "#778899";
    const editableControl = required(
      editable.querySelector<HTMLInputElement>('[data-part="control"]'),
    );
    const editableEdit = required(editable.querySelector<HTMLButtonElement>('[data-part="edit"]'));
    await instance.run("ui.editable.edit", { args: [editable] });
    const editableExplicit = realm.ui.editable.editing(editable);
    editableControl.value = "Current";
    await instance.run("ui.editable.commit", { element: editableControl });
    const editableImplicit =
      !realm.ui.editable.editing(editable) &&
      realm.ui.editable.value(editable) === "Current" &&
      formData().get("displayName") === "Current";

    let wrongTargetRejected = false;
    try {
      await instance.run("ui.number-field.increment", { args: [rating, 1] });
    } catch {
      wrongTargetRejected = true;
    }
    let wrongValueTargetRejected = false;
    try {
      await instance.run("ui.tags-input.add", { args: [search, "wrong"] });
    } catch {
      wrongValueTargetRejected = true;
    }
    let wrongPasswordTargetRejected = false;
    try {
      await instance.run("ui.password-field.show", { element: passwordControl, args: [sidebar] });
    } catch {
      wrongPasswordTargetRejected = true;
    }
    let wrongSidebarTargetRejected = false;
    try {
      await instance.run("ui.sidebar.close", { element: sidebarTrigger, args: [password] });
    } catch {
      wrongSidebarTargetRejected = true;
    }
    let wrongColorTargetRejected = false;
    try {
      await instance.run("ui.color-picker.set", {
        element: colorText,
        args: [colorText, "#aabbcc"],
      });
    } catch {
      wrongColorTargetRejected = true;
    }
    let wrongEditableTargetRejected = false;
    try {
      await instance.run("ui.editable.edit", { element: editableEdit, args: [editableControl] });
    } catch {
      wrongEditableTargetRejected = true;
    }
    return {
      numberExplicit,
      numberImplicit,
      timeExplicit,
      ratingExplicit,
      toggleExplicit,
      groupExplicit,
      toolbarExplicit,
      passwordExplicit,
      passwordImplicit,
      sidebarExplicit,
      sidebarImplicit,
      otpExplicit,
      otpImplicit,
      searchExplicit,
      tagsExplicit,
      stepperExplicit,
      multiExplicit,
      colorExplicit,
      colorImplicit,
      editableExplicit,
      editableImplicit,
      wrongTargetRejected,
      wrongValueTargetRejected,
      wrongPasswordTargetRejected,
      wrongSidebarTargetRejected,
      wrongColorTargetRejected,
      wrongEditableTargetRejected,
      numberUnchanged: realm.ui.numberField.value(number) === 1,
      tagsUnchanged: JSON.stringify(realm.ui.tagsInput.value(tags)) === '["Datastar"]',
      passwordUnchanged: passwordControl.type === "password",
      sidebarUnchanged: realm.ui.sidebar.value(sidebar),
      colorUnchanged: colorControl.value === "#778899",
      editableUnchanged: !realm.ui.editable.editing(editable),
    };
  } finally {
    realm.jquery(app).star("destroy");
    realm.star.dispose();
    realm.frame.remove();
  }
}

export async function exerciseRemainingElementActionTargets(factory: Factory) {
  const realm = createRealm(factory);
  const app = realm.owner.document.createElement("main");
  try {
    await realm.star.whenEnhanced();
    app.innerHTML = `
      <form id="action-transfer-form">
        <div id="action-transfer" data-jqs="transfer-list" data-name="permissions" data-value='["write"]'>
          <select data-part="available" multiple><option value="read">Read</option></select>
          <select data-part="selected" multiple><option value="write">Write</option></select>
          <button data-part="add">Add</button><button data-part="remove">Remove</button>
          <p data-part="status"></p>
        </div>
      </form>
      <section id="action-log" data-jqs="log-viewer">
        <select data-part="filter"><option value="all">All</option></select>
        <button data-part="pause">Pause</button>
        <div data-part="viewport"><ol data-part="entries"><li data-part="entry" data-level="info">Ready</li></ol></div>
        <p data-part="status"></p>
      </section>
      <section id="action-json" data-jqs="json-viewer">
        <button data-part="expand">Expand</button>
        <script type="application/json" data-part="source">{"nested":{"ready":true}}</script>
        <div data-part="tree"></div><p data-part="status"></p>
      </section>
      <nav id="action-pagination" data-jqs="pagination" data-page="1" data-page-count="3" data-navigation="manual">
        <a data-part="page" data-page="1" href="?page=1">1</a>
        <a data-part="page" data-page="2" href="?page=2">2</a>
        <a data-part="page" data-page="3" href="?page=3">3</a>
        <p data-part="status"></p>
      </nav>
      <section id="action-scroller" data-jqs="message-scroller">
        <div data-part="viewport"><div data-part="content"><article data-jqs="message">Ready</article></div></div>
        <button data-part="latest">Latest</button><p data-part="status"></p>
      </section>
      <div id="action-countdown" data-jqs="countdown" data-duration="5">
        <span data-part="seconds"></span><output data-part="status"></output>
      </div>`;
    realm.owner.document.body.append(app);
    realm.ui.enhance(app);
    const instance = required(realm.jquery(app).star().star("instance"));
    const transfer = required(app.querySelector<HTMLElement>("#action-transfer"));
    const transferForeign = required(
      transfer.querySelector<HTMLElement>('[data-part="available"]'),
    );
    const transferForm = required(app.querySelector<HTMLFormElement>("#action-transfer-form"));
    const log = required(app.querySelector<HTMLElement>("#action-log"));
    const logForeign = required(log.querySelector<HTMLElement>('[data-part="pause"]'));
    const json = required(app.querySelector<HTMLElement>("#action-json"));
    const jsonForeign = required(json.querySelector<HTMLElement>('[data-part="expand"]'));
    const pagination = required(app.querySelector<HTMLElement>("#action-pagination"));
    const paginationForeign = required(pagination.querySelector<HTMLElement>('[data-part="page"]'));
    const scroller = required(app.querySelector<HTMLElement>("#action-scroller"));
    const scrollerForeign = required(scroller.querySelector<HTMLElement>('[data-part="latest"]'));
    const countdown = required(app.querySelector<HTMLElement>("#action-countdown"));
    const countdownForeign = required(
      countdown.querySelector<HTMLElement>('[data-part="seconds"]'),
    );
    const rejected = async (name: string, element: HTMLElement, args: unknown[], kind: string) => {
      try {
        await instance.run(name, { element, args });
        return false;
      } catch (error) {
        return String(error).includes(`data-jqs="${kind}"`);
      }
    };

    const wrongTransfer = await rejected(
      "ui.transfer-list.add",
      transferForeign,
      [transferForeign, ["read"]],
      "transfer-list",
    );
    const transferUnchanged = JSON.stringify(realm.ui.transferList.value(transfer)) === '["write"]';
    await instance.run("ui.transfer-list.add", { args: [transfer, ["read"]] });
    const transferExplicit =
      JSON.stringify(realm.ui.transferList.value(transfer)) === '["write","read"]' &&
      JSON.stringify(
        new (realm.owner as Window & typeof globalThis).FormData(transferForm).getAll(
          "permissions",
        ),
      ) === '["write","read"]';
    await instance.run("ui.transfer-list.remove", { element: transferForeign, args: [["read"]] });
    const transferImplicit = JSON.stringify(realm.ui.transferList.value(transfer)) === '["write"]';

    const wrongLog = await rejected("ui.log-viewer.pause", logForeign, [logForeign], "log-viewer");
    const logUnchanged = !realm.ui.logViewer.state(log).paused;
    await instance.run("ui.log-viewer.pause", { args: [log] });
    const logExplicit = realm.ui.logViewer.state(log).paused;
    await instance.run("ui.log-viewer.resume", { element: logForeign });
    const logImplicit = !realm.ui.logViewer.state(log).paused;

    const wrongJSON = await rejected(
      "ui.json-viewer.collapse-all",
      jsonForeign,
      [jsonForeign],
      "json-viewer",
    );
    const jsonUnchanged = required(json.querySelector<HTMLDetailsElement>("details")).open;
    await instance.run("ui.json-viewer.collapse-all", { args: [json] });
    const jsonExplicit = !required(json.querySelector<HTMLDetailsElement>("details")).open;
    await instance.run("ui.json-viewer.expand-all", { element: jsonForeign });
    const jsonImplicit = required(json.querySelector<HTMLDetailsElement>("details")).open;

    const wrongPagination = await rejected(
      "ui.pagination.next",
      paginationForeign,
      [paginationForeign],
      "pagination",
    );
    const paginationUnchanged = realm.ui.pagination.page(pagination) === 1;
    await instance.run("ui.pagination.next", { args: [pagination] });
    const paginationExplicit = realm.ui.pagination.page(pagination) === 2;
    await instance.run("ui.pagination.previous", { element: paginationForeign });
    const paginationImplicit = realm.ui.pagination.page(pagination) === 1;

    await instance.run("ui.message-scroller.follow", { args: [scroller, false] });
    const scrollerExplicit = !realm.ui.messageScroller.isFollowing(scroller);
    const wrongScroller = await rejected(
      "ui.message-scroller.latest",
      scrollerForeign,
      [scrollerForeign],
      "message-scroller",
    );
    const scrollerUnchanged = !realm.ui.messageScroller.isFollowing(scroller);
    await instance.run("ui.message-scroller.follow", { element: scrollerForeign, args: [true] });
    const scrollerImplicit = realm.ui.messageScroller.isFollowing(scroller);

    const wrongCountdown = await rejected(
      "ui.countdown.pause",
      countdownForeign,
      [countdownForeign],
      "countdown",
    );
    const countdownUnchanged = !realm.ui.countdown.state(countdown).paused;
    await instance.run("ui.countdown.pause", { args: [countdown] });
    const countdownExplicit = realm.ui.countdown.state(countdown).paused;
    await instance.run("ui.countdown.resume", { element: countdownForeign });
    const countdownImplicit = !realm.ui.countdown.state(countdown).paused;

    return {
      wrongTransfer,
      transferUnchanged,
      transferExplicit,
      transferImplicit,
      wrongLog,
      logUnchanged,
      logExplicit,
      logImplicit,
      wrongJSON,
      jsonUnchanged,
      jsonExplicit,
      jsonImplicit,
      wrongPagination,
      paginationUnchanged,
      paginationExplicit,
      paginationImplicit,
      wrongScroller,
      scrollerUnchanged,
      scrollerExplicit,
      scrollerImplicit,
      wrongCountdown,
      countdownUnchanged,
      countdownExplicit,
      countdownImplicit,
    };
  } finally {
    realm.jquery(app).star("destroy");
    realm.star.dispose();
    realm.frame.remove();
  }
}

export async function exerciseAdditionalElementActionTargets(factory: Factory) {
  const realm = createRealm(factory);
  const app = realm.owner.document.createElement("main");
  try {
    await realm.star.whenEnhanced();
    app.innerHTML = `
      <form id="action-choice-form">
        <section id="action-combo" data-jqs="combobox">
          <input data-part="control" name="query" aria-label="Choice">
          <input data-part="value" type="hidden" name="choice">
          <div data-part="content"><div data-part="option" data-value="a">Alpha</div><div data-part="option" data-value="b">Beta</div><div data-part="empty">Empty</div></div>
        </section>
      </form>
      <ul id="action-tree" data-jqs="tree">
        <li data-part="item" data-value="a" data-expanded="false"><div data-part="row"><span data-part="toggle"></span><span data-part="label">Alpha</span></div><ul data-part="group"><li data-part="item" data-value="b"><div data-part="row"><span data-part="label">Beta</span></div></li></ul></li>
      </ul>
      <section id="action-tabs" data-jqs="tabs" data-value="a">
        <div data-part="list"><button data-part="trigger" data-value="a">Alpha</button><button data-part="trigger" data-value="b">Beta</button></div>
        <section data-part="panel" data-value="a">Alpha panel</section><section data-part="panel" data-value="b">Beta panel</section>
      </section>
      <section id="action-carousel" data-jqs="carousel" data-value="a">
        <div data-part="content"><div data-part="slide" data-value="a"><button>Alpha</button></div><div data-part="slide" data-value="b">Beta</div></div>
        <button data-part="previous">Previous</button><button data-part="next">Next</button><div data-part="indicators"></div><button data-part="rotation"></button><span data-part="status"></span>
      </section>
      <form id="action-upload-form"><section id="action-upload" data-jqs="file-upload">
        <input data-part="control" type="file" name="assets" accept=".txt" multiple>
        <label data-part="dropzone">Files</label><ul data-part="list"></ul><p data-part="status"></p>
      </section></form>
      <section id="action-popover" data-jqs="popover"><button data-part="trigger">Open</button><div data-part="content"><h2 data-part="title">Details</h2><button>Inside</button></div></section>`;
    realm.owner.document.body.append(app);
    realm.ui.enhance(app);
    const instance = required(realm.jquery(app).star().star("instance"));
    const root = (id: string) => required(app.querySelector<HTMLElement>(`#action-${id}`));
    const part = (id: string, name: string) =>
      required(root(id).querySelector<HTMLElement>(`[data-part="${name}"]`));
    const rejected = async (name: string, foreign: HTMLElement, args: unknown[], kind: string) => {
      try {
        await instance.run(name, { element: foreign, args });
        return false;
      } catch (error) {
        return String(error).includes(`data-jqs="${kind}"`);
      }
    };
    const constructors = realm.owner as Window & typeof globalThis;

    const comboForeign = part("combo", "control");
    const comboWrong = await rejected("ui.combobox.open", comboForeign, [comboForeign], "combobox");
    const comboUnchanged = root("combo").dataset.state === "closed";
    await instance.run("ui.combobox.open", { args: [root("combo")] });
    const comboExplicit = root("combo").dataset.state === "open";
    await instance.run("ui.combobox.select", { args: ["#action-combo", "b"] });
    const comboForm =
      new constructors.FormData(
        required(app.querySelector<HTMLFormElement>("#action-choice-form")),
      ).get("choice") === "b";

    const treeForeign = part("tree", "row");
    const treeWrong = await rejected("ui.tree.expand", treeForeign, [treeForeign, "a"], "tree");
    const treeUnchanged =
      required(root("tree").querySelector<HTMLElement>('[data-part="item"]')).dataset.expanded ===
      "false";
    await instance.run("ui.tree.expand", { args: [root("tree"), "a"] });
    const treeExplicit =
      required(root("tree").querySelector<HTMLElement>('[data-part="item"]')).dataset.expanded ===
      "true";

    const tabsForeign = part("tabs", "trigger");
    const tabsWrong = await rejected("ui.tabs.activate", tabsForeign, [tabsForeign, "b"], "tabs");
    const tabsUnchanged = realm.ui.tabs.value(root("tabs")) === "a";
    await instance.run("ui.tabs.activate", { args: [root("tabs"), "b"] });
    const tabsExplicit =
      realm.ui.tabs.value(root("tabs")) === "b" &&
      !required(root("tabs").querySelector<HTMLElement>('[data-part="panel"][data-value="b"]'))
        .hidden;

    const carouselForeign = required(part("carousel", "slide").querySelector("button"));
    const carouselWrong = await rejected(
      "ui.carousel.next",
      carouselForeign,
      [carouselForeign],
      "carousel",
    );
    const carouselUnchanged = realm.ui.carousel.value(root("carousel")) === "a";
    await instance.run("ui.carousel.go", { args: [root("carousel"), "b"] });
    const carouselExplicit =
      realm.ui.carousel.value(root("carousel")) === "b" &&
      required(root("carousel").querySelector<HTMLElement>('[data-part="slide"][data-value="a"]'))
        .hidden;

    const uploadForeign = part("upload", "control");
    const file = new constructors.File(["asset"], "asset.txt", { type: "text/plain" });
    const transfer = new constructors.DataTransfer();
    transfer.items.add(file);
    (uploadForeign as HTMLInputElement).files = transfer.files;
    uploadForeign.dispatchEvent(new constructors.Event("change", { bubbles: true }));
    const uploadWrong = await rejected(
      "ui.fileUpload.clear",
      uploadForeign,
      [uploadForeign],
      "file-upload",
    );
    const uploadUnchanged = realm.ui.fileUpload.files(root("upload"))[0]?.name === "asset.txt";
    await instance.run("ui.fileUpload.remove", { args: [root("upload"), "asset.txt"] });
    const uploadExplicit =
      realm.ui.fileUpload.files(root("upload")).length === 0 &&
      (uploadForeign as HTMLInputElement).files?.length === 0;

    const popoverForeign = part("popover", "trigger");
    const popoverWrong = await rejected(
      "ui.popover.open",
      popoverForeign,
      [popoverForeign],
      "popover",
    );
    const popoverUnchanged = root("popover").dataset.state === "closed";
    await instance.run("ui.popover.open", { args: [root("popover")] });
    const popoverExplicit =
      root("popover").dataset.state === "open" &&
      popoverForeign.getAttribute("aria-expanded") === "true";

    return {
      comboWrong,
      comboUnchanged,
      comboExplicit,
      comboForm,
      treeWrong,
      treeUnchanged,
      treeExplicit,
      tabsWrong,
      tabsUnchanged,
      tabsExplicit,
      carouselWrong,
      carouselUnchanged,
      carouselExplicit,
      uploadWrong,
      uploadUnchanged,
      uploadExplicit,
      popoverWrong,
      popoverUnchanged,
      popoverExplicit,
    };
  } finally {
    realm.jquery(app).star("destroy");
    realm.star.dispose();
    realm.frame.remove();
  }
}

export async function exerciseStructuralElementActionTargets(factory: Factory) {
  const realm = createRealm(factory);
  const app = realm.owner.document.createElement("main");
  try {
    await realm.star.whenEnhanced();
    app.innerHTML = `
      <button id="structural-dialog-trigger" aria-controls="structural-dialog">Open dialog</button>
      <dialog id="structural-dialog" data-jqs="dialog"><div data-part="content"><h2 data-part="title">Dialog</h2><button data-part="cancel">Close</button></div></dialog>
      <form id="structural-form" data-jqs="form"><div data-jqs="field"><label data-part="label" for="structural-email">Email</label><input id="structural-email" name="email" type="email" required><p data-part="message" hidden></p></div><button type="reset">Reset</button><p data-part="server-message" hidden></p></form>
      <details id="structural-collapsible" data-jqs="collapsible"><summary>More</summary><div data-part="content">More content</div></details>
      <div id="structural-accordion" data-jqs="accordion" data-mode="single"><details id="structural-first" data-part="item" open><summary>First</summary><div data-part="content">First content</div></details><details id="structural-second" data-part="item"><summary>Second</summary><div data-part="content">Second content</div></details></div>
      <div id="structural-menu" data-jqs="menu"><button data-part="trigger">Menu</button><div data-part="content"><button data-part="item" data-value="a">Alpha</button><button data-part="item" data-value="authored" data-disabled>Authored disabled</button><button data-part="item" data-value="native" disabled>Native disabled</button><button data-part="item" data-value="b">Beta</button></div></div>
      <div id="structural-context-menu" data-jqs="context-menu"><div data-part="trigger" tabindex="0">Canvas</div><div data-part="content" aria-label="Canvas actions"><button data-part="item" data-value="a">Alpha</button></div></div>
      <button id="structural-toggle" data-jqs="toggle" type="button"><span data-part="label">Preview</span></button>`;
    realm.owner.document.body.append(app);
    realm.ui.enhance(app);
    const instance = required(realm.jquery(app).star().star("instance"));
    const constructors = realm.owner as Window & typeof globalThis;
    const root = (id: string) => required(app.querySelector<HTMLElement>(`#structural-${id}`));
    const child = (id: string, selector: string) =>
      required(root(id).querySelector<HTMLElement>(selector));
    const rejected = async (
      name: string,
      element: HTMLElement,
      args: unknown[],
      message: string,
    ) => {
      try {
        await instance.run(name, { element, args });
        return false;
      } catch (error) {
        return String(error).includes(message);
      }
    };

    const dialog = root("dialog") as HTMLDialogElement;
    const dialogTrigger = root("dialog-trigger");
    const dialogWrong = await rejected(
      "ui.dialog.open",
      dialogTrigger,
      [dialogTrigger],
      "<dialog>",
    );
    const dialogUnchanged = !dialog.open;
    await instance.run("ui.dialog.open", { args: [dialog] });
    const dialogExplicit = dialog.open;
    realm.ui.dialog.close(dialog);

    const form = root("form") as HTMLFormElement;
    const email = root("email") as HTMLInputElement;
    email.value = "proof@example.com";
    const formWrong = await rejected("ui.form.reset", email, [email], 'form[data-jqs="form"]');
    const formUnchanged = email.value === "proof@example.com";
    await instance.run("ui.form.reset", { args: [form] });
    const formExplicit = email.value === "";
    const errorsWrong = await rejected(
      "ui.form.set-errors",
      email,
      [email, { email: "Already registered." }],
      'form[data-jqs="form"]',
    );
    const errorsUnchanged = !email.validity.customError;
    await instance.run("ui.form.set-errors", {
      args: [form, { email: "Already registered." }],
    });
    const errorsExplicit = email.validity.customError;
    const clearWrong = await rejected(
      "ui.form.clear-errors",
      email,
      [email, ["email"]],
      'form[data-jqs="form"]',
    );
    const clearUnchanged = email.validationMessage === "Already registered.";
    await instance.run("ui.form.clear-errors", { args: [form, ["email"]] });
    const clearExplicit = !email.validity.customError;

    const details = root("collapsible") as HTMLDetailsElement;
    const summary = child("collapsible", "summary");
    const disclosureWrong = await rejected("ui.collapsible.open", summary, [summary], "<details>");
    const disclosureUnchanged = !details.open;
    await instance.run("ui.collapsible.open", { args: [details] });
    const disclosureExplicit = details.open;

    const first = root("first") as HTMLDetailsElement;
    const second = root("second") as HTMLDetailsElement;
    const secondSummary = child("second", "summary");
    const accordionWrong = await rejected(
      "ui.accordion.open",
      secondSummary,
      [secondSummary],
      "<details>",
    );
    const accordionUnchanged = first.open && !second.open;
    await instance.run("ui.accordion.open", { args: [second] });
    const accordionExplicit = second.open;

    const menu = root("menu");
    const menuTrigger = child("menu", '[data-part="trigger"]');
    const menuWrong = await rejected("ui.menu.open", menuTrigger, [menuTrigger], 'data-jqs="menu"');
    const menuUnchanged = menu.dataset.state === "closed";
    await instance.run("ui.menu.open", { args: [menu] });
    const menuExplicit = menu.dataset.state === "open";
    const menuAuthored = child("menu", '[data-value="authored"]');
    const menuNative = child("menu", '[data-value="native"]');
    const menuBeta = child("menu", '[data-value="b"]');
    menuAuthored.dispatchEvent(new constructors.Event("pointermove", { bubbles: true }));
    const menuAuthoredFocus = realm.owner.document.activeElement === menuAuthored;
    menuNative.dispatchEvent(new constructors.Event("pointermove", { bubbles: true }));
    const menuNativeSkipped = realm.owner.document.activeElement === menuAuthored;
    menuAuthored.dispatchEvent(
      new constructors.KeyboardEvent("keydown", { bubbles: true, key: "End" }),
    );
    const menuKeyboardSkipped = realm.owner.document.activeElement === menuBeta;
    await instance.run("ui.menu.close", { args: [menu] });

    const contextMenu = root("context-menu");
    const contextTrigger = child("context-menu", '[data-part="trigger"]');
    const contextWrong = await rejected(
      "ui.context-menu.open",
      contextTrigger,
      [contextTrigger, 24, 32],
      'data-jqs="context-menu"',
    );
    const contextUnchanged = contextMenu.dataset.state === "closed";
    await instance.run("ui.context-menu.open", { args: [contextMenu, 24, 32] });
    const contextExplicit = contextMenu.dataset.state === "open";
    await instance.run("ui.context-menu.close", { args: [contextMenu] });
    const contextKey = new constructors.KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ContextMenu",
    });
    contextTrigger.dispatchEvent(contextKey);
    const contextKeyboard =
      contextKey.defaultPrevented &&
      contextMenu.dataset.state === "open" &&
      realm.owner.document.activeElement === child("context-menu", '[data-part="item"]');
    await instance.run("ui.context-menu.close", { args: [contextMenu] });
    contextTrigger.dispatchEvent(
      new constructors.PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 24,
        clientY: 32,
        pointerType: "touch",
      }),
    );
    contextTrigger.dispatchEvent(new constructors.Event("pointercancel", { bubbles: true }));
    await new Promise<void>((resolve) => realm.owner.setTimeout(resolve, 575));
    const contextPressCanceled = contextMenu.dataset.state === "closed";

    const toggle = root("toggle") as HTMLButtonElement;
    const label = child("toggle", '[data-part="label"]');
    const toggleWrong = await rejected(
      "ui.toggle.toggle",
      label,
      [label],
      'button[data-jqs="toggle"]',
    );
    const toggleUnchanged = !realm.ui.toggle.pressed(toggle);
    const pressWrong = await rejected(
      "ui.toggle.press",
      label,
      [label, true],
      'button[data-jqs="toggle"]',
    );
    const pressUnchanged = !realm.ui.toggle.pressed(toggle);
    await instance.run("ui.toggle.press", { args: [toggle, true] });
    const toggleExplicit = realm.ui.toggle.pressed(toggle);

    return {
      dialogWrong,
      dialogUnchanged,
      dialogExplicit,
      formWrong,
      formUnchanged,
      formExplicit,
      errorsWrong,
      errorsUnchanged,
      errorsExplicit,
      clearWrong,
      clearUnchanged,
      clearExplicit,
      disclosureWrong,
      disclosureUnchanged,
      disclosureExplicit,
      accordionWrong,
      accordionUnchanged,
      accordionExplicit,
      menuWrong,
      menuUnchanged,
      menuExplicit,
      menuAuthoredFocus,
      menuNativeSkipped,
      menuKeyboardSkipped,
      contextWrong,
      contextUnchanged,
      contextExplicit,
      contextKeyboard,
      contextPressCanceled,
      toggleWrong,
      toggleUnchanged,
      pressWrong,
      pressUnchanged,
      toggleExplicit,
    };
  } finally {
    realm.jquery(app).star("destroy");
    realm.star.dispose();
    realm.frame.remove();
  }
}

function nativeRoot(owner: Window, kind: NativeFieldKind): HTMLElement {
  const root = owner.document.createElement("section");
  root.id = "native-sample";
  root.dataset.jqs = kind;
  root.innerHTML =
    kind === "number-field"
      ? '<input data-part="control" type="number" value="1"><button data-part="decrement">-</button><button data-part="increment">+</button>'
      : kind === "password-field"
        ? '<input data-part="control" type="password" value="secret"><button data-part="toggle">Toggle</button><span data-part="status"></span>'
        : kind === "search-field"
          ? '<input data-part="control" type="search" value="query"><button data-part="clear">Clear</button>'
          : '<input data-part="control" type="radio" name="rating" value="1" checked><input data-part="control" type="radio" name="rating" value="2"><output data-part="status"></output>';
  return root;
}
function fieldValue(
  ui: ReturnType<typeof uiPlugin.install>,
  kind: NativeFieldKind,
  root: HTMLElement | string,
) {
  if (kind === "number-field") return ui.numberField.value(root);
  if (kind === "password-field") return ui.passwordField.visible(root);
  if (kind === "search-field") return ui.searchField.value(root);
  return ui.rating.value(root);
}
function setField(
  ui: ReturnType<typeof uiPlugin.install>,
  kind: NativeFieldKind,
  root: HTMLElement,
) {
  if (kind === "number-field") ui.numberField.set(root, 2);
  else if (kind === "password-field") ui.passwordField.show(root);
  else if (kind === "search-field") ui.searchField.clear(root);
  else ui.rating.set(root, "2");
}

export async function exerciseNativeFieldOwnership(
  factory: Factory,
  kind: NativeFieldKind,
  mode: RealmMode,
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const root = nativeRoot(source.owner, kind);
    const form = source.owner.document.createElement("form");
    form.append(root);
    source.owner.document.body.append(form);
    let active = source;
    let rejectedPreviousOwner = true;
    if (mode === "adopted") {
      source.ui.enhance(root);
      destination.owner.document.body.append(destination.owner.document.adoptNode(form));
      active = destination;
      try {
        fieldValue(source.ui, kind, root);
        rejectedPreviousOwner = false;
      } catch {
        /* Old owner rejects. */
      }
      fieldValue(active.ui, kind, root);
      source.star.dispose();
    } else if (mode === "automatic") await source.star.whenEnhanced();
    else source.ui.enhance(root);
    const enhancedBeforeFacade = root.dataset.state !== undefined;
    const received: boolean[] = [];
    const native: boolean[] = [];
    root.addEventListener(`jquery-star:${kind}:change`, (event) =>
      received.push(event instanceof (active.owner as Window & typeof globalThis).CustomEvent),
    );
    root.addEventListener("input", (event) =>
      native.push(event instanceof (active.owner as Window & typeof globalThis).Event),
    );
    if (mode === "action") {
      const button = active.owner.document.createElement("button");
      button.type = "button";
      const expression =
        kind === "number-field"
          ? "@ui.number-field.set(2)"
          : kind === "password-field"
            ? "@ui.password-field.show()"
            : kind === "search-field"
              ? "@ui.search-field.clear()"
              : "@ui.rating.set('2')";
      button.setAttribute("data-on:click", expression);
      root.append(button);
      active.jquery(form).star();
      button.click();
    } else if (mode === "adopted") {
      const selector =
        kind === "number-field"
          ? '[data-part="increment"]'
          : kind === "rating"
            ? 'input[value="2"]'
            : "button";
      root.querySelector<HTMLElement>(selector)?.click();
    } else setField(active.ui, kind, root);
    const expected =
      kind === "number-field"
        ? 2
        : kind === "password-field"
          ? true
          : kind === "search-field"
            ? ""
            : "2";
    const operated = fieldValue(active.ui, kind, "#native-sample") === expected;
    const adapter = createRenderAdapter(active.installed);
    const preserved = adapter.begin(form, { preserveRoots: [root] });
    preserved.beforeRemove(root);
    root.remove();
    form.append(root);
    await preserved.commit();
    const retainedAfterPreservation = fieldValue(active.ui, kind, root) === expected;
    const removal = adapter.begin(form);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      setField(active.ui, kind, root);
    } catch {
      rejectedRemovedRoot = true;
    }
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      operated,
      rejectedPreviousOwner,
      retainedAfterPreservation,
      rejectedRemovedRoot,
      receivedOwnerEvents: received.length === 1 && received.every(Boolean),
      receivedNativeEvents:
        kind === "password-field"
          ? native.length === 0
          : native.length === 1 && native.every(Boolean),
    };
  } finally {
    destination.star.dispose();
    source.star.dispose();
    destination.frame.remove();
    source.frame.remove();
  }
}

export async function exerciseNativeFieldReset(
  factory: Factory,
  kind: Exclude<NativeFieldKind, "password-field">,
  adopted: boolean,
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    const root = nativeRoot(source.owner, kind);
    const form = source.owner.document.createElement("form");
    form.append(root);
    source.owner.document.body.append(form);
    source.ui.enhance(root);
    const active = adopted ? destination : source;
    if (adopted) {
      destination.owner.document.body.append(destination.owner.document.adoptNode(form));
      active.ui.enhance(root);
      source.star.dispose();
    }
    setField(active.ui, kind, root);
    const selected = fieldValue(active.ui, kind, root);
    form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
    form.reset();
    await new Promise((resolve) => active.owner.setTimeout(resolve, 5));
    const canceled = fieldValue(active.ui, kind, root) === selected;
    form.reset();
    active.ui.enhance(root);
    await new Promise((resolve) => active.owner.setTimeout(resolve, 5));
    const reset = root.dataset.value === (kind === "search-field" ? "query" : "1");
    return { canceled, reset };
  } finally {
    destination.star.dispose();
    source.star.dispose();
    destination.frame.remove();
    source.frame.remove();
  }
}

type TokenKind = "input-otp" | "tags-input" | "toggle" | "toggle-group";
function tokenRoot(owner: Window, kind: TokenKind): HTMLElement {
  const root = owner.document.createElement(kind === "toggle" ? "button" : "section");
  root.id = "token-sample";
  root.dataset.jqs = kind;
  if (kind === "input-otp") {
    root.dataset.length = "4";
    root.innerHTML =
      '<input data-part="control" value="1"><div data-part="slots"></div><span data-part="status"></span>';
  } else if (kind === "tags-input") {
    root.dataset.value = '["a"]';
    root.dataset.name = "tags";
    root.innerHTML =
      '<input data-part="control" value="Draft"><ul data-part="list"></ul><span data-part="status"></span>';
  } else if (kind === "toggle") root.textContent = "Toggle";
  else {
    root.dataset.value = "a";
    root.dataset.name = "choice";
    root.innerHTML =
      '<button data-part="item" data-value="a">A</button><button data-part="item" data-value="b">B</button><button data-part="item" data-value="c">C</button>';
  }
  return root;
}
function tokenValue(
  ui: ReturnType<typeof uiPlugin.install>,
  kind: TokenKind,
  root: HTMLElement | string,
): string {
  if (kind === "input-otp") return ui.inputOTP.value(root);
  if (kind === "tags-input") return JSON.stringify(ui.tagsInput.value(root));
  if (kind === "toggle") return String(ui.toggle.pressed(root as HTMLButtonElement | string));
  return String(ui.toggleGroup.value(root));
}
function setToken(ui: ReturnType<typeof uiPlugin.install>, kind: TokenKind, root: HTMLElement) {
  if (kind === "input-otp") ui.inputOTP.set(root, "1234");
  else if (kind === "tags-input") ui.tagsInput.add(root, "b");
  else if (kind === "toggle") ui.toggle.press(root as HTMLButtonElement);
  else ui.toggleGroup.select(root, "b");
}
export async function exerciseTokenOwnership(factory: Factory, kind: TokenKind, mode: RealmMode) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const root = tokenRoot(source.owner, kind);
    const form = source.owner.document.createElement("form");
    form.append(root);
    source.owner.document.body.append(form);
    let active = source;
    let rejectedPreviousOwner = true;
    if (mode === "adopted") {
      source.ui.enhance(root);
      destination.owner.document.body.append(destination.owner.document.adoptNode(form));
      active = destination;
      try {
        tokenValue(source.ui, kind, root);
        rejectedPreviousOwner = false;
      } catch {
        /* Old owner rejects. */
      }
      tokenValue(active.ui, kind, root);
      source.star.dispose();
    } else if (mode === "automatic") await source.star.whenEnhanced();
    else source.ui.enhance(root);
    const enhancedBeforeFacade = Boolean(root.dataset.state || root.getAttribute("role"));
    const received: boolean[] = [];
    const native: boolean[] = [];
    root.addEventListener(`jquery-star:${kind}:change`, (event) =>
      received.push(event instanceof (active.owner as Window & typeof globalThis).CustomEvent),
    );
    root.addEventListener("input", (event) =>
      native.push(event instanceof (active.owner as Window & typeof globalThis).Event),
    );
    if (mode === "action") {
      const button = kind === "toggle" ? root : active.owner.document.createElement("button");
      button.setAttribute("type", "button");
      const expression =
        kind === "input-otp"
          ? "@ui.input-otp.set('1234')"
          : kind === "tags-input"
            ? "@ui.tags-input.add('b')"
            : kind === "toggle"
              ? "@ui.toggle.press(true)"
              : "@ui.toggle-group.select('b')";
      button.setAttribute("data-on:click", expression);
      if (button !== root) root.append(button);
      active.jquery(form).star();
      button.click();
    } else if (mode === "adopted") {
      const input = root.querySelector<HTMLInputElement>('input[data-part="control"]');
      if (kind === "input-otp" && input) {
        input.value = "1234";
        input.dispatchEvent(
          new (active.owner as Window & typeof globalThis).Event("input", { bubbles: true }),
        );
      } else if (kind === "tags-input" && input) {
        input.value = "b";
        input.dispatchEvent(
          new (active.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
            bubbles: true,
            key: "Enter",
          }),
        );
      } else if (kind === "toggle") root.click();
      else root.querySelector<HTMLButtonElement>('[data-value="b"]')?.click();
    } else setToken(active.ui, kind, root);
    const expected =
      kind === "input-otp"
        ? "1234"
        : kind === "tags-input"
          ? '["a","b"]'
          : kind === "toggle"
            ? "true"
            : "b";
    const operated = tokenValue(active.ui, kind, "#token-sample") === expected;
    const generated = [
      ...root.querySelectorAll('[data-part="slot"], [data-part="tag"], input[data-generated]'),
    ];
    active.ui.enhance(root);
    const stableGeneratedNodes = generated.every(
      (node) => root.contains(node) && node.ownerDocument === active.owner.document,
    );
    let rovingFocus = true;
    if (kind === "toggle-group") {
      const current = root.querySelector<HTMLButtonElement>('[data-value="b"]');
      current?.focus();
      current?.dispatchEvent(
        new (active.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
          bubbles: true,
          key: "ArrowRight",
        }),
      );
      active.ui.enhance(root);
      const next = root.querySelector<HTMLButtonElement>('[data-value="c"]');
      rovingFocus = active.owner.document.activeElement === next && next?.tabIndex === 0;
    }
    const adapter = createRenderAdapter(active.installed);
    const preserved = adapter.begin(form, { preserveRoots: [root] });
    preserved.beforeRemove(root);
    root.remove();
    form.append(root);
    await preserved.commit();
    const retainedAfterPreservation = tokenValue(active.ui, kind, root) === expected;
    const removal = adapter.begin(form);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      setToken(active.ui, kind, root);
    } catch {
      rejectedRemovedRoot = true;
    }
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      operated,
      rejectedPreviousOwner,
      stableGeneratedNodes,
      rovingFocus,
      retainedAfterPreservation,
      rejectedRemovedRoot,
      receivedOwnerEvents: received.length === 1 && received.every(Boolean),
      receivedNativeEvents:
        kind === "input-otp" || kind === "tags-input"
          ? native.length === 1 && native.every(Boolean)
          : native.length === 0,
    };
  } finally {
    destination.star.dispose();
    source.star.dispose();
    destination.frame.remove();
    source.frame.remove();
  }
}
export async function exerciseOTPReset(factory: Factory, adopted: boolean) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    const root = tokenRoot(source.owner, "input-otp");
    const form = source.owner.document.createElement("form");
    form.append(root);
    source.owner.document.body.append(form);
    source.ui.enhance(root);
    const active = adopted ? destination : source;
    if (adopted) {
      destination.owner.document.body.append(destination.owner.document.adoptNode(form));
      active.ui.enhance(root);
      source.star.dispose();
    }
    active.ui.inputOTP.set(root, "1234");
    form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
    form.reset();
    await new Promise((resolve) => active.owner.setTimeout(resolve, 5));
    const canceled = active.ui.inputOTP.value(root) === "1234";
    form.reset();
    active.ui.enhance(root);
    await new Promise((resolve) => active.owner.setTimeout(resolve, 5));
    return {
      canceled,
      reset:
        active.ui.inputOTP.value(root) === "1" &&
        root.querySelector('[data-part="slots"]')?.textContent === "1",
    };
  } finally {
    destination.star.dispose();
    source.star.dispose();
    destination.frame.remove();
    source.frame.remove();
  }
}

type NavigationKind = "tabs" | "toolbar" | "pagination" | "sidebar";
function navigationRoot(owner: Window, kind: NavigationKind): HTMLElement {
  const root = owner.document.createElement("section");
  root.id = "navigation-sample";
  root.dataset.jqs = kind;
  if (kind === "tabs") {
    root.dataset.value = "a";
    root.dataset.activation = "manual";
    root.innerHTML =
      '<div data-part="list"><button data-part="trigger" data-value="a">A</button><button data-part="trigger" data-value="b">B</button></div><section data-part="panel" data-value="a">A panel</section><section data-part="panel" data-value="b">B panel</section>';
  } else if (kind === "toolbar")
    root.innerHTML =
      '<button data-part="item" data-value="a">A</button><button data-part="item" data-value="b">B</button><input data-part="item" data-value="text" value="Draft">';
  else if (kind === "pagination") {
    root.dataset.page = "1";
    root.dataset.pageCount = "2";
    root.dataset.navigation = "manual";
    root.innerHTML =
      '<a data-part="page" data-page="1" href="#page-1">1</a><a data-part="page" data-page="2" href="#page-2">2</a><span data-part="status"></span>';
  } else {
    root.dataset.value = "expanded";
    root.innerHTML =
      '<aside data-part="panel"><button>Panel control</button></aside><button data-part="trigger">Toggle</button><button data-part="backdrop">Close</button>';
  }
  return root;
}
function navigationValue(
  ui: ReturnType<typeof uiPlugin.install>,
  kind: NavigationKind,
  root: HTMLElement | string,
) {
  if (kind === "tabs") return ui.tabs.value(root);
  if (kind === "toolbar") return ui.toolbar.value(root);
  if (kind === "pagination") return ui.pagination.page(root);
  return ui.sidebar.value(root);
}
function setNavigation(
  ui: ReturnType<typeof uiPlugin.install>,
  kind: NavigationKind,
  root: HTMLElement,
) {
  if (kind === "tabs") ui.tabs.activate(root, "b");
  else if (kind === "toolbar") ui.toolbar.focus(root, "b");
  else if (kind === "pagination") ui.pagination.goTo(root, 2);
  else ui.sidebar.close(root);
}
export async function exerciseNavigationOwnership(
  factory: Factory,
  kind: NavigationKind,
  mode: RealmMode,
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  // Both roots use a desktop viewport here; mobile transitions have separate native coverage.
  source.frame.style.width = destination.frame.style.width = "1000px";
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const root = navigationRoot(source.owner, kind);
    const app = source.owner.document.createElement("main");
    app.append(root);
    source.owner.document.body.append(app);
    let active = source;
    let rejectedPreviousOwner = true;
    if (mode === "adopted") {
      source.ui.enhance(root);
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        navigationValue(source.ui, kind, root);
        rejectedPreviousOwner = false;
      } catch {
        /* Old owner rejects. */
      }
      navigationValue(active.ui, kind, root);
      source.star.dispose();
    } else if (mode === "automatic") await source.star.whenEnhanced();
    else source.ui.enhance(root);
    const enhancedBeforeFacade = Boolean(
      root.dataset.state || root.getAttribute("role") || root.querySelector('[role="tablist"]'),
    );
    const received: boolean[] = [];
    root.addEventListener(`jquery-star:${kind}:change`, (event) =>
      received.push(event instanceof (active.owner as Window & typeof globalThis).CustomEvent),
    );
    if (mode === "action") {
      const button = active.owner.document.createElement("button");
      const expression =
        kind === "tabs"
          ? "@ui.tabs.activate('b')"
          : kind === "toolbar"
            ? "@ui.toolbar.focus('b')"
            : kind === "pagination"
              ? "@ui.pagination.page(2)"
              : "@ui.sidebar.close()";
      button.setAttribute("data-on:click", expression);
      root.append(button);
      active.jquery(app).star();
      button.click();
    } else if (mode === "adopted") {
      if (kind === "toolbar") {
        const first = required(root.querySelector<HTMLElement>('[data-part="item"]'));
        first.focus();
        first.dispatchEvent(
          new (active.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
            bubbles: true,
            key: "ArrowRight",
          }),
        );
      } else
        required(
          root.querySelector<HTMLElement>(
            kind === "tabs"
              ? '[data-part="trigger"][data-value="b"]'
              : kind === "pagination"
                ? '[data-page="2"]'
                : '[data-part="trigger"]',
          ),
        ).click();
    } else setNavigation(active.ui, kind, root);
    const expected = kind === "sidebar" ? false : kind === "pagination" ? 2 : "b";
    const operated = navigationValue(active.ui, kind, "#navigation-sample") === expected;
    let nativeControls = true;
    if (kind === "toolbar") {
      const input = required(root.querySelector("input"));
      input.focus();
      input.setSelectionRange(1, 3);
      const event = new (active.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "ArrowRight",
      });
      input.dispatchEvent(event);
      active.ui.enhance(root);
      nativeControls =
        !event.defaultPrevented &&
        active.owner.document.activeElement === input &&
        input.selectionStart === 1 &&
        input.selectionEnd === 3;
      active.ui.toolbar.focus(root, "b");
    } else if (kind === "tabs") {
      const current = required(
        root.querySelector<HTMLElement>('[data-part="trigger"][data-value="b"]'),
      );
      current.focus();
      current.dispatchEvent(
        new (active.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
          bubbles: true,
          key: "Home",
        }),
      );
      active.ui.enhance(root);
      const first = required(root.querySelector<HTMLElement>('[data-part="trigger"]'));
      nativeControls =
        active.owner.document.activeElement === first &&
        first.tabIndex === 0 &&
        active.ui.tabs.value(root) === "b";
    } else if (kind === "pagination") {
      const link = required(root.querySelector<HTMLElement>('[data-page="1"]'));
      link.addEventListener(
        "click",
        (event) => {
          nativeControls = !event.defaultPrevented;
          event.preventDefault();
        },
        { once: true },
      );
      link.dispatchEvent(
        new (active.owner as Window & typeof globalThis).MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
        }),
      );
      nativeControls &&= active.ui.pagination.page(root) === 2;
    }
    const adapter = createRenderAdapter(active.installed);
    const preserved = adapter.begin(app, { preserveRoots: [root] });
    preserved.beforeRemove(root);
    root.remove();
    app.append(root);
    await preserved.commit();
    const retainedAfterPreservation = navigationValue(active.ui, kind, root) === expected;
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      setNavigation(active.ui, kind, root);
    } catch {
      rejectedRemovedRoot = true;
    }
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      operated,
      rejectedPreviousOwner,
      nativeControls,
      retainedAfterPreservation,
      rejectedRemovedRoot,
      receivedOwnerEvents:
        kind === "toolbar"
          ? received.length === 0
          : received.length === 1 && received.every(Boolean),
    };
  } finally {
    destination.star.dispose();
    source.star.dispose();
    destination.frame.remove();
    source.frame.remove();
  }
}
export async function exerciseSidebarViewportAdoption(factory: Factory, disposedFirst: boolean) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  source.frame.style.width = "1000px";
  destination.frame.style.width = "300px";
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const root = navigationRoot(source.owner, "sidebar");
    source.owner.document.body.append(root);
    source.ui.enhance(root);
    if (disposedFirst) source.star.dispose();
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    source.star.dispose();
    const collapsedOnMobile = root.dataset.mobile === "true" && !destination.ui.sidebar.value(root);
    const trigger = required(root.querySelector<HTMLElement>('[data-part="trigger"]'));
    trigger.click();
    const inside = required(root.querySelector<HTMLElement>('[data-part="panel"] button'));
    inside.focus();
    root.dispatchEvent(
      new (destination.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
        bubbles: true,
        key: "Escape",
      }),
    );
    const returnedFocus =
      !destination.ui.sidebar.value(root) && destination.owner.document.activeElement === trigger;
    destination.frame.style.width = "1000px";
    await new Promise<void>((resolve) => {
      const query = destination.owner.matchMedia("(max-width: 48rem)");
      if (!query.matches) resolve();
      else query.addEventListener("change", () => resolve(), { once: true });
    });
    // Let the component's media listener finish before observing the reflected state.
    await new Promise<void>((resolve) => destination.owner.requestAnimationFrame(() => resolve()));
    return {
      collapsedOnMobile,
      returnedFocus,
      restoredDesktop: root.dataset.mobile === "false" && destination.ui.sidebar.value(root),
    };
  } finally {
    destination.star.dispose();
    source.star.dispose();
    destination.frame.remove();
    source.frame.remove();
  }
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Missing navigation fixture control.");
  return value;
}

type DisclosureStepKind = "collapsible" | "accordion" | "editable" | "stepper";
function disclosureStepRoot(owner: Window, kind: DisclosureStepKind): HTMLElement {
  const root = owner.document.createElement(kind === "collapsible" ? "details" : "section");
  root.dataset.jqs = kind;
  root.id = "disclosure-step-sample";
  const content =
    '<summary data-part="trigger">Open</summary><div data-part="content">Content</div>';
  if (kind === "collapsible") root.innerHTML = content;
  else if (kind === "accordion")
    root.innerHTML = `<details id="disclosure-item" data-part="item">${content}</details><details data-part="item">${content}</details>`;
  else if (kind === "editable")
    root.innerHTML =
      '<div data-part="display"><span data-part="preview">A</span><button data-part="edit">Edit</button></div><div data-part="editor"><input data-part="control" value="A"></div><span data-part="status"></span>';
  else {
    root.dataset.value = "a";
    root.innerHTML =
      '<ol data-part="list"><li data-part="step" data-value="a"><button data-part="trigger">A</button></li><li data-part="step" data-value="b"><button data-part="trigger">B</button></li></ol><section data-part="panel" data-value="a"><input required value="Valid"></section><section data-part="panel" data-value="b">B</section><button data-part="previous">Back</button><button data-part="next">Next</button><span data-part="status"></span>';
  }
  return root;
}
function disclosureItem(root: HTMLElement): HTMLDetailsElement {
  return root.tagName === "DETAILS"
    ? (root as HTMLDetailsElement)
    : required(root.querySelector("details"));
}
function setDisclosureStep(
  ui: ReturnType<typeof uiPlugin.install>,
  kind: DisclosureStepKind,
  root: HTMLElement,
) {
  if (kind === "editable") ui.editable.set(root, "B");
  else if (kind === "stepper") ui.stepper.go(root, "b");
  else ui[kind].open(disclosureItem(root));
}
function disclosureStepValue(kind: DisclosureStepKind, root: HTMLElement) {
  return kind === "editable" || kind === "stepper" ? root.dataset.value : disclosureItem(root).open;
}
export async function exerciseDisclosureStepOwnership(
  factory: Factory,
  kind: DisclosureStepKind,
  mode: RealmMode,
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const root = disclosureStepRoot(source.owner, kind);
    const app = source.owner.document.createElement("main");
    app.append(root);
    source.owner.document.body.append(app);
    let active = source;
    let rejectedPreviousOwner = true;
    if (mode === "adopted") {
      source.ui.enhance(root);
      if (kind === "editable") source.ui.editable.edit(root);
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        setDisclosureStep(source.ui, kind, root);
        rejectedPreviousOwner = false;
      } catch {
        /* Old owner rejects. */
      }
      if (kind === "editable") active.ui.editable.value(root);
      else if (kind === "stepper") active.ui.stepper.value(root);
      else active.ui[kind].close(disclosureItem(root));
      source.star.dispose();
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else active.ui.enhance(root);
    const enhancedBeforeFacade = Boolean(
      kind === "accordion" ? disclosureItem(root).dataset.state : root.dataset.state,
    );
    const events: boolean[] = [];
    const name = kind === "editable" || kind === "stepper" ? "change" : "open";
    root.addEventListener(`jquery-star:${kind}:${name}`, (event) =>
      events.push(event instanceof (active.owner as Window & typeof globalThis).CustomEvent),
    );
    let immediateCancellation = true;
    if (mode === "action") {
      const button = active.owner.document.createElement("button");
      button.setAttribute(
        "data-on:click",
        kind === "editable"
          ? "@ui.editable.edit"
          : kind === "stepper"
            ? "@ui.stepper.go('b')"
            : `@ui.${kind}.open`,
      );
      (kind === "accordion" ? disclosureItem(root) : root).append(button);
      active.jquery(app).star();
      button.click();
      if (kind === "editable") {
        required(root.querySelector("input")).value = "B";
        active.ui.editable.commit(root);
      }
    } else if (mode === "adopted") {
      if (kind === "editable") {
        const control = required(root.querySelector("input"));
        control.value = "B";
        control.dispatchEvent(
          new (active.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
            key: "Enter",
            bubbles: true,
          }),
        );
      } else if (kind === "stepper")
        required(root.querySelector<HTMLElement>('[data-part="next"]')).click();
      else {
        root.addEventListener(
          `jquery-star:${kind}:before-open`,
          (event) => event.preventDefault(),
          { once: true },
        );
        const summary = required(disclosureItem(root).querySelector("summary"));
        summary.click();
        immediateCancellation = !disclosureItem(root).open;
        summary.click();
      }
    } else setDisclosureStep(active.ui, kind, root);
    await new Promise((resolve) => active.owner.setTimeout(resolve, 10));
    const expected = kind === "editable" ? "B" : kind === "stepper" ? "b" : true;
    const operated = disclosureStepValue(kind, root) === expected;
    const receivedOwnerEvents = events.length === 1 && events.every(Boolean);
    const adapter = createRenderAdapter(active.installed);
    const preserved = adapter.begin(app, { preserveRoots: [root] });
    preserved.beforeRemove(root);
    root.remove();
    app.append(root);
    await preserved.commit();
    const retainedAfterPreservation = disclosureStepValue(kind, root) === expected;
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      setDisclosureStep(active.ui, kind, root);
    } catch {
      rejectedRemovedRoot = true;
    }
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      operated,
      receivedOwnerEvents,
      immediateCancellation,
      rejectedPreviousOwner,
      retainedAfterPreservation,
      rejectedRemovedRoot,
    };
  } finally {
    destination.star.dispose();
    source.star.dispose();
    destination.frame.remove();
    source.frame.remove();
  }
}
export async function exerciseDisclosureDefaults(
  factory: Factory,
  kind: "collapsible" | "accordion",
  adopted: boolean,
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const root = disclosureStepRoot(source.owner, kind);
    source.owner.document.body.append(root);
    source.ui.enhance(root);
    let active = source;
    if (adopted) {
      destination.owner.document.body.append(destination.owner.document.adoptNode(root));
      destination.ui.enhance(root);
      source.star.dispose();
      active = destination;
    }
    const first = disclosureItem(root);
    const summary = required(first.querySelector("summary"));
    let opens = 0;
    root.addEventListener(`jquery-star:${kind}:open`, () => {
      opens += 1;
    });
    summary.click();
    active.ui.enhance(root);
    await new Promise((resolve) => active.owner.setTimeout(resolve, 10));
    const pendingNotification =
      opens === 1 && first.open && summary.getAttribute("aria-expanded") === "true";
    let nativeExclusion = true;
    let lateCancellation = true;
    let nativeLink = true;
    if (kind === "accordion") {
      const second = required(root.querySelectorAll("details")[1]);
      const secondSummary = required(second.querySelector("summary"));
      root.addEventListener("click", (event) => event.preventDefault(), { once: true });
      secondSummary.click();
      lateCancellation = first.open && !second.open;
      const link = active.owner.document.createElement("a");
      link.href = "#content";
      link.textContent = "Native link";
      secondSummary.append(link);
      root.addEventListener("click", (event) => event.preventDefault(), { once: true });
      link.click();
      nativeLink = first.open && !second.open;
      secondSummary.click();
      await new Promise((resolve) => active.owner.setTimeout(resolve, 10));
      nativeExclusion =
        !first.open &&
        second.open &&
        required(second.querySelector("summary")).getAttribute("aria-expanded") === "true";
    }
    return { pendingNotification, nativeExclusion, lateCancellation, nativeLink };
  } finally {
    destination.star.dispose();
    source.star.dispose();
    destination.frame.remove();
    source.frame.remove();
  }
}
export async function exerciseDraftCompletionAdoption(
  factory: Factory,
  kind: "editable" | "stepper",
  disposedFirst: boolean,
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const root = disclosureStepRoot(source.owner, kind);
    source.owner.document.body.append(root);
    source.ui.enhance(root);
    if (kind === "editable") {
      source.ui.editable.edit(root);
      const control = required(root.querySelector("input"));
      control.value = "Draft";
      control.setSelectionRange(1, 3);
    } else {
      source.ui.stepper.go(root, "b");
      source.ui.stepper.next(root);
    }
    if (disposedFirst) source.star.dispose();
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    source.star.dispose();
    if (kind === "editable") {
      const control = required(root.querySelector("input"));
      const retained =
        destination.ui.editable.value(root) === "A" &&
        control.value === "Draft" &&
        control.selectionStart === 1 &&
        control.selectionEnd === 3;
      destination.ui.editable.cancel(root);
      return {
        retained,
        operated: control.value === "A" && !destination.ui.editable.editing(root),
      };
    }
    const retained =
      root.dataset.state === "complete" &&
      destination.ui.stepper.value(root) === "b" &&
      required(root.querySelector<HTMLButtonElement>('[data-part="next"]')).disabled;
    destination.ui.stepper.complete(root, "b", false);
    return {
      retained,
      operated:
        root.dataset.state === "active" &&
        !required(root.querySelector<HTMLButtonElement>('[data-part="next"]')).disabled,
    };
  } finally {
    destination.star.dispose();
    source.star.dispose();
    destination.frame.remove();
    source.frame.remove();
  }
}

export async function exerciseSelectOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<form><label for="realm-choice-control">Choice</label><section id="realm-choice" data-jqs="select"><select id="realm-choice-control" data-part="control" name="choice"><option value="a" selected>Alpha</option><option value="b">Beta</option><optgroup label="Unavailable" disabled><option value="x">Unavailable</option></optgroup><option value="c">Charlie</option></select></section></form>';
    source.owner.document.body.append(app);
    const form = required(app.querySelector("form"));
    const root = required(app.querySelector<HTMLElement>("section"));
    const control = required(root.querySelector("select"));
    let active = source;
    let rejectedPreviousOwner = true;
    let retainedNativeValue = true;
    const key = (value: string): void => {
      const constructors = active.owner as Window & typeof globalThis;
      required(root.querySelector<HTMLElement>('[data-part="trigger"]')).dispatchEvent(
        new constructors.KeyboardEvent("keydown", { key: value, bubbles: true }),
      );
    };
    const adopted = mode === "adopted" || mode === "disposed-first" || mode === "facade";
    if (adopted) {
      source.ui.select.open(root);
      key("ArrowDown");
      if (mode === "facade") control.value = "c";
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.select.value(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected previous-owner rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") active.ui.select.value(root);
      else active.ui.enhance(root);
      source.star.dispose();
      retainedNativeValue = control.value === (mode === "facade" ? "c" : "a");
    } else if (mode === "automatic") await source.star.whenEnhanced();
    else source.ui.enhance(root);
    const trigger = required(root.querySelector<HTMLElement>('[data-part="trigger"]'));
    const content = required(root.querySelector<HTMLElement>('[data-part="content"]'));
    const beta = required(content.querySelector<HTMLElement>('[data-value="b"]'));
    const charlie = required(content.querySelector<HTMLElement>('[data-value="c"]'));
    const enhancedBeforeFacade = root.dataset.state !== undefined;
    const constructors = active.owner as Window & typeof globalThis;
    const native: boolean[] = [];
    const component: boolean[] = [];
    control.addEventListener("input", (event) => native.push(event instanceof constructors.Event));
    control.addEventListener("change", (event) => native.push(event instanceof constructors.Event));
    root.addEventListener("jquery-star:select:change", (event) =>
      component.push(event instanceof constructors.CustomEvent),
    );
    if (mode === "action") {
      const button = active.owner.document.createElement("button");
      button.type = "button";
      button.setAttribute("data-on:click", "@ui.select.select('#realm-choice', 'c')");
      root.append(button);
      active.jquery(root).star();
      button.click();
      retainedNativeValue = control.value === "c";
    }
    if (!adopted) {
      key("ArrowDown");
      if (mode === "action") key("Home");
      key("ArrowDown");
    }
    const activeBefore = trigger.getAttribute("aria-activedescendant");
    const expectedActive = mode === "facade" ? charlie.id : beta.id;
    const retainedExploration =
      activeBefore === expectedActive &&
      root.dataset.state === "open" &&
      content.matches(":popover-open");
    active.ui.enhance(root);
    const stableOptions =
      content.querySelector('[data-value="b"]') === beta &&
      trigger.getAttribute("aria-activedescendant") === activeBefore;
    if (mode === "facade") {
      key("Home");
      key("ArrowDown");
    }
    root.addEventListener("jquery-star:select:before-close", (event) => event.preventDefault(), {
      once: true,
    });
    active.ui.select.close(root);
    const canceledClose = root.dataset.state === "open" && content.matches(":popover-open");
    key("Enter");
    const operated =
      control.value === "b" && root.dataset.state === "closed" && !content.matches(":popover-open");
    const nativeSubmission = new constructors.FormData(form).get("choice") === "b";
    content.addEventListener("beforetoggle", (event) => event.preventDefault(), { once: true });
    active.ui.select.open(root);
    const canceledNativeOpen = root.dataset.state === "closed" && !content.matches(":popover-open");
    form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
    form.reset();
    active.ui.enhance(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const canceledReset = control.value === "b" && root.dataset.value === "b";
    form.reset();
    active.ui.enhance(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const acceptedReset = control.value === "a" && root.dataset.value === "a";
    key("ArrowDown");
    key("ArrowDown");
    key("ArrowDown");
    const skipsDisabledGroup = trigger.getAttribute("aria-activedescendant") === charlie.id;
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    form.append(root);
    await preserve.commit();
    const retainedAfterPreservation =
      root.dataset.state === "open" &&
      content.matches(":popover-open") &&
      trigger.getAttribute("aria-activedescendant") === charlie.id;
    key("Enter");
    const selectedAfterPreservation = control.value === "c";
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      active.ui.select.open(root);
    } catch {
      rejectedRemovedRoot = true;
    }
    trigger.click();
    beta.click();
    const releasedNativeBinding = control.value === "c" && !content.matches(":popover-open");
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      retainedNativeValue,
      rejectedPreviousOwner,
      retainedExploration,
      stableOptions,
      canceledClose,
      operated,
      nativeSubmission,
      canceledReset,
      acceptedReset,
      skipsDisabledGroup,
      canceledNativeOpen,
      retainedAfterPreservation,
      selectedAfterPreservation,
      rejectedRemovedRoot,
      releasedNativeBinding,
      receivedOwnerEvents: component.length > 0 && component.every(Boolean),
      receivedNativeEvents: native.length >= 2 && native.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseComboboxOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<form><label for="realm-combo-control">Choice</label><section id="realm-combo" data-jqs="combobox" data-filter="manual"><input id="realm-combo-control" data-part="control" name="query"><input data-part="value" type="hidden" name="choice" value="a"><div data-part="content"><div data-part="option" data-value="a">Alpha</div><div data-part="option" data-value="b">Beta</div><div data-part="option" data-value="x" data-disabled>Unavailable</div><div data-part="option" data-value="c">Charlie</div><div data-part="empty">No choices</div><div data-part="loading">Loading</div></div></section></form>';
    source.owner.document.body.append(app);
    const form = required(app.querySelector("form"));
    const root = required(app.querySelector<HTMLElement>("section"));
    const control = required(root.querySelector<HTMLInputElement>('[data-part="control"]'));
    const hidden = required(root.querySelector<HTMLInputElement>('[data-part="value"]'));
    const content = required(root.querySelector<HTMLElement>('[data-part="content"]'));
    const beta = required(content.querySelector<HTMLElement>('[data-value="b"]'));
    const charlie = required(content.querySelector<HTMLElement>('[data-value="c"]'));
    let active = source;
    const key = (key: string, extra: KeyboardEventInit = {}): void => {
      const constructors = active.owner as Window & typeof globalThis;
      control.dispatchEvent(
        new constructors.KeyboardEvent("keydown", { key, bubbles: true, ...extra }),
      );
    };
    const query = (value: string): void => {
      const constructors = active.owner as Window & typeof globalThis;
      control.value = value;
      control.dispatchEvent(new constructors.Event("input", { bubbles: true }));
    };
    const adopted = mode === "adopted" || mode === "disposed-first" || mode === "facade";
    let rejectedPreviousOwner = true;
    if (adopted) {
      source.ui.enhance(root);
      query("a");
      key("ArrowDown");
      control.setSelectionRange(0, 1);
      control.dispatchEvent(
        new (source.owner as Window & typeof globalThis).CompositionEvent("compositionstart", {
          bubbles: true,
        }),
      );
      if (mode === "facade") hidden.value = "c";
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.combobox.value(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected previous-owner rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") active.ui.combobox.value(root);
      else active.ui.enhance(root);
      source.star.dispose();
    } else if (mode === "automatic") await source.star.whenEnhanced();
    else source.ui.enhance(root);
    const enhancedBeforeFacade = root.dataset.state !== undefined;
    const constructors = active.owner as Window & typeof globalThis;
    const native: boolean[] = [];
    const component: boolean[] = [];
    root.addEventListener("input", (event) => native.push(event instanceof constructors.Event));
    root.addEventListener("change", (event) => native.push(event instanceof constructors.Event));
    root.addEventListener("jquery-star:combobox:select", (event) =>
      component.push(event instanceof constructors.CustomEvent),
    );
    let actionSelected = true;
    if (mode === "action") {
      const button = active.owner.document.createElement("button");
      button.type = "button";
      button.setAttribute("data-on:click", "@ui.combobox.select('#realm-combo', 'c')");
      root.append(button);
      active.jquery(root).star();
      button.click();
      actionSelected = hidden.value === "c";
    }
    if (!adopted) {
      query("a");
      key("ArrowDown");
      control.setSelectionRange(0, 1);
      control.dispatchEvent(
        new constructors.CompositionEvent("compositionstart", { bubbles: true }),
      );
    }
    const expectedValue = mode === "facade" ? "c" : "";
    const expectedActive = mode === "facade" ? charlie.id : beta.id;
    const retainedDraft =
      control.value === "a" &&
      hidden.value === expectedValue &&
      control.selectionStart === 0 &&
      control.selectionEnd === 1;
    const retainedExploration =
      control.getAttribute("aria-activedescendant") === expectedActive &&
      root.dataset.state === "open" &&
      content.matches(":popover-open");
    active.ui.enhance(root);
    const stableOptions =
      root.querySelector('[data-part="value"]') === hidden &&
      content.querySelector('[data-value="b"]') === beta &&
      control.getAttribute("aria-activedescendant") === expectedActive;
    key("Enter");
    const retainedComposition = hidden.value === expectedValue && root.dataset.state === "open";
    control.dispatchEvent(new constructors.CompositionEvent("compositionend", { bubbles: true }));
    if (mode === "facade") key("ArrowUp");
    root.addEventListener("jquery-star:combobox:before-close", (event) => event.preventDefault(), {
      once: true,
    });
    active.ui.combobox.close(root);
    const canceledClose = root.dataset.state === "open" && content.matches(":popover-open");
    key("Enter");
    const operated =
      hidden.value === "b" &&
      control.value === "Beta" &&
      root.dataset.state === "closed" &&
      !content.matches(":popover-open");
    const submission = new constructors.FormData(form);
    const nativeSubmission = submission.get("choice") === "b" && submission.get("query") === "Beta";
    content.addEventListener("beforetoggle", (event) => event.preventDefault(), { once: true });
    active.ui.combobox.open(root);
    const canceledNativeOpen = root.dataset.state === "closed" && !content.matches(":popover-open");
    form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
    form.reset();
    active.ui.enhance(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const canceledReset = hidden.value === "b" && control.value === "Beta";
    form.reset();
    active.ui.enhance(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const acceptedReset =
      hidden.value === "a" && control.value === "Alpha" && root.dataset.value === "a";
    query("a");
    key("ArrowDown");
    key("ArrowDown");
    const skipsDisabled = control.getAttribute("aria-activedescendant") === charlie.id;
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    form.append(root);
    await preserve.commit();
    const retainedAfterPreservation =
      root.dataset.state === "open" &&
      content.matches(":popover-open") &&
      control.value === "a" &&
      control.getAttribute("aria-activedescendant") === charlie.id;
    key("Enter");
    const selectedAfterPreservation = hidden.value === "c";
    active.ui.combobox.open(root);
    root.dataset.inline = "";
    active.ui.enhance(root);
    const inlineTransition =
      !content.hasAttribute("popover") && !content.hidden && root.dataset.state === "open";
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      active.ui.combobox.open(root);
    } catch {
      rejectedRemovedRoot = true;
    }
    control.click();
    beta.click();
    const releasedNativeBinding = hidden.value === "c" && content.hidden;
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      actionSelected,
      rejectedPreviousOwner,
      retainedDraft,
      retainedExploration,
      stableOptions,
      retainedComposition,
      canceledClose,
      operated,
      nativeSubmission,
      canceledNativeOpen,
      canceledReset,
      acceptedReset,
      skipsDisabled,
      retainedAfterPreservation,
      selectedAfterPreservation,
      inlineTransition,
      rejectedRemovedRoot,
      releasedNativeBinding,
      receivedOwnerEvents: component.length > 0 && component.every(Boolean),
      receivedNativeEvents: native.length >= 3 && native.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseMultiSelectOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<form><label for="realm-multi-control">Choices</label><section id="realm-multi" data-jqs="multi-select" data-max="3"><select id="realm-multi-control" data-part="control" name="choices" multiple required><option value="a" selected disabled>Locked Alpha</option><option value="b">Beta</option><option value="c">Charlie</option><optgroup label="Unavailable" disabled><option value="x">Unavailable</option></optgroup></select></section></form>';
    source.owner.document.body.append(app);
    const form = required(app.querySelector("form"));
    const root = required(app.querySelector<HTMLElement>("section"));
    const control = required(root.querySelector("select"));
    let active = source;
    const values = (): string =>
      JSON.stringify(Array.from(control.selectedOptions, (option) => option.value));
    const key = (key: string, extra: KeyboardEventInit = {}): void => {
      const constructors = active.owner as Window & typeof globalThis;
      required(root.querySelector<HTMLElement>('[data-part="content"]')).dispatchEvent(
        new constructors.KeyboardEvent("keydown", { key, bubbles: true, ...extra }),
      );
    };
    const adopted = mode === "adopted" || mode === "disposed-first" || mode === "facade";
    let rejectedPreviousOwner = true;
    let firstTag: Element | null = null;
    if (adopted) {
      source.ui.multiSelect.open(root);
      source.ui.multiSelect.select(root, "b");
      key("ArrowDown");
      firstTag = root.querySelector('[data-part="tag"]');
      if (mode === "facade")
        for (const option of control.options)
          option.selected = option.value === "a" || option.value === "c";
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.multiSelect.value(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected previous-owner rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") active.ui.multiSelect.value(root);
      else active.ui.enhance(root);
      source.star.dispose();
    } else if (mode === "automatic") await source.star.whenEnhanced();
    else source.ui.enhance(root);
    const enhancedBeforeFacade = root.dataset.state !== undefined;
    const content = required(root.querySelector<HTMLElement>('[data-part="content"]'));
    const beta = required(content.querySelector<HTMLElement>('[data-value="b"]'));
    const charlie = required(content.querySelector<HTMLElement>('[data-value="c"]'));
    const constructors = active.owner as Window & typeof globalThis;
    const native: boolean[] = [];
    const component: boolean[] = [];
    control.addEventListener("input", (event) => native.push(event instanceof constructors.Event));
    control.addEventListener("change", (event) => native.push(event instanceof constructors.Event));
    root.addEventListener("jquery-star:multi-select:change", (event) =>
      component.push(event instanceof constructors.CustomEvent),
    );
    let actionSelected = true;
    if (mode === "action") {
      const button = active.owner.document.createElement("button");
      button.type = "button";
      button.setAttribute("data-on:click", "@ui.multi-select.set('#realm-multi', ['b'])");
      root.append(button);
      active.jquery(root).star();
      button.click();
      actionSelected = values() === '["a","b"]';
    }
    if (!adopted) {
      active.ui.multiSelect.select(root, "b");
      active.ui.multiSelect.open(root);
      key("ArrowDown");
      firstTag = root.querySelector('[data-part="tag"]');
    }
    const retainedNativeValue = values() === (mode === "facade" ? '["a","c"]' : '["a","b"]');
    const retainedExploration =
      root.dataset.state === "open" &&
      content.matches(":popover-open") &&
      content.getAttribute("aria-activedescendant") === charlie.id;
    const stableTag = mode === "facade" || root.querySelector('[data-part="tag"]') === firstTag;
    active.ui.enhance(root);
    const stableOptions =
      content.querySelector('[data-value="b"]') === beta &&
      content.getAttribute("aria-activedescendant") === charlie.id;
    const previous = values();
    key("Enter", { isComposing: true });
    key("Enter", { ctrlKey: true });
    const nativeComposition = values() === previous;
    active.ui.multiSelect.set(root, ["b"]);
    root.addEventListener(
      "jquery-star:multi-select:before-change",
      (event) => event.preventDefault(),
      { once: true },
    );
    key(" ");
    const canceledSelection = values() === '["a","b"]';
    key(" ");
    const operated = values() === '["a","b","c"]' && root.dataset.state === "open";
    const nativeSubmission =
      JSON.stringify(new constructors.FormData(form).getAll("choices")) === '["b","c"]';
    const lockedTag = required(
      root.querySelector<HTMLButtonElement>('[data-part="remove"][data-value="a"]'),
    ).disabled;
    root.dataset.max = "2";
    key("a", { ctrlKey: true });
    const maximum = values() === '["a","b"]';
    key("a", { metaKey: true });
    const clearsEnabled =
      values() === '["a"]' && new constructors.FormData(form).getAll("choices").length === 0;
    required(control.options[0]).disabled = false;
    active.ui.enhance(root);
    active.ui.multiSelect.clear(root);
    const nativeRequired =
      control.validity.valueMissing &&
      new constructors.FormData(form).getAll("choices").length === 0;
    required(control.options[0]).disabled = true;
    active.ui.enhance(root);
    active.ui.multiSelect.set(root, ["b"]);
    form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
    form.reset();
    active.ui.enhance(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const canceledReset = values() === '["b"]';
    form.reset();
    active.ui.enhance(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const acceptedReset = values() === '["a"]' && root.dataset.value === '["a"]';
    root.addEventListener(
      "jquery-star:multi-select:before-close",
      (event) => event.preventDefault(),
      { once: true },
    );
    active.ui.multiSelect.close(root);
    const canceledClose = root.dataset.state === "open" && content.matches(":popover-open");
    active.ui.multiSelect.close(root);
    content.addEventListener("beforetoggle", (event) => event.preventDefault(), { once: true });
    active.ui.multiSelect.open(root);
    const canceledNativeOpen =
      root.dataset.state === "selected" && !content.matches(":popover-open");
    active.ui.multiSelect.open(root);
    key("ArrowDown");
    const currentFocus = active.owner.document.activeElement === content;
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    form.append(root);
    await preserve.commit();
    const retainedAfterPreservation =
      root.dataset.state === "open" &&
      content.matches(":popover-open") &&
      content.getAttribute("aria-activedescendant") === charlie.id;
    key(" ");
    const selectedAfterPreservation = values() === '["a","c"]';
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      active.ui.multiSelect.open(root);
    } catch {
      rejectedRemovedRoot = true;
    }
    beta.click();
    const releasedNativeBinding = values() === '["a","c"]' && !content.matches(":popover-open");
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      rejectedPreviousOwner,
      actionSelected,
      retainedNativeValue,
      retainedExploration,
      stableTag,
      stableOptions,
      nativeComposition,
      canceledSelection,
      operated,
      nativeSubmission,
      lockedTag,
      maximum,
      clearsEnabled,
      nativeRequired,
      canceledReset,
      acceptedReset,
      canceledClose,
      canceledNativeOpen,
      currentFocus,
      retainedAfterPreservation,
      selectedAfterPreservation,
      rejectedRemovedRoot,
      releasedNativeBinding,
      receivedOwnerEvents: component.length > 0 && component.every(Boolean),
      receivedNativeEvents: native.length >= 2 && native.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseColorPickerOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<form><section id="realm-color" data-jqs="color-picker"><input data-part="control" type="color" name="accent" value="#112233"><input data-part="value"><span data-part="preview"></span><button type="button" data-part="swatch" data-value="#445566">Next</button><button type="button" data-part="swatch" data-value="#abcdef" disabled>Unavailable</button><p data-part="status"></p></section></form>';
    source.owner.document.body.append(app);
    const form = required(app.querySelector("form"));
    const root = required(app.querySelector<HTMLElement>("section"));
    const control = required(root.querySelector<HTMLInputElement>('[data-part="control"]'));
    const text = required(root.querySelector<HTMLInputElement>('[data-part="value"]'));
    const swatch = required(root.querySelector<HTMLButtonElement>('[data-part="swatch"]'));
    let active = source;
    let rejectedPreviousOwner = true;
    let retainedNativeValue = true;
    let retainedDraft = true;
    const adopted = mode === "adopted" || mode === "disposed-first" || mode === "facade";
    if (adopted) {
      source.ui.enhance(root);
      source.ui.colorPicker.set(root, "#445566");
      control.value = "#778899";
      text.value = "#draft";
      text.setSelectionRange(2, 5);
      text.dispatchEvent(
        new (source.owner as Window & typeof globalThis).CompositionEvent("compositionstart", {
          bubbles: true,
        }),
      );
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.colorPicker.value(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected document ownership rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") active.ui.colorPicker.value(root);
      else active.ui.enhance(root);
      source.star.dispose();
      retainedNativeValue = control.value === "#778899";
      retainedDraft =
        text.value === "#draft" && text.selectionStart === 2 && text.selectionEnd === 5;
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else active.ui.enhance(root);
    const enhancedBeforeFacade = root.dataset.state === "ready";
    const constructors = active.owner as Window & typeof globalThis;
    const native: boolean[] = [];
    const component: boolean[] = [];
    control.addEventListener("input", (event) => native.push(event instanceof constructors.Event));
    control.addEventListener("change", (event) => native.push(event instanceof constructors.Event));
    root.addEventListener("jquery-star:color-picker:change", (event) =>
      component.push(event instanceof constructors.CustomEvent),
    );
    if (!adopted)
      text.dispatchEvent(new constructors.CompositionEvent("compositionstart", { bubbles: true }));
    text.value = "#445566";
    const composingKey = new constructors.KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    });
    text.dispatchEvent(composingKey);
    const composition =
      !composingKey.defaultPrevented && control.value === (adopted ? "#778899" : "#112233");
    text.dispatchEvent(new constructors.CompositionEvent("compositionend", { bubbles: true }));
    if (mode === "action") {
      const button = active.owner.document.createElement("button");
      button.type = "button";
      button.setAttribute("data-on:click", "@ui.color-picker.set('#445566')");
      root.append(button);
      active.jquery(root).star();
      button.click();
      button.setAttribute("data-on:click", "@ui.color-picker.set('#realm-color', '#778899')");
      await active.star.whenEnhanced();
      button.click();
    } else swatch.click();
    const expected = mode === "action" ? "#778899" : "#445566";
    const operated = control.value === expected && root.dataset.value === expected;
    const nativeSubmission = new constructors.FormData(form).get("accent") === expected;
    text.value = "invalid";
    text.dispatchEvent(new constructors.Event("change", { bubbles: true }));
    text.setSelectionRange(1, 3);
    active.ui.enhance(root);
    const invalidDraft =
      text.value === "invalid" &&
      text.selectionStart === 1 &&
      text.selectionEnd === 3 &&
      text.getAttribute("aria-invalid") === "true" &&
      root.dataset.state === "invalid";
    active.ui.colorPicker.set(root, expected);
    const clearsInvalid = !text.hasAttribute("aria-invalid") && root.dataset.state === "ready";
    root.addEventListener(
      "jquery-star:color-picker:before-change",
      (event) => {
        active.ui.colorPicker.set(root, "#abcdef");
        event.preventDefault();
      },
      { once: true },
    );
    active.ui.colorPicker.set(root, "#556677");
    const newerCancellation = control.value === "#abcdef";
    control.readOnly = true;
    active.ui.colorPicker.set(root, "#445566");
    const readonly = control.value === "#abcdef";
    control.readOnly = false;
    const authoredDisabled = required(
      root.querySelector<HTMLButtonElement>('[data-value="#abcdef"]'),
    ).disabled;
    control.setAttribute("alpha", "");
    control.setAttribute("colorspace", "display-p3");
    active.ui.enhance(root);
    const nativeProbe = control.cloneNode() as HTMLInputElement;
    nativeProbe.value = "red";
    const acceptsCSS = nativeProbe.value !== "#000000";
    let nativeNormalization = true;
    for (const candidate of [
      "red",
      "black",
      "rgb(10, 20, 30)",
      "#12345680",
      "color(display-p3 0.2 0.3 0.4)",
    ]) {
      active.ui.colorPicker.set(root, "#112233");
      const previous = control.value;
      nativeProbe.value = candidate;
      active.ui.colorPicker.set(root, candidate);
      nativeNormalization &&= acceptsCSS
        ? control.value === nativeProbe.value
        : control.value === previous && root.dataset.state === "invalid";
    }
    let invalidColors = true;
    for (const candidate of [
      "not-a-color",
      "inherit",
      "initial",
      "unset",
      "revert",
      "revert-layer",
      "currentColor",
      "var(--missing)",
    ]) {
      active.ui.colorPicker.set(root, "#112233");
      const previous = control.value;
      active.ui.colorPicker.set(root, candidate);
      invalidColors &&= control.value === previous && root.dataset.state === "invalid";
    }
    control.removeAttribute("alpha");
    control.removeAttribute("colorspace");
    active.ui.enhance(root);
    active.ui.colorPicker.set(root, "#445566");
    form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
    form.reset();
    active.ui.enhance(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const canceledReset = control.value === "#445566" && root.dataset.value === "#445566";
    form.reset();
    active.ui.enhance(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const acceptedReset =
      control.value === "#112233" &&
      root.dataset.value === "#112233" &&
      control.defaultValue === "#112233";
    text.value = "draft";
    text.setSelectionRange(1, 3);
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    form.append(root);
    await preserve.commit();
    const retainedAfterPreservation =
      text.value === "draft" && text.selectionStart === 1 && text.selectionEnd === 3;
    swatch.click();
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      active.ui.colorPicker.set(root, "#abcdef");
    } catch {
      rejectedRemovedRoot = true;
    }
    control.value = "#778899";
    control.dispatchEvent(new constructors.Event("input", { bubbles: true }));
    const releasedNativeBinding = root.dataset.value === "#445566";
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      retainedNativeValue,
      retainedDraft,
      rejectedPreviousOwner,
      composition,
      operated,
      nativeSubmission,
      invalidDraft,
      clearsInvalid,
      newerCancellation,
      readonly,
      authoredDisabled,
      nativeNormalization,
      invalidColors,
      canceledReset,
      acceptedReset,
      retainedAfterPreservation,
      rejectedRemovedRoot,
      releasedNativeBinding,
      receivedOwnerEvents: component.length > 0 && component.every(Boolean),
      receivedNativeEvents: native.length >= 2 && native.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseFileUploadOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<form><section id="realm-upload" data-jqs="file-upload"><input data-part="control" type="file" name="assets" multiple accept=".txt"><label data-part="dropzone">Files</label><ul data-part="list"></ul><p data-part="status"></p></section></form>';
    source.owner.document.body.append(app);
    const form = required(app.querySelector("form"));
    const root = required(app.querySelector<HTMLElement>("section"));
    const control = required(root.querySelector("input"));
    const list = required(root.querySelector('[data-part="list"]'));
    let active = source;
    const constructors = () => active.owner as Window & typeof globalThis;
    const make = (name: string, contents = name) =>
      new (constructors().File)([contents], name, { type: "text/plain", lastModified: 123 });
    const assign = (files: File[], notify = true) => {
      const transfer = new (constructors().DataTransfer)();
      for (const file of files) transfer.items.add(file);
      control.files = transfer.files;
      if (notify) control.dispatchEvent(new (constructors().Event)("change", { bubbles: true }));
    };
    const drag = (type: string, files: File[] = []) => {
      const transfer = new (constructors().DataTransfer)();
      for (const file of files.length ? files : [make("drag.txt")]) transfer.items.add(file);
      root.dispatchEvent(
        new (constructors().DragEvent)(type, {
          dataTransfer: transfer,
          bubbles: true,
          cancelable: true,
        }),
      );
    };
    const adopted = mode === "adopted" || mode === "disposed-first" || mode === "facade";
    let rejectedPreviousOwner = true;
    let retainedSelection = true;
    let retainedRows = true;
    let retainedDrag = true;
    if (adopted) {
      source.ui.enhance(root);
      const first = make("same.txt", "one");
      assign([first]);
      const row = list.firstElementChild;
      const replacement = make("same.txt", "two");
      assign([replacement], false);
      drag("dragenter");
      drag("dragenter");
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.fileUpload.files(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected document ownership rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") active.ui.fileUpload.files(root);
      else active.ui.enhance(root);
      source.star.dispose();
      retainedSelection = active.ui.fileUpload.files(root)[0] === replacement;
      retainedRows = list.firstElementChild === row;
      retainedDrag = root.dataset.state === "dragging";
      drag("dragleave");
      retainedDrag &&= root.dataset.state === "dragging";
      drag("dragleave");
      retainedDrag &&= root.dataset.state === "ready";
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else active.ui.enhance(root);
    const enhancedBeforeFacade = root.dataset.state !== undefined;
    const native: boolean[] = [];
    const component: boolean[] = [];
    root.addEventListener("input", (event) => native.push(event instanceof constructors().Event));
    root.addEventListener("change", (event) => native.push(event instanceof constructors().Event));
    root.addEventListener("jquery-star:file-upload:change", (event) =>
      component.push(event instanceof constructors().CustomEvent),
    );
    const first = make("same.txt", "one");
    const second = make("same.txt", "two");
    assign([first]);
    const row = list.firstElementChild;
    assign([second]);
    const replacedFile =
      active.ui.fileUpload.files(root)[0] === second && control.files?.[0] === second;
    const stableRows = list.firstElementChild === row;
    const submitted = new (constructors().FormData)(form).get("assets");
    const nativeSubmission =
      submitted instanceof constructors().File && (await submitted.text()) === "two";
    drag("drop", [make("added.txt")]);
    const dropped =
      active.ui.fileUpload
        .files(root)
        .map((file) => file.name)
        .join(",") === "same.txt,added.txt";
    let actions = true;
    if (mode === "action") {
      const button = active.owner.document.createElement("button");
      button.type = "button";
      button.setAttribute("data-on:click", "@ui.fileUpload.remove('added.txt')");
      root.append(button);
      active.jquery(root).star();
      button.click();
      actions = active.ui.fileUpload.files(root).length === 1;
      button.setAttribute("data-on:click", "@ui.fileUpload.clear('#realm-upload')");
      await active.star.whenEnhanced();
      button.click();
      actions &&= active.ui.fileUpload.files(root).length === 0;
      assign([second]);
    } else active.ui.fileUpload.remove(root, "added.txt");
    const nativeRemoval =
      control.files?.length === 1 &&
      control.files[0] === second &&
      new (constructors().FormData)(form).getAll("assets").length === 1;
    root.dataset.maxFiles = "1";
    drag("drop", [make("bad.png")]);
    const validation =
      root.dataset.state === "invalid" &&
      control.files?.length === 1 &&
      control.files[0] === second;
    delete root.dataset.maxFiles;
    const newer = make("newer.txt");
    root.addEventListener(
      "jquery-star:file-upload:before-change",
      (event) => {
        assign([newer]);
        event.preventDefault();
      },
      { once: true },
    );
    assign([make("older.txt")]);
    const newerCancellation =
      control.files?.[0] === newer && active.ui.fileUpload.files(root)[0] === newer;
    const fieldset = active.owner.document.createElement("fieldset");
    root.before(fieldset);
    fieldset.append(root);
    fieldset.disabled = true;
    active.ui.fileUpload.clear(root);
    const disabled = control.files?.[0] === newer;
    fieldset.disabled = false;
    fieldset.before(root);
    fieldset.remove();
    active.ui.enhance(root);
    form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
    form.reset();
    active.ui.enhance(root);
    await active.star.whenEnhanced();
    const canceledReset = control.files?.[0] === newer && root.dataset.count === "1";
    form.reset();
    active.ui.enhance(root);
    await active.star.whenEnhanced();
    const acceptedReset = control.files?.length === 0 && root.dataset.count === "0";
    assign([second]);
    control.value = "";
    active.ui.enhance(root);
    const silentClear = active.ui.fileUpload.files(root).length === 0 && root.dataset.count === "0";
    assign([second]);
    const preservedRow = list.firstElementChild;
    drag("dragenter");
    drag("dragenter");
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    form.append(root);
    await preserve.commit();
    const retainedAfterPreservation =
      list.firstElementChild === preservedRow && root.dataset.state === "dragging";
    drag("dragleave");
    drag("dragleave");
    active.ui.fileUpload.clear(root);
    const nativeClear =
      control.files?.length === 0 && root.dataset.count === "0" && !Object.hasOwn(control, "files");
    assign([second]);
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      active.ui.fileUpload.clear(root);
    } catch {
      rejectedRemovedRoot = true;
    }
    assign([]);
    const releasedNativeBinding = root.dataset.count === "1";
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      rejectedPreviousOwner,
      retainedSelection,
      retainedRows,
      retainedDrag,
      replacedFile,
      stableRows,
      nativeSubmission,
      dropped,
      actions,
      nativeRemoval,
      validation,
      newerCancellation,
      disabled,
      canceledReset,
      acceptedReset,
      silentClear,
      retainedAfterPreservation,
      nativeClear,
      rejectedRemovedRoot,
      releasedNativeBinding,
      receivedOwnerEvents: component.length > 0 && component.every(Boolean),
      receivedNativeEvents: native.length >= 2 && native.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseTreeOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<ul id="realm-tree" data-jqs="tree" data-selection="multiple" data-value=\'["a"]\'><li data-part="item" data-value="a" data-expanded="true"><div data-part="row"><span data-part="toggle"></span><span data-part="label">Alpha</span><button type="button">Native action</button></div><ul data-part="group"><li data-part="item" data-value="c"><div data-part="row"><span data-part="label">Bravo</span></div></li></ul></li><li data-part="item" data-value="b" aria-label="Authored Beta"><div data-part="row"><span data-part="label">Beta</span></div></li><li data-part="item" data-value="locked" data-disabled><div data-part="row"><span data-part="label">Locked</span></div></li></ul>';
    source.owner.document.body.append(app);
    const root = required(app.querySelector<HTMLElement>("ul"));
    const item = (value: string) =>
      required(root.querySelector<HTMLElement>(`[data-part="item"][data-value="${value}"]`));
    const row = (value: string) =>
      required(item(value).querySelector<HTMLElement>('[data-part="row"]'));
    let active = source;
    const key = (target: HTMLElement, value: string, options: KeyboardEventInit = {}) =>
      target.dispatchEvent(
        new (active.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
          key: value,
          bubbles: true,
          cancelable: true,
          ...options,
        }),
      );
    if (mode === "automatic") await source.star.whenEnhanced();
    else source.ui.enhance(root);
    let enhancedBeforeFacade = root.getAttribute("role") === "tree";
    item("a").focus();
    key(item("a"), "b");
    source.ui.tree.focus(root, "b");
    let rejectedPreviousOwner = true;
    const adopted = mode === "adopted" || mode === "disposed-first" || mode === "facade";
    if (adopted) {
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.tree.value(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected document ownership rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") active.ui.tree.value(root);
      else active.ui.enhance(root);
      source.star.dispose();
      enhancedBeforeFacade = enhancedBeforeFacade && root.getAttribute("role") === "tree";
    } else active.ui.enhance(root);
    const retainedExploration =
      item("b").tabIndex === 0 &&
      item("a").dataset.expanded === "true" &&
      root.dataset.value === '["a"]';
    key(item("b"), "r");
    const retainedSearch = active.owner.document.activeElement === item("c");
    key(item("c"), "b", { isComposing: true });
    key(item("c"), "a", { altKey: true });
    const nativeComposition = active.owner.document.activeElement === item("c");
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 550));
    key(item("c"), "b");
    const expiredSearch = active.owner.document.activeElement === item("b");
    const events: boolean[] = [];
    root.addEventListener("jquery-star:tree:select", (event) =>
      events.push(event instanceof (active.owner as Window & typeof globalThis).CustomEvent),
    );
    if (mode === "action") {
      const action = active.owner.document.createElement("button");
      action.type = "button";
      root.append(action);
      action.setAttribute("data-on:click", "@ui.tree.select('#realm-tree', 'b', true)");
      active.jquery(root).star();
      action.click();
      action.setAttribute("data-on:click", "@ui.tree.select('c', true)");
      await active.star.whenEnhanced();
      action.click();
    } else {
      row("b").click();
      row("c").click();
    }
    const operated = root.dataset.value === '["a","c","b"]';
    root.addEventListener("jquery-star:tree:before-select", (event) => event.preventDefault(), {
      once: true,
    });
    active.ui.tree.select(root, "a", false);
    const canceledSelection = root.dataset.value === '["a","c","b"]';
    root.addEventListener(
      "jquery-star:tree:before-select",
      () => active.ui.tree.select(root, "b", false),
      { once: true },
    );
    active.ui.tree.select(root, "a", false);
    const newerSelection = root.dataset.value === '["a","c"]';
    active.ui.tree.select(root, "a", false);
    required(row("a").querySelector("button")).click();
    const nestedControl = root.dataset.value === '["c"]';
    active.ui.tree.collapse(root, "a");
    active.ui.tree.focus(root, "b");
    root.addEventListener("jquery-star:tree:expand", () => active.ui.tree.focus(root, "b"), {
      once: true,
    });
    active.ui.tree.focus(root, "c");
    const newerFocus =
      active.owner.document.activeElement === item("b") && item("a").dataset.expanded === "true";
    const previous = row("a");
    const replacement = previous.cloneNode(true) as HTMLElement;
    required(replacement.querySelector<HTMLElement>('[data-part="label"]')).id =
      "replacement-tree-label";
    previous.replaceWith(replacement);
    active.ui.tree.focus(root, "a");
    replacement.click();
    const currentParts =
      root.dataset.value === '["a","c"]' &&
      item("a").getAttribute("aria-labelledby") === "replacement-tree-label" &&
      active.owner.document.activeElement === item("a");
    const authoredName =
      item("b").getAttribute("aria-label") === "Authored Beta" &&
      !item("b").hasAttribute("aria-labelledby");
    delete item("locked").dataset.disabled;
    active.ui.enhance(root);
    active.ui.tree.select(root, "locked", true);
    const clearedDisabled =
      item("locked").getAttribute("aria-disabled") !== "true" &&
      root.dataset.value === '["a","c","locked"]';
    item("locked").dataset.disabled = "";
    active.ui.tree.collapse(root, "a");
    key(item("a"), "a", { ctrlKey: true });
    key(item("a"), "a", { metaKey: true });
    const visibleSelection = root.dataset.value === '["c","locked"]';
    active.ui.tree.expand(root, "a");
    active.ui.tree.focus(root, "b");
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    app.append(root);
    await preserve.commit();
    const retainedAfterPreservation =
      item("b").tabIndex === 0 &&
      item("a").dataset.expanded === "true" &&
      root.dataset.value === '["c","locked"]';
    row("b").click();
    const selectedAfterPreservation = root.dataset.value === '["c","b","locked"]';
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      active.ui.tree.select(root, "a", true);
    } catch {
      rejectedRemovedRoot = true;
    }
    row("a").click();
    const releasedNativeBinding = root.dataset.value === '["c","b","locked"]';
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      rejectedPreviousOwner,
      retainedExploration,
      retainedSearch,
      nativeComposition,
      expiredSearch,
      operated,
      canceledSelection,
      newerSelection,
      nestedControl,
      newerFocus,
      currentParts,
      authoredName,
      clearedDisabled,
      visibleSelection,
      retainedAfterPreservation,
      selectedAfterPreservation,
      rejectedRemovedRoot,
      releasedNativeBinding,
      receivedOwnerEvents: events.length > 0 && events.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseTransferListOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<form><section id="realm-transfer" data-jqs="transfer-list" data-name="items"><select data-part="available" multiple><option value="a" selected>Alpha</option><option value="c">Charlie</option><option value="locked" disabled>Locked</option></select><select data-part="selected" multiple><option value="b">Beta</option></select><button type="button" data-jqs="button" data-part="add"><svg><path d="M0 0h1" /></svg>Add</button><button type="button" data-jqs="button" data-part="add-all">Add all</button><button type="button" data-jqs="button" data-part="remove">Remove</button><button type="button" data-jqs="button" data-part="remove-all">Remove all</button><button type="button" data-jqs="button" data-part="move-up">Up</button><button type="button" data-jqs="button" data-part="move-down">Down</button><p data-part="status"></p></section></form>';
    source.owner.document.body.append(app);
    const root = required(app.querySelector<HTMLElement>("section"));
    const form = required(app.querySelector("form"));
    let available = required(root.querySelector<HTMLSelectElement>('[data-part="available"]'));
    const selected = required(root.querySelector<HTMLSelectElement>('[data-part="selected"]'));
    const button = (name: string) =>
      required(root.querySelector<HTMLButtonElement>(`button[data-part="${name}"]`));
    let active = source;
    const choose = (control: HTMLSelectElement, values: string[]) => {
      for (const option of control.options) option.selected = values.includes(option.value);
      control.dispatchEvent(
        new (active.owner as Window & typeof globalThis).Event("change", { bubbles: true }),
      );
    };
    const assigned = () => JSON.stringify(active.ui.transferList.value(root));
    const submitted = () =>
      JSON.stringify(
        new (active.owner as Window & typeof globalThis).FormData(form).getAll("items"),
      );
    const option = (control: HTMLSelectElement, value: string) =>
      required(Array.from(control.options).find((item) => item.value === value));
    if (mode === "automatic") await source.star.whenEnhanced();
    else source.ui.enhance(root);
    const enhancedBeforeFacade = root.dataset.state === "ready";
    const original = option(available, "a");
    const field = root.querySelector("input");
    let rejectedPreviousOwner = true;
    if (mode === "adopted" || mode === "disposed-first" || mode === "facade") {
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.transferList.value(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected document ownership rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") active.ui.transferList.value(root);
      else active.ui.enhance(root);
      source.star.dispose();
    } else active.ui.enhance(root);
    const retainedNativeState =
      option(available, "a") === original &&
      original.selected &&
      original.defaultSelected &&
      root.querySelector("input") === field &&
      assigned() === '["b"]';
    const constructors = active.owner as Window & typeof globalThis;
    const component: boolean[] = [];
    const native: boolean[] = [];
    root.addEventListener("jquery-star:transfer-list:change", (event) =>
      component.push(event instanceof constructors.CustomEvent),
    );
    root.addEventListener("input", (event) => native.push(event instanceof constructors.Event));
    root.addEventListener("change", (event) => native.push(event instanceof constructors.Event));
    const action = active.owner.document.createElement("button");
    action.type = "button";
    if (mode === "action") {
      action.setAttribute("data-on:click", "@ui.transfer-list.add('#realm-transfer', ['a'])");
      root.append(action);
      active.jquery(root).star();
      action.click();
    } else
      required(button("add").querySelector("path")).dispatchEvent(
        new constructors.MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    const operated = assigned() === '["b","a"]' && submitted() === '["b","a"]';
    if (mode === "action") {
      action.setAttribute("data-on:click", "@ui.transfer-list.add(['c'])");
      await active.star.whenEnhanced();
      action.click();
    } else {
      choose(available, ["c"]);
      option(available, "c").dispatchEvent(
        new constructors.MouseEvent("dblclick", { bubbles: true, cancelable: true }),
      );
    }
    const nativeOptionOrAction = assigned() === '["b","a","c"]';
    choose(selected, ["c"]);
    selected.dispatchEvent(
      new constructors.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );
    const nativeEnter = assigned() === '["b","a"]';
    choose(selected, ["a"]);
    button("move-up").click();
    const moved = assigned() === '["a","b"]';
    active.ui.transferList.down(root, ["a"]);
    const reordered = moved && assigned() === '["b","a"]';
    root.addEventListener(
      "jquery-star:transfer-list:before-change",
      (event) => event.preventDefault(),
      { once: true },
    );
    active.ui.transferList.set(root, ["c"]);
    const canceled = assigned() === '["b","a"]';
    root.addEventListener(
      "jquery-star:transfer-list:before-change",
      () => active.ui.transferList.set(root, ["c"]),
      { once: true },
    );
    active.ui.transferList.set(root, ["a"]);
    const newerMembership = assigned() === '["c"]';
    root.addEventListener(
      "jquery-star:transfer-list:before-change",
      (event) => (event as CustomEvent<{ value: string[] }>).detail.value.push("c"),
      { once: true },
    );
    active.ui.transferList.set(root, ["a"]);
    const protectedEvent = assigned() === '["a"]';
    root.dataset.value = '["b","a"]';
    const rootPatch = assigned() === '["b","a"]';
    available.append(option(selected, "a"));
    const silentMembership = assigned() === '["b"]' && submitted() === '["b"]';
    choose(available, []);
    form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
    form.reset();
    active.ui.enhance(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const canceledReset = !original.selected && button("add").disabled && assigned() === '["b"]';
    form.reset();
    active.ui.enhance(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const acceptedReset =
      original.selected &&
      !button("add").disabled &&
      assigned() === '["b"]' &&
      submitted() === '["b"]';
    const external = active.owner.document.createElement("form");
    external.id = "external-transfer";
    app.append(external);
    available.setAttribute("form", external.id);
    active.ui.transferList.value(root);
    choose(available, []);
    external.reset();
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const externalReset = original.selected && !button("add").disabled;
    available.removeAttribute("form");
    active.ui.enhance(root);
    choose(available, ["a"]);
    available.dispatchEvent(
      new constructors.KeyboardEvent("keydown", {
        key: "Enter",
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    const composition = assigned() === '["b"]';
    available.disabled = true;
    active.ui.transferList.add(root, ["a"]);
    const disabled = assigned() === '["b"]' && submitted() === "[]";
    available.disabled = false;
    active.ui.enhance(root);
    active.ui.transferList.add(root, ["a"]);
    const enabled = assigned() === '["b","a"]' && submitted() === '["b","a"]';
    button("remove-all").disabled = true;
    choose(available, ["c"]);
    const authoredDisabled = button("remove-all").disabled;
    option(selected, "b").disabled = true;
    active.ui.transferList.set(root, ["a", "locked"]);
    const disabledMembership = assigned() === '["b","a"]' && submitted() === '["a"]';
    option(selected, "b").disabled = false;
    active.ui.transferList.set(root, ["b"]);
    const previous = available;
    available = previous.cloneNode(true) as HTMLSelectElement;
    previous.replaceWith(available);
    const status = required(root.querySelector<HTMLElement>('[data-part="status"]'));
    status.replaceWith(status.cloneNode());
    active.ui.transferList.add(root, ["c"]);
    previous.dispatchEvent(new constructors.MouseEvent("dblclick", { bubbles: true }));
    const currentParts =
      assigned() === '["b","c"]' &&
      root.querySelector('[data-part="status"]')?.textContent === "2 assigned";
    choose(available, ["a"]);
    const fields = Array.from(root.querySelectorAll("input"));
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    form.append(root);
    await preserve.commit();
    const retainedAfterPreservation =
      assigned() === '["b","c"]' &&
      option(available, "a").selected &&
      Array.from(root.querySelectorAll("input")).every((input, index) => input === fields[index]);
    button("add").click();
    const selectedAfterPreservation = assigned() === '["b","c","a"]';
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      active.ui.transferList.removeAll(root);
    } catch {
      rejectedRemovedRoot = true;
    }
    button("remove").click();
    const releasedNativeBinding = root.dataset.value === '["b","c","a"]';
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      rejectedPreviousOwner,
      retainedNativeState,
      operated,
      nativeOptionOrAction,
      nativeEnter,
      reordered,
      canceled,
      newerMembership,
      protectedEvent,
      rootPatch,
      silentMembership,
      canceledReset,
      acceptedReset,
      externalReset,
      composition,
      disabled,
      enabled,
      authoredDisabled,
      disabledMembership,
      currentParts,
      retainedAfterPreservation,
      selectedAfterPreservation,
      rejectedRemovedRoot,
      releasedNativeBinding,
      receivedOwnerEvents: component.length > 0 && component.every(Boolean),
      receivedNativeEvents: native.length > 0 && native.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exercisePopoverOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<section id="realm-popover" data-jqs="popover" data-initial-focus="#last-focus"><button type="button" data-jqs="button" data-part="trigger"><svg><path d="M0 0h1" /></svg>Open</button><div data-part="content"><h2 data-part="title">Details</h2><button id="first-focus">First</button><button id="last-focus">Last</button></div></section><button id="outside">Outside</button>';
    source.owner.document.body.append(app);
    const root = required(app.querySelector<HTMLElement>("section"));
    let trigger = required(root.querySelector<HTMLButtonElement>('[data-part="trigger"]'));
    let content = required(root.querySelector<HTMLElement>('[data-part="content"]'));
    const last = required(content.querySelector<HTMLButtonElement>("#last-focus"));
    let active = source;
    let retainedOpenFocus = true;
    let rejectedPreviousOwner = true;
    const adopted = mode === "adopted" || mode === "disposed-first" || mode === "facade";
    if (adopted) {
      source.ui.popover.open(root);
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.popover.close(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected owner rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") active.ui.popover.open(root);
      else active.ui.enhance(root);
      source.star.dispose();
      retainedOpenFocus =
        content.matches(":popover-open") &&
        root.dataset.state === "open" &&
        active.owner.document.activeElement === last;
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else if (mode === "action") {
      trigger.setAttribute("data-on:click", "@ui.popover.open('#realm-popover')");
      active.jquery(app).star();
      await active.star.whenEnhanced();
    } else active.ui.enhance(root);
    const enhancedBeforeFacade =
      trigger.getAttribute("aria-controls") === content.id &&
      content.getAttribute("role") === "dialog";
    const constructors = active.owner as Window & typeof globalThis;
    const ownerEvents: boolean[] = [];
    for (const type of ["open", "close"])
      root.addEventListener(`jquery-star:popover:${type}`, (event) =>
        ownerEvents.push(event instanceof constructors.CustomEvent),
      );
    if (!adopted)
      required(trigger.querySelector("path")).dispatchEvent(
        new constructors.MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    const opened =
      content.matches(":popover-open") &&
      root.dataset.state === "open" &&
      active.owner.document.activeElement === last;
    if (mode === "action") {
      active.jquery(app).star("destroy");
      trigger.removeAttribute("data-on:click");
      active.ui.enhance(root);
    }
    const first = required(content.querySelector<HTMLButtonElement>("#first-focus"));
    first.focus();
    active.ui.enhance(root);
    active.ui.enhance(root);
    const stableFocus =
      active.owner.document.activeElement === first && content.matches(":popover-open");
    root.addEventListener("jquery-star:popover:before-close", (event) => event.preventDefault(), {
      once: true,
    });
    active.ui.popover.close(root);
    const canceledClose = content.matches(":popover-open") && root.dataset.state === "open";
    active.ui.popover.close(root);
    const returnedFocus =
      !content.matches(":popover-open") && active.owner.document.activeElement === trigger;
    content.addEventListener(
      "beforetoggle",
      (event) => {
        if (event.newState === "open") event.preventDefault();
      },
      { once: true },
    );
    active.ui.popover.open(root);
    const canceledNativeOpen = !content.matches(":popover-open") && root.dataset.state === "closed";
    content.addEventListener("beforetoggle", () => active.ui.popover.close(root), { once: true });
    active.ui.popover.open(root);
    const newerNativeClose = !content.matches(":popover-open") && root.dataset.state === "closed";
    content.addEventListener("beforetoggle", () => active.ui.popover.open(root), { once: true });
    active.ui.popover.open(root);
    const nativeNoopOpen = content.matches(":popover-open") && root.dataset.state === "open";
    content.addEventListener("beforetoggle", () => active.ui.popover.close(root), { once: true });
    active.ui.popover.close(root);
    const nativeNoopClose = !content.matches(":popover-open") && root.dataset.state === "closed";
    active.ui.popover.open(root);
    root.addEventListener("jquery-star:popover:before-close", () => active.ui.popover.open(root), {
      once: true,
    });
    active.ui.popover.close(root);
    const newerNoopOpen = content.matches(":popover-open") && root.dataset.state === "open";
    active.ui.popover.close(root);
    active.ui.popover.open(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const lateToggle = content.matches(":popover-open") && root.dataset.state === "open";
    content.hidePopover();
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const externalNativeClose =
      root.dataset.state === "closed" && !content.matches(":popover-open");
    active.ui.popover.open(root);
    content.hidePopover();
    active.ui.popover.open(root);
    const immediateNativeReopen = content.matches(":popover-open") && root.dataset.state === "open";
    active.ui.popover.close(root);
    content.showPopover();
    active.ui.popover.close(root);
    const immediateNativeClose =
      !content.matches(":popover-open") && root.dataset.state === "closed";
    root.dataset.disabled = "";
    active.ui.popover.open(root);
    const disabled = !content.matches(":popover-open");
    delete root.dataset.disabled;
    active.ui.popover.open(root);
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    app.prepend(root);
    await preserve.commit();
    const preservedOpen = content.matches(":popover-open") && root.dataset.state === "open";
    const preservedFocus = active.owner.document.activeElement === last;
    active.ui.popover.close(root);
    const oldTrigger = trigger;
    trigger = trigger.cloneNode(true) as HTMLButtonElement;
    oldTrigger.replaceWith(trigger);
    const replacement = content.cloneNode(true) as HTMLElement;
    content.replaceWith(replacement);
    content = replacement;
    active.ui.popover.open(root);
    const currentParts =
      content.matches(":popover-open") && trigger.getAttribute("aria-controls") === content.id;
    active.ui.popover.close(root);
    oldTrigger.click();
    const retiredTrigger = !content.matches(":popover-open");
    active.ui.popover.open(root);
    const outside = required(app.querySelector<HTMLButtonElement>("#outside"));
    outside.dispatchEvent(
      new constructors.MouseEvent("pointerdown", { bubbles: true, cancelable: true }),
    );
    const foreignOutside = !content.matches(":popover-open");
    active.ui.popover.open(root);
    active.owner.document.dispatchEvent(
      new constructors.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    const foreignEscape = !content.matches(":popover-open");
    active.ui.popover.open(root);
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      active.ui.popover.open(root);
    } catch {
      rejectedRemovedRoot = true;
    }
    trigger.click();
    const releasedNativeBinding =
      !content.matches(":popover-open") && root.dataset.state === "closed";
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      retainedOpenFocus,
      rejectedPreviousOwner,
      opened,
      stableFocus,
      canceledClose,
      returnedFocus,
      canceledNativeOpen,
      newerNativeClose,
      nativeNoopOpen,
      nativeNoopClose,
      newerNoopOpen,
      lateToggle,
      externalNativeClose,
      immediateNativeReopen,
      immediateNativeClose,
      disabled,
      preservedOpen,
      preservedFocus,
      currentParts,
      retiredTrigger,
      foreignOutside,
      foreignEscape,
      rejectedRemovedRoot,
      releasedNativeBinding,
      receivedOwnerEvents: ownerEvents.length > 0 && ownerEvents.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseTooltipOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<section id="realm-tooltip" data-jqs="tooltip" data-delay="0" data-close-delay="0"><button type="button" data-jqs="button" data-part="trigger"><svg><path d="M0 0h1" /></svg>Open</button><div data-part="content">Helpful description</div></section><button id="outside">Outside</button>';
    source.owner.document.body.append(app);
    const root = required(app.querySelector<HTMLElement>("section"));
    let trigger = required(root.querySelector<HTMLButtonElement>('[data-part="trigger"]'));
    let content = required(root.querySelector<HTMLElement>('[data-part="content"]'));
    const outside = required(app.querySelector<HTMLButtonElement>("#outside"));
    let active = source;
    let retainedOpen = true;
    let rejectedPreviousOwner = true;
    const adopted = mode === "adopted" || mode === "disposed-first" || mode === "facade";
    if (adopted) {
      source.ui.tooltip.open(root);
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.tooltip.close(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected owner rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") active.ui.tooltip.open(root);
      else active.ui.enhance(root);
      source.star.dispose();
      retainedOpen = content.matches(":popover-open") && root.dataset.state === "open";
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else if (mode === "action") {
      trigger.setAttribute("data-on:click", "@ui.tooltip.open('#realm-tooltip')");
      active.jquery(app).star();
      await active.star.whenEnhanced();
    } else active.ui.enhance(root);
    const enhancedBeforeFacade =
      trigger.getAttribute("aria-describedby") === content.id &&
      content.getAttribute("role") === "tooltip";
    const constructors = active.owner as Window & typeof globalThis;
    const ownerEvents: boolean[] = [];
    for (const type of ["open", "close"])
      root.addEventListener(`jquery-star:tooltip:${type}`, (event) =>
        ownerEvents.push(event instanceof constructors.CustomEvent),
      );
    outside.focus();
    if (!adopted)
      required(trigger.querySelector("path")).dispatchEvent(
        new constructors.MouseEvent(mode === "action" ? "click" : "pointerenter", {
          bubbles: true,
          cancelable: true,
        }),
      );
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const opened =
      content.matches(":popover-open") &&
      root.dataset.state === "open" &&
      active.owner.document.activeElement === outside;
    let implicitAction = true;
    if (mode === "action") {
      active.ui.tooltip.close(root);
      trigger.setAttribute("data-on:click", "@ui.tooltip.open");
      await active.star.whenEnhanced();
      trigger.click();
      implicitAction = content.matches(":popover-open");
      active.jquery(app).star("destroy");
      trigger.removeAttribute("data-on:click");
      active.ui.enhance(root);
    }

    active.ui.enhance(root);
    active.ui.enhance(root);
    const stableFocus =
      active.owner.document.activeElement === outside && content.matches(":popover-open");
    root.addEventListener("jquery-star:tooltip:before-close", (event) => event.preventDefault(), {
      once: true,
    });
    active.ui.tooltip.close(root);
    const canceledClose = content.matches(":popover-open") && root.dataset.state === "open";
    active.ui.tooltip.close(root);
    const returnedFocus =
      !content.matches(":popover-open") && active.owner.document.activeElement === outside;
    content.addEventListener(
      "beforetoggle",
      (event) => {
        if (event.newState === "open") event.preventDefault();
      },
      { once: true },
    );
    active.ui.tooltip.open(root);
    const canceledNativeOpen = !content.matches(":popover-open") && root.dataset.state === "closed";
    content.addEventListener("beforetoggle", () => active.ui.tooltip.close(root), { once: true });
    active.ui.tooltip.open(root);
    const newerNativeClose = !content.matches(":popover-open") && root.dataset.state === "closed";
    content.addEventListener("beforetoggle", () => active.ui.tooltip.open(root), { once: true });
    active.ui.tooltip.open(root);
    const nativeNoopOpen = content.matches(":popover-open") && root.dataset.state === "open";
    content.addEventListener("beforetoggle", () => active.ui.tooltip.close(root), { once: true });
    active.ui.tooltip.close(root);
    const nativeNoopClose = !content.matches(":popover-open") && root.dataset.state === "closed";
    active.ui.tooltip.open(root);
    root.addEventListener("jquery-star:tooltip:before-close", () => active.ui.tooltip.open(root), {
      once: true,
    });
    active.ui.tooltip.close(root);
    const newerNoopOpen = content.matches(":popover-open") && root.dataset.state === "open";
    active.ui.tooltip.close(root);
    active.ui.tooltip.open(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const lateToggle = content.matches(":popover-open") && root.dataset.state === "open";
    content.hidePopover();
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const externalNativeClose =
      root.dataset.state === "closed" && !content.matches(":popover-open");
    active.ui.tooltip.open(root);
    content.hidePopover();
    active.ui.tooltip.open(root);
    const immediateNativeReopen = content.matches(":popover-open") && root.dataset.state === "open";
    active.ui.tooltip.close(root);
    content.showPopover();
    active.ui.tooltip.close(root);
    const immediateNativeClose =
      !content.matches(":popover-open") && root.dataset.state === "closed";
    root.dataset.disabled = "";
    active.ui.tooltip.open(root);
    const disabled = !content.matches(":popover-open");
    delete root.dataset.disabled;
    active.ui.tooltip.open(root);
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    app.prepend(root);
    await preserve.commit();
    const preservedOpen = content.matches(":popover-open") && root.dataset.state === "open";
    const preservedFocus = active.owner.document.activeElement === outside;
    active.ui.tooltip.close(root);
    const oldTrigger = trigger;
    trigger = trigger.cloneNode(true) as HTMLButtonElement;
    oldTrigger.replaceWith(trigger);
    const replacement = content.cloneNode(true) as HTMLElement;
    content.replaceWith(replacement);
    content = replacement;
    active.ui.tooltip.open(root);
    const currentParts =
      content.matches(":popover-open") && trigger.getAttribute("aria-describedby") === content.id;
    active.ui.tooltip.close(root);
    oldTrigger.dispatchEvent(new constructors.Event("pointerenter"));
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const retiredTrigger = !content.matches(":popover-open");
    active.ui.tooltip.open(root);
    outside.dispatchEvent(
      new constructors.MouseEvent("pointerdown", { bubbles: true, cancelable: true }),
    );
    const foreignOutside = !content.matches(":popover-open");
    active.ui.tooltip.open(root);
    active.owner.document.dispatchEvent(
      new constructors.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    const foreignEscape = !content.matches(":popover-open");
    active.ui.tooltip.open(root);
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      active.ui.tooltip.open(root);
    } catch {
      rejectedRemovedRoot = true;
    }
    trigger.dispatchEvent(new constructors.Event("pointerenter"));
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const releasedNativeBinding =
      !content.matches(":popover-open") && root.dataset.state === "closed";
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      implicitAction,
      retainedOpen,
      rejectedPreviousOwner,
      opened,
      stableFocus,
      canceledClose,
      returnedFocus,
      canceledNativeOpen,
      newerNativeClose,
      nativeNoopOpen,
      nativeNoopClose,
      newerNoopOpen,
      lateToggle,
      externalNativeClose,
      immediateNativeReopen,
      immediateNativeClose,
      disabled,
      preservedOpen,
      preservedFocus,
      currentParts,
      retiredTrigger,
      foreignOutside,
      foreignEscape,
      rejectedRemovedRoot,
      releasedNativeBinding,
      receivedOwnerEvents: ownerEvents.length > 0 && ownerEvents.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseTooltipDeadline(
  factory: Factory,
  closing: boolean,
  disposedFirst: boolean,
  kind: "tooltip" | "hover-card" = "tooltip",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const root = source.owner.document.createElement("section");
    root.dataset.jqs = kind;
    root.dataset.delay = "350";
    root.dataset.closeDelay = "350";
    root.innerHTML =
      '<button data-part="trigger">Explain</button><div data-part="content">Helpful description</div>';
    source.owner.document.body.append(root);
    source.ui.enhance(root);
    const trigger = required(root.querySelector("button"));
    const content = required(root.querySelector<HTMLElement>('[data-part="content"]'));
    if (closing) source.ui[kind === "hover-card" ? "hoverCard" : kind].open(root);
    trigger.dispatchEvent(
      new (source.owner as Window & typeof globalThis).Event(
        closing ? "pointerleave" : "pointerenter",
      ),
    );
    await new Promise<void>((resolve) => source.owner.setTimeout(resolve, 200));
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    if (disposedFirst) source.star.dispose();
    const scheduled: number[] = [];
    const nativeSet = destination.owner.setTimeout;
    destination.owner.setTimeout = (callback, delay, ...args) => {
      scheduled.push(delay ?? 0);
      return nativeSet.call(destination.owner, callback, delay, ...args);
    };
    try {
      destination.ui.enhance(root);
    } finally {
      destination.owner.setTimeout = nativeSet;
    }
    source.star.dispose();
    const restoredBeforeDeadline = content.matches(":popover-open") === closing;
    const remainingDeadline =
      scheduled.length === 1 && required(scheduled[0]) >= 0 && required(scheduled[0]) < 250;
    await new Promise<void>((resolve) => destination.owner.setTimeout(resolve, 400));
    return {
      restoredBeforeDeadline,
      remainingDeadline,
      completed: content.matches(":popover-open") !== closing,
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseFloatingHandoff(
  factory: Factory,
  previous: "popover" | "tooltip" | "hover-card" | "menu" | "context-menu",
  next: "popover" | "tooltip" | "hover-card" | "menu" | "context-menu",
  opening: boolean,
) {
  const realm = createRealm(factory);
  try {
    await realm.star.whenEnhanced();
    const root = realm.owner.document.createElement("section");
    root.dataset.jqs = previous;
    root.innerHTML =
      '<button data-part="trigger">Explain</button><div data-part="content">Common panel</div>';
    realm.owner.document.body.append(root);
    const content = required(root.querySelector<HTMLElement>('[data-part="content"]'));
    const previousAPI =
      realm.ui[
        previous === "hover-card"
          ? "hoverCard"
          : previous === "context-menu"
            ? "contextMenu"
            : previous
      ];
    const nextAPI =
      realm.ui[
        next === "hover-card" ? "hoverCard" : next === "context-menu" ? "contextMenu" : next
      ];
    let opened = 0;
    root.addEventListener(`jquery-star:${next}:open`, () => opened++);
    realm.ui.enhance(root);
    if (!opening) previousAPI.open(root);
    content.addEventListener(
      "beforetoggle",
      () => {
        root.dataset.jqs = next;
        nextAPI.open(root);
      },
      { once: true },
    );
    previousAPI[opening ? "open" : "close"](root);
    const accepted =
      content.matches(":popover-open") &&
      root.dataset.state === "open" &&
      root.dataset.jqs === next;
    await realm.star.whenEnhanced();
    const stable = content.matches(":popover-open") && root.dataset.state === "open";
    nextAPI.close(root);
    const closed = !content.matches(":popover-open") && root.dataset.state === "closed";
    return { accepted, stable, closed, notified: opened === 1 };
  } finally {
    realm.star.dispose();
    realm.frame.remove();
  }
}

export async function exerciseHoverCardOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<section id="realm-hover-card" data-jqs="hover-card" data-delay="0" data-close-delay="0"><button type="button" data-jqs="button" data-part="trigger"><svg><path d="M0 0h1" /></svg>Open</button><div data-part="content"><h2 data-part="title">Profile</h2><button id="inside">Profile action</button></div></section><button id="outside">Outside</button>';
    source.owner.document.body.append(app);
    const root = required(app.querySelector<HTMLElement>("section"));
    let trigger = required(root.querySelector<HTMLButtonElement>('[data-part="trigger"]'));
    let content = required(root.querySelector<HTMLElement>('[data-part="content"]'));
    const outside = required(app.querySelector<HTMLButtonElement>("#outside"));
    let inside = required(content.querySelector<HTMLButtonElement>("#inside"));
    let retainedFocus = true;
    let active = source;
    let retainedOpen = true;
    let rejectedPreviousOwner = true;
    const adopted = mode === "adopted" || mode === "disposed-first" || mode === "facade";
    if (adopted) {
      source.ui.hoverCard.open(root);
      inside.focus();
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.hoverCard.close(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected owner rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") active.ui.hoverCard.open(root);
      else active.ui.enhance(root);
      source.star.dispose();
      retainedOpen = content.matches(":popover-open") && root.dataset.state === "open";
      retainedFocus = active.owner.document.activeElement === inside;
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else if (mode === "action") {
      trigger.setAttribute("data-on:click", "@ui.hover-card.open('#realm-hover-card')");
      active.jquery(app).star();
      await active.star.whenEnhanced();
    } else active.ui.enhance(root);
    const enhancedBeforeFacade =
      trigger.getAttribute("aria-controls") === content.id &&
      content.getAttribute("aria-labelledby") === content.querySelector("h2")?.id;
    const constructors = active.owner as Window & typeof globalThis;
    const ownerEvents: boolean[] = [];
    for (const type of ["open", "close"])
      root.addEventListener(`jquery-star:hover-card:${type}`, (event) =>
        ownerEvents.push(event instanceof constructors.CustomEvent),
      );
    outside.focus();
    required(trigger.querySelector("path")).dispatchEvent(
      new constructors.MouseEvent(mode === "action" ? "click" : "pointerenter", {
        bubbles: true,
        cancelable: true,
      }),
    );
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const opened =
      content.matches(":popover-open") &&
      root.dataset.state === "open" &&
      active.owner.document.activeElement === outside;
    let implicitAction = true;
    if (mode === "action") {
      active.ui.hoverCard.close(root);
      trigger.setAttribute("data-on:click", "@ui.hover-card.open");
      await active.star.whenEnhanced();
      trigger.click();
      implicitAction = content.matches(":popover-open");
      active.jquery(app).star("destroy");
      trigger.removeAttribute("data-on:click");
      active.ui.enhance(root);
    }

    inside.focus();
    active.ui.enhance(root);
    active.ui.enhance(root);
    const stableFocus =
      active.owner.document.activeElement === inside && content.matches(":popover-open");
    root.addEventListener(
      "jquery-star:hover-card:before-close",
      (event) => event.preventDefault(),
      {
        once: true,
      },
    );
    active.ui.hoverCard.close(root);
    const canceledClose = content.matches(":popover-open") && root.dataset.state === "open";
    active.ui.hoverCard.close(root);
    const returnedFocus =
      !content.matches(":popover-open") && active.owner.document.activeElement === trigger;
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const stayedDismissed = !content.matches(":popover-open");
    outside.focus();
    trigger.focus();
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const deliberateFocusOpened = content.matches(":popover-open");
    active.ui.hoverCard.close(root);
    outside.focus();
    content.addEventListener(
      "beforetoggle",
      (event) => {
        if (event.newState === "open") event.preventDefault();
      },
      { once: true },
    );
    active.ui.hoverCard.open(root);
    const canceledNativeOpen = !content.matches(":popover-open") && root.dataset.state === "closed";
    content.addEventListener("beforetoggle", () => active.ui.hoverCard.close(root), { once: true });
    active.ui.hoverCard.open(root);
    const newerNativeClose = !content.matches(":popover-open") && root.dataset.state === "closed";
    content.addEventListener("beforetoggle", () => active.ui.hoverCard.open(root), { once: true });
    active.ui.hoverCard.open(root);
    const nativeNoopOpen = content.matches(":popover-open") && root.dataset.state === "open";
    content.addEventListener("beforetoggle", () => active.ui.hoverCard.close(root), { once: true });
    active.ui.hoverCard.close(root);
    const nativeNoopClose = !content.matches(":popover-open") && root.dataset.state === "closed";
    active.ui.hoverCard.open(root);
    root.addEventListener(
      "jquery-star:hover-card:before-close",
      () => active.ui.hoverCard.open(root),
      {
        once: true,
      },
    );
    active.ui.hoverCard.close(root);
    const newerNoopOpen = content.matches(":popover-open") && root.dataset.state === "open";
    active.ui.hoverCard.close(root);
    active.ui.hoverCard.open(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const lateToggle = content.matches(":popover-open") && root.dataset.state === "open";
    content.hidePopover();
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const externalNativeClose =
      root.dataset.state === "closed" && !content.matches(":popover-open");
    active.ui.hoverCard.open(root);
    content.hidePopover();
    active.ui.hoverCard.open(root);
    const immediateNativeReopen = content.matches(":popover-open") && root.dataset.state === "open";
    active.ui.hoverCard.close(root);
    content.showPopover();
    active.ui.hoverCard.close(root);
    const immediateNativeClose =
      !content.matches(":popover-open") && root.dataset.state === "closed";
    root.dataset.disabled = "";
    active.ui.hoverCard.open(root);
    const disabled = !content.matches(":popover-open");
    delete root.dataset.disabled;
    active.ui.hoverCard.open(root);
    inside.focus();
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    app.prepend(root);
    await preserve.commit();
    const preservedOpen = content.matches(":popover-open") && root.dataset.state === "open";
    const preservedFocus = active.owner.document.activeElement === inside;
    active.ui.hoverCard.close(root);
    const oldTrigger = trigger;
    trigger = trigger.cloneNode(true) as HTMLButtonElement;
    oldTrigger.replaceWith(trigger);
    const replacement = content.cloneNode(true) as HTMLElement;
    content.replaceWith(replacement);
    content = replacement;
    inside = required(content.querySelector<HTMLButtonElement>("#inside"));
    active.ui.hoverCard.open(root);
    const currentParts =
      content.matches(":popover-open") && trigger.getAttribute("aria-controls") === content.id;
    active.ui.hoverCard.close(root);
    oldTrigger.dispatchEvent(new constructors.Event("pointerenter"));
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const retiredTrigger = !content.matches(":popover-open");
    active.ui.hoverCard.open(root);
    outside.dispatchEvent(
      new constructors.MouseEvent("pointerdown", { bubbles: true, cancelable: true }),
    );
    const foreignOutside = !content.matches(":popover-open");
    active.ui.hoverCard.open(root);
    active.owner.document.dispatchEvent(
      new constructors.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    const foreignEscape = !content.matches(":popover-open");
    active.ui.hoverCard.open(root);
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      active.ui.hoverCard.open(root);
    } catch {
      rejectedRemovedRoot = true;
    }
    trigger.dispatchEvent(new constructors.Event("pointerenter"));
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const releasedNativeBinding =
      !content.matches(":popover-open") && root.dataset.state === "closed";
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      implicitAction,
      retainedOpen,
      retainedFocus,
      stayedDismissed,
      deliberateFocusOpened,
      rejectedPreviousOwner,
      opened,
      stableFocus,
      canceledClose,
      returnedFocus,
      canceledNativeOpen,
      newerNativeClose,
      nativeNoopOpen,
      nativeNoopClose,
      newerNoopOpen,
      lateToggle,
      externalNativeClose,
      immediateNativeReopen,
      immediateNativeClose,
      disabled,
      preservedOpen,
      preservedFocus,
      currentParts,
      retiredTrigger,
      foreignOutside,
      foreignEscape,
      rejectedRemovedRoot,
      releasedNativeBinding,
      receivedOwnerEvents: ownerEvents.length > 0 && ownerEvents.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseMenuOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
  kind: "menu" | "context-menu",
) {
  const api = kind === "menu" ? "menu" : "contextMenu";
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML =
      '<section id="realm-menu" data-jqs="menu"><button type="button" data-jqs="button" data-part="trigger"><svg><path d="M0 0h1" /></svg>Open</button><div data-part="content"><h2 data-part="title">Details</h2><button data-part="item" id="first-focus">First</button><button data-part="item" id="last-focus">Last</button></div></section><button id="outside">Outside</button>';
    source.owner.document.body.append(app);
    const root = required(app.querySelector<HTMLElement>("section"));
    root.dataset.jqs = kind;
    const first = required(root.querySelector<HTMLButtonElement>("#first-focus"));
    let trigger = required(root.querySelector<HTMLButtonElement>('[data-part="trigger"]'));
    let content = required(root.querySelector<HTMLElement>('[data-part="content"]'));
    const last = required(content.querySelector<HTMLButtonElement>("#last-focus"));
    let active = source;
    let retainedOpenFocus = true;
    let rejectedPreviousOwner = true;
    const adopted = mode === "adopted" || mode === "disposed-first" || mode === "facade";
    if (adopted) {
      source.ui[api].open(root);
      last.focus();
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui[api].close(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected owner rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") active.ui[api].open(root);
      else active.ui.enhance(root);
      source.star.dispose();
      retainedOpenFocus =
        content.matches(":popover-open") &&
        root.dataset.state === "open" &&
        active.owner.document.activeElement === (mode === "facade" ? first : last);
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else if (mode === "action") {
      trigger.setAttribute("data-on:click", `@ui.${kind}.open('#realm-menu')`);
      active.jquery(app).star();
      await active.star.whenEnhanced();
    } else active.ui.enhance(root);
    const enhancedBeforeFacade =
      trigger.getAttribute("aria-controls") === content.id &&
      content.getAttribute("role") === "menu";
    const constructors = active.owner as Window & typeof globalThis;
    const ownerEvents: boolean[] = [];
    for (const type of ["open", "close"])
      root.addEventListener(`jquery-star:${kind}:${type}`, (event) =>
        ownerEvents.push(event instanceof constructors.CustomEvent),
      );
    const activate = (target: Element, action = false): void => {
      target.dispatchEvent(
        new constructors.MouseEvent(action || kind === "menu" ? "click" : "contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: 64,
          clientY: 72,
        }),
      );
    };
    if (!adopted) activate(required(trigger.querySelector("path")), mode === "action");
    const opened =
      content.matches(":popover-open") &&
      root.dataset.state === "open" &&
      active.owner.document.activeElement === (adopted && mode !== "facade" ? last : first);
    if (mode === "action") {
      active.jquery(app).star("destroy");
      trigger.removeAttribute("data-on:click");
      active.ui.enhance(root);
    }
    last.focus();
    active.ui.enhance(root);
    active.ui.enhance(root);
    const stableFocus =
      active.owner.document.activeElement === last && content.matches(":popover-open");
    root.addEventListener(`jquery-star:${kind}:before-close`, (event) => event.preventDefault(), {
      once: true,
    });
    active.ui[api].close(root);
    const canceledClose = content.matches(":popover-open") && root.dataset.state === "open";
    active.ui[api].close(root);
    const returnedFocus =
      !content.matches(":popover-open") && active.owner.document.activeElement === trigger;
    content.addEventListener(
      "beforetoggle",
      (event) => {
        if (event.newState === "open") event.preventDefault();
      },
      { once: true },
    );
    active.ui[api].open(root);
    const canceledNativeOpen = !content.matches(":popover-open") && root.dataset.state === "closed";
    content.addEventListener("beforetoggle", () => active.ui[api].close(root), { once: true });
    active.ui[api].open(root);
    const newerNativeClose = !content.matches(":popover-open") && root.dataset.state === "closed";
    content.addEventListener("beforetoggle", () => active.ui[api].open(root), { once: true });
    active.ui[api].open(root);
    const nativeNoopOpen = content.matches(":popover-open") && root.dataset.state === "open";
    content.addEventListener("beforetoggle", () => active.ui[api].close(root), { once: true });
    active.ui[api].close(root);
    const nativeNoopClose = !content.matches(":popover-open") && root.dataset.state === "closed";
    active.ui[api].open(root);
    root.addEventListener(`jquery-star:${kind}:before-close`, () => active.ui[api].open(root), {
      once: true,
    });
    active.ui[api].close(root);
    const newerNoopOpen = content.matches(":popover-open") && root.dataset.state === "open";
    active.ui[api].close(root);
    active.ui[api].open(root);
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const lateToggle = content.matches(":popover-open") && root.dataset.state === "open";
    content.hidePopover();
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    const externalNativeClose =
      root.dataset.state === "closed" && !content.matches(":popover-open");
    active.ui[api].open(root);
    content.hidePopover();
    active.ui[api].open(root);
    const immediateNativeReopen = content.matches(":popover-open") && root.dataset.state === "open";
    active.ui[api].close(root);
    content.showPopover();
    active.ui[api].close(root);
    const immediateNativeClose =
      !content.matches(":popover-open") && root.dataset.state === "closed";
    root.dataset.disabled = "";
    active.ui[api].open(root);
    const disabled = !content.matches(":popover-open");
    delete root.dataset.disabled;
    active.ui[api].open(root);
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    app.prepend(root);
    await preserve.commit();
    const preservedOpen = content.matches(":popover-open") && root.dataset.state === "open";
    const preservedFocus = active.owner.document.activeElement === first;
    active.ui[api].close(root);
    const oldTrigger = trigger;
    trigger = trigger.cloneNode(true) as HTMLButtonElement;
    oldTrigger.replaceWith(trigger);
    const replacement = content.cloneNode(true) as HTMLElement;
    content.replaceWith(replacement);
    content = replacement;
    active.ui[api].open(root);
    const currentParts =
      content.matches(":popover-open") && trigger.getAttribute("aria-controls") === content.id;
    active.ui[api].close(root);
    activate(oldTrigger);
    const retiredTrigger = !content.matches(":popover-open");
    active.ui[api].open(root);
    const outside = required(app.querySelector<HTMLButtonElement>("#outside"));
    outside.dispatchEvent(
      new constructors.MouseEvent("pointerdown", { bubbles: true, cancelable: true }),
    );
    const foreignOutside = !content.matches(":popover-open");
    active.ui[api].open(root);
    (active.owner.document.activeElement ?? active.owner.document).dispatchEvent(
      new constructors.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    const foreignEscape = !content.matches(":popover-open");
    active.ui[api].open(root);
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      active.ui[api].open(root);
    } catch {
      rejectedRemovedRoot = true;
    }
    activate(trigger);
    const releasedNativeBinding =
      !content.matches(":popover-open") && root.dataset.state === "closed";
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      retainedOpenFocus,
      rejectedPreviousOwner,
      opened,
      stableFocus,
      canceledClose,
      returnedFocus,
      canceledNativeOpen,
      newerNativeClose,
      nativeNoopOpen,
      nativeNoopClose,
      newerNoopOpen,
      lateToggle,
      externalNativeClose,
      immediateNativeReopen,
      immediateNativeClose,
      disabled,
      preservedOpen,
      preservedFocus,
      currentParts,
      retiredTrigger,
      foreignOutside,
      foreignEscape,
      rejectedRemovedRoot,
      releasedNativeBinding,
      receivedOwnerEvents: ownerEvents.length > 0 && ownerEvents.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseMenuDeadline(
  factory: Factory,
  kind: "menu" | "context-menu",
  press: boolean,
  disposedFirst: boolean,
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  const api = kind === "menu" ? "menu" : "contextMenu";
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const root = source.owner.document.createElement("section");
    root.dataset.jqs = kind;
    root.innerHTML =
      '<button data-part="trigger">Commands</button><div data-part="content"><button data-part="item" id="alpha">Alpha</button><button data-part="item" id="beta">Beta</button></div>';
    source.owner.document.body.append(root);
    source.ui.enhance(root);
    const trigger = required(root.querySelector<HTMLButtonElement>('[data-part="trigger"]'));
    const content = required(root.querySelector<HTMLElement>('[data-part="content"]'));
    const constructors = source.owner as Window & typeof globalThis;
    if (press)
      trigger.dispatchEvent(
        new constructors.PointerEvent("pointerdown", {
          bubbles: true,
          pointerType: "touch",
          clientX: 64,
          clientY: 72,
        }),
      );
    else {
      source.ui[api].open(root);
      required(content.querySelector("button")).dispatchEvent(
        new constructors.KeyboardEvent("keydown", { key: "b", bubbles: true }),
      );
    }
    await new Promise<void>((resolve) => source.owner.setTimeout(resolve, 250));
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    if (disposedFirst) source.star.dispose();
    const delays: number[] = [];
    const nativeSet = destination.owner.setTimeout;
    destination.owner.setTimeout = (callback, delay, ...args) => {
      delays.push(delay ?? 0);
      return nativeSet.call(destination.owner, callback, delay, ...args);
    };
    try {
      destination.ui.enhance(root);
    } finally {
      destination.owner.setTimeout = nativeSet;
    }
    source.star.dispose();
    const retained = press
      ? !content.matches(":popover-open")
      : content.matches(":popover-open") && destination.owner.document.activeElement?.id === "beta";
    const remaining = delays.length === 1 && required(delays[0]) >= 0 && required(delays[0]) < 400;
    await new Promise<void>((resolve) => destination.owner.setTimeout(resolve, 600));
    if (!press)
      required(content.querySelector("#beta")).dispatchEvent(
        new (destination.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
          key: "a",
          bubbles: true,
        }),
      );
    const completed = press
      ? content.matches(":popover-open") &&
        content.style.left === "64px" &&
        content.style.top === "72px"
      : destination.owner.document.activeElement?.id === "alpha";
    return { retained, remaining, completed };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

function menubarMarkup(): string {
  return (
    '<div id="realm-menubar" data-jqs="menubar" aria-label="Commands">' +
    ["Alpha", "Beta", "Baker"]
      .map(
        (name, index) =>
          `<div data-jqs="menu" data-part="menu" data-value="${index}"><button data-jqs="button" data-part="trigger">${name}</button><div data-part="content"><button data-part="item">First ${name}</button><button data-part="item">Last ${name}</button></div></div>`,
      )
      .join("") +
    "</div>"
  );
}
export async function exerciseMenubarSelectors(factory: Factory) {
  const realm = createRealm(factory);
  const app = realm.owner.document.createElement("main");
  try {
    await realm.star.whenEnhanced();
    app.innerHTML =
      '<span class="shared">Unrelated match</span>' +
      '<div id="selector-local" class="target shared" data-jqs="menubar" aria-label="Local">' +
      '<div data-part="menu" data-jqs="menu" data-value="#tools"><button data-part="trigger">Hash tools</button><div data-part="content"><button data-part="item">One</button></div></div>' +
      '<div data-part="menu" data-jqs="menu" data-value="plain"><button data-part="trigger">Plain tools</button><div data-part="content"><button data-part="item">Two</button></div></div>' +
      '</div><div id="tools" data-jqs="menubar" aria-label="Other">' +
      '<div data-part="menu" data-jqs="menu" data-value="other"><button data-part="trigger">Other</button><div data-part="content"><button data-part="item">Three</button></div></div></div>';
    realm.owner.document.body.append(app);
    realm.ui.enhance(app);
    const local = required(app.querySelector<HTMLElement>("#selector-local"));
    local.setAttribute("data-on:hash-open", "@ui.menubar.open('#tools')");
    const instance = required(realm.jquery(app).star().star("instance"));
    const other = required(app.querySelector<HTMLElement>("#tools"));
    const event = new (realm.owner as Window & typeof globalThis).CustomEvent("hash-open", {
      bubbles: true,
    });
    local.dispatchEvent(event);
    const exactValue =
      realm.ui.menubar.value(local) === "#tools" && other.dataset.state === "closed";
    await instance.run("ui.menubar.open", { args: [".target", "plain"] });
    const classTarget = realm.ui.menubar.value(local) === "plain";
    realm.ui.menubar.close(local);
    realm.ui.menubar.open(".shared", "plain");
    const facade = realm.ui.menubar.value(local) === "plain";
    await instance.run("ui.menubar.focus", { args: ["#tools", "other"] });
    const explicitId =
      realm.owner.document.activeElement === other.querySelector('[data-part="trigger"]');
    const native =
      local.getAttribute("role") === "menubar" &&
      !!local.querySelector('[data-value="plain"] [data-part="content"]:popover-open');
    return { exactValue, classTarget, facade, explicitId, native };
  } finally {
    realm.jquery(app).star("destroy");
    realm.star.dispose();
    realm.frame.remove();
  }
}
export async function exerciseMenubarOwnership(
  factory: Factory,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML = menubarMarkup();
    source.owner.document.body.append(app);
    const root = required(app.querySelector<HTMLElement>('[data-jqs="menubar"]'));
    const menus = [...root.children] as HTMLElement[];
    const trigger = (index: number): HTMLButtonElement =>
      required(required(menus[index]).querySelector<HTMLButtonElement>('[data-part="trigger"]'));
    const content = (index: number): HTMLElement =>
      required(required(menus[index]).querySelector<HTMLElement>('[data-part="content"]'));
    const item = (index: number, last = false): HTMLButtonElement =>
      required(
        content(index).querySelector<HTMLButtonElement>(last ? "button:last-child" : "button"),
      );
    let active = source;
    let retainedOpenFocus = true;
    let rejectedPreviousOwner = true;
    const adopted = mode === "adopted" || mode === "disposed-first" || mode === "facade";
    if (adopted) {
      source.ui.menubar.open(root, "1");
      item(1, true).focus();
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        source.ui.menubar.close(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected owner rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") active.ui.menubar.value(root);
      else active.ui.enhance(root);
      source.star.dispose();
      retainedOpenFocus =
        content(1).matches(":popover-open") &&
        active.owner.document.activeElement === item(1, true) &&
        trigger(1).tabIndex === 0;
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else if (mode === "action") {
      root.setAttribute("data-on:open-menu", "@ui.menubar.open('1')");
      active.jquery(app).star();
      await active.star.whenEnhanced();
    } else active.ui.enhance(root);
    const constructors = active.owner as Window & typeof globalThis;
    const key = (target: HTMLElement, key: string, canceled = false): void => {
      const event = new constructors.KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      });
      if (canceled) event.preventDefault();
      target.dispatchEvent(event);
    };
    const enhancedBeforeFacade =
      root.getAttribute("role") === "menubar" &&
      trigger(1).getAttribute("role") === "menuitem" &&
      content(1).getAttribute("role") === "menu";
    const ownerEvents: boolean[] = [];
    root.addEventListener("jquery-star:menu:open", (event) =>
      ownerEvents.push(event instanceof constructors.CustomEvent),
    );
    if (!adopted) {
      if (mode === "action")
        root.dispatchEvent(new constructors.CustomEvent("open-menu", { bubbles: true }));
      else trigger(1).click();
    }
    const opened = content(1).matches(":popover-open") && active.ui.menubar.value(root) === "1";
    if (mode === "action") {
      active.jquery(app).star("destroy");
      root.removeAttribute("data-on:open-menu");
    }
    item(1, true).focus();
    active.ui.enhance(root);
    active.ui.enhance(root);
    const stableFocus =
      active.owner.document.activeElement === item(1, true) && trigger(1).tabIndex === 0;
    key(item(1), "ArrowRight", true);
    key(trigger(1), "Tab", true);
    const canceledKeys = active.ui.menubar.value(root) === "1";
    item(1).setAttribute("aria-disabled", "true");
    key(item(1), "ArrowRight");
    const childNavigation =
      active.ui.menubar.value(root) === "2" && active.owner.document.activeElement === item(2);
    active.ui.menubar.open(root, "1");
    item(1).removeAttribute("aria-disabled");
    item(1).dataset.disabled = "true";
    key(item(1), "ArrowRight");
    const inactiveNavigation =
      active.ui.menubar.value(root) === "2" && active.owner.document.activeElement === item(2);
    delete item(1).dataset.disabled;
    trigger(2).focus();
    key(trigger(2), "Home");
    const rovingNavigation =
      active.ui.menubar.value(root) === "0" &&
      active.owner.document.activeElement === item(0) &&
      menus.filter((_, index) => trigger(index).tabIndex === 0).length === 1;
    required(menus[0]).addEventListener(
      "jquery-star:menu:before-close",
      (event) => event.preventDefault(),
      { once: true },
    );
    active.ui.menubar.close(root);
    const canceledClose =
      active.ui.menubar.value(root) === "0" && content(0).matches(":popover-open");
    active.ui.menubar.close(root);
    required(menus[1]).addEventListener(
      "jquery-star:menu:before-open",
      () => active.ui.menubar.close(root),
      { once: true },
    );
    active.ui.menubar.open(root, "1");
    const newerClose =
      active.ui.menubar.value(root) === undefined && !content(1).matches(":popover-open");
    content(1).addEventListener("beforetoggle", () => active.ui.menubar.close(root), {
      once: true,
    });
    active.ui.menubar.open(root, "1");
    const nativeNewerClose =
      active.ui.menubar.value(root) === undefined && !content(1).matches(":popover-open");
    active.ui.menubar.open(root, "0");
    required(menus[0]).addEventListener(
      "jquery-star:menu:before-close",
      () => active.ui.menubar.open(root, "2"),
      { once: true },
    );
    active.ui.menubar.close(root);
    const newerOpen = active.ui.menubar.value(root) === "2" && content(2).matches(":popover-open");
    active.ui.menubar.close(root);
    required(menus[1]).addEventListener(
      "jquery-star:menu:before-open",
      () => root.setAttribute("aria-disabled", "true"),
      { once: true },
    );
    active.ui.menubar.open(root, "1");
    const disabled =
      active.ui.menubar.value(root) === undefined && !content(1).matches(":popover-open");
    root.removeAttribute("aria-disabled");
    root.dataset.orientation = "vertical";
    active.ui.enhance(root);
    active.ui.menubar.focus(root, "0");
    key(trigger(0), "ArrowDown");
    key(trigger(1), "ArrowRight");
    const vertical =
      active.ui.menubar.value(root) === "1" && active.owner.document.activeElement === item(1);
    root.dataset.orientation = "horizontal";
    active.ui.menubar.close(root);
    const oldTrigger = trigger(1);
    oldTrigger.replaceWith(oldTrigger.cloneNode(true));
    content(1).replaceWith(content(1).cloneNode(true));
    active.ui.menubar.open(root, "1");
    const currentParts =
      content(1).matches(":popover-open") && active.owner.document.activeElement === item(1);
    active.ui.menubar.close(root);
    oldTrigger.click();
    key(oldTrigger, "ArrowRight");
    const retiredTrigger = active.ui.menubar.value(root) === undefined;
    active.ui.menubar.open(root, "2");
    item(2, true).focus();
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    app.append(root);
    await preserve.commit();
    const preserved =
      content(2).matches(":popover-open") &&
      active.ui.menubar.value(root) === "2" &&
      active.owner.document.activeElement === item(2, true);
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      active.ui.menubar.open(root, "1");
    } catch {
      rejectedRemovedRoot = true;
    }
    trigger(1).click();
    key(trigger(0), "ArrowRight");
    const released =
      menus.every((_, index) => !content(index).matches(":popover-open")) &&
      root.dataset.state === "closed";
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      retainedOpenFocus,
      rejectedPreviousOwner,
      opened,
      stableFocus,
      canceledKeys,
      childNavigation,
      inactiveNavigation,
      rovingNavigation,
      canceledClose,
      newerClose,
      nativeNewerClose,
      newerOpen,
      disabled,
      vertical,
      currentParts,
      retiredTrigger,
      preserved,
      rejectedRemovedRoot,
      released,
      ownerEvents: ownerEvents.length > 0 && ownerEvents.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

export async function exerciseMenubarDeadline(factory: Factory, disposedFirst: boolean) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML = menubarMarkup();
    source.owner.document.body.append(app);
    const root = required(app.querySelector<HTMLElement>('[data-jqs="menubar"]'));
    const triggers = [...root.querySelectorAll<HTMLButtonElement>('[data-part="trigger"]')];
    source.ui.enhance(root);
    required(triggers[0]).dispatchEvent(
      new (source.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
        key: "b",
        bubbles: true,
      }),
    );
    await new Promise<void>((resolve) => source.owner.setTimeout(resolve, 250));
    destination.owner.document.body.append(destination.owner.document.adoptNode(app));
    if (disposedFirst) source.star.dispose();
    const delays: number[] = [];
    const nativeSet = destination.owner.setTimeout;
    destination.owner.setTimeout = (callback, delay, ...args) => {
      delays.push(delay ?? 0);
      return nativeSet.call(destination.owner, callback, delay, ...args);
    };
    try {
      destination.ui.enhance(root);
    } finally {
      destination.owner.setTimeout = nativeSet;
    }
    source.star.dispose();
    const retained =
      destination.owner.document.activeElement === triggers[1] &&
      required(triggers[1]).tabIndex === 0;
    const remaining = delays.length === 1 && required(delays[0]) >= 0 && required(delays[0]) < 400;
    required(triggers[1]).dispatchEvent(
      new (destination.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
      }),
    );
    const continued = destination.owner.document.activeElement === triggers[2];
    await new Promise<void>((resolve) => destination.owner.setTimeout(resolve, 600));
    required(triggers[2]).dispatchEvent(
      new (destination.owner as Window & typeof globalThis).KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
      }),
    );
    return {
      retained,
      remaining,
      continued,
      completed: destination.owner.document.activeElement === triggers[0],
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

type CopyKind = "clipboard" | "code-block";
function copyMarkup(kind: CopyKind): string {
  return (
    `<section id="realm-copy" data-jqs="${kind}" data-reset-delay="5000">` +
    (kind === "clipboard"
      ? '<input aria-label="Text to copy" data-part="value" value="initial">'
      : '<pre><code data-part="code">initial</code></pre>') +
    `<button data-jqs="button" data-part="${kind === "clipboard" ? "trigger" : "copy"}" aria-describedby="copy-hint">Copy</button><p id="copy-hint">Plain text</p><p data-part="status"></p></section>`
  );
}
function copyAPI(ui: ReturnType<typeof uiPlugin.install>, kind: CopyKind) {
  return kind === "clipboard" ? ui.clipboard : ui.codeBlock;
}
function copySource(root: HTMLElement, value?: string): HTMLElement {
  const source = required(
    root.querySelector<HTMLElement>('[data-part="value"], [data-part="code"]'),
  );
  if (value !== undefined) {
    if (source.localName === "input") (source as HTMLInputElement).value = value;
    else source.textContent = value;
  }
  return source;
}
function stubCopyWriter(owner: Window) {
  const previous = Object.getOwnPropertyDescriptor(owner.navigator, "clipboard");
  const texts: string[] = [];
  const receivers: boolean[] = [];
  let pending: { resolve(): void; reject(error: Error): void } | undefined;
  let defer = false;
  const clipboard = {
    writeText(text: string): Promise<void> {
      texts.push(text);
      receivers.push(this === clipboard);
      if (!defer) return Promise.resolve();
      defer = false;
      return new Promise<void>((resolve, reject) => {
        pending = { resolve, reject };
      });
    },
  };
  Object.defineProperty(owner.navigator, "clipboard", { configurable: true, value: clipboard });
  return {
    texts,
    receivers,
    defer: () => {
      defer = true;
    },
    finish: () => {
      required(pending).resolve();
    },
    fail: (error: Error) => {
      required(pending).reject(error);
    },
    restore: () => {
      if (previous) Object.defineProperty(owner.navigator, "clipboard", previous);
      else Reflect.deleteProperty(owner.navigator, "clipboard");
    },
  };
}
export async function exerciseCopyOwnership(
  factory: Factory,
  kind: CopyKind,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  const oldWriter = stubCopyWriter(source.owner);
  const nextWriter = stubCopyWriter(destination.owner);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML = copyMarkup(kind);
    source.owner.document.body.append(app);
    const root = required(app.querySelector<HTMLElement>("section"));
    let trigger = required(root.querySelector<HTMLButtonElement>("button"));
    let status = required(root.querySelector<HTMLElement>('[data-part="status"]'));
    let active = source;
    let writer = oldWriter;
    let retainedPending = true;
    let rejectedPreviousOwner = true;
    const adopted = mode === "adopted" || mode === "disposed-first" || mode === "facade";
    if (adopted) {
      oldWriter.defer();
      const result = copyAPI(source.ui, kind).copy(root);
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      writer = nextWriter;
      try {
        copyAPI(source.ui, kind).text(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected owner rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") copyAPI(active.ui, kind).text(root);
      else active.ui.enhance(root);
      source.star.dispose();
      retainedPending = kind !== "clipboard" || trigger.disabled;
      oldWriter.finish();
      await result;
      retainedPending &&=
        root.dataset.state === "copied" &&
        status.textContent === "Copied to clipboard." &&
        !trigger.disabled &&
        nextWriter.texts.length === 0;
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else if (mode === "action") {
      trigger.setAttribute("data-on:click", `@ui.${kind}.copy`);
      active.jquery(app).star();
      await active.star.whenEnhanced();
    } else active.ui.enhance(root);
    const constructors = active.owner as Window & typeof globalThis;
    const events: boolean[] = [];
    for (const name of ["before-copy", "copy", "error"])
      root.addEventListener(`jquery-star:${kind}:${name}`, (event) =>
        events.push(event instanceof constructors.CustomEvent),
      );
    const enhancedBeforeFacade =
      status.getAttribute("aria-live") === "polite" &&
      trigger.getAttribute("aria-describedby") === `copy-hint ${status.id}`;
    if (mode === "action") {
      trigger.click();
      await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
    } else await copyAPI(active.ui, kind).copy(root);
    const copied =
      writer.texts.at(-1) === "initial" && root.dataset.state === "copied" && !trigger.disabled;
    if (mode === "action") {
      active.jquery(app).star("destroy");
      trigger.removeAttribute("data-on:click");
    }
    const initialCount = writer.texts.length;
    const initialMessage = status.textContent;
    active.ui.enhance(root);
    active.ui.enhance(root);
    const stable = status.textContent === initialMessage && writer.texts.length === initialCount;
    root.addEventListener(`jquery-star:${kind}:before-copy`, (event) => event.preventDefault(), {
      once: true,
    });
    await copyAPI(active.ui, kind).copy(root);
    const canceled = writer.texts.length === initialCount && status.textContent === initialMessage;
    const oldSource = copySource(root);
    oldSource.replaceWith(oldSource.cloneNode(true));
    copySource(root, "replacement");
    const oldTrigger = trigger;
    trigger = trigger.cloneNode(true) as HTMLButtonElement;
    oldTrigger.replaceWith(trigger);
    const oldStatus = status;
    status = status.cloneNode(false) as HTMLElement;
    status.id = "replacement-status";
    oldStatus.replaceWith(status);
    const currentText = copyAPI(active.ui, kind).text(root) === "replacement";
    await copyAPI(active.ui, kind).copy(root);
    const currentParts =
      currentText &&
      writer.texts.at(-1) === "replacement" &&
      status.textContent === "Copied to clipboard." &&
      !trigger.disabled &&
      !oldTrigger.disabled;
    const currentDescription =
      trigger.getAttribute("aria-describedby") === "copy-hint replacement-status";
    root.dataset.disabled = "true";
    const blockedCount = writer.texts.length;
    await copyAPI(active.ui, kind).copy(root);
    const disabled = writer.texts.length === blockedCount;
    root.dataset.disabled = "false";
    root.addEventListener(`jquery-star:${kind}:before-copy`, () => root.setAttribute("inert", ""), {
      once: true,
    });
    await copyAPI(active.ui, kind).copy(root);
    const changedConstraint = writer.texts.length === blockedCount;
    root.removeAttribute("inert");
    let newer: Promise<string> | undefined;
    root.addEventListener(
      `jquery-star:${kind}:before-copy`,
      () => {
        copySource(root, "newer");
        newer = copyAPI(active.ui, kind).copy(root);
      },
      { once: true },
    );
    await copyAPI(active.ui, kind).copy(root);
    await required(newer);
    const reentered = writer.texts.length === blockedCount + 1 && writer.texts.at(-1) === "newer";
    const adapter = createRenderAdapter(active.installed);
    writer.defer();
    const preservedCopy = copyAPI(active.ui, kind).copy(root);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    writer.finish();
    await preservedCopy;
    app.append(root);
    await preserve.commit();
    const preserved =
      root.dataset.state === "copied" &&
      status.textContent === "Copied to clipboard." &&
      !trigger.disabled;
    writer.defer();
    const retiredCopy = copyAPI(active.ui, kind).copy(root);
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    const retiredState = root.dataset.state;
    const retiredMessage = status.textContent;
    const eventCount = events.length;
    let rejectedRemovedRoot = false;
    try {
      await copyAPI(active.ui, kind).copy(root);
    } catch {
      rejectedRemovedRoot = true;
    }
    writer.finish();
    await retiredCopy;
    const retired =
      root.dataset.state === retiredState &&
      status.textContent === retiredMessage &&
      events.length === eventCount &&
      !trigger.disabled;
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      retainedPending,
      rejectedPreviousOwner,
      copied,
      stable,
      canceled,
      currentParts,
      currentDescription,
      disabled,
      changedConstraint,
      reentered,
      preserved,
      rejectedRemovedRoot,
      retired,
      ownerEvents: events.length > 0 && events.every(Boolean),
      receiver: oldWriter.receivers.every(Boolean) && nextWriter.receivers.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    oldWriter.restore();
    nextWriter.restore();
    source.frame.remove();
    destination.frame.remove();
  }
}
export async function exerciseCopyFallback(
  factory: Factory,
  kind: CopyKind,
  outcome: "success" | "refused" | "copy-throws" | "selection-throws",
) {
  const { owner, frame, star, ui } = createRealm(factory);
  const clipboard = Object.getOwnPropertyDescriptor(owner.navigator, "clipboard");
  const command = Object.getOwnPropertyDescriptor(owner.document, "execCommand");
  const prototype = (owner as Window & typeof globalThis).HTMLTextAreaElement.prototype;
  const select = prototype.select;
  let selections = 0;
  let executions = 0;
  let correctDocument = true;
  try {
    Object.defineProperty(owner.navigator, "clipboard", { configurable: true, value: undefined });
    Object.defineProperty(owner.document, "execCommand", {
      configurable: true,
      value: function (this: Document) {
        executions++;
        correctDocument &&= this === owner.document;
        if (outcome === "copy-throws") throw new Error("Synthetic copy failure");
        return outcome !== "refused";
      },
    });
    prototype.select = function (this: HTMLTextAreaElement) {
      selections++;
      correctDocument &&= this.ownerDocument === owner.document;
      if (outcome === "selection-throws") throw new Error("Synthetic selection failure");
      select.call(this);
    };
    const app = owner.document.createElement("main");
    app.innerHTML = copyMarkup(kind);
    owner.document.body.append(app);
    const root = required(app.querySelector<HTMLElement>("section"));
    const unrelated = owner.document.createElement("textarea");
    owner.document.body.append(unrelated);
    const result = await copyAPI(ui, kind)
      .copy(root)
      .then(
        (value) => ({ value, failed: false }),
        () => ({ value: undefined, failed: true }),
      );
    return {
      result:
        result.failed === (outcome !== "success") && (result.failed || result.value === "initial"),
      state: root.dataset.state === (outcome === "success" ? "copied" : "error"),
      correctDocument,
      selections,
      executions,
      cleaned: owner.document.querySelectorAll("textarea").length === 1 && unrelated.isConnected,
    };
  } finally {
    star.dispose();
    prototype.select = select;
    if (clipboard) Object.defineProperty(owner.navigator, "clipboard", clipboard);
    else Reflect.deleteProperty(owner.navigator, "clipboard");
    if (command) Object.defineProperty(owner.document, "execCommand", command);
    else Reflect.deleteProperty(owner.document, "execCommand");
    frame.remove();
  }
}
export async function exerciseCopyDeadline(factory: Factory, disposedFirst: boolean) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  const sourceWrite = stubCopyWriter(source.owner);
  const destinationWrite = stubCopyWriter(destination.owner);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML = copyMarkup("clipboard");
    source.owner.document.body.append(app);
    const root = required(app.querySelector<HTMLElement>("section"));
    root.dataset.resetDelay = "500";
    await source.ui.clipboard.copy(root);
    await new Promise<void>((resolve) => source.owner.setTimeout(resolve, 200));
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    if (disposedFirst) source.star.dispose();
    const delays: number[] = [];
    const schedule = destination.owner.setTimeout;
    destination.owner.setTimeout = (callback, delay, ...args) => {
      delays.push(delay ?? 0);
      return schedule.call(destination.owner, callback, delay, ...args);
    };
    try {
      destination.ui.enhance(root);
    } finally {
      destination.owner.setTimeout = schedule;
    }
    source.star.dispose();
    const retained = destination.ui.clipboard.state(root) === "copied";
    const remaining = delays.length === 1 && required(delays[0]) >= 0 && required(delays[0]) < 400;
    await new Promise<void>((resolve) => destination.owner.setTimeout(resolve, 600));
    return {
      retained,
      remaining,
      completed:
        destination.ui.clipboard.state(root) === "idle" &&
        root.querySelector('[data-part="status"]')?.textContent === "",
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    sourceWrite.restore();
    destinationWrite.restore();
    source.frame.remove();
    destination.frame.remove();
  }
}

type ViewerKind = "json-viewer" | "log-viewer";
const viewerActions = {
  "json-viewer": "@ui.json-viewer.expand-all",
  "log-viewer": "@ui.log-viewer.pause",
};
function viewerMarkup(kind: ViewerKind): string {
  const body =
    kind === "json-viewer"
      ? '<script data-part="source" type="application/json">{"initial":{"value":1},"other":{"value":2}}</script><div data-part="tree"></div>'
      : '<select data-part="filter" aria-label="Severity"><option>all</option><option>error</option></select><button data-part="pause">Pause</button><div data-part="viewport" style="height:64px;overflow:auto"><ol data-part="entries"><li data-part="entry" data-level="info" style="height:100px">Initial</li></ol></div>';
  return `<section id="realm-viewer" data-jqs="${kind}" data-max="3"><button data-part="action" type="button">Action</button>${body}<p data-part="status"></p></section>`;
}
function viewerPart(root: HTMLElement, name: string): HTMLElement {
  return required(root.querySelector<HTMLElement>(`[data-part="${name}"]`));
}
function viewerBranches(root: HTMLElement): HTMLDetailsElement[] {
  return Array.from(root.querySelectorAll<HTMLDetailsElement>('details[data-part="branch"]'));
}
export async function exerciseViewerOwnership(
  factory: Factory,
  kind: ViewerKind,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML = viewerMarkup(kind);
    source.owner.document.body.append(app);
    const root = required(app.querySelector<HTMLElement>("section"));
    let active = source;
    let retainedAfterAdoption = true;
    let rejectedPreviousOwner = true;
    if (mode === "adopted" || mode === "disposed-first" || mode === "facade") {
      source.ui.enhance(root);
      if (kind === "json-viewer") {
        required(viewerBranches(root)[0]).open = false;
        required(viewerBranches(root)[1]).open = true;
      } else {
        source.ui.logViewer.pause(root);
        source.ui.logViewer.follow(root, false);
      }
      const original = kind === "json-viewer" ? viewerPart(root, "tree").firstChild : undefined;
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        if (kind === "json-viewer") source.ui.jsonViewer.value(root);
        else source.ui.logViewer.state(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected owner rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") {
        if (kind === "json-viewer") active.ui.jsonViewer.value(root);
        else active.ui.logViewer.state(root);
      } else active.ui.enhance(root);
      source.star.dispose();
      if (kind === "json-viewer")
        retainedAfterAdoption =
          viewerPart(root, "tree").firstChild === original &&
          viewerBranches(root)
            .map((branch) => branch.open)
            .join() === "false,true,false";
      else {
        const state = active.ui.logViewer.state(root);
        retainedAfterAdoption = state.paused && !state.following && state.count === 1;
        active.ui.logViewer.resume(root);
      }
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else active.ui.enhance(root);
    const enhancedBeforeFacade = root.dataset.state === (kind === "json-viewer" ? "ready" : "live");
    const events: boolean[] = [];
    const constructors = active.owner as Window & typeof globalThis;
    for (const name of kind === "json-viewer"
      ? ["update", "expand", "collapse", "error"]
      : ["append", "clear", "pause", "resume", "filter", "follow"])
      root.addEventListener(`jquery-star:${kind}:${name}`, (event) =>
        events.push(event instanceof constructors.CustomEvent),
      );
    if (mode === "action") {
      const trigger = required(root.querySelector<HTMLButtonElement>('[data-part="action"]'));
      trigger.setAttribute("data-on:click", viewerActions[kind]);
      active.jquery(root).star();
      trigger.click();
      await active.star.whenEnhanced();
      await new Promise<void>((resolve) => active.owner.queueMicrotask(resolve));
      active.jquery(root).star("destroy");
    } else if (kind === "json-viewer") active.ui.jsonViewer.expandAll(root);
    else active.ui.logViewer.pause(root);
    const operated =
      kind === "json-viewer"
        ? viewerBranches(root).every((branch) => branch.open)
        : active.ui.logViewer.state(root).paused;
    const initialContent =
      kind === "json-viewer"
        ? viewerPart(root, "tree").firstChild
        : viewerPart(root, "entries").firstChild;
    const eventCount = events.length;
    active.ui.enhance(root);
    active.ui.enhance(root);
    const stable =
      initialContent ===
        (kind === "json-viewer"
          ? viewerPart(root, "tree").firstChild
          : viewerPart(root, "entries").firstChild) && events.length === eventCount;
    let currentParts = false;
    let nativeBehavior = false;
    let reentered = false;
    let constraints = true;
    let uniqueIDs = true;
    if (kind === "json-viewer") {
      const branch = required(viewerBranches(root)[0]);
      required(branch.querySelector("summary")).click();
      active.ui.jsonViewer.value(root);
      nativeBehavior = !branch.open;
      for (const name of ["source", "tree", "status"]) {
        const old = viewerPart(root, name);
        const next = old.cloneNode(false) as HTMLElement;
        if (name === "source") next.textContent = '{"replacement":{"value":3}}';
        old.replaceWith(next);
      }
      const value = active.ui.jsonViewer.value(root);
      currentParts =
        JSON.stringify(value) === '{"replacement":{"value":3}}' &&
        viewerPart(root, "tree").textContent.includes("replacement") &&
        viewerPart(root, "status").textContent.includes("JSON");
      active.ui.jsonViewer.set(root, {
        toJSON() {
          active.ui.jsonViewer.set(root, { newer: true });
          return { older: true };
        },
      });
      reentered = JSON.stringify(active.ui.jsonViewer.value(root)) === '{"newer":true}';
      delete root.dataset.expanded;
      active.ui.enhance(root);
      const tree = viewerPart(root, "tree");
      const replace = tree.replaceChildren.bind(tree);
      tree.replaceChildren = (...nodes) => {
        tree.replaceChildren = replace;
        replace(...nodes);
        active.ui.jsonViewer.collapseAll(root);
      };
      active.ui.jsonViewer.set(root, { nested: { value: 2 } });
      const collapsed = !required(viewerBranches(root)[0]).open;
      delete root.dataset.expanded;
      active.ui.enhance(root);
      reentered = reentered && collapsed && required(viewerBranches(root)[0]).open;
      root.dataset.maxDepth = "1";
      active.ui.jsonViewer.set(root, { nested: { leaf: 1 } });
      const truncated = !!root.querySelector('[data-type="truncated"]');
      root.dataset.maxDepth = "5";
      active.ui.enhance(root);
      constraints = truncated && !root.querySelector('[data-type="truncated"]');
    } else {
      active.ui.logViewer.resume(root);
      for (const name of ["viewport", "filter", "pause", "status"]) {
        const old = viewerPart(root, name);
        old.replaceWith(old.cloneNode(name !== "status"));
      }
      active.ui.logViewer.append(root, { message: "<img src=x> current", level: "error" });
      const filter = viewerPart(root, "filter") as HTMLSelectElement;
      filter.value = "error";
      filter.dispatchEvent(new constructors.Event("change", { bubbles: true }));
      currentParts =
        active.ui.logViewer.state(root).filter === "error" &&
        viewerPart(root, "entries").textContent.includes("<img src=x> current") &&
        !root.querySelector("img") &&
        viewerPart(root, "status").textContent.includes("Live");
      root.dataset.disabled = "true";
      filter.value = "all";
      filter.dispatchEvent(new constructors.Event("change", { bubbles: true }));
      constraints = active.ui.logViewer.state(root).filter === "error";
      delete root.dataset.disabled;
      root.addEventListener(
        "jquery-star:log-viewer:before-append",
        () => active.ui.logViewer.clear(root),
        { once: true },
      );
      active.ui.logViewer.append(root, { message: "older" });
      reentered = active.ui.logViewer.state(root).count === 0;
      active.ui.logViewer.filter(root, "all");
      for (let i = 0; i < 6; i += 1) active.ui.logViewer.append(root, { message: `entry ${i}` });
      const entries = Array.from(viewerPart(root, "entries").children);
      uniqueIDs = entries.length === 3 && new Set(entries.map((entry) => entry.id)).size === 3;
      for (const entry of entries)
        if (entry instanceof constructors.HTMLElement) entry.style.height = "100px";
      active.ui.logViewer.follow(root, false);
      active.ui.logViewer.follow(root, true);
      await active.star.whenEnhanced();
      await new Promise<void>((resolve) => active.owner.queueMicrotask(resolve));
      const view = viewerPart(root, "viewport");
      nativeBehavior = view.scrollTop > 0;
      view.scrollTop = 0;
      view.dispatchEvent(new constructors.Event("scroll"));
      nativeBehavior &&= !active.ui.logViewer.state(root).following;
    }
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    if (kind === "json-viewer") active.ui.jsonViewer.set(root, { preserved: true });
    else active.ui.logViewer.append(root, { message: "preserved" });
    app.append(root);
    await preserve.commit();
    const preserved = root.textContent.includes("preserved");
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      if (kind === "json-viewer") active.ui.jsonViewer.expandAll(root);
      else active.ui.logViewer.pause(root);
    } catch {
      rejectedRemovedRoot = true;
    }
    const before = root.outerHTML;
    if (kind === "log-viewer") {
      const filter = viewerPart(root, "filter") as HTMLSelectElement;
      filter.value = "error";
      filter.dispatchEvent(new constructors.Event("change", { bubbles: true }));
      viewerPart(root, "viewport").dispatchEvent(new constructors.Event("scroll"));
    }
    await new Promise<void>((resolve) => active.owner.queueMicrotask(resolve));
    const retired = root.outerHTML === before;
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      retainedAfterAdoption,
      rejectedPreviousOwner,
      operated,
      stable,
      currentParts,
      nativeBehavior,
      reentered,
      constraints,
      uniqueIDs,
      preserved,
      rejectedRemovedRoot,
      retired,
      ownerEvents: events.length > 0 && events.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

type ReportingKind = "chart" | "data-table";

export function exerciseDataTableCost(factory: Factory) {
  const active = createRealm(factory);
  const owner = active.owner as Window & typeof globalThis;
  const prototype = owner.HTMLTableRowElement.prototype;
  const previous = Object.getOwnPropertyDescriptor(prototype, "textContent");
  const native = Object.getOwnPropertyDescriptor(owner.Node.prototype, "textContent")?.get;
  if (!native) throw new Error("Missing native row text getter.");
  try {
    return [12, 24, 48].map((size) => {
      const root = owner.document.createElement("section");
      root.dataset.jqs = "data-table";
      root.dataset.pageSize = "4";
      root.innerHTML = `
        <table data-part="table">
          <thead><tr><th data-key="name"><button data-part="sort">Name</button></th></tr></thead>
          <tbody>${Array.from(
            { length: size },
            (_, index) =>
              `<tr data-row-id="row-${index}"><td data-key="name">Row ${index}<input data-part="row-select" type="checkbox"></td></tr>`,
          ).join("")}</tbody>
        </table>
        <button data-part="previous">Previous</button>
        <button data-part="next">Next</button>
        <span data-part="page-status"></span>
        <span data-part="selection-status"></span>
      `;
      owner.document.body.append(root);
      let reads = 0;
      Object.defineProperty(prototype, "textContent", {
        configurable: true,
        get(this: HTMLTableRowElement) {
          reads++;
          return Reflect.apply(native, this, []);
        },
      });
      try {
        active.ui.enhance(root);
        const initial = reads;
        reads = 0;
        const query = Reflect.get(root, "querySelectorAll");
        let queries = 0;
        Object.defineProperty(root, "querySelectorAll", {
          configurable: true,
          value: (selector: string) => {
            queries++;
            return Reflect.apply(query, root, [selector]);
          },
        });
        let page: number;
        try {
          active.ui.dataTable.page(root, 2);
          page = reads;
        } finally {
          Reflect.deleteProperty(root, "querySelectorAll");
        }
        reads = 0;
        active.ui.enhance(root);
        const repeated = reads;
        const visible = Array.from(root.querySelectorAll<HTMLTableRowElement>("tbody tr"))
          .filter((row) => !row.hidden)
          .map((row) => row.dataset.rowId);
        return {
          size,
          initial,
          page,
          repeated,
          queries,
          visible,
          status: root.querySelector('[data-part="page-status"]')?.textContent,
        };
      } finally {
        if (previous) Object.defineProperty(prototype, "textContent", previous);
        else Reflect.deleteProperty(prototype, "textContent");
        root.remove();
      }
    });
  } finally {
    active.star.dispose();
    active.frame.remove();
  }
}

function reportingMarkup(kind: ReportingKind): string {
  const body =
    kind === "chart"
      ? '<svg data-part="plot"></svg><div data-part="legend"></div><p data-part="status"></p><table data-part="data"><caption>Counts</caption><thead><tr><th>Label</th><th data-series="count">Count</th></tr></thead><tbody><tr><th>Alpha</th><td>10</td></tr></tbody></table>'
      : '<input data-part="filter" aria-label="Filter"><table data-part="table"><caption>Rows</caption><thead><tr><th><input type="checkbox" data-part="select-all" aria-label="Select visible"></th><th data-key="name"><button data-part="sort">Name</button></th></tr></thead><tbody><tr data-row-id="beta"><td><input type="checkbox" data-part="row-select" checked aria-label="Select Beta"></td><th data-key="name">Beta</th></tr><tr data-row-id="alpha"><td><input type="checkbox" data-part="row-select" aria-label="Select Alpha"></td><th data-key="name">Alpha</th></tr></tbody></table><button data-part="previous">Previous</button><button data-part="next">Next</button><p data-part="page-status"></p><p data-part="selection-status"></p>';
  return `<section id="realm-report" data-jqs="${kind}" data-page-size="1">${body}</section>`;
}
function reportingValue(
  ui: ReturnType<typeof createRealm>["ui"],
  root: HTMLElement,
  kind: ReportingKind,
): void {
  if (kind === "chart") ui.chart.data(root);
  else ui.dataTable.selected(root);
}
function reportingChange(
  ui: ReturnType<typeof createRealm>["ui"],
  root: HTMLElement,
  kind: ReportingKind,
): void {
  if (kind === "chart") ui.chart.setType(root, "line");
  else ui.dataTable.sort(root, "name", "ascending");
}
function tableIDs(root: HTMLElement): string {
  const table = required(root.querySelector("table"));
  return Array.from(required(table.tBodies[0]).rows, (row) => row.dataset.rowId).join();
}
function exerciseChartOutput(active: ReturnType<typeof createRealm>, root: HTMLElement) {
  const old = viewerPart(root, "plot");
  const original = old.innerHTML;
  old.replaceWith(old.cloneNode(false));
  active.ui.chart.refresh(root);
  const plot = viewerPart(root, "plot");
  const currentParts = old.innerHTML === original && !!plot.querySelector('[data-part="line"]');
  const nativeBehavior =
    plot.namespaceURI === "http://www.w3.org/2000/svg" &&
    plot.getAttribute("aria-hidden") === "true" &&
    plot.getBoundingClientRect().width > 0 &&
    root.querySelector("caption")?.textContent === "Counts";
  root.addEventListener(
    "jquery-star:chart:before-render",
    () => {
      required(root.querySelector("td")).textContent = "30";
      active.ui.chart.setType(root, "bar");
    },
    { once: true },
  );
  active.ui.chart.refresh(root);
  const reentered =
    root.querySelector('[data-part="bar"] title')?.textContent === "Alpha, Count: 30";
  const replace = plot.replaceChildren.bind(plot);
  let failed = false;
  plot.replaceChildren = () => {
    throw new Error("Interrupted chart output");
  };
  try {
    active.ui.chart.refresh(root);
  } catch {
    failed = true;
  }
  plot.replaceChildren = replace;
  active.ui.enhance(root);
  const recovered = failed && !!plot.querySelector('[data-part="bar"]');
  return { currentParts, nativeBehavior, reentered, recovered };
}
function exerciseTableOutput(active: ReturnType<typeof createRealm>, root: HTMLElement) {
  const table = viewerPart(root, "table");
  const before = table.innerHTML;
  table.replaceWith(table.cloneNode(true));
  active.ui.dataTable.sort(root, "name", "descending");
  const currentParts = table.innerHTML === before && tableIDs(root) === "beta,alpha";
  active.ui.dataTable.sort(root, "name", "ascending");
  let sorted = 0;
  root.addEventListener("jquery-star:data-table:sort", () => {
    sorted += 1;
  });
  root.addEventListener(
    "jquery-star:data-table:before-sort",
    () => active.ui.dataTable.page(root, 2),
    { once: true },
  );
  active.ui.dataTable.sort(root, "name", "descending");
  const reentered = root.dataset.page === "2" && sorted === 0;
  const filter = viewerPart(root, "filter") as HTMLInputElement;
  filter.value = "Alpha";
  filter.dispatchEvent(
    new (active.owner as Window & typeof globalThis).Event("input", { bubbles: true }),
  );
  const nativeBehavior =
    root.dataset.rowCount === "1" &&
    root.querySelector("caption")?.textContent === "Rows" &&
    active.ui.dataTable.selected(root).join() === "beta";
  active.ui.dataTable.filter(root, "");
  active.ui.dataTable.sort(root, "name", "none");
  // The new table starts from the current server-authored order; its native row identities survive recovery.
  const rows = Array.from(required(root.querySelector("tbody")).rows);
  active.ui.enhance(root);
  const recovered = rows.every(
    (row, index) => required(root.querySelector("tbody")).rows[index] === row,
  );
  return { currentParts, nativeBehavior, reentered, recovered };
}
export async function exerciseReportingOwnership(
  factory: Factory,
  kind: ReportingKind,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML = reportingMarkup(kind);
    source.owner.document.body.append(app);
    const root = required(app.querySelector<HTMLElement>("section"));
    let active = source;
    let retainedAfterAdoption = true;
    let rejectedPreviousOwner = true;
    if (mode === "adopted" || mode === "disposed-first" || mode === "facade") {
      source.ui.enhance(root);
      const native = viewerPart(root, kind === "chart" ? "plot" : "table");
      const child = native.firstChild;
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        reportingValue(source.ui, root, kind);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected owner rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") reportingValue(active.ui, root, kind);
      else active.ui.enhance(root);
      source.star.dispose();
      retainedAfterAdoption =
        native.firstChild === child &&
        (kind === "chart" || active.ui.dataTable.selected(root).join() === "beta");
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else active.ui.enhance(root);
    const enhancedBeforeFacade =
      kind === "chart" ? root.dataset.state === "ready" : root.dataset.rowCount === "2";
    const events: boolean[] = [];
    root.addEventListener(`jquery-star:${kind}:${kind === "chart" ? "render" : "sort"}`, (event) =>
      events.push(event instanceof (active.owner as Window & typeof globalThis).CustomEvent),
    );
    if (mode === "action") {
      const instance = required(active.jquery(root).star().star("instance"));
      await instance.run(kind === "chart" ? "ui.chart.type" : "ui.dataTable.sort", {
        args: kind === "chart" ? ["#realm-report", "line"] : ["#realm-report", "name", "ascending"],
      });
      active.jquery(root).star("destroy");
    } else if (kind === "chart") active.ui.chart.setType(root, "line");
    else viewerPart(root, "sort").click();
    const operated =
      kind === "chart"
        ? !!root.querySelector('[data-part="line"]')
        : tableIDs(root) === "alpha,beta";
    const native = viewerPart(root, kind === "chart" ? "plot" : "table").firstChild;
    const count = events.length;
    active.ui.enhance(root);
    active.ui.enhance(root);
    const stable =
      native === viewerPart(root, kind === "chart" ? "plot" : "table").firstChild &&
      events.length === count;
    const output =
      kind === "chart" ? exerciseChartOutput(active, root) : exerciseTableOutput(active, root);
    root.dataset.disabled = "true";
    const constrainedEvents = events.length;
    const instance = required(active.jquery(root).star().star("instance"));
    await instance.run(kind === "chart" ? "ui.chart.type" : "ui.dataTable.sort", {
      args: kind === "chart" ? ["line"] : ["name", "ascending"],
    });
    const constraints = events.length === constrainedEvents;
    active.jquery(root).star("destroy");
    delete root.dataset.disabled;
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    reportingChange(active.ui, root, kind);
    app.append(root);
    await preserve.commit();
    const preserved =
      kind === "chart"
        ? !!root.querySelector('[data-part="line"]')
        : tableIDs(root) === "alpha,beta";
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      reportingChange(active.ui, root, kind);
    } catch {
      rejectedRemovedRoot = true;
    }
    const html = root.outerHTML;
    const eventCount = events.length;
    if (kind === "data-table") viewerPart(root, "sort").click();
    const retired = root.outerHTML === html && events.length === eventCount;
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      retainedAfterAdoption,
      rejectedPreviousOwner,
      operated,
      stable,
      ...output,
      constraints,
      preserved,
      rejectedRemovedRoot,
      retired,
      ownerEvents: events.length > 0 && events.every(Boolean),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}

type CalendarKind = "calendar" | "range-calendar" | "date-picker" | "date-range-picker";
function calendarMarkup(kind: CalendarKind): string {
  const range = kind.includes("range");
  const parts =
    '<div data-part="header"><button data-part="previous">Previous</button><h2 data-part="heading"></h2><button data-part="next">Next</button></div><div data-part="grid"></div><p data-part="status"></p>';
  if (!kind.includes("picker"))
    return `<section id="realm-calendar" data-jqs="${kind}" data-month="2026-09" ${range ? 'data-start="2026-09-02" data-end="2026-09-05"' : 'data-value="2026-09-02"'}>${parts}</section>`;
  return `<section id="realm-calendar" data-jqs="${kind}">${range ? '<input data-part="start-control" name="start" aria-label="Start date" value="2026-09-02"><input data-part="end-control" name="end" aria-label="End date" value="2026-09-05">' : '<input data-part="control" name="date" aria-label="Date" value="2026-09-02">'}<div data-jqs="popover" data-part="popover"><button data-part="trigger"><span data-part="value">Choose</span></button><div data-part="content"><section data-jqs="${range ? "range-calendar" : "calendar"}" data-month="2026-09">${parts}</section></div></div></section>`;
}
function calendarFacade(ui: ReturnType<typeof createRealm>["ui"], kind: CalendarKind) {
  if (kind === "calendar") return ui.calendar;
  if (kind === "range-calendar") return ui.rangeCalendar;
  if (kind === "date-picker") return ui.datePicker;
  return ui.dateRangePicker;
}
function calendarSelect(
  ui: ReturnType<typeof createRealm>["ui"],
  root: HTMLElement,
  kind: CalendarKind,
  start: string | Date,
  end?: string | Date,
): void {
  if (kind === "range-calendar") ui.rangeCalendar.select(root, start, end);
  else if (kind === "date-range-picker") ui.dateRangePicker.select(root, start, end);
  else if (kind === "date-picker") ui.datePicker.select(root, start);
  else ui.calendar.select(root, start);
}
function calendarValue(root: HTMLElement): string | undefined {
  if (root.dataset.jqs?.includes("picker")) return required(root.querySelector("input")).value;
  return root.dataset[root.dataset.jqs === "calendar" ? "value" : "start"];
}

export async function exerciseCalendarOwnership(
  factory: Factory,
  kind: CalendarKind,
  mode: RealmMode | "disposed-first" | "facade",
) {
  const source = createRealm(factory);
  const destination = createRealm(factory);
  try {
    await source.star.whenEnhanced();
    await destination.star.whenEnhanced();
    const app = source.owner.document.createElement("main");
    app.innerHTML = `<form>${calendarMarkup(kind)}</form>`;
    source.owner.document.body.append(app);
    const form = required(app.querySelector("form"));
    const root = required(app.querySelector<HTMLElement>("section"));
    const picker = kind.includes("picker");
    const range = kind.includes("range");
    const calendar = picker
      ? required(
          root.querySelector<HTMLElement>(`[data-jqs="${range ? "range-calendar" : "calendar"}"]`),
        )
      : root;
    let active = source;
    let retainedAfterAdoption = true;
    let retainedOpen = true;
    let rejectedPreviousOwner = true;
    if (mode === "adopted" || mode === "disposed-first" || mode === "facade") {
      source.ui.enhance(root);
      if (picker) (range ? source.ui.dateRangePicker : source.ui.datePicker).open(root);
      const native = viewerPart(root, "grid").firstChild;
      destination.owner.document.body.append(destination.owner.document.adoptNode(app));
      active = destination;
      try {
        calendarFacade(source.ui, kind).value(root);
        rejectedPreviousOwner = false;
      } catch {
        /* Expected owner rejection. */
      }
      if (mode === "disposed-first") source.star.dispose();
      if (mode === "facade") calendarFacade(active.ui, kind).value(root);
      else active.ui.enhance(root);
      source.star.dispose();
      retainedAfterAdoption =
        viewerPart(root, "grid").firstChild === native && calendarValue(root) === "2026-09-02";
      retainedOpen = !picker || viewerPart(root, "popover").dataset.state === "open";
    } else if (mode === "automatic") await active.star.whenEnhanced();
    else active.ui.enhance(root);
    const enhancedBeforeFacade = root.querySelectorAll('[data-part="day"]').length === 42;
    const constructors = active.owner as Window & typeof globalThis;
    const events: boolean[] = [];
    root.addEventListener(`jquery-star:${kind}:change`, (event) =>
      events.push(event instanceof constructors.CustomEvent),
    );
    const nativeEvents: boolean[] = [];
    for (const input of root.querySelectorAll("input"))
      input.addEventListener("input", (event) =>
        nativeEvents.push(event instanceof constructors.Event),
      );
    const day = (value: string): HTMLButtonElement =>
      required(
        calendar.querySelector<HTMLButtonElement>(`[data-part="day"][data-value="${value}"]`),
      );
    const choose = (start: string | Date, end?: string | Date): void =>
      calendarSelect(active.ui, root, kind, start, end);
    if (mode === "action") {
      const instance = required(active.jquery(root).star().star("instance"));
      await instance.run(`ui.${kind}.select`, {
        args: ["#realm-calendar", "2026-09-10", ...(range ? ["2026-09-12"] : [])],
      });
      active.jquery(root).star("destroy");
    } else {
      if (picker) (range ? active.ui.dateRangePicker : active.ui.datePicker).open(root);
      day("2026-09-10").click();
      if (range) day("2026-09-12").click();
    }
    const operated =
      calendarValue(root) === "2026-09-10" && (!range || calendar.dataset.end === "2026-09-12");
    const nativeSubmission =
      !picker || new constructors.FormData(form).get(range ? "start" : "date") === "2026-09-10";
    const first = viewerPart(root, "grid").firstChild;
    const count = events.length;
    active.ui.enhance(root);
    active.ui.enhance(root);
    const stable = viewerPart(root, "grid").firstChild === first && events.length === count;
    const foreign = (active === source ? destination.owner : source.owner) as Window &
      typeof globalThis;
    const date = new foreign.Date("2026-09-14T12:00:00Z");
    choose(date, "2026-09-16");
    const foreignDate =
      !(date instanceof constructors.Date) && calendarValue(root) === "2026-09-14";
    choose("0099-09-10", "0099-09-12");
    const earlyYear = calendarValue(root) === "0099-09-10" && calendar.dataset.month === "0099-09";
    choose("2026-09-02", "2026-09-05");
    if (picker) (range ? active.ui.dateRangePicker : active.ui.datePicker).open(root);
    day("2026-09-02").focus();
    day("2026-09-02").dispatchEvent(
      new constructors.KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      }),
    );
    const keyboard =
      active.owner.document.activeElement?.getAttribute("data-value") === "2026-09-03" &&
      calendarValue(root) === "2026-09-02";
    calendar.addEventListener("click", (event) => event.preventDefault(), {
      capture: true,
      once: true,
    });
    day("2026-09-10").dispatchEvent(
      new constructors.MouseEvent("click", { bubbles: true, cancelable: true }),
    );
    const canceledNative = calendarValue(root) === "2026-09-02";
    const before = `jquery-star:${range ? "range-calendar" : "calendar"}:before-change`;
    calendar.addEventListener(
      before,
      () => {
        calendar.dataset.disabledDates = "2026-09-10";
      },
      { once: true },
    );
    choose("2026-09-10", "2026-09-12");
    const constraints = calendarValue(root) === "2026-09-02";
    delete calendar.dataset.disabledDates;
    const oldGrid = viewerPart(root, "grid");
    oldGrid.replaceWith(oldGrid.cloneNode(false));
    choose("2026-09-14", "2026-09-16");
    const currentParts =
      root.querySelectorAll('[data-part="day"]').length === 42 &&
      calendarValue(root) === "2026-09-14";
    calendar.addEventListener(before, () => choose("2026-09-18", "2026-09-20"), { once: true });
    choose("2026-09-10", "2026-09-12");
    const reentered = calendarValue(root) === "2026-09-18";
    const heading = viewerPart(root, "heading");
    const setHeading = heading.setAttribute;
    const eventCount = events.length;
    heading.setAttribute = function (name, value) {
      setHeading.call(this, name, value);
      if (calendar.dataset[range ? "start" : "value"] === "2026-09-14")
        root.dataset.disabled = "true";
    };
    day("2026-09-14").dispatchEvent(new constructors.MouseEvent("click", { bubbles: true }));
    const constrainedContinuation =
      events.length === eventCount && (!picker || calendarValue(root) === "2026-09-18");
    heading.setAttribute = setHeading;
    delete root.dataset.disabled;
    choose("2026-09-18", "2026-09-20");
    let canceledReset = true;
    let acceptedReset = true;
    if (picker) {
      form.addEventListener("reset", (event) => event.preventDefault(), { once: true });
      form.reset();
      await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
      canceledReset = calendarValue(root) === "2026-09-18";
      form.reset();
      await new Promise<void>((resolve) => active.owner.setTimeout(resolve, 10));
      acceptedReset =
        calendarValue(root) === "2026-09-02" &&
        calendar.dataset[range ? "start" : "value"] === "2026-09-02";
    }
    const adapter = createRenderAdapter(active.installed);
    const preserve = adapter.begin(app, { preserveRoots: [root] });
    preserve.beforeRemove(root);
    root.remove();
    form.append(root);
    await preserve.commit();
    choose("2026-09-22", "2026-09-24");
    const preserved = calendarValue(root) === "2026-09-22";
    const removal = adapter.begin(app);
    removal.beforeRemove(root);
    let rejectedRemovedRoot = false;
    try {
      choose("2026-09-10");
    } catch {
      rejectedRemovedRoot = true;
    }
    const html = root.outerHTML;
    day("2026-09-10").click();
    const retired = root.outerHTML === html;
    root.remove();
    await removal.commit();
    return {
      enhancedBeforeFacade,
      retainedAfterAdoption,
      retainedOpen,
      rejectedPreviousOwner,
      operated,
      nativeSubmission,
      stable,
      foreignDate,
      earlyYear,
      keyboard,
      canceledNative,
      constraints,
      currentParts,
      reentered,
      constrainedContinuation,
      canceledReset,
      acceptedReset,
      preserved,
      rejectedRemovedRoot,
      retired,
      ownerEvents:
        events.length > 0 &&
        events.every(Boolean) &&
        (!picker || (nativeEvents.length > 0 && nativeEvents.every(Boolean))),
    };
  } finally {
    source.star.dispose();
    destination.star.dispose();
    source.frame.remove();
    destination.frame.remove();
  }
}
