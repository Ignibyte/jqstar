import $ from "jquery";
import { afterEach, describe, expect, it } from "vitest";
import { datastarPlugin } from "../src/datastar";
import {
  datastarAbortFixture,
  datastarFailureFixture,
  datastarMalformedFixture,
  datastarMultiEventFixture,
  datastarRetryFixtures,
  datastarStreamingFixture,
  datastarSuccessFixture,
} from "../src/datastar/testing";
import {
  createResponseController,
  createStarHarness,
  type StarDOMWindow,
  type StarHarness,
} from "../src/testing";

const frames: HTMLIFrameElement[] = [];
const harnesses: StarHarness[] = [];

function harness(controller = createResponseController()): StarHarness {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  frames.push(frame);
  const active = createStarHarness({
    window: frame.contentWindow as StarDOMWindow,
    jQuery: $,
    plugins: [datastarPlugin],
    responses: controller,
  });
  harnesses.push(active);
  return active;
}

afterEach(() => {
  for (const active of harnesses.splice(0).reverse()) {
    try {
      active.dispose();
    } catch {
      // Failure and abort fixtures settle during disposal.
    }
  }
  for (const frame of frames.splice(0).reverse()) frame.remove();
});

describe("Datastar testing fixtures", () => {
  it("generates valid success, ordered multi-event, and streaming responses through the SDK", async () => {
    const controller = createResponseController();
    controller
      .enqueue({
        url: "https://example.test/success",
        response: datastarSuccessFixture({ ready: true }),
      })
      .enqueue({
        url: "https://example.test/multi",
        response: datastarMultiEventFixture([
          { kind: "signals", signals: { first: 1 } },
          { kind: "elements", elements: "<p id=second>Second</p>" },
        ]),
      })
      .enqueue({
        url: "https://example.test/stream",
        response: datastarStreamingFixture([
          { kind: "signals", signals: { first: 1 } },
          { kind: "signals", signals: { second: 2 } },
        ]),
      });
    controller.install();

    const success = await fetch("https://example.test/success");
    expect(success.headers.get("content-type")).toContain("text/event-stream");
    expect(await success.text()).toContain("datastar-patch-signals");
    const multi = await (await fetch("https://example.test/multi")).text();
    expect(multi.indexOf("first")).toBeLessThan(multi.indexOf("second"));
    const streaming = await (await fetch("https://example.test/stream")).text();
    expect(streaming.indexOf("first")).toBeLessThan(streaming.indexOf("second"));
    controller.dispose();
  });

  it("provides retry, malformed, failure, and abort paths", async () => {
    const [retryFailure, retrySuccess] = datastarRetryFixtures({ recovered: true });
    expect(retryFailure).toMatchObject({ kind: "response" });
    expect(retrySuccess).toMatchObject({ kind: "response" });
    expect(datastarMalformedFixture()).toMatchObject({ kind: "response" });
    expect(datastarFailureFixture()).toMatchObject({ kind: "network-error" });
    expect(datastarAbortFixture()).toEqual({ kind: "abort" });
  });

  it("updates public application state through the installed Datastar profile", async () => {
    const controller = createResponseController();
    controller.enqueue({
      url: /^https:\/\/example\.test\/datastar\?datastar=/,
      response: datastarSuccessFixture({ ready: true, count: 2 }),
    });
    const active = harness(controller);
    const root = active.document.createElement("section");
    active.document.body.append(root);
    const application = active.mountBehavior(root, { state: { ready: false, count: 0 } });
    await application.instance.run(
      active.installed.star.get("https://example.test/datastar", { profile: "core.datastar" }),
    );
    await active.flush();
    expect(application.state).toMatchObject({ ready: true, count: 2 });
    controller.assertSatisfied();
  });
});
