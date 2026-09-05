import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const coreURL = `/@fs${resolve("src/core.ts")}`;
const cspURL = `/@fs${resolve("src/csp.ts")}`;
const storesURL = `/@fs${resolve("src/stores.ts")}`;
const jquerySource = readFileSync(resolve("node_modules/jquery/dist/jquery.js"), "utf8");

test("shared stores coordinate two roots and dispose cleanly in trusted and CSP engines", async ({
  page,
}) => {
  await page.goto("/components/lab/");
  const results = await page.evaluate(
    async ({ corePath, cspPath, jqueryCode, storesPath }) => {
      const [core, csp, storesEntry] = await Promise.all([
        import(corePath),
        import(cspPath),
        import(storesPath),
      ]);
      const modes = ["trusted", "csp"] as const;
      const outcomes = [];

      for (const mode of modes) {
        const frame = document.createElement("iframe");
        document.body.append(frame);
        const owner = frame.contentDocument!;
        const ownerWindow = frame.contentWindow!;
        const script = owner.createElement("script");
        script.textContent = jqueryCode;
        owner.head.append(script);
        const jquery = (ownerWindow as unknown as { jQuery: JQueryStatic }).jQuery;
        const installed =
          mode === "csp"
            ? csp.installStarCSP(jquery, { document: owner })
            : core.installStarCore(jquery, { document: owner });
        const facade = installed.star.use(storesEntry.storesPlugin);
        owner.body.innerHTML = `
          <section id="behavior"><output role="status" aria-live="polite"></output></section>
          <section id="declarative" data-signals="{ store: 'local' }">
            <button data-on:click="stores.session.count++">increment</button>
            <output role="status" aria-live="polite" data-text="stores.session && stores.session.count"></output>
            <span data-text="$store"></span>
          </section>
        `;
        const behavior = owner.querySelector<HTMLElement>("#behavior")!;
        const declarative = owner.querySelector<HTMLElement>("#declarative")!;
        installed(behavior).star({
          state: { store: "behavior-local" },
          ui: {
            output: {
              text: ({ stores }: { stores?: Record<string, { count?: number } | undefined> }) =>
                stores?.session?.count ?? "missing",
            },
          },
        });
        installed(declarative).star();
        const before = behavior.querySelector("output")!.textContent;
        const session = facade.define(
          "session",
          storesEntry.defineStore({ initial: { count: 1 } }),
        ) as { count: number };
        await installed.star.nextUpdate();
        const afterDefine = [...owner.querySelectorAll("output")].map(
          ({ textContent }) => textContent,
        );
        installed(declarative.querySelector("button")!).trigger("click");
        await installed.star.nextUpdate();
        const afterClick = [...owner.querySelectorAll("output")].map(
          ({ textContent }) => textContent,
        );
        installed(behavior).star("destroy");
        session.count = 5;
        await installed.star.nextUpdate();
        const afterDestroy = [...owner.querySelectorAll("output")].map(
          ({ textContent }) => textContent,
        );
        const local = declarative.querySelector("span")!.textContent;
        const disposal = installed.star.dispose();
        let terminal = false;
        try {
          void session.count;
        } catch {
          terminal = true;
        }
        outcomes.push({
          afterClick,
          afterDefine,
          afterDestroy,
          before,
          disposalFailures: disposal.failed.length,
          local,
          mode,
          terminal,
        });
        frame.remove();
      }
      return outcomes;
    },
    { corePath: coreURL, cspPath: cspURL, jqueryCode: jquerySource, storesPath: storesURL },
  );

  expect(results).toEqual([
    {
      afterClick: ["2", "2"],
      afterDefine: ["1", "1"],
      afterDestroy: ["2", "5"],
      before: "missing",
      disposalFailures: 0,
      local: "local",
      mode: "trusted",
      terminal: true,
    },
    {
      afterClick: ["2", "2"],
      afterDefine: ["1", "1"],
      afterDestroy: ["2", "5"],
      before: "missing",
      disposalFailures: 0,
      local: "local",
      mode: "csp",
      terminal: true,
    },
  ]);
});
