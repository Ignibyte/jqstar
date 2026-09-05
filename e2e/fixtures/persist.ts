import type * as CoreEntry from "../../src/core";
import type * as StoresEntry from "../../src/stores";
import type * as PersistEntry from "../../src/persist";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { StarPersistAttachment } from "../../src/persist";

interface PersistFixture {
  readonly attachment: StarPersistAttachment;
  readonly store: { count: number; theme: string };
  readonly rendered: string[];
  dispose(): unknown;
  update(): Promise<void>;
}

declare global {
  interface Window {
    persistFixture: PersistFixture;
  }
}

export interface PersistFixtureOptions {
  readonly kind?: "local" | "session";
  readonly raw?: string;
  readonly clock?: number;
  readonly version?: number;
  readonly failure?: "unavailable" | "quota" | "migration" | "decode";
  readonly throttleMs?: number;
  readonly maxDelayMs?: number;
}

export const persistKey = "jqstar:browser:preferences";

export async function bootPersistence(
  page: Page,
  options: PersistFixtureOptions = {},
): Promise<void> {
  await page.evaluate(
    async ({ corePath, storesPath, persistPath, jquerySource, options, key }) => {
      const core = (await import(corePath)) as typeof CoreEntry;
      const storesEntry = (await import(storesPath)) as typeof StoresEntry;
      const persistEntry = (await import(persistPath)) as typeof PersistEntry;
      const frame = document.createElement("iframe");
      frame.title = "Persistence reference application";
      frame.id = "persistence-proof";
      document.body.append(frame);
      const owner = frame.contentDocument!;
      const ownerWindow = frame.contentWindow!;
      const script = owner.createElement("script");
      script.textContent = jquerySource;
      owner.head.append(script);
      const jquery = (ownerWindow as unknown as { jQuery: JQueryStatic }).jQuery;
      const installed = core.installStarCore(jquery, { document: owner });
      const shared = installed.star.use(storesEntry.storesPlugin);
      const persisted = installed.star.use(persistEntry.persistPlugin);
      const store = shared.define(
        "preferences",
        storesEntry.defineStore({ initial: { count: 1, theme: "light" } }),
      );
      const base =
        options.kind === "session"
          ? persistEntry.createSessionStorageAdapter(ownerWindow)
          : persistEntry.createLocalStorageAdapter(ownerWindow);
      if (options.raw !== undefined) base.replace(key, options.raw);
      const codec = persistEntry.createFieldCodec<typeof store>([
        { path: "count", validate: (value) => typeof value === "number" && value >= 0 },
        { path: "theme", validate: (value) => value === "dark" || value === "light" },
      ]);
      const attachment = persisted.attach(
        "preferences",
        Object.freeze({
          namespace: "browser",
          version: options.version ?? 1,
          adapter: persistEntry.createCustomStorageAdapter({
            ...base,
            available: () => (options.failure === "unavailable" ? false : base.available()),
            replace(key: string, value: string) {
              if (options.failure === "quota")
                throw new DOMException("quota", "QuotaExceededError");
              base.replace(key, value);
            },
          }),
          codec:
            options.failure === "decode"
              ? {
                  ...codec,
                  decode() {
                    throw new Error("decode");
                  },
                }
              : codec,
          migrations:
            options.version === 2
              ? {
                  1(data) {
                    if (options.failure === "migration") throw new Error("migration");
                    return { ...(data as object), count: 9 };
                  },
                }
              : {},
          clock: () => options.clock ?? 1000,
          throttleMs: options.throttleMs ?? 30,
          maxDelayMs: options.maxDelayMs ?? 100,
          flushOnDispose: options.failure === undefined,
        }),
      );
      const rendered: string[] = [];
      owner.body.innerHTML =
        '<main><section id="app"><output role="status" aria-live="polite" aria-label="Preferences"></output></section></main>';
      installed(owner.querySelector<HTMLElement>("#app")!).star({
        state: {},
        ui: {
          output: {
            text: () => {
              const value = `${store.count}:${store.theme}`;
              rendered.push(value);
              return value;
            },
          },
        },
      });
      window.persistFixture = {
        attachment,
        store,
        rendered,
        dispose: () => installed.star.dispose(),
        update: () => installed.star.nextUpdate(),
      };
    },
    {
      corePath: `/@fs${resolve("src/core.ts")}`,
      storesPath: `/@fs${resolve("src/stores.ts")}`,
      persistPath: `/@fs${resolve("src/persist.ts")}`,
      jquerySource: readFileSync(resolve("node_modules/jquery/dist/jquery.js"), "utf8"),
      options,
      key: persistKey,
    },
  );
}
