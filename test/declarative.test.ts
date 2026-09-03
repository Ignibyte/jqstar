import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import { DeclarativeApplication } from "../src/declarative";
import type { StarExpressionError } from "../src/expression";
import { kernelForDocument } from "../src/kernel";
import { effect, reactive } from "../src/reactivity";

async function settled(): Promise<void> {
  await $.star.nextUpdate();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("declarative jQuery Star", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    $.fx.off = true;
  });

  afterEach(() => {
    $("body").children().star("destroy");
    $.star.clearExpressionCache();
    $.fx.off = false;
    vi.useRealTimers();
  });

  it("runs the requested jQuery expression while updating a reactive signal", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0 }">
        <button data-on:click="$count++; $(el).fadeOut()">
          Increment and disappear
        </button>
        <output data-text="$count"></output>
      </section>
    `;

    $("#app").star();
    expect($("output").text()).toBe("0");

    $("button").trigger("click");
    await settled();

    expect($("#app").star<{ count: number }>("state")?.count).toBe(1);
    expect($("output").text()).toBe("1");
    expect($("button").css("display")).toBe("none");
  });

  it("keeps $ as real jQuery and exposes el, evt, and this", async () => {
    document.body.innerHTML = `
      <section id="app">
        <button data-on:click="$(el).attr('data-proof', $.fn.jquery); $(this).attr('data-event', evt.type); $el.attr('data-el', 'yes'); $root.attr('data-root', 'yes')">
          Prove context
        </button>
      </section>
    `;

    $("#app").star();
    $("button").trigger("click");
    await settled();

    expect($("button").attr("data-proof")).toBe($.fn.jquery);
    expect($("button").attr("data-event")).toBe("click");
    expect($("button").attr("data-el")).toBe("yes");
    expect($("#app").attr("data-root")).toBe("yes");
  });

  it("invokes @name actions and evaluates their arguments against signals", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ itemId: 42 }">
        <button data-on:click="@removeItem($itemId, 'archive')">Remove</button>
      </section>
    `;
    const remove = vi.fn(({ $element, args }) => {
      $element?.attr("data-removed", String(args?.[0]));
    });
    $.star.action("removeItem", remove);

    $("#app").star();
    $("button").trigger("click");
    await settled();

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0]?.[0].args).toEqual([42, "archive"]);
    expect($("button").attr("data-removed")).toBe("42");
  });

  it("reacts through text, computed, show, class, attribute, property, style, and effect directives", async () => {
    document.body.innerHTML = `
      <section
        id="app"
        data-signals="{ count: 1 }"
        data-computed:double="$count * 2"
      >
        <button data-on:click="$count++">Increment</button>
        <output
          data-text="$double"
          data-show="$count > 0"
          data-class:ready="$count >= 2"
          data-attr:aria-label="'Count ' + $count"
          data-prop:title="'Double ' + $double"
          data-style:color="$count >= 2 ? 'green' : 'red'"
        ></output>
        <i data-effect="$(el).attr('data-seen', $count)"></i>
      </section>
    `;

    $("#app").star();
    expect($("output").text()).toBe("2");
    expect($("i").attr("data-seen")).toBe("1");

    $("button").trigger("click");
    await settled();

    expect($("output").text()).toBe("4");
    expect($("output").hasClass("ready")).toBe(true);
    expect($("output").attr("aria-label")).toBe("Count 2");
    expect($("output").prop("title")).toBe("Double 4");
    expect($<HTMLElement>("output").get(0)?.style.color).toBe("green");
    expect($("i").attr("data-seen")).toBe("2");
  });

  it("provides two-way nested bindings for text and checkboxes", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ user: { name: 'Ada', subscribed: false } }">
        <input name="name" data-bind:user.name>
        <input name="subscribed" type="checkbox" data-bind:user.subscribed>
        <output data-text="$user.name + ':' + $user.subscribed"></output>
      </section>
    `;

    $("#app").star();
    expect($("[name=name]").val()).toBe("Ada");

    $("[name=name]").val("Grace").trigger("input");
    $("[name=subscribed]").prop("checked", true).trigger("change");
    await settled();

    expect($("output").text()).toBe("Grace:true");
    expect($("#app").star<{ user: { name: string; subscribed: boolean } }>("state")?.user).toEqual({
      name: "Grace",
      subscribed: true,
    });
  });

  it("supports prevent, once, key, debounce, and outside modifiers", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0 }">
        <button class="once" data-on:click__prevent__once="$count++">Once</button>
        <input data-on:keydown__enter__debounce.25ms="$count += 10">
        <aside data-on:pointerdown__outside="$count += 100">Panel</aside>
        <output data-text="$count"></output>
      </section>
    `;

    $("#app").star();
    const click = $.Event("click");
    $(".once").trigger(click).trigger("click");
    expect(click.isDefaultPrevented()).toBe(true);

    $("input").trigger($.Event("keydown", { key: "Escape" }));
    $("input").trigger($.Event("keydown", { key: "Enter" }));
    await vi.advanceTimersByTimeAsync(25);

    document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await $.star.nextUpdate();
    expect($("output").text()).toBe("111");
  });

  it("initializes changed and dynamically inserted directives exactly once", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0 }">
        <button data-on:click="$count++">Increment</button>
        <output data-text="$count"></output>
      </section>
    `;

    $("#app").star();
    $("button").attr("data-on:click", "$count += 2");
    await settled();
    $("button").trigger("click");
    await settled();
    expect($("output").text()).toBe("2");

    $("#app").append(`
      <button class="dynamic" data-on:click="$count += 3">Dynamic</button>
      <strong data-text="$count"></strong>
    `);
    await settled();
    $(".dynamic").trigger("click");
    await settled();

    expect($("output").text()).toBe("5");
    expect($("strong").text()).toBe("5");
  });

  it("runs initialization and destruction actions during DOM lifecycle", async () => {
    document.body.innerHTML = `
      <section id="app">
        <div class="widget" data-init="@mountWidget" data-destroy="@destroyWidget"></div>
      </section>
    `;
    const mount = vi.fn();
    const destroy = vi.fn();
    $.star.action("mountWidget", mount).action("destroyWidget", destroy);

    $("#app").star();
    await settled();
    expect(mount).toHaveBeenCalledTimes(1);

    $(".widget").remove();
    await settled();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("reports malformed expressions without preventing other directives", () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 2 }">
        <span class="bad" data-text="("></span>
        <span class="good" data-text="$count"></span>
      </section>
    `;
    const errors: unknown[] = [];
    $("#app").on("jquery-star:error", (_event, detail) => errors.push(detail));

    $("#app").star();

    expect(errors).toHaveLength(1);
    expect($(".good").text()).toBe("2");
  });

  it("aborts staged requests when a later setup error forces rollback", async () => {
    document.body.innerHTML = `
      <section id="app">
        <i data-init="@get('/slow', { openWhenHidden: true })"></i>
        <output data-text="("></output>
      </section>
    `;
    let signal: AbortSignal | undefined;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      signal = init?.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new Error("request aborted")), {
          once: true,
        });
      });
    });
    const setupFailure = new Error("error reporter failed");
    let reports = 0;
    $("#app").on("jquery-star:error", () => {
      reports += 1;
      if (reports === 1) throw setupFailure;
    });

    try {
      expect(() => $("#app").star()).toThrow(setupFailure);
      await settled();

      expect(fetchMock).toHaveBeenCalledOnce();
      expect(signal?.aborted).toBe(true);
      expect($("#app").star("instance")).toBeUndefined();
    } finally {
      fetchMock.mockRestore();
    }
  });

  it("boots from a selector, merges signal declarations, and awaits event expressions", async () => {
    document.body.innerHTML = `
      <main id="app" data-signals="{ count: 1, user: { first: 'Ada' } }">
        <div data-signals="{ count: 2, user: { last: 'Lovelace' } }">
          <button data-on:click="await Promise.resolve(); $count++">Increment later</button>
          <output data-text="$user.first + ' ' + $user.last + ': ' + $count"></output>
        </div>
      </main>
    `;

    $.star.boot("#app");
    expect($("#app").star("instance")?.mode).toBe("attributes");
    expect($("output").text()).toBe("Ada Lovelace: 2");

    $("button").trigger("click");
    await settled();
    expect($("output").text()).toBe("Ada Lovelace: 3");
  });

  it("handles HTML and object class bindings while leaving ignored subtrees alone", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ ready: false }">
        <div class="markup" data-html="$ready ? '<strong>Ready</strong>' : '<em>Waiting</em>'"></div>
        <div class="classes" data-class="{ ready: $ready, waiting: !$ready }"></div>
        <div data-ignore>
          <button class="ignored" data-on:click="$ready = true">Ignored</button>
        </div>
      </section>
    `;

    $("#app").star();
    expect($(".markup em").text()).toBe("Waiting");
    expect($(".classes").hasClass("waiting")).toBe(true);

    $(".ignored").trigger("click");
    await settled();
    expect($("#app").star<{ ready: boolean }>("state")?.ready).toBe(false);

    $("[data-ignore]").append(
      '<button class="ignored-later" data-on:click="$ready = true">Later</button>',
    );
    await settled();
    $(".ignored-later").trigger("click");
    await settled();
    expect($("#app").star<{ ready: boolean }>("state")?.ready).toBe(false);

    $("#app").star<{ ready: boolean }>("state")!.ready = true;
    await settled();
    expect($(".markup strong").text()).toBe("Ready");
    expect($(".classes").hasClass("ready")).toBe(true);
  });

  it("initializes directives inserted by an initial data-html binding", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ ready: false }">
        <div class="injected" data-html="\`<button data-on:click='$ready = true'>Activate</button>\`"></div>
        <output data-text="$ready"></output>
      </section>
    `;

    $("#app").star();
    await settled();
    $(".injected button").trigger("click");
    await settled();
    expect($("output").text()).toBe("true");
  });

  it("binds kebab names, checkbox arrays, radio groups, and multiple selects", async () => {
    document.body.innerHTML = `
      <section
        id="app"
        data-signals="{ displayName: 'Ada', colors: ['red'], size: 'large', tags: ['one'] }"
      >
        <input name="display" data-bind:display-name>
        <input class="color" type="checkbox" value="red" data-bind:colors>
        <input class="color" type="checkbox" value="blue" data-bind:colors>
        <input type="radio" name="size" value="small" data-bind:size>
        <input type="radio" name="size" value="large" data-bind:size>
        <select name="tags" multiple data-bind:tags>
          <option value="one">One</option>
          <option value="two">Two</option>
        </select>
      </section>
    `;

    $("#app").star();
    expect($("[name=display]").val()).toBe("Ada");
    expect($(".color[value=red]").prop("checked")).toBe(true);
    expect($("[name=size][value=large]").prop("checked")).toBe(true);
    expect($("[name=tags]").val()).toEqual(["one"]);

    $("[name=display]").val("Grace").trigger("input");
    $(".color[value=blue]").prop("checked", true).trigger("change");
    $("[name=size][value=small]").prop("checked", true).trigger("change");
    $("[name=tags]").val(["two"]).trigger("change");
    await settled();

    const state = $("#app").star<{
      displayName: string;
      colors: string[];
      size: string;
      tags: string[];
    }>("state")!;
    expect(state).toMatchObject({
      displayName: "Grace",
      colors: ["red", "blue"],
      size: "small",
      tags: ["two"],
    });
  });

  it("supports stop, self, throttle, window, document, capture, and passive modifiers", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0 }">
        <button class="stop" data-on:click__stop="$count++">Stop</button>
        <div class="self" data-on:click__self="$count += 10"><span>Child</span></div>
        <button class="throttle" data-on:click__throttle.50ms="$count += 100">Throttle</button>
        <i data-on:resize__window__passive="$count += 1000"></i>
        <i data-on:star-event__document__capture="$count += 10000"></i>
        <output data-text="$count"></output>
      </section>
    `;
    const bubbled = vi.fn();
    $("#app").on("click", bubbled);

    $("#app").star();
    $(".stop").trigger("click");
    expect(bubbled).not.toHaveBeenCalled();

    $(".self span").trigger("click");
    $(".self").trigger("click");
    $(".throttle").trigger("click").trigger("click");
    await vi.advanceTimersByTimeAsync(50);
    $(".throttle").trigger("click");
    window.dispatchEvent(new Event("resize"));
    document.dispatchEvent(new Event("star-event"));
    await $.star.nextUpdate();

    expect($("output").text()).toBe("11211");
  });

  it("stops declarative effects and listeners when explicitly destroyed", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0 }">
        <button data-on:click="$count++">Increment</button>
        <output data-text="$count"></output>
      </section>
    `;

    $("#app").star();
    const state = $("#app").star<{ count: number }>("state")!;
    $("#app").star("destroy");

    state.count = 10;
    $("button").trigger("click");
    await settled();
    expect($("output").text()).toBe("0");
    expect(state.count).toBe(10);
    expect($("#app").star("instance")).toBeUndefined();
  });

  it("stops declarative model effects when explicitly destroyed", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 1 }">
        <input data-bind:count>
      </section>
    `;
    $("#app").star();
    const instance = $("#app").star("instance")!;
    const state = instance.state as { count: number };
    instance.destroy();

    state.count = 2;
    await $.star.nextUpdate();

    expect($("input").val()).toBe("1");
  });

  it("removes directive cleanup records before attempting every failing listener teardown", () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 0 }">
        <button class="first" data-on:click__capture="$count++"></button>
        <button class="complete" data-on:click__capture="$count++"></button>
        <button class="second" data-on:click__capture="$count++"></button>
      </section>
    `;
    const firstFailure = new Error("first directive cleanup failed");
    const secondFailure = new Error("second directive cleanup failed");
    $("#app").star();
    const first = document.querySelector(".first")!;
    const completeElement = document.querySelector(".complete")!;
    const second = document.querySelector(".second")!;
    const failOne = vi.spyOn(first, "removeEventListener").mockImplementation(() => {
      throw firstFailure;
    });
    const complete = vi.spyOn(completeElement, "removeEventListener");
    const failTwo = vi.spyOn(second, "removeEventListener").mockImplementation(() => {
      throw secondFailure;
    });
    const instance = $("#app").star("instance")!;

    let failure: unknown;
    try {
      instance.destroy();
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors).toEqual([firstFailure, secondFailure]);
    expect(failOne).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledOnce();
    expect(failTwo).toHaveBeenCalledOnce();
    expect($("#app").star("instance")).toBeUndefined();
    expect(() => instance.destroy()).not.toThrow();
    expect(failOne).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledOnce();
    expect(failTwo).toHaveBeenCalledOnce();
  });

  it("refreshes declarative effects explicitly and reports scheduled effect failures", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 1, fail: false }">
        <output data-text="$count"></output>
        <i data-effect="if ($fail) throw new Error('scheduled effect failed')"></i>
      </section>
    `;
    const errors: unknown[] = [];
    $("#app").on("jquery-star:error", (_event, detail) => errors.push(detail));
    $("#app").star();
    const instance = $("#app").star("instance")!;
    const state = instance.state as { count: number; fail: boolean };

    state.count = 2;
    instance.refresh();
    expect($("output").text()).toBe("2");
    state.fail = true;
    await $.star.nextUpdate();

    expect(errors).toHaveLength(1);
    const detail = errors[0] as {
      attribute: string;
      error: StarExpressionError;
      expression: string;
    };
    expect(detail).toMatchObject({
      attribute: "data-effect",
      expression: "if ($fail) throw new Error('scheduled effect failed')",
      error: {
        name: "StarExpressionError",
        phase: "evaluate",
        location: { attribute: "data-effect" },
      },
    });
    expect(detail.error.message).toContain("scheduled effect failed");
  });

  it("identifies multiple declarative refresh failures", () => {
    document.body.innerHTML = `<section id="app"></section>`;
    $("#app").star();
    const instance = $("#app").star("instance")!;
    const first = new Error("first refresh failed");
    const second = new Error("second refresh failed");
    const firstRunner = effect(() => undefined);
    const secondRunner = effect(() => undefined);
    const internals = instance as unknown as { effects: Set<typeof firstRunner> };
    Object.assign(firstRunner, { active: true });
    Object.assign(secondRunner, { active: true });
    internals.effects.add(
      Object.assign(() => {
        throw first;
      }, firstRunner),
    );
    internals.effects.add(
      Object.assign(() => {
        throw second;
      }, secondRunner),
    );

    expect(() => instance.refresh()).toThrow(
      expect.objectContaining({
        message: "jQuery Star declarative refresh failed.",
        errors: [first, second],
      }),
    );
  });

  it("reports failures from owned directive and model effects", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 1 }">
        <input data-bind:count>
        <output></output>
      </section>
    `;
    const reports: unknown[] = [];
    $("#app").on("jquery-star:error", (_event, detail) => reports.push(detail));
    $("#app").star();
    const instance = $("#app").star("instance")!;
    const internals = instance as unknown as {
      bindEffect(element: Element, attribute: string, run: () => void): void;
    };
    const output = document.querySelector("output")!;
    const local = reactive({ fail: false });
    internals.bindEffect(output, "test:effect", () => {
      if (local.fail) throw new Error("owned directive failed");
    });
    const originalVal = $.fn.val;
    const valueFailure = new Error("model write failed");
    const val = vi.spyOn($.fn, "val").mockImplementation(function (
      this: JQuery,
      ...args: unknown[]
    ) {
      if (args.length > 0 && this.is("input")) throw valueFailure;
      return originalVal.apply(this, args as Parameters<typeof originalVal>);
    });

    try {
      local.fail = true;
      (instance.state as { count: number }).count = 2;
      await $.star.nextUpdate();
      expect((reports[0] as { error: Error }).error.message).toBe("owned directive failed");
      expect(reports[0]).toMatchObject({ attribute: "test:effect", expression: "" });
      expect((reports[1] as { error: Error }).error).toBe(valueFailure);
    } finally {
      val.mockRestore();
    }
  });

  it("rolls back model and native event setup failures", () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ value: '' }">
        <input data-bind:value>
        <button data-on:click__capture="$value = 'clicked'"></button>
      </section>
    `;
    const input = document.querySelector("input")!;
    const button = document.querySelector("button")!;
    const modelFailure = new Error("model listener failed");
    const modelCleanupFailure = new Error("model cleanup failed");
    const eventFailure = new Error("native listener failed");
    const eventCleanupFailure = new Error("native cleanup failed");
    const reports: unknown[] = [];
    $("#app").on("jquery-star:error", (_event, detail) => reports.push(detail));
    const originalOn = Reflect.get($.fn, "on") as JQuery["on"];
    const originalOff = $.fn.off;
    const on = vi.spyOn($.fn, "on").mockImplementation(function (this: JQuery, ...args: unknown[]) {
      if (typeof args[0] === "string" && args[0].includes("jqueryStarBind")) throw modelFailure;
      return originalOn.apply(this, args as Parameters<typeof originalOn>);
    });
    const off = vi.spyOn($.fn, "off").mockImplementation(function (
      this: JQuery,
      ...args: unknown[]
    ) {
      if (typeof args[0] === "string" && args[0].includes("jqueryStarBind")) {
        throw modelCleanupFailure;
      }
      return originalOff.apply(this, args as Parameters<typeof originalOff>);
    });
    const add = vi.spyOn(button, "addEventListener").mockImplementation(() => {
      throw eventFailure;
    });
    const remove = vi.spyOn(button, "removeEventListener").mockImplementation(() => {
      throw eventCleanupFailure;
    });

    try {
      $("#app").star();
      expect(reports).toHaveLength(2);
      expect((reports[0] as { error: AggregateError }).error).toMatchObject({
        message: "jQuery Star model setup rollback failed.",
        errors: [modelFailure, modelCleanupFailure],
      });
      expect((reports[1] as { error: AggregateError }).error).toMatchObject({
        message: "jQuery Star event setup rollback failed.",
        errors: [eventFailure, eventCleanupFailure],
      });
      expect(remove).toHaveBeenCalledOnce();
      expect(input.getAttribute("data-bind:value")).not.toBeNull();
    } finally {
      on.mockRestore();
      off.mockRestore();
      add.mockRestore();
      remove.mockRestore();
    }
  });

  it("passes capture and passive options to native declarative listeners", () => {
    document.body.innerHTML = `
      <section id="app">
        <button data-on:click__capture__passive=""></button>
      </section>
    `;
    const button = document.querySelector("button")!;
    const add = vi.spyOn(button, "addEventListener");

    $("#app").star();

    expect(add).toHaveBeenCalledWith("click", expect.any(Function), {
      capture: true,
      passive: true,
    });
  });

  it("cleans both callbacks when replacing a cleanup fails", () => {
    document.body.innerHTML = `<section id="app"><i></i></section>`;
    $("#app").star();
    const instance = $("#app").star("instance")!;
    const internals = instance as unknown as {
      setCleanup(element: Element, attribute: string, cleanup: () => void): void;
    };
    const element = document.querySelector("i")!;
    const previousFailure = new Error("previous cleanup failed");
    const replacement = vi.fn();
    internals.setCleanup(element, "test:cleanup", () => {
      throw previousFailure;
    });

    expect(() => internals.setCleanup(element, "test:cleanup", replacement)).toThrow(
      previousFailure,
    );
    expect(replacement).toHaveBeenCalledOnce();
    const cleanupMaps = (instance as unknown as { cleanups: Map<Element, unknown> }).cleanups;
    expect(cleanupMaps.has(element)).toBe(false);
    expect(() => instance.destroy()).not.toThrow();
  });

  it("replaces a successful cleanup without running its replacement early", () => {
    document.body.innerHTML = `<section id="app"><i></i></section>`;
    $("#app").star();
    const instance = $("#app").star("instance")!;
    const internals = instance as unknown as {
      setCleanup(element: Element, attribute: string, cleanup: () => void): void;
    };
    const element = document.querySelector("i")!;
    const previous = vi.fn();
    const replacement = vi.fn();
    internals.setCleanup(element, "test:cleanup", previous);
    internals.setCleanup(element, "test:cleanup", replacement);

    expect(previous).toHaveBeenCalledOnce();
    expect(replacement).not.toHaveBeenCalled();
    instance.destroy();
    expect(replacement).toHaveBeenCalledOnce();
  });

  it("retains unrelated cleanup ownership after a replacement rollback", () => {
    document.body.innerHTML = `<section id="app"><i></i></section>`;
    $("#app").star();
    const instance = $("#app").star("instance")!;
    const internals = instance as unknown as {
      setCleanup(element: Element, attribute: string, cleanup: () => void): void;
      cleanups: Map<Element, Map<string, () => void>>;
    };
    const element = document.querySelector("i")!;
    const firstFailure = new Error("first replacement cleanup failed");
    const secondFailure = new Error("second replacement cleanup failed");
    const unrelated = vi.fn();
    internals.setCleanup(element, "unrelated", unrelated);
    internals.setCleanup(element, "failing", () => {
      throw firstFailure;
    });

    expect(() =>
      internals.setCleanup(element, "failing", () => {
        throw secondFailure;
      }),
    ).toThrow(
      expect.objectContaining({
        message: "jQuery Star cleanup replacement failed.",
        errors: [firstFailure, secondFailure],
      }),
    );
    expect(internals.cleanups.get(element)?.has("unrelated")).toBe(true);
    instance.destroy();
    expect(unrelated).toHaveBeenCalledOnce();
  });

  it("stops residual owned effects during destruction", async () => {
    document.body.innerHTML = `<section id="app"></section>`;
    $("#app").star();
    const instance = $("#app").star("instance")!;
    const state = reactive({ count: 0 });
    const runs = vi.fn(() => void state.count);
    const runner = effect(runs);
    const internals = instance as unknown as { effects: Set<typeof runner> };
    internals.effects.add(runner);

    instance.destroy();
    state.count = 1;
    await $.star.nextUpdate();

    expect(runs).toHaveBeenCalledOnce();
    expect(internals.effects.size).toBe(0);
  });

  it("handles ignore and signal attribute changes and reports asynchronous cleanup failures", async () => {
    document.body.innerHTML = `
      <section id="app" data-signals="{ count: 1 }">
        <div class="scope">
          <button data-on:click__capture="$count++"></button>
          <output data-text="$count"></output>
        </div>
      </section>
    `;
    const reports: unknown[] = [];
    $("#app").on("jquery-star:error", (_event, detail) => reports.push(detail));
    $("#app").star();
    const scope = document.querySelector(".scope")!;
    const button = document.querySelector("button")!;

    scope.setAttribute("data-ignore", "");
    await settled();
    scope.removeAttribute("data-ignore");
    await settled();
    scope.setAttribute("data-signals", "{ count: 3 }");
    scope.setAttribute("data-computed:double", "$count * 2");
    await settled();
    expect($("output").text()).toBe("3");

    const cleanupFailure = new Error("async listener cleanup failed");
    vi.spyOn(button, "removeEventListener").mockImplementation(() => {
      throw cleanupFailure;
    });
    button.remove();
    await settled();

    expect(reports).toContain(cleanupFailure);
  });

  it("owns its observer under the declarative application identity", () => {
    document.body.innerHTML = `<section id="app"></section>`;
    $("#app").star();
    const instance = $("#app").star("instance")!;
    const internals = instance as unknown as { owner: string };
    const observer = kernelForDocument(document)!
      .resourceSummary()
      .find(({ kind, owner }) => kind === "observer" && owner === `${internals.owner}:mutation`);

    expect(internals.owner).toMatch(/^application:attributes:\d+$/);
    expect(observer).toEqual({ kind: "observer", owner: `${internals.owner}:mutation` });
  });

  it("marks direct constructor rollback destroyed and aggregates cleanup failures", () => {
    const root = document.createElement("section");
    root.setAttribute("data-text", "(");
    document.body.append(root);
    const setupFailure = new Error("declarative setup failed");
    const releaseFailure = new Error("declarative release failed");
    let staged: DeclarativeApplication | undefined;
    $(root).on("jquery-star:error", (_event, detail: { instance: DeclarativeApplication }) => {
      staged = detail.instance;
      throw setupFailure;
    });
    const removeData = vi.spyOn($, "removeData").mockImplementation(() => {
      throw releaseFailure;
    });

    try {
      expect(
        () =>
          new DeclarativeApplication($, root, kernelForDocument(document)!.applicationCapabilities),
      ).toThrow(
        expect.objectContaining({
          message: "jQuery Star declarative setup rollback failed.",
          errors: [setupFailure, releaseFailure],
        }),
      );
      expect(staged?.destroyed).toBe(true);
    } finally {
      removeData.mockRestore();
    }
  });

  it("identifies failures aggregated across declarative resource groups", () => {
    document.body.innerHTML = `<section id="app"><i></i></section>`;
    $("#app").star();
    const instance = $("#app").star("instance")!;
    const internals = instance as unknown as {
      setCleanup(element: Element, attribute: string, cleanup: () => void): void;
    };
    const cleanupFailure = new Error("directive cleanup failed");
    internals.setCleanup(document.querySelector("i")!, "test:failure", () => {
      throw cleanupFailure;
    });
    const releaseFailure = new Error("declarative data release failed");
    const removeData = vi.spyOn($, "removeData").mockImplementation(() => {
      throw releaseFailure;
    });

    try {
      expect(() => instance.destroy()).toThrow(
        expect.objectContaining({
          message: "jQuery Star declarative destruction failed.",
          errors: [cleanupFailure, releaseFailure],
        }),
      );
    } finally {
      removeData.mockRestore();
    }
  });

  it("releases a declarative subtree through its lifecycle contract", () => {
    document.body.innerHTML = `
      <section id="app">
        <i data-destroy="@testDeclarativeRelease"></i>
      </section>
    `;
    const released = vi.fn();
    $.star.action("testDeclarativeRelease", released);
    $("#app").star();
    const instance = $("#app").star("instance")! as unknown as {
      releaseTree(tree: Element): void;
    };
    const child = document.querySelector("i")!;

    instance.releaseTree(child);
    expect(released).toHaveBeenCalledOnce();
  });

  it("cancels only data-on cleanup requests", async () => {
    document.body.innerHTML = `<section id="app"><button></button></section>`;
    $("#app").star();
    const instance = $("#app").star("instance")!;
    const button = document.querySelector("button")!;
    const internals = instance as unknown as {
      cleanupDirective(element: Element, attribute: string): void;
    };
    const signals: AbortSignal[] = [];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      const signal = init?.signal as AbortSignal;
      signals.push(signal);
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("request aborted")), {
          once: true,
        });
      });
    });

    const first = instance.run(
      $.star.get("/first", { openWhenHidden: true, requestCancellation: "cleanup" }),
      { element: button, $element: $(button) },
    );
    internals.cleanupDirective(button, "customdata-on:");
    expect(signals[0]?.aborted).toBe(false);
    internals.cleanupDirective(button, "data-on:click");
    expect(signals[0]?.aborted).toBe(true);
    await first;
    fetchMock.mockRestore();
  });

  it("identifies aggregated directive cleanup failures", async () => {
    document.body.innerHTML = `<section id="app"><button></button></section>`;
    $("#app").star();
    const instance = $("#app").star("instance")!;
    const button = document.querySelector("button")!;
    const internals = instance as unknown as {
      cleanupDirective(element: Element, attribute: string): void;
      setCleanup(element: Element, attribute: string, cleanup: () => void): void;
    };
    const cleanupFailure = new Error("listener cleanup failed");
    const cancellationFailure = new Error("request cancellation failed");
    internals.setCleanup(button, "data-on:click", () => {
      throw cleanupFailure;
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      const signal = init?.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("request aborted")), {
          once: true,
        });
      });
    });
    const request = instance.run(
      $.star.get("/slow", { openWhenHidden: true, requestCancellation: "cleanup" }),
      { element: button, $element: $(button) },
    );
    const abort = vi.spyOn(AbortController.prototype, "abort").mockImplementation(() => {
      throw cancellationFailure;
    });

    expect(() => internals.cleanupDirective(button, "data-on:click")).toThrow(
      expect.objectContaining({
        message: "jQuery Star directive cleanup failed.",
        errors: [cleanupFailure, cancellationFailure],
      }),
    );

    abort.mockRestore();
    instance.destroy();
    await request;
    fetchMock.mockRestore();
  });

  it("aggregates multiple declarative subtree cleanup failures", () => {
    document.body.innerHTML = `<section id="app"><i></i><b></b></section>`;
    $("#app").star();
    const instance = $("#app").star("instance")! as unknown as {
      releaseTree(tree: Element): void;
      setCleanup(element: Element, attribute: string, cleanup: () => void): void;
    };
    const first = new Error("first subtree failure");
    const second = new Error("second subtree failure");
    instance.setCleanup(document.querySelector("i")!, "test:first", () => {
      throw first;
    });
    instance.setCleanup(document.querySelector("b")!, "test:second", () => {
      throw second;
    });

    expect(() => instance.releaseTree(document.querySelector("#app")!)).toThrow(
      expect.objectContaining({
        message: "jQuery Star declarative subtree cleanup failed.",
        errors: [first, second],
      }),
    );
  });

  it("retains declarative ownership inside preserved render subtrees", () => {
    document.body.innerHTML = `
      <section id="app">
        <div id="preserved"><button></button></div>
        <div id="removed"><button></button></div>
      </section>
    `;
    $("#app").star();
    const instance = $("#app").star("instance")! as unknown as {
      releaseTree(tree: Element, preservedRoots?: readonly Element[]): void;
      setCleanup(element: Element, attribute: string, cleanup: () => void): void;
    };
    const app = document.querySelector("#app")!;
    const preserved = document.querySelector("#preserved")!;
    const removed = document.querySelector("#removed")!;
    const preservedCleanup = vi.fn();
    const removedCleanup = vi.fn();
    instance.setCleanup(preserved.querySelector("button")!, "test:preserved", preservedCleanup);
    instance.setCleanup(removed.querySelector("button")!, "test:removed", removedCleanup);

    instance.releaseTree(app, [preserved]);

    expect(preservedCleanup).not.toHaveBeenCalled();
    expect(removedCleanup).toHaveBeenCalledOnce();
  });

  it("routes each declarative mutation kind to its exact lifecycle work", () => {
    document.body.innerHTML = `<section id="app"><div class="target"></div></section>`;
    $("#app").star();
    const instance = $("#app").star("instance")!;
    const target = document.querySelector(".target")!;
    interface MutationInternals {
      cleanupDirective(element: Element, attribute: string): void;
      cleanupTree(tree: Element): void;
      handleMutations(mutations: MutationRecord[]): void;
      initializeComputed(element: Element, attribute: string): void;
      initializeDirective(element: Element, attribute: string): void;
      loadComputed(tree: Element): void;
      loadSignals(tree: Element): void;
      scanTree(tree: Element): void;
    }
    const internals = instance as unknown as MutationInternals;
    const cleanupDirective = vi
      .spyOn(internals, "cleanupDirective")
      .mockImplementation(() => undefined);
    const cleanupTree = vi.spyOn(internals, "cleanupTree").mockImplementation(() => undefined);
    const initializeComputed = vi
      .spyOn(internals, "initializeComputed")
      .mockImplementation(() => undefined);
    const initializeDirective = vi
      .spyOn(internals, "initializeDirective")
      .mockImplementation(() => undefined);
    const loadComputed = vi.spyOn(internals, "loadComputed").mockImplementation(() => undefined);
    const loadSignals = vi.spyOn(internals, "loadSignals").mockImplementation(() => undefined);
    const scanTree = vi.spyOn(internals, "scanTree").mockImplementation(() => undefined);
    const attributeMutation = (attributeName: string): MutationRecord =>
      ({ type: "attributes", target, attributeName }) as unknown as MutationRecord;

    target.setAttribute("data-ignore", "");
    internals.handleMutations([attributeMutation("data-ignore")]);
    expect(cleanupTree).toHaveBeenCalledWith(target);

    target.removeAttribute("data-ignore");
    internals.handleMutations([attributeMutation("data-ignore")]);
    expect(loadSignals).toHaveBeenCalledWith(target);
    expect(loadComputed).toHaveBeenCalledWith(target);
    expect(scanTree).toHaveBeenCalledWith(target);

    cleanupDirective.mockClear();
    initializeDirective.mockClear();
    target.setAttribute("data-ignore", "");
    internals.handleMutations([attributeMutation("data-text")]);
    expect(cleanupDirective).not.toHaveBeenCalled();
    expect(initializeDirective).not.toHaveBeenCalled();
    target.removeAttribute("data-ignore");

    internals.handleMutations([attributeMutation("data-signals")]);
    expect(cleanupDirective).toHaveBeenCalledWith(target, "data-signals");
    expect(loadSignals).toHaveBeenCalledTimes(2);

    internals.handleMutations([attributeMutation("data-computed:total")]);
    expect(initializeComputed).toHaveBeenCalledWith(target, "data-computed:total");

    internals.handleMutations([attributeMutation("data-text")]);
    expect(initializeDirective).toHaveBeenCalledWith(target, "data-text");

    const added = document.createElement("i");
    internals.handleMutations([
      {
        type: "childList",
        target,
        addedNodes: [added],
        removedNodes: [],
      } as unknown as MutationRecord,
    ]);
    expect(loadSignals).toHaveBeenLastCalledWith(added, []);
    expect(loadComputed).toHaveBeenLastCalledWith(added, []);
    expect(scanTree).toHaveBeenLastCalledWith(added, []);
  });
});
