import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cspEngineURL = `/@fs${resolve("src/csp/engine.ts")}`;
const jquerySource = readFileSync(resolve("node_modules/jquery/dist/jquery.js"), "utf8");
const runtimeURL = `/@fs${resolve("e2e/fixtures/runtime.ts")}`;

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
