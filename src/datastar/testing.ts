import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import {
  abortFixture,
  networkErrorFixture,
  responseFixture,
  type StarResponseFixture,
} from "../testing/responses";

export interface StarDatastarPatchElements {
  readonly kind: "elements";
  readonly elements: string;
  readonly options?: Parameters<ServerSentEventGenerator["patchElements"]>[1];
}

export interface StarDatastarPatchSignals {
  readonly kind: "signals";
  readonly signals: Readonly<Record<string, unknown>>;
  readonly options?: Parameters<ServerSentEventGenerator["patchSignals"]>[1];
}

export type StarDatastarFixtureEvent = StarDatastarPatchElements | StarDatastarPatchSignals;

function sdkResponse(
  events: readonly StarDatastarFixtureEvent[],
  between?: (index: number) => void | PromiseLike<void>,
): Response {
  return ServerSentEventGenerator.stream(async (stream) => {
    for (const [index, event] of events.entries()) {
      if (event.kind === "elements") stream.patchElements(event.elements, event.options);
      else stream.patchSignals(JSON.stringify(event.signals), event.options);
      await between?.(index);
    }
  });
}

export function datastarSuccessFixture(
  signals: Readonly<Record<string, unknown>>,
): StarResponseFixture {
  return responseFixture(() => sdkResponse([Object.freeze({ kind: "signals", signals })]));
}

export function datastarMultiEventFixture(
  events: readonly StarDatastarFixtureEvent[],
): StarResponseFixture {
  return responseFixture(() => sdkResponse(events));
}

export function datastarStreamingFixture(
  events: readonly StarDatastarFixtureEvent[],
): StarResponseFixture {
  return responseFixture(() => sdkResponse(events, () => Promise.resolve()));
}

export function datastarRetryFixtures(
  signals: Readonly<Record<string, unknown>>,
  status = 503,
): readonly StarResponseFixture[] {
  return Object.freeze([
    responseFixture({ status, body: "retry" }),
    datastarSuccessFixture(signals),
  ]);
}

export function datastarMalformedFixture(): StarResponseFixture {
  return responseFixture({
    body: "event: datastar-patch-signals\ndata: signals nope\n\n",
    headers: { "content-type": "text/event-stream" },
  });
}

export function datastarFailureFixture(message?: string): StarResponseFixture {
  return networkErrorFixture(message ?? "The Datastar stream failed.");
}

export function datastarAbortFixture(): StarResponseFixture {
  return abortFixture();
}
