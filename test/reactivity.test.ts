import { describe, expect, it, vi } from "vitest";
import { effect, nextUpdate, reactive, stop } from "../src/reactivity";

describe("reactive effect lifecycle", () => {
  it("removes dependencies when the initial effect run fails", async () => {
    const state = reactive({ value: 0 });
    const runs = vi.fn(() => {
      void state.value;
      throw new Error("initial failure");
    });

    expect(() => effect(runs)).toThrow("initial failure");
    state.value = 1;
    await nextUpdate();

    expect(runs).toHaveBeenCalledOnce();
  });

  it("reports an owned failure and still runs every later scheduled effect", async () => {
    const state = reactive({ value: 0 });
    const failure = new Error("owned failure");
    const reported = vi.fn();
    const observed: number[] = [];
    const failing = effect(
      () => {
        if (state.value === 1) throw failure;
      },
      { owner: "application:test", onError: reported },
    );
    const succeeding = effect(() => observed.push(state.value), { owner: "application:other" });

    state.value = 1;
    await nextUpdate();

    expect(failing.owner).toBe("application:test");
    expect(reported).toHaveBeenCalledWith(failure, failing);
    expect(observed).toEqual([0, 1]);
    stop(failing);
    stop(succeeding);
  });

  it("rejects the reactive barrier after all unowned failing effects run", async () => {
    const state = reactive({ value: 0 });
    const first = new Error("first failure");
    const second = new Error("second failure");
    const later = vi.fn();
    const firstEffect = effect(() => {
      if (state.value === 1) throw first;
    });
    const secondEffect = effect(() => {
      if (state.value === 1) throw second;
    });
    const laterEffect = effect(() => {
      void state.value;
      later();
    });

    state.value = 1;
    let failure: unknown;
    try {
      await nextUpdate();
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors).toEqual([first, second]);
    expect(later).toHaveBeenCalledTimes(2);
    stop(firstEffect);
    stop(secondEffect);
    stop(laterEffect);
  });

  it("preserves both the effect and reporter failures", async () => {
    const state = reactive({ fail: false });
    const effectFailure = new Error("effect failed");
    const reporterFailure = new Error("reporter failed");
    const runner = effect(
      () => {
        if (state.fail) throw effectFailure;
      },
      {
        onError: () => {
          throw reporterFailure;
        },
      },
    );

    state.fail = true;
    await expect(nextUpdate()).rejects.toMatchObject({
      message: "Reactive effect updates failed.",
      errors: [effectFailure, reporterFailure],
    });
    stop(runner);
  });

  it("flushes effects queued by another scheduled effect", async () => {
    const state = reactive({ first: 0, second: 0 });
    const observations: number[] = [];
    const first = effect(() => {
      state.second = state.first;
    });
    const second = effect(() => observations.push(state.second));

    state.first = 1;
    await nextUpdate();

    expect(observations).toEqual([0, 1]);
    stop(first);
    stop(second);
  });

  it("removes a stopped effect from an already scheduled batch", async () => {
    const state = reactive({ value: 0 });
    const runs = vi.fn(() => void state.value);
    const runner = effect(runs);

    state.value = 1;
    stop(runner);
    await nextUpdate();

    expect(runs).toHaveBeenCalledOnce();
  });

  it("skips a scheduled effect whose public lifecycle is inactive", async () => {
    const state = reactive({ value: 0 });
    const runs = vi.fn(() => void state.value);
    const runner = effect(runs);

    state.value = 1;
    runner.active = false;
    await nextUpdate();

    expect(runs).toHaveBeenCalledOnce();
    stop(runner);
  });

  it("rejects with the original error when exactly one effect fails", async () => {
    const state = reactive({ fail: false });
    const failure = new Error("single failure");
    const runner = effect(() => {
      if (state.fail) throw failure;
    });

    state.fail = true;
    await expect(nextUpdate()).rejects.toBe(failure);
    stop(runner);
  });
});
