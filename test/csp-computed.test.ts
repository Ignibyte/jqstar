import type { StarContext, StarInstance, StateRecord } from "../src/types";
import $ from "jquery";
import { afterEach, expect, it } from "vitest";
import { createCSPExpressionEngine, installStarCSP } from "../src/csp";
import { installStarCore } from "../src/core";
import { createTrustedExpressionEngine } from "../src/expression";

afterEach(() => {
  const installed: Partial<Pick<JQueryStatic, "star">> = $;
  installed.star?.dispose();
  $(document).off(".computedProof");
  document.body.replaceChildren();
});

it.each(["trusted", "csp"])(
  "renders and updates a declarative computed signal through %s",
  async (profile) => {
    document.body.innerHTML = `<main data-jqs data-signals="{ count: 2 }" data-computed:double="$count * 2">
    <button type="button" data-on:click="$count++">Increment</button>
    <output id="count" data-text="$count"></output>
    <output id="double" data-text="$double"></output>
  </main>`;
    const errors: unknown[] = [];
    $(document).on("jquery-star:error.computedProof", (_event, detail) =>
      errors.push(detail.error?.code),
    );
    const installed =
      profile === "csp"
        ? installStarCSP($)
        : installStarCore($, { expressionEngine: createTrustedExpressionEngine() });
    installed.star.boot();
    expect($("#count").text()).toBe("2");
    expect({ computed: $("#double").text(), errors }).toEqual({ computed: "4", errors: [] });
    $("button").trigger("click");
    await installed.star.nextUpdate();
    expect($("#count").text()).toBe("3");
    expect({ computed: $("#double").text(), errors }).toEqual({ computed: "6", errors: [] });
    const disposal = installed.star.dispose();
    expect(disposal.failed).toHaveLength(0);
    expect(disposal.remaining).toHaveLength(0);
  },
);

function context(instance: StarInstance, state = instance.state): StarContext {
  return {
    $: $,
    state,
    computed: instance.computed,
    helpers: {},
    root: instance.root,
    $root: $(instance.root),
    element: instance.root,
    $element: $(instance.root),
    instance,
  };
}
function evaluate(
  source: string,
  instance: StarInstance,
  { statement = false, state = instance.state }: { statement?: boolean; state?: StateRecord } = {},
) {
  const engine = createCSPExpressionEngine();
  try {
    return (statement ? engine.compileStatement(source) : engine.compileValue(source))(
      context(instance, state),
    );
  } finally {
    engine.dispose();
  }
}
function denied(invoke: () => unknown, code = "CSP_CAPABILITY_ACCESSOR") {
  let error: unknown;
  try {
    invoke();
  } catch (caught) {
    error = caught;
  }
  expect(error).toMatchObject({ code });
}
function start(
  markup = '<main id="app" data-jqs data-signals="{ count: 2, double: 99 }" data-computed:double="$count * 2"></main>',
) {
  document.body.innerHTML = markup;
  const installed = installStarCSP($);
  installed.star.boot("#app, #other");
  return { installed, instance: required($("#app").star("instance")) };
}
async function settle() {
  await $.star.nextUpdate();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

it("reads owned computed signals through every documented state root", () => {
  const { instance } = start();
  for (const source of ["$double", "state.double", 'signals["double"]'])
    expect(evaluate(source, instance)).toBe(4);
});

it("refuses arbitrary root and nested getters before invoking them", () => {
  const { instance } = start();
  let reads = 0;
  let writes = 0;
  const getter = () => {
    reads += 1;
    throw new Error("private getter");
  };
  Object.defineProperty(instance.state, "unsafe", { get: getter, configurable: true });
  instance.state.holder = Object.defineProperty({}, "unsafe", { get: getter });
  Object.defineProperty(instance.state, "setterOnly", {
    set() {
      writes += 1;
    },
  });
  for (const source of [
    "$unsafe",
    "state.unsafe",
    'signals["unsafe"]',
    "$holder.unsafe",
    "$setterOnly",
  ])
    denied(() => evaluate(source, instance));
  expect(reads).toBe(0);
  expect(writes).toBe(0);
});

it("refuses computed getters copied to another key, nested record, state or application", () => {
  const { instance } = start(
    '<main id="app" data-jqs data-signals="{ count: 2 }" data-computed:double="$count * 2"></main><main id="other" data-jqs data-signals="{ count: 10 }"></main>',
  );
  const descriptor = required(Object.getOwnPropertyDescriptor(instance.state, "double"));
  Object.defineProperty(instance.state, "copied", descriptor);
  instance.state.holder = Object.defineProperty({}, "double", descriptor);
  const foreign = Object.defineProperty({}, "double", descriptor);
  const other = required($("#other").star("instance"));
  Object.defineProperty(other.state, "double", descriptor);
  denied(() => evaluate("$copied", instance));
  denied(() => evaluate("$holder.double", instance));
  denied(() => evaluate("$double", instance, { state: foreign }));
  denied(() => evaluate("$double", other));
  expect(evaluate("$double", instance)).toBe(4);
});

it("keeps owned computed values and their returned data read-only", () => {
  const { instance } = start(
    '<main id="app" data-jqs data-signals="{ count: 2 }" data-computed:double="$count * 2" data-computed:view="{ count: $count }"></main>',
  );
  for (const source of ["$double = 3", "state.double = 3", "signals.double++"])
    denied(() => evaluate(source, instance, { statement: true }));
  denied(() => evaluate("$view.count = 3", instance, { statement: true }), "CSP_CAPABILITY_LVALUE");
  expect(evaluate("$double", instance)).toBe(4);
  expect(instance.state.count).toBe(2);
});

it("revokes replaced and removed computed getters and restores the previous data", async () => {
  const { instance } = start();
  const previous = required(Object.getOwnPropertyDescriptor(instance.state, "double"));
  instance.root.setAttribute("data-computed:double", "$count * 3");
  await settle();
  expect(evaluate("$double", instance)).toBe(6);
  const replacement = required(Object.getOwnPropertyDescriptor(instance.state, "double"));
  Object.defineProperty(instance.state, "double", previous);
  denied(() => evaluate("$double", instance));
  Object.defineProperty(instance.state, "double", replacement);
  instance.root.removeAttribute("data-computed:double");
  await settle();
  expect(evaluate("$double", instance)).toBe(99);
  Object.defineProperty(instance.state, "double", replacement);
  denied(() => evaluate("$double", instance));
});

it("restores a still-owned computed getter after a nested definition is removed", async () => {
  const { instance } = start(
    '<main id="app" data-jqs data-signals="{ count: 2 }" data-computed:double="$count * 2"><section id="nested" data-computed:double="$count * 3"></section></main>',
  );
  expect(evaluate("$double", instance)).toBe(6);
  required(document.querySelector("#nested")).remove();
  await settle();
  expect(evaluate("$double", instance)).toBe(4);
});

it("revokes computed reads when the application is destroyed", () => {
  const { instance } = start();
  const descriptor = required(Object.getOwnPropertyDescriptor(instance.state, "double"));
  $(instance.root).star("destroy");
  Object.defineProperty(instance.state, "double", descriptor);
  denied(() => evaluate("$double", instance));
});

it("rejects computed cycles with a bounded diagnostic and clears the active read", () => {
  const { instance } = start(
    '<main id="app" data-jqs data-computed:loop="$loop" data-computed:okay="4"></main>',
  );
  denied(() => evaluate("$loop", instance), "CSP_EVALUATE_CYCLE");
  expect(evaluate("$okay", instance)).toBe(4);
});

it("counts repeated computed dependencies against the same evaluation budget", () => {
  const definitions = ['data-computed:c0="1"'];
  for (let index = 1; index <= 8; index += 1)
    definitions.push(`data-computed:c${index}="$c${index - 1} + $c${index - 1}"`);
  const { instance } = start(`<main id="app" data-jqs ${definitions.join(" ")}></main>`);
  denied(() => evaluate("$c8", instance), "CSP_LIMIT_EVALUATION_STEPS");
  expect(evaluate("$c0", instance)).toBe(1);
});

it("accepts the exact shared step limit across computed reads and refuses one beyond", () => {
  const definitions = ['data-computed:c0="1"'];
  for (let index = 1; index < 128; index += 1)
    definitions.push(`data-computed:c${index}="$c${index - 1}"`);
  const { instance } = start(`<main id="app" data-jqs ${definitions.join(" ")}></main>`);
  expect(evaluate("$c126", instance)).toBe(1);
  denied(() => evaluate("$c127", instance), "CSP_LIMIT_EVALUATION_STEPS");
  expect(evaluate("$c126", instance)).toBe(1);
});

it("does not let a helper conceal a computed cycle diagnostic", () => {
  document.body.innerHTML =
    '<main id="app" data-jqs data-computed:loop="$loop" data-computed:swallowed="proof.computed.swallow()"></main>';
  const installed = installStarCSP($);
  installed.star.use({
    name: "proof.computed",
    version: "1.0.0",
    apiVersion: "^0.1.0",
    install(registrar) {
      registrar.helper("proof.computed.swallow", () => {
        try {
          return evaluate("$loop", instance);
        } catch {
          return 4;
        }
      });
    },
  });
  installed.star.boot("#app");
  const instance = required($("#app").star("instance"));
  denied(() => evaluate("$swallowed", instance), "CSP_EVALUATE_CYCLE");
});

it("keeps reentrant computed work in a different application on its own budget", () => {
  const definitions = ['data-computed:c0="1"'];
  for (let index = 1; index <= 126; index += 1)
    definitions.push(`data-computed:c${index}="$c${index - 1}"`);
  document.body.innerHTML = `<main id="app" data-jqs data-computed:forward="proof.computed.other()"></main><main id="other" data-jqs ${definitions.join(" ")}></main>`;
  const installed = installStarCSP($);
  installed.star.use({
    name: "proof.computed",
    version: "1.0.0",
    apiVersion: "^0.1.0",
    install(registrar) {
      registrar.helper("proof.computed.other", () => evaluate("$c126", other));
    },
  });
  installed.star.boot("#app, #other");
  const instance = required($("#app").star("instance"));
  const other = required($("#other").star("instance"));
  expect(evaluate("$forward", instance)).toBe(1);
  expect(evaluate("$forward", instance)).toBe(1);
});

it("preserves the first computed failure when a helper catches it and then exceeds the budget", () => {
  document.body.innerHTML =
    '<main id="app" data-jqs data-computed:loop="$loop" data-computed:swallowed="proof.computed.swallow()"></main>';
  const installed = installStarCSP($);
  installed.star.use({
    name: "proof.computed",
    version: "1.0.0",
    apiVersion: "^0.1.0",
    install(registrar) {
      registrar.helper("proof.computed.swallow", () => {
        try {
          evaluate("$loop", instance);
        } catch {
          /* The helper continues after a contained failure. */
        }
        try {
          evaluate(Array.from({ length: 100 }, () => "1").join(" + "), instance);
        } catch {
          /* It also catches the later step-limit failure. */
        }
        return 4;
      });
    },
  });
  installed.star.boot("#app");
  const instance = required($("#app").star("instance"));
  denied(() => evaluate("$swallowed", instance), "CSP_EVALUATE_CYCLE");
});

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Required test fixture is missing.");
  return value;
}
