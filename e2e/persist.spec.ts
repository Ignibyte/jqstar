import { expect, test } from "@playwright/test";
import { bootPersistence, persistKey } from "./fixtures/persist";

function stored(changes: Record<string, unknown> = {}): string {
  return JSON.stringify({
    format: "jquery-star-persist/1",
    namespace: "browser",
    store: "preferences",
    version: 1,
    savedAt: 100,
    expiresAt: null,
    revision: { counter: 1, origin: "other" },
    codec: { id: "fields", version: 1 },
    data: { count: 5, theme: "dark" },
    ...changes,
  });
}

test("local preferences hydrate before UI, survive reload and converge once across pages", async ({
  page,
  context,
}) => {
  await page.goto("/docs/stores/");
  await bootPersistence(page, { raw: stored() });
  expect(await page.evaluate(() => window.persistFixture.rendered)).toEqual(["5:dark"]);
  await page.evaluate(() => {
    window.persistFixture.store.count = 6;
  });
  await expect
    .poll(() =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).data.count, persistKey),
    )
    .toBe(6);
  await page.reload();
  await bootPersistence(page);
  expect(await page.evaluate(() => window.persistFixture.rendered)).toEqual(["6:dark"]);
  const sibling = await context.newPage();
  await sibling.goto("/docs/stores/");
  await bootPersistence(sibling);
  expect(await sibling.evaluate(() => window.persistFixture.rendered)).toEqual(["6:dark"]);
  await page.evaluate(() => {
    window.persistFixture.store.count = 7;
    window.persistFixture.store.theme = "light";
    window.persistFixture.attachment.flush();
  });
  await expect
    .poll(() => sibling.evaluate(() => window.persistFixture.rendered))
    .toEqual(["6:dark", "7:light"]);
  const raw = await page.evaluate((key) => localStorage.getItem(key), persistKey);
  await sibling.evaluate(async () => {
    await window.persistFixture.update();
    window.persistFixture.attachment.flush();
  });
  expect(await sibling.evaluate((key) => localStorage.getItem(key), persistKey)).toBe(raw);
  expect(await sibling.frameLocator("#persistence-proof").getByRole("status").textContent()).toBe(
    "7:light",
  );
  await sibling.close();
});

test("session preferences survive reload and stay partitioned between top-level pages", async ({
  page,
  context,
}) => {
  await page.goto("/docs/stores/");
  await bootPersistence(page, { kind: "session", raw: stored() });
  await page.reload();
  await bootPersistence(page, { kind: "session" });
  expect(await page.evaluate(() => window.persistFixture.rendered)).toEqual(["5:dark"]);
  const sibling = await context.newPage();
  await sibling.goto("/docs/stores/");
  await bootPersistence(sibling, { kind: "session" });
  expect(await sibling.evaluate(() => window.persistFixture.rendered)).toEqual(["1:light"]);
  await sibling.close();
});

test("corrupt, future, migration and decode failures preserve bytes and announce defaults once", async ({
  page,
}) => {
  const cases = [
    { raw: "{", error: "corrupt" },
    { raw: stored({ version: 3 }), error: "future-version" },
    { raw: stored(), version: 2, failure: "migration" as const, error: "migration" },
    { raw: stored(), failure: "decode" as const, error: "decode" },
  ];
  for (const scenario of cases) {
    await page.goto("/docs/stores/");
    await bootPersistence(page, scenario);
    expect(await page.evaluate(() => window.persistFixture.attachment.status().error)).toBe(
      scenario.error,
    );
    expect(await page.evaluate(() => window.persistFixture.rendered)).toEqual(["1:light"]);
    expect(await page.evaluate((key) => localStorage.getItem(key), persistKey)).toBe(scenario.raw);
    expect(await page.evaluate(() => window.persistFixture.attachment.retry().ok)).toBe(false);
    expect(await page.evaluate(() => window.persistFixture.attachment.reset().ok)).toBe(true);
    expect(await page.evaluate(() => window.persistFixture.attachment.status().outcome)).toBe(
      "written",
    );
    await page.evaluate(() => window.persistFixture.dispose());
  }
});

test("controlled expiry, unavailable storage and quota failure retain application behavior", async ({
  page,
}) => {
  await page.goto("/docs/stores/");
  await bootPersistence(page, { raw: stored({ expiresAt: 1000 }), clock: 1000 });
  expect(await page.evaluate(() => window.persistFixture.rendered)).toEqual(["1:light"]);
  expect(await page.evaluate(() => window.persistFixture.attachment.status().outcome)).toBe(
    "expired",
  );
  expect(await page.evaluate((key) => localStorage.getItem(key), persistKey)).toBeNull();
  for (const failure of ["unavailable", "quota"] as const) {
    await page.goto("/docs/stores/");
    await bootPersistence(page, { failure });
    await page.evaluate(async () => {
      window.persistFixture.store.count = 2;
      window.persistFixture.attachment.flush();
      await window.persistFixture.update();
    });
    expect(await page.evaluate(() => window.persistFixture.attachment.status().error)).toBe(
      failure,
    );
    expect(await page.evaluate(() => window.persistFixture.rendered)).toEqual([
      "1:light",
      "2:light",
    ]);
    await page.evaluate(() => window.persistFixture.dispose());
  }
});

test("migration and disposal flush the latest state without duplicate UI updates", async ({
  page,
}) => {
  await page.goto("/docs/stores/");
  await bootPersistence(page, { raw: stored(), version: 2, throttleMs: 1000, maxDelayMs: 2000 });
  expect(await page.evaluate(() => window.persistFixture.rendered)).toEqual(["9:dark"]);
  await page.evaluate(() => {
    window.persistFixture.store.count = 12;
    window.persistFixture.dispose();
  });
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).data.count, persistKey),
  ).toBe(12);
  expect(await page.evaluate(() => window.persistFixture.attachment.status().outcome)).toBe(
    "disposed",
  );
  expect(await page.evaluate(() => window.persistFixture.attachment.dispose().ok)).toBe(true);
});
