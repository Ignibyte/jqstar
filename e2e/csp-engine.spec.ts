import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cspEngineURL = `/@fs${resolve("src/csp/engine.ts")}`;
const jquerySource = readFileSync(resolve("node_modules/jquery/dist/jquery.js"), "utf8");
const runtimeURL = `/@fs${resolve("e2e/fixtures/runtime.ts")}`;
const cspInstallURL = `/@fs${resolve("src/csp.ts")}`;

test("internal CSP declarative computed signals update and retain getter ownership", async ({
  page,
}) => {
  await page.goto("/components/lab/");
  const result = await page.evaluate(
    async ({ installPath, jqueryCode }) => {
      const { installStarCSP, createCSPExpressionEngine } = await import(installPath);
      const required = <T>(value: T | null | undefined): T => {
        if (value == null) throw new Error("Required browser fixture is missing.");
        return value;
      };
      const frame = document.createElement("iframe");
      document.body.append(frame);
      const realm = required(frame.contentWindow);
      const targetDocument = required(frame.contentDocument);
      const script = targetDocument.createElement("script");
      script.textContent = jqueryCode;
      targetDocument.head.append(script);
      const $ = (realm as unknown as { jQuery: JQueryStatic }).jQuery;
      targetDocument.body.innerHTML = `<main id="app" data-jqs data-signals="{ count: 2 }" data-computed:double="$count * 2">
      <button type="button" data-on:click="$count++">Increment</button>
      <output data-text="$double"></output>
    </main>`;
      const errors: unknown[] = [];
      $(targetDocument).on("jquery-star:error", (_event, detail) =>
        errors.push(detail.error?.code),
      );
      const installed = installStarCSP($, { document: targetDocument });
      const engine = createCSPExpressionEngine();
      try {
        const root = required(targetDocument.querySelector("main"));
        installed.star.boot(root);
        const instance = required($(root).star("instance"));
        const initial = $(root).find("output").text();
        required(root.querySelector("button")).click();
        await installed.star.nextUpdate();
        const updated = $(root).find("output").text();
        const context = {
          $,
          instance,
          root,
          $root: $(root),
          element: root,
          $element: $(root),
          state: instance.state,
          computed: instance.computed,
        };
        let reads = 0;
        Object.defineProperty(instance.state, "unsafe", {
          get() {
            reads += 1;
            return 99;
          },
        });
        const descriptor = required(Object.getOwnPropertyDescriptor(instance.state, "double"));
        Object.defineProperty(instance.state, "copied", descriptor);
        const denied = (source: string): string => {
          try {
            engine.compileValue(source)(context);
            return "no-error";
          } catch (error) {
            return (error as { code: string }).code;
          }
        };
        const arbitrary = denied("$unsafe");
        const copied = denied("$copied");
        const disposal = installed.star.dispose();
        Object.defineProperty(instance.state, "double", descriptor);
        const destroyed = denied("$double");
        return {
          initial,
          updated,
          errors,
          reads,
          arbitrary,
          copied,
          destroyed,
          failed: disposal.failed.length,
          remaining: disposal.remaining.length,
        };
      } finally {
        engine.dispose();
        installed.star?.dispose();
        frame.remove();
      }
    },
    { installPath: cspInstallURL, jqueryCode: jquerySource },
  );
  expect(result).toEqual({
    initial: "4",
    updated: "6",
    errors: [],
    reads: 0,
    arbitrary: "CSP_CAPABILITY_ACCESSOR",
    copied: "CSP_CAPABILITY_ACCESSOR",
    destroyed: "CSP_CAPABILITY_ACCESSOR",
    failed: 0,
    remaining: 0,
  });
});

test("internal CSP engine stays closed across real browser realms", async ({ page }) => {
  await page.goto("/components/lab/");
  const result = await page.evaluate(
    async ({ cspPath, jqueryCode, runtimePath }) => {
      const [{ createCSPExpressionEngine }, runtime] = await Promise.all([
        import(cspPath),
        import(runtimePath),
      ]);
      const jquery = runtime.jquery as JQueryStatic;
      const root = document.createElement("main");
      const element = document.createElement("input");
      element.dataset.role = "save";
      root.append(element);
      document.body.append(root);

      const frame = document.createElement("iframe");
      document.body.append(frame);
      const foreignWindow = frame.contentWindow!;
      const foreignDocument = frame.contentDocument!;
      const script = foreignDocument.createElement("script");
      script.textContent = jqueryCode;
      foreignDocument.head.append(script);
      const foreignJQuery = (foreignWindow as unknown as { jQuery: JQueryStatic }).jQuery;
      const foreignElement = foreignDocument.createElement("button");
      foreignDocument.body.append(foreignElement);
      const ForeignObject = (foreignWindow as unknown as { Object: ObjectConstructor }).Object;
      const foreignData = new ForeignObject() as Record<string, unknown>;
      foreignData.safe = "foreign-data";

      let accessorReads = 0;
      const state: Record<string, unknown> = {
        count: 2,
        foreignData,
        profile: { name: "Ada" },
      };
      Object.defineProperty(state, "secret", {
        configurable: true,
        get: () => {
          accessorReads += 1;
          return "private";
        },
      });
      const instance = {
        mode: "behavior",
        root,
        $root: jquery(root),
        state,
        computed: { double: 4 },
      };
      const context = {
        $: jquery,
        root,
        $root: jquery(root),
        element,
        $element: jquery(element),
        event: new Event("click"),
        args: ["input"],
        state,
        computed: instance.computed,
        instance,
      };
      const engine = createCSPExpressionEngine();
      const capture = (run: () => unknown): string => {
        try {
          run();
          return "no-error";
        } catch (error) {
          return (error as { code?: string }).code ?? "unknown-error";
        }
      };

      const value = engine.compileValue("$count + computed.double")(context);
      const statement = engine.compileStatement(
        "state.profile.name = 'Grace'; $count++; return state.profile.name",
      )(context);
      const role = engine.compileValue("$(el).attr('data-role')")(context);
      const plainCrossRealm = engine.compileValue("state.foreignData.safe")(context);
      const accessorCode = capture(() => engine.compileValue("state.secret")(context));
      const foreignElementCode = capture(() =>
        engine.compileValue("$(el)")({ ...context, element: foreignElement }),
      );
      const foreignJQueryCode = capture(() =>
        engine.compileValue("$el.length")({
          ...context,
          $element: foreignJQuery(foreignElement),
        }),
      );
      const retained = engine.compileValue("$count");
      engine.dispose();
      const disposedCode = capture(() => retained(context));

      frame.remove();
      root.remove();
      return {
        accessorCode,
        accessorReads,
        disposedCode,
        foreignElementCode,
        foreignJQueryCode,
        plainCrossRealm,
        role,
        statement,
        value,
      };
    },
    { cspPath: cspEngineURL, jqueryCode: jquerySource, runtimePath: runtimeURL },
  );

  expect(result).toEqual({
    accessorCode: "CSP_CAPABILITY_ACCESSOR",
    accessorReads: 0,
    disposedCode: "CSP_ENGINE_DISPOSED",
    foreignElementCode: "CSP_CAPABILITY_VALUE",
    foreignJQueryCode: "CSP_CAPABILITY_VALUE",
    plainCrossRealm: "foreign-data",
    role: "save",
    statement: "Grace",
    value: 6,
  });
});
