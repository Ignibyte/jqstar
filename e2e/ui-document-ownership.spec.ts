import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import type {
  exerciseDocumentListenerAcquisition,
  exerciseDocumentListenerIdentity,
  exerciseDocumentListenerOptions,
  exerciseDocumentListenerGetter,
  exerciseStagedListenerCancellation,
  exerciseStagedListenerDuplicate,
  exerciseFirstScopeObserver,
  exerciseFirstScopeController,
  beginNativeLayoutInteraction,
  endNativeLayoutInteraction,
  exerciseLayoutOwnership,
  exerciseDocumentOwnership,
  exerciseCarouselFocusAdoption,
  exerciseNativeFieldOwnership,
  exerciseNativeElementActionTargets,
  exerciseRemainingElementActionTargets,
  exerciseAdditionalElementActionTargets,
  exerciseStructuralElementActionTargets,
  exerciseNativeFieldReset,
  exerciseTokenOwnership,
  exerciseOTPReset,
  exerciseNavigationOwnership,
  exerciseSidebarViewportAdoption,
  exerciseDisclosureStepOwnership,
  exerciseDisclosureDefaults,
  exerciseDraftCompletionAdoption,
  exerciseTimePickerOwnership,
  exerciseSelectOwnership,
  exerciseComboboxOwnership,
  exerciseMultiSelectOwnership,
  exerciseColorPickerOwnership,
  exerciseFileUploadOwnership,
  exerciseTreeOwnership,
  exerciseTransferListOwnership,
  exercisePopoverOwnership,
  exerciseMenuOwnership,
  exerciseMenuDeadline,
  exerciseMenubarOwnership,
  exerciseMenubarSelectors,
  exerciseMenubarDeadline,
  exerciseCopyOwnership,
  exerciseViewerOwnership,
  exerciseReportingOwnership,
  exerciseDataTableCost,
  exerciseCalendarOwnership,
  exerciseFormOwnership,
  exerciseQuestionnaireOwnership,
  exerciseToastOwnership,
  exerciseFeedOwnership,
  exerciseCopyFallback,
  exerciseCopyDeadline,
  exerciseTooltipOwnership,
  exerciseHoverCardOwnership,
  exerciseTooltipDeadline,
  exerciseFloatingHandoff,
  exerciseExternalFloatingToggles,
} from "./fixtures/ui-document-ownership";

const runtimeURL = `/@fs${resolve("e2e/fixtures/ui-document-ownership.ts")}`;
const factoryURL = `/@fs${resolve("node_modules/jquery/dist-module/jquery.factory.module.js")}`;

for (const mode of [
  "ordinary",
  "method",
  "method-nonfunction",
  "capture",
  "once",
  "passive",
  "signal",
  "native-return",
  "native-throw",
] as const) {
  test(`staged plugin listener cancellation stops native ${mode}`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseStagedListenerCancellation: typeof exerciseStagedListenerCancellation;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseStagedListenerCancellation(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result.nativeCalls).toBe(
      ["method", "method-nonfunction", "capture", "once", "passive", "signal"].includes(mode)
        ? 0
        : 1,
    );
    expect(result.during).toBe(mode === "ordinary" ? 1 : 0);
    expect(result.after).toBe(0);
    expect(result.rejected).toBe(mode === "native-throw");
    expect(result.listenerResources).toBe(0);
  });
}

for (const cancelDuringSecond of [false, true]) {
  test(`staged plugin listener preserves native duplicate with cancellation=${cancelDuringSecond}`, async ({
    page,
  }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, cancelDuringSecond }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseStagedListenerDuplicate: typeof exerciseStagedListenerDuplicate;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseStagedListenerDuplicate(jQueryFactory, cancelDuringSecond);
      },
      { runtimeURL, factoryURL, cancelDuringSecond },
    );
    expect(result).toEqual({
      nativeCalls: 2,
      beforeRelease: 1,
      afterRelease: cancelDuringSecond ? 2 : 1,
    });
  });
}

for (const key of ["method", "capture", "once", "passive", "signal"] as const) {
  test(`document listener keeps newer ${key} getter registration`, async ({ page }) => {
    await page.goto("/components/lab/");
    const results = await page.evaluate(
      async ({ runtimeURL, factoryURL, key }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseDocumentListenerGetter: typeof exerciseDocumentListenerGetter;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return [false, true].map((previous) =>
          runtime.exerciseDocumentListenerGetter(jQueryFactory, key, previous),
        );
      },
      { runtimeURL, factoryURL, key },
    );
    expect(results).toEqual([
      { entered: true, beforeRelease: 1, deliveries: 1 },
      { entered: true, beforeRelease: 1, deliveries: 1 },
    ]);
  });
}

for (const mode of [
  "capture-mutation",
  "late-disposal",
  "setup-throw",
  "late-throw",
  "option-disposal",
  "method-disposal",
] as const) {
  test(`document listener acquisition cleans native ${mode}`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseDocumentListenerAcquisition: typeof exerciseDocumentListenerAcquisition;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseDocumentListenerAcquisition(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result.deliveries).toBe(0);
    expect(result.rejected).toBe(mode !== "capture-mutation");
    expect(result.entered).toBe(mode !== "capture-mutation");
    expect(result.nativeAdded).toBe(["late-disposal", "setup-throw", "late-throw"].includes(mode));
  });
}

for (const mode of [
  "duplicate",
  "once",
  "abort",
  "cleanup",
  "nested-before",
  "nested-after",
] as const) {
  test(`document listener identity preserves native ${mode}`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseDocumentListenerIdentity: typeof exerciseDocumentListenerIdentity;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseDocumentListenerIdentity(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result.initial).toBe(mode === "once" ? 1 : 0);
    expect(result.beforeRelease).toBe(mode === "duplicate" ? 1 : result.initial + 2);
    expect(result.deliveries).toBe(result.beforeRelease);
    expect(result.receivers).toBe(true);
  });
}

test("document listener options preserve native defaults and getter conversion", async ({
  page,
}) => {
  await page.goto("/components/lab/");
  const result = await page.evaluate(
    async ({ runtimeURL, factoryURL }) => {
      const runtime = (await import(runtimeURL)) as {
        exerciseDocumentListenerOptions: typeof exerciseDocumentListenerOptions;
      };
      const { jQueryFactory } = (await import(factoryURL)) as {
        jQueryFactory(owner: Window): JQueryStatic;
      };
      return runtime.exerciseDocumentListenerOptions(jQueryFactory);
    },
    { runtimeURL, factoryURL },
  );
  expect(result.rows).toHaveLength(28);
  for (const row of result.rows)
    expect(row.owned, `${row.target} option ${row.mode}`).toBe(row.native);
  expect(result.reads).toEqual(["capture", "once", "passive", "signal"]);
  expect(result.receivers).toEqual([true, true, true, true]);
  expect(result.calls).toBe(1);
});

for (const throws of [false, true]) {
  test(`first scope disconnects late native observation with throw=${throws}`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, throws }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseFirstScopeObserver: typeof exerciseFirstScopeObserver;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseFirstScopeObserver(jQueryFactory, throws);
      },
      { runtimeURL, factoryURL, throws },
    );
    expect(result).toEqual({ entered: true, rejected: true, deliveries: 0, disconnects: 2 });
  });
}
for (const kind of ["resizable", "replacement", "pagination", "stepper"] as const) {
  test(`first scope retains newer ${kind} controller work`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, kind }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseFirstScopeController: typeof exerciseFirstScopeController;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseFirstScopeController(jQueryFactory, kind);
      },
      { runtimeURL, factoryURL, kind },
    );
    expect(result).toEqual({
      entered: true,
      value: kind === "pagination" ? 2 : kind === "stepper" ? "b" : [70, 30],
      nativeValue: kind === "pagination" ? 1 : kind === "stepper" ? "a" : [75, 25],
      observers: 1,
    });
  });
}

for (const kind of ["resizable", "sortable"] as const) {
  test(kind + " retains trusted native dragging after document adoption", async ({ page }) => {
    await page.goto("/components/lab/");
    await page.evaluate(
      async ({ runtimeURL, factoryURL, kind }) => {
        const runtime = (await import(runtimeURL)) as {
          beginNativeLayoutInteraction: typeof beginNativeLayoutInteraction;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        runtime.beginNativeLayoutInteraction(jQueryFactory, kind);
      },
      { runtimeURL, factoryURL, kind },
    );
    try {
      const frame = page.frameLocator("#native-layout-frame");
      const root = frame.locator("section"),
        handle = root.locator('[data-part="handle"]').first();
      if (kind === "resizable") {
        const bounds = await handle.boundingBox();
        if (!bounds) throw new Error("Missing native handle bounds.");
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 30);
        await page.mouse.down();
        await expect(handle).toHaveAttribute("data-state", "dragging");
        await expect(root).toHaveAttribute("data-captured", "true");
        await page.mouse.move(bounds.x + 80, bounds.y + 30, { steps: 4 });
        await page.mouse.up();
        await expect(root).toHaveAttribute("data-proof-resize-end", "true");
        await expect(handle).toHaveAttribute("data-state", "idle");
        expect(Number(await handle.getAttribute("aria-valuenow"))).toBeGreaterThan(50);
        expect(
          await root.evaluate((element) => {
            const handle = element.querySelector<HTMLElement>('[data-part="handle"]');
            return handle?.hasPointerCapture(Number(element.getAttribute("data-pointer-id")));
          }),
        ).toBe(false);
      } else {
        await handle.dragTo(root.locator('[data-value="c"] [data-part="handle"]'));
        await expect(root).toHaveAttribute("data-proof-drop", "true");
        await expect(root).toHaveAttribute("data-state", "idle");
        await expect(root).toHaveAttribute("data-value", '["b","c","a"]');
        await expect(root).toHaveAttribute("data-transfer", "a");
        expect(
          await frame
            .locator("form")
            .evaluate((form) =>
              new (form.ownerDocument.defaultView as Window & typeof globalThis).FormData(
                form as HTMLFormElement,
              ).getAll("order"),
            ),
        ).toEqual(["b", "c", "a"]);
      }
      await expect(root).toHaveAttribute("data-trusted", "true");
      await expect(root).toHaveAttribute("data-event-owner", "true");
      await expect(root).toHaveAttribute("data-proof-change", "true");
    } finally {
      await page.evaluate(async (runtimeURL) => {
        const runtime = (await import(runtimeURL)) as {
          endNativeLayoutInteraction: typeof endNativeLayoutInteraction;
        };
        runtime.endNativeLayoutInteraction();
      }, runtimeURL);
    }
  });
}

for (const kind of ["resizable", "sortable"] as const)
  for (const mode of [
    "explicit",
    "automatic",
    "action",
    "adopted",
    "disposed-first",
    "facade",
  ] as const) {
    test(
      kind + " supports " + mode + " document ownership and native layout controls",
      async ({ page }) => {
        await page.goto("/components/lab/");
        const result = await page.evaluate(
          async ({ runtimeURL, factoryURL, kind, mode }) => {
            const runtime = (await import(runtimeURL)) as {
              exerciseLayoutOwnership: typeof exerciseLayoutOwnership;
            };
            const { jQueryFactory } = (await import(factoryURL)) as {
              jQueryFactory(owner: Window): JQueryStatic;
            };
            return runtime.exerciseLayoutOwnership(jQueryFactory, kind, mode);
          },
          { runtimeURL, factoryURL, kind, mode },
        );
        expect(result).toEqual({
          enhancedBeforeFacade: true,
          retained: true,
          rejectedPreviousOwner: true,
          canceledKey: true,
          canceledAction: true,
          constrained: true,
          programmatic: true,
          nativeControl: true,
          preview: true,
          persisted: true,
          newerRequest: true,
          patchedState: true,
          currentParts: true,
          retiredPart: true,
          stable: true,
          preserved: true,
          rejectedRemovedRoot: true,
          retired: true,
          ownerEvents: true,
        });
      },
    );
  }

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`Feed supports ${mode} document ownership and native loading`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseFeedOwnership: typeof exerciseFeedOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseFeedOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      retained: true,
      enhancedBeforeFacade: true,
      rejectedPreviousOwner: true,
      canceledClick: true,
      canceledKey: true,
      canceledAction: true,
      constrained: true,
      programmatic: true,
      forward: true,
      backward: true,
      boundaryKeys: true,
      authoredLoad: true,
      pendingFocus: true,
      labels: true,
      articleIdentity: true,
      errorState: true,
      resetState: true,
      patchedState: true,
      currentParts: true,
      newerRequest: true,
      getterOrdering: true,
      stable: true,
      nativeObserver: true,
      preserved: true,
      rejectedRemovedRoot: true,
      retired: true,
      ownerEvents: true,
    });
  });
}

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`Toast supports ${mode} document ownership and native interactions`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseToastOwnership: typeof exerciseToastOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseToastOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      enhancedBeforeFacade: true,
      retained: true,
      rejectedPreviousOwner: true,
      canceledClose: true,
      canceledEscape: true,
      canceledF8: true,
      hotkey: true,
      constrained: true,
      nestedIgnored: true,
      currentParts: true,
      stable: true,
      safeText: true,
      newerRequest: true,
      preserved: true,
      operated: true,
      recoveryFocus: true,
      separateAnnouncement: true,
      rejectedRemovedRoot: true,
      retired: true,
      ownerEvents: true,
    });
  });
}

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`Questionnaire supports ${mode} document ownership and native forms`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseQuestionnaireOwnership: typeof exerciseQuestionnaireOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseQuestionnaireOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      enhancedBeforeFacade: true,
      retained: true,
      rejectedPreviousOwner: true,
      operated: true,
      requiredValidation: true,
      skippedValue: true,
      nativeSubmission: true,
      submitted: true,
      canceledSubmit: true,
      canceledNavigation: true,
      canceledShortcut: true,
      keyboard: true,
      constraints: true,
      canceledReset: true,
      newerReset: true,
      acceptedReset: true,
      currentParts: true,
      newerRequest: true,
      stable: true,
      preserved: true,
      rejectedRemovedRoot: true,
      retired: true,
      ownerEvents: true,
      nativeEvents: true,
    });
  });
}

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`Form supports ${mode} document ownership and native validation`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseFormOwnership: typeof exerciseFormOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseFormOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      enhancedBeforeFacade: true,
      retained: true,
      rejectedPreviousOwner: true,
      operated: true,
      association: true,
      nativeSubmission: true,
      nativeSubmit: true,
      canceledSubmit: true,
      canceledReset: true,
      newerReset: true,
      acceptedReset: true,
      nativeNames: true,
      currentParts: true,
      newerRequest: true,
      constrained: true,
      preserved: true,
      rejectedRemovedRoot: true,
      retired: true,
      ownerEvents: true,
    });
  });
}

for (const kind of ["calendar", "range-calendar", "date-picker", "date-range-picker"] as const) {
  for (const mode of [
    "explicit",
    "automatic",
    "action",
    "adopted",
    "disposed-first",
    "facade",
  ] as const) {
    test(`${kind} supports ${mode} document ownership and native dates`, async ({ page }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, kind, mode }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseCalendarOwnership: typeof exerciseCalendarOwnership;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseCalendarOwnership(jQueryFactory, kind, mode);
        },
        { runtimeURL, factoryURL, kind, mode },
      );
      expect(result).toEqual({
        enhancedBeforeFacade: true,
        retainedAfterAdoption: true,
        retainedOpen: true,
        rejectedPreviousOwner: true,
        operated: true,
        nativeSubmission: true,
        stable: true,
        foreignDate: true,
        earlyYear: true,
        keyboard: true,
        canceledNative: true,
        constraints: true,
        currentParts: true,
        reentered: true,
        constrainedContinuation: true,
        canceledReset: true,
        acceptedReset: true,
        preserved: true,
        rejectedRemovedRoot: true,
        retired: true,
        ownerEvents: true,
      });
    });
  }
}

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`Select supports ${mode} document ownership and native popovers`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseSelectOwnership: typeof exerciseSelectOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseSelectOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      enhancedBeforeFacade: true,
      retainedNativeValue: true,
      rejectedPreviousOwner: true,
      retainedExploration: true,
      stableOptions: true,
      canceledClose: true,
      operated: true,
      nativeSubmission: true,
      canceledReset: true,
      acceptedReset: true,
      skipsDisabledGroup: true,
      canceledNativeOpen: true,
      retainedAfterPreservation: true,
      selectedAfterPreservation: true,
      rejectedRemovedRoot: true,
      releasedNativeBinding: true,
      receivedOwnerEvents: true,
      receivedNativeEvents: true,
    });
  });
}

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`Time Picker supports ${mode} document ownership and native reset`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseTimePickerOwnership: typeof exerciseTimePickerOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseTimePickerOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      enhancedBeforeFacade: true,
      retainedNativeValue: true,
      rejectedPreviousOwner: true,
      operated: true,
      nativeSubmission: true,
      readonly: true,
      canceledReset: true,
      acceptedReset: true,
      retainedAfterPreservation: true,
      rejectedRemovedRoot: true,
      releasedNativeBinding: true,
      receivedOwnerEvents: true,
      receivedNativeEvents: true,
    });
  });
}

for (const kind of ["countdown", "carousel", "message-scroller", "dialog"] as const) {
  for (const mode of ["explicit", "automatic", "action", "adopted"] as const) {
    test(`${kind} supports ${mode} ownership in independent frame documents`, async ({ page }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, kind, mode }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseDocumentOwnership: typeof exerciseDocumentOwnership;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseDocumentOwnership(jQueryFactory, kind, mode);
        },
        { runtimeURL, factoryURL, kind, mode },
      );
      expect(result).toEqual({
        enhancedBeforeFacade: true,
        operated: true,
        afterOldDisposal: true,
        rejectedPreviousOwner: true,
        preservedRoot: true,
        rejectedRemovedRoot: true,
        retainedAfterPreservation: true,
        receivedOwnerEvents: true,
      });
    });
  }
}

for (const userPaused of [false, true]) {
  test(`Carousel recalculates native focus on adoption with user pause=${userPaused}`, async ({
    page,
  }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, userPaused }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseCarouselFocusAdoption: typeof exerciseCarouselFocusAdoption;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseCarouselFocusAdoption(jQueryFactory, userPaused);
      },
      { runtimeURL, factoryURL, userPaused },
    );
    expect(result).toEqual({ before: "paused", after: userPaused ? "paused" : "playing" });
  });
}

test("native component actions accept element targets and reject mismatched roots", async ({
  page,
}) => {
  await page.goto("/components/lab/");
  const result = await page.evaluate(
    async ({ runtimeURL, factoryURL }) => {
      const runtime = (await import(runtimeURL)) as {
        exerciseNativeElementActionTargets: typeof exerciseNativeElementActionTargets;
      };
      const { jQueryFactory } = (await import(factoryURL)) as {
        jQueryFactory(owner: Window): JQueryStatic;
      };
      return runtime.exerciseNativeElementActionTargets(jQueryFactory);
    },
    { runtimeURL, factoryURL },
  );
  expect(result).toEqual({
    numberExplicit: true,
    numberImplicit: true,
    timeExplicit: true,
    ratingExplicit: true,
    toggleExplicit: true,
    groupExplicit: true,
    toolbarExplicit: true,
    passwordExplicit: true,
    passwordImplicit: true,
    sidebarExplicit: true,
    sidebarImplicit: true,
    otpExplicit: true,
    otpImplicit: true,
    searchExplicit: true,
    tagsExplicit: true,
    stepperExplicit: true,
    multiExplicit: true,
    colorExplicit: true,
    colorImplicit: true,
    editableExplicit: true,
    editableImplicit: true,
    wrongTargetRejected: true,
    wrongValueTargetRejected: true,
    wrongPasswordTargetRejected: true,
    wrongSidebarTargetRejected: true,
    wrongColorTargetRejected: true,
    wrongEditableTargetRejected: true,
    numberUnchanged: true,
    tagsUnchanged: true,
    passwordUnchanged: true,
    sidebarUnchanged: true,
    colorUnchanged: true,
    editableUnchanged: true,
  });
});

test("remaining native actions validate explicit element targets", async ({ page }) => {
  await page.goto("/components/lab/");
  const result = await page.evaluate(
    async ({ runtimeURL, factoryURL }) => {
      const runtime = (await import(runtimeURL)) as {
        exerciseRemainingElementActionTargets: typeof exerciseRemainingElementActionTargets;
      };
      const { jQueryFactory } = (await import(factoryURL)) as {
        jQueryFactory(owner: Window): JQueryStatic;
      };
      return runtime.exerciseRemainingElementActionTargets(jQueryFactory);
    },
    { runtimeURL, factoryURL },
  );
  expect(Object.values(result).every(Boolean)).toBe(true);
});

test("additional native actions validate explicit element targets", async ({ page }) => {
  await page.goto("/components/lab/");
  const result = await page.evaluate(
    async ({ runtimeURL, factoryURL }) => {
      const runtime = (await import(runtimeURL)) as {
        exerciseAdditionalElementActionTargets: typeof exerciseAdditionalElementActionTargets;
      };
      const { jQueryFactory } = (await import(factoryURL)) as {
        jQueryFactory(owner: Window): JQueryStatic;
      };
      return runtime.exerciseAdditionalElementActionTargets(jQueryFactory);
    },
    { runtimeURL, factoryURL },
  );
  expect(Object.values(result).every(Boolean)).toBe(true);
});

test("structural native actions validate targets and interactions", async ({ page }) => {
  await page.goto("/components/lab/");
  const result = await page.evaluate(
    async ({ runtimeURL, factoryURL }) => {
      const runtime = (await import(runtimeURL)) as {
        exerciseStructuralElementActionTargets: typeof exerciseStructuralElementActionTargets;
      };
      const { jQueryFactory } = (await import(factoryURL)) as {
        jQueryFactory(owner: Window): JQueryStatic;
      };
      return runtime.exerciseStructuralElementActionTargets(jQueryFactory);
    },
    { runtimeURL, factoryURL },
  );
  expect(result).toEqual(Object.fromEntries(Object.keys(result).map((key) => [key, true])));
});

test("external native floating toggles keep Popover and Hover Card state", async ({ page }) => {
  await page.goto("/components/lab/");
  const result = await page.evaluate(
    async ({ runtimeURL, factoryURL }) => {
      const runtime = (await import(runtimeURL)) as {
        exerciseExternalFloatingToggles: typeof exerciseExternalFloatingToggles;
      };
      const { jQueryFactory } = (await import(factoryURL)) as {
        jQueryFactory(owner: Window): JQueryStatic;
      };
      return runtime.exerciseExternalFloatingToggles(jQueryFactory);
    },
    { runtimeURL, factoryURL },
  );
  expect(result).toEqual({
    popoverInitial: true,
    popoverExternalHide: true,
    popoverExternalShow: true,
    popoverOutside: true,
    "hover-cardInitial": true,
    "hover-cardExternalHide": true,
    "hover-cardExternalShow": true,
    "hover-cardOutside": true,
  });
});

for (const kind of ["number-field", "password-field", "search-field", "rating"] as const) {
  for (const mode of ["explicit", "automatic", "action", "adopted"] as const) {
    test(`${kind} supports ${mode} native document ownership`, async ({ page }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, kind, mode }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseNativeFieldOwnership: typeof exerciseNativeFieldOwnership;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseNativeFieldOwnership(jQueryFactory, kind, mode);
        },
        { runtimeURL, factoryURL, kind, mode },
      );
      expect(result).toEqual({
        enhancedBeforeFacade: true,
        operated: true,
        rejectedPreviousOwner: true,
        retainedAfterPreservation: true,
        rejectedRemovedRoot: true,
        receivedOwnerEvents: true,
        receivedNativeEvents: true,
      });
    });
  }
}
for (const kind of ["number-field", "search-field", "rating"] as const) {
  for (const adopted of [false, true]) {
    test(`${kind} preserves native reset cancellation with adoption=${adopted}`, async ({
      page,
    }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, kind, adopted }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseNativeFieldReset: typeof exerciseNativeFieldReset;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseNativeFieldReset(jQueryFactory, kind, adopted);
        },
        { runtimeURL, factoryURL, kind, adopted },
      );
      expect(result).toEqual({ canceled: true, reset: true });
    });
  }
}

for (const kind of ["input-otp", "tags-input", "toggle", "toggle-group"] as const) {
  for (const mode of ["explicit", "automatic", "action", "adopted"] as const) {
    test(`${kind} supports ${mode} document ownership`, async ({ page }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, kind, mode }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseTokenOwnership: typeof exerciseTokenOwnership;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseTokenOwnership(jQueryFactory, kind, mode);
        },
        { runtimeURL, factoryURL, kind, mode },
      );
      expect(result).toEqual({
        enhancedBeforeFacade: true,
        operated: true,
        rejectedPreviousOwner: true,
        stableGeneratedNodes: true,
        rovingFocus: true,
        retainedAfterPreservation: true,
        rejectedRemovedRoot: true,
        receivedOwnerEvents: true,
        receivedNativeEvents: true,
      });
    });
  }
}
for (const adopted of [false, true]) {
  test(`Input OTP preserves native reset cancellation with adoption=${adopted}`, async ({
    page,
  }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, adopted }) => {
        const runtime = (await import(runtimeURL)) as { exerciseOTPReset: typeof exerciseOTPReset };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseOTPReset(jQueryFactory, adopted);
      },
      { runtimeURL, factoryURL, adopted },
    );
    expect(result).toEqual({ canceled: true, reset: true });
  });
}

for (const kind of ["tabs", "toolbar", "pagination", "sidebar"] as const) {
  for (const mode of ["explicit", "automatic", "action", "adopted"] as const) {
    test(`${kind} supports ${mode} navigation document ownership`, async ({ page }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, kind, mode }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseNavigationOwnership: typeof exerciseNavigationOwnership;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseNavigationOwnership(jQueryFactory, kind, mode);
        },
        { runtimeURL, factoryURL, kind, mode },
      );
      expect(result).toEqual({
        enhancedBeforeFacade: true,
        operated: true,
        rejectedPreviousOwner: true,
        nativeControls: true,
        retainedAfterPreservation: true,
        rejectedRemovedRoot: true,
        receivedOwnerEvents: true,
      });
    });
  }
}
for (const disposedFirst of [false, true]) {
  test(`Sidebar restores desktop preference after a mobile adoption with disposal first=${disposedFirst}`, async ({
    page,
  }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, disposedFirst }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseSidebarViewportAdoption: typeof exerciseSidebarViewportAdoption;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseSidebarViewportAdoption(jQueryFactory, disposedFirst);
      },
      { runtimeURL, factoryURL, disposedFirst },
    );
    expect(result).toEqual({ collapsedOnMobile: true, returnedFocus: true, restoredDesktop: true });
  });
}

for (const kind of ["collapsible", "accordion", "editable", "stepper"] as const) {
  for (const mode of ["explicit", "automatic", "action", "adopted"] as const) {
    test(`${kind} supports ${mode} disclosure/step document ownership`, async ({ page }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, kind, mode }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseDisclosureStepOwnership: typeof exerciseDisclosureStepOwnership;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseDisclosureStepOwnership(jQueryFactory, kind, mode);
        },
        { runtimeURL, factoryURL, kind, mode },
      );
      expect(result).toEqual({
        enhancedBeforeFacade: true,
        operated: true,
        receivedOwnerEvents: true,
        immediateCancellation: true,
        rejectedPreviousOwner: true,
        retainedAfterPreservation: true,
        rejectedRemovedRoot: true,
      });
    });
  }
}
for (const kind of ["collapsible", "accordion"] as const) {
  for (const adopted of [false, true]) {
    test(`${kind} preserves native default actions and toggle notifications with adoption=${adopted}`, async ({
      page,
    }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, kind, adopted }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseDisclosureDefaults: typeof exerciseDisclosureDefaults;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseDisclosureDefaults(jQueryFactory, kind, adopted);
        },
        { runtimeURL, factoryURL, kind, adopted },
      );
      expect(result).toEqual({
        pendingNotification: true,
        nativeExclusion: true,
        lateCancellation: true,
        nativeLink: true,
      });
    });
  }
}
for (const kind of ["editable", "stepper"] as const) {
  for (const disposedFirst of [false, true]) {
    test(`${kind} retains state across adoption with source disposal first=${disposedFirst}`, async ({
      page,
    }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, kind, disposedFirst }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseDraftCompletionAdoption: typeof exerciseDraftCompletionAdoption;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseDraftCompletionAdoption(jQueryFactory, kind, disposedFirst);
        },
        { runtimeURL, factoryURL, kind, disposedFirst },
      );
      expect(result).toEqual({ retained: true, operated: true });
    });
  }
}

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`Combobox supports ${mode} document ownership and native popovers`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseComboboxOwnership: typeof exerciseComboboxOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseComboboxOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      enhancedBeforeFacade: true,
      actionSelected: true,
      rejectedPreviousOwner: true,
      retainedDraft: true,
      retainedExploration: true,
      stableOptions: true,
      retainedComposition: true,
      canceledClose: true,
      operated: true,
      nativeSubmission: true,
      canceledNativeOpen: true,
      canceledReset: true,
      acceptedReset: true,
      skipsDisabled: true,
      retainedAfterPreservation: true,
      selectedAfterPreservation: true,
      inlineTransition: true,
      rejectedRemovedRoot: true,
      releasedNativeBinding: true,
      receivedOwnerEvents: true,
      receivedNativeEvents: true,
    });
  });
}

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`Multi Select supports ${mode} document ownership and native popovers`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseMultiSelectOwnership: typeof exerciseMultiSelectOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseMultiSelectOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      enhancedBeforeFacade: true,
      rejectedPreviousOwner: true,
      actionSelected: true,
      retainedNativeValue: true,
      retainedExploration: true,
      stableTag: true,
      stableOptions: true,
      nativeComposition: true,
      canceledSelection: true,
      operated: true,
      nativeSubmission: true,
      lockedTag: true,
      maximum: true,
      clearsEnabled: true,
      nativeRequired: true,
      canceledReset: true,
      acceptedReset: true,
      canceledClose: true,
      canceledNativeOpen: true,
      currentFocus: true,
      retainedAfterPreservation: true,
      selectedAfterPreservation: true,
      rejectedRemovedRoot: true,
      releasedNativeBinding: true,
      receivedOwnerEvents: true,
      receivedNativeEvents: true,
    });
  });
}

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`Color Picker supports ${mode} document ownership and native colors`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseColorPickerOwnership: typeof exerciseColorPickerOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseColorPickerOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      enhancedBeforeFacade: true,
      retainedNativeValue: true,
      retainedDraft: true,
      rejectedPreviousOwner: true,
      composition: true,
      operated: true,
      nativeSubmission: true,
      invalidDraft: true,
      clearsInvalid: true,
      newerCancellation: true,
      readonly: true,
      authoredDisabled: true,
      nativeNormalization: true,
      invalidColors: true,
      canceledReset: true,
      acceptedReset: true,
      retainedAfterPreservation: true,
      rejectedRemovedRoot: true,
      releasedNativeBinding: true,
      receivedOwnerEvents: true,
      receivedNativeEvents: true,
    });
  });
}

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`File Upload supports ${mode} document ownership and native files`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseFileUploadOwnership: typeof exerciseFileUploadOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseFileUploadOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      enhancedBeforeFacade: true,
      rejectedPreviousOwner: true,
      retainedSelection: true,
      retainedRows: true,
      retainedDrag: true,
      replacedFile: true,
      stableRows: true,
      nativeSubmission: true,
      dropped: true,
      actions: true,
      nativeRemoval: true,
      validation: true,
      newerCancellation: true,
      disabled: true,
      canceledReset: true,
      acceptedReset: true,
      silentClear: true,
      retainedAfterPreservation: true,
      nativeClear: true,
      rejectedRemovedRoot: true,
      releasedNativeBinding: true,
      receivedOwnerEvents: true,
      receivedNativeEvents: true,
    });
  });
}

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`Tree supports ${mode} document ownership and native exploration`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseTreeOwnership: typeof exerciseTreeOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseTreeOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      enhancedBeforeFacade: true,
      rejectedPreviousOwner: true,
      retainedExploration: true,
      retainedSearch: true,
      nativeComposition: true,
      expiredSearch: true,
      operated: true,
      canceledSelection: true,
      newerSelection: true,
      nestedControl: true,
      newerFocus: true,
      currentParts: true,
      authoredName: true,
      clearedDisabled: true,
      visibleSelection: true,
      retainedAfterPreservation: true,
      selectedAfterPreservation: true,
      rejectedRemovedRoot: true,
      releasedNativeBinding: true,
      receivedOwnerEvents: true,
    });
  });
}

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`Transfer List supports ${mode} document ownership and native membership`, async ({
    page,
  }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseTransferListOwnership: typeof exerciseTransferListOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseTransferListOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      enhancedBeforeFacade: true,
      rejectedPreviousOwner: true,
      retainedNativeState: true,
      operated: true,
      nativeOptionOrAction: true,
      nativeEnter: true,
      reordered: true,
      canceled: true,
      newerMembership: true,
      protectedEvent: true,
      rootPatch: true,
      silentMembership: true,
      canceledReset: true,
      acceptedReset: true,
      externalReset: true,
      composition: true,
      disabled: true,
      enabled: true,
      authoredDisabled: true,
      disabledMembership: true,
      currentParts: true,
      retainedAfterPreservation: true,
      selectedAfterPreservation: true,
      rejectedRemovedRoot: true,
      releasedNativeBinding: true,
      receivedOwnerEvents: true,
      receivedNativeEvents: true,
    });
  });
}

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`Popover supports ${mode} document ownership and native transitions`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exercisePopoverOwnership: typeof exercisePopoverOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exercisePopoverOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      enhancedBeforeFacade: true,
      retainedOpenFocus: true,
      rejectedPreviousOwner: true,
      opened: true,
      stableFocus: true,
      canceledClose: true,
      returnedFocus: true,
      canceledNativeOpen: true,
      newerNativeClose: true,
      nativeNoopOpen: true,
      nativeNoopClose: true,
      newerNoopOpen: true,
      lateToggle: true,
      externalNativeClose: true,
      immediateNativeReopen: true,
      immediateNativeClose: true,
      disabled: true,
      preservedOpen: true,
      preservedFocus: true,
      currentParts: true,
      retiredTrigger: true,
      foreignOutside: true,
      foreignEscape: true,
      rejectedRemovedRoot: true,
      releasedNativeBinding: true,
      receivedOwnerEvents: true,
    });
  });
}

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`Tooltip supports ${mode} document ownership and native transitions`, async ({ page }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseTooltipOwnership: typeof exerciseTooltipOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseTooltipOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      enhancedBeforeFacade: true,
      implicitAction: true,
      retainedOpen: true,
      rejectedPreviousOwner: true,
      opened: true,
      stableFocus: true,
      canceledClose: true,
      returnedFocus: true,
      canceledNativeOpen: true,
      newerNativeClose: true,
      nativeNoopOpen: true,
      nativeNoopClose: true,
      newerNoopOpen: true,
      lateToggle: true,
      externalNativeClose: true,
      immediateNativeReopen: true,
      immediateNativeClose: true,
      disabled: true,
      preservedOpen: true,
      preservedFocus: true,
      currentParts: true,
      retiredTrigger: true,
      foreignOutside: true,
      foreignEscape: true,
      rejectedRemovedRoot: true,
      releasedNativeBinding: true,
      receivedOwnerEvents: true,
    });
  });
}

for (const closing of [false, true]) {
  for (const disposedFirst of [false, true]) {
    test(`Tooltip retains ${closing ? "closing" : "opening"} deadline with source disposal first=${disposedFirst}`, async ({
      page,
    }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, closing, disposedFirst }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseTooltipDeadline: typeof exerciseTooltipDeadline;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseTooltipDeadline(jQueryFactory, closing, disposedFirst);
        },
        { runtimeURL, factoryURL, closing, disposedFirst },
      );
      expect(result).toEqual({
        restoredBeforeDeadline: true,
        remainingDeadline: true,
        completed: true,
      });
    });
  }
}

for (const [previous, next] of [
  ["popover", "tooltip"],
  ["popover", "hover-card"],
  ["popover", "menu"],
  ["popover", "context-menu"],
  ["tooltip", "popover"],
  ["tooltip", "hover-card"],
  ["tooltip", "menu"],
  ["tooltip", "context-menu"],
  ["hover-card", "popover"],
  ["hover-card", "tooltip"],
  ["hover-card", "menu"],
  ["hover-card", "context-menu"],
  ["menu", "popover"],
  ["menu", "tooltip"],
  ["menu", "hover-card"],
  ["menu", "context-menu"],
  ["context-menu", "popover"],
  ["context-menu", "tooltip"],
  ["context-menu", "hover-card"],
  ["context-menu", "menu"],
] as const) {
  for (const opening of [false, true]) {
    test(`Floating content survives ${previous} to ${next} handoff during native ${opening ? "opening" : "closing"}`, async ({
      page,
    }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, previous, next, opening }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseFloatingHandoff: typeof exerciseFloatingHandoff;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseFloatingHandoff(jQueryFactory, previous, next, opening);
        },
        { runtimeURL, factoryURL, previous, next, opening },
      );
      expect(result).toEqual({ accepted: true, stable: true, closed: true, notified: true });
    });
  }
}

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`Hover Card supports ${mode} document ownership and native transitions`, async ({
    page,
  }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseHoverCardOwnership: typeof exerciseHoverCardOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseHoverCardOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      enhancedBeforeFacade: true,
      implicitAction: true,
      retainedOpen: true,
      retainedFocus: true,
      stayedDismissed: true,
      deliberateFocusOpened: true,
      rejectedPreviousOwner: true,
      opened: true,
      stableFocus: true,
      canceledClose: true,
      returnedFocus: true,
      canceledNativeOpen: true,
      newerNativeClose: true,
      nativeNoopOpen: true,
      nativeNoopClose: true,
      newerNoopOpen: true,
      lateToggle: true,
      externalNativeClose: true,
      immediateNativeReopen: true,
      immediateNativeClose: true,
      disabled: true,
      preservedOpen: true,
      preservedFocus: true,
      currentParts: true,
      retiredTrigger: true,
      foreignOutside: true,
      foreignEscape: true,
      rejectedRemovedRoot: true,
      releasedNativeBinding: true,
      receivedOwnerEvents: true,
    });
  });
}

for (const closing of [false, true]) {
  for (const disposedFirst of [false, true]) {
    test(`Hover Card retains ${closing ? "closing" : "opening"} deadline with source disposal first=${disposedFirst}`, async ({
      page,
    }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, closing, disposedFirst }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseTooltipDeadline: typeof exerciseTooltipDeadline;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseTooltipDeadline(
            jQueryFactory,
            closing,
            disposedFirst,
            "hover-card",
          );
        },
        { runtimeURL, factoryURL, closing, disposedFirst },
      );
      expect(result).toEqual({
        restoredBeforeDeadline: true,
        remainingDeadline: true,
        completed: true,
      });
    });
  }
}

for (const kind of ["menu", "context-menu"] as const) {
  for (const mode of [
    "explicit",
    "automatic",
    "action",
    "adopted",
    "disposed-first",
    "facade",
  ] as const) {
    test(`${kind} supports ${mode} document ownership and native transitions`, async ({ page }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, mode, kind }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseMenuOwnership: typeof exerciseMenuOwnership;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseMenuOwnership(jQueryFactory, mode, kind);
        },
        { runtimeURL, factoryURL, mode, kind },
      );
      expect(result).toEqual({
        enhancedBeforeFacade: true,
        retainedOpenFocus: true,
        rejectedPreviousOwner: true,
        opened: true,
        stableFocus: true,
        canceledClose: true,
        returnedFocus: true,
        canceledNativeOpen: true,
        newerNativeClose: true,
        nativeNoopOpen: true,
        nativeNoopClose: true,
        newerNoopOpen: true,
        lateToggle: true,
        externalNativeClose: true,
        immediateNativeReopen: true,
        immediateNativeClose: true,
        disabled: true,
        preservedOpen: true,
        preservedFocus: true,
        currentParts: true,
        retiredTrigger: true,
        foreignOutside: true,
        foreignEscape: true,
        rejectedRemovedRoot: true,
        releasedNativeBinding: true,
        receivedOwnerEvents: true,
      });
    });
  }
}

for (const [kind, press] of [
  ["menu", false],
  ["context-menu", false],
  ["context-menu", true],
] as const) {
  for (const disposedFirst of [false, true]) {
    test(`${kind} retains ${press ? "long-press" : "search"} deadline, source disposed first=${disposedFirst}`, async ({
      page,
    }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, kind, press, disposedFirst }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseMenuDeadline: typeof exerciseMenuDeadline;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseMenuDeadline(jQueryFactory, kind, press, disposedFirst);
        },
        { runtimeURL, factoryURL, kind, press, disposedFirst },
      );
      expect(result).toEqual({ retained: true, remaining: true, completed: true });
    });
  }
}

test("Menubar resolves local values and selectors in its owning document", async ({ page }) => {
  await page.goto("/components/lab/");
  const result = await page.evaluate(
    async ({ runtimeURL, factoryURL }) => {
      const runtime = (await import(runtimeURL)) as {
        exerciseMenubarSelectors: typeof exerciseMenubarSelectors;
      };
      const { jQueryFactory } = (await import(factoryURL)) as {
        jQueryFactory(owner: Window): JQueryStatic;
      };
      return runtime.exerciseMenubarSelectors(jQueryFactory);
    },
    { runtimeURL, factoryURL },
  );
  expect(result).toEqual({
    exactValue: true,
    classTarget: true,
    facade: true,
    explicitId: true,
    native: true,
  });
});

for (const mode of [
  "explicit",
  "automatic",
  "action",
  "adopted",
  "disposed-first",
  "facade",
] as const) {
  test(`Menubar supports ${mode} document ownership and child native transitions`, async ({
    page,
  }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, mode }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseMenubarOwnership: typeof exerciseMenubarOwnership;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseMenubarOwnership(jQueryFactory, mode);
      },
      { runtimeURL, factoryURL, mode },
    );
    expect(result).toEqual({
      enhancedBeforeFacade: true,
      retainedOpenFocus: true,
      rejectedPreviousOwner: true,
      opened: true,
      stableFocus: true,
      canceledKeys: true,
      childNavigation: true,
      inactiveNavigation: true,
      rovingNavigation: true,
      canceledClose: true,
      newerClose: true,
      nativeNewerClose: true,
      newerOpen: true,
      disabled: true,
      vertical: true,
      currentParts: true,
      retiredTrigger: true,
      preserved: true,
      rejectedRemovedRoot: true,
      released: true,
      ownerEvents: true,
    });
  });
}
for (const disposedFirst of [false, true]) {
  test(`Menubar retains search deadline and roving focus, source disposed first=${disposedFirst}`, async ({
    page,
  }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, disposedFirst }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseMenubarDeadline: typeof exerciseMenubarDeadline;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseMenubarDeadline(jQueryFactory, disposedFirst);
      },
      { runtimeURL, factoryURL, disposedFirst },
    );
    expect(result).toEqual({ retained: true, remaining: true, continued: true, completed: true });
  });
}

for (const kind of ["clipboard", "code-block"] as const) {
  for (const mode of [
    "explicit",
    "automatic",
    "action",
    "adopted",
    "disposed-first",
    "facade",
  ] as const) {
    test(`${kind} supports ${mode} document ownership and async copy`, async ({ page }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, kind, mode }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseCopyOwnership: typeof exerciseCopyOwnership;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseCopyOwnership(jQueryFactory, kind, mode);
        },
        { runtimeURL, factoryURL, kind, mode },
      );
      expect(result).toEqual({
        enhancedBeforeFacade: true,
        retainedPending: true,
        rejectedPreviousOwner: true,
        copied: true,
        stable: true,
        canceled: true,
        currentParts: true,
        currentDescription: true,
        disabled: true,
        changedConstraint: true,
        reentered: true,
        preserved: true,
        rejectedRemovedRoot: true,
        retired: true,
        ownerEvents: true,
        receiver: true,
      });
    });
  }
  for (const outcome of ["success", "refused", "copy-throws", "selection-throws"] as const) {
    test(`${kind} uses its owning document fallback on ${outcome}`, async ({ page }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, kind, outcome }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseCopyFallback: typeof exerciseCopyFallback;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseCopyFallback(jQueryFactory, kind, outcome);
        },
        { runtimeURL, factoryURL, kind, outcome },
      );
      expect(result).toEqual({
        result: true,
        state: true,
        correctDocument: true,
        selections: 1,
        executions: outcome === "selection-throws" ? 0 : 1,
        cleaned: true,
      });
    });
  }
}
for (const disposedFirst of [false, true]) {
  test(`Clipboard retains reset deadline, source disposed first=${disposedFirst}`, async ({
    page,
  }) => {
    await page.goto("/components/lab/");
    const result = await page.evaluate(
      async ({ runtimeURL, factoryURL, disposedFirst }) => {
        const runtime = (await import(runtimeURL)) as {
          exerciseCopyDeadline: typeof exerciseCopyDeadline;
        };
        const { jQueryFactory } = (await import(factoryURL)) as {
          jQueryFactory(owner: Window): JQueryStatic;
        };
        return runtime.exerciseCopyDeadline(jQueryFactory, disposedFirst);
      },
      { runtimeURL, factoryURL, disposedFirst },
    );
    expect(result).toEqual({ retained: true, remaining: true, completed: true });
  });
}

for (const kind of ["json-viewer", "log-viewer"] as const) {
  for (const mode of [
    "explicit",
    "automatic",
    "action",
    "adopted",
    "disposed-first",
    "facade",
  ] as const) {
    test(`${kind} supports ${mode} document ownership and current native output`, async ({
      page,
    }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, kind, mode }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseViewerOwnership: typeof exerciseViewerOwnership;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseViewerOwnership(jQueryFactory, kind, mode);
        },
        { runtimeURL, factoryURL, kind, mode },
      );
      expect(result).toEqual({
        enhancedBeforeFacade: true,
        retainedAfterAdoption: true,
        rejectedPreviousOwner: true,
        operated: true,
        stable: true,
        currentParts: true,
        nativeBehavior: true,
        reentered: true,
        constraints: true,
        uniqueIDs: true,
        preserved: true,
        rejectedRemovedRoot: true,
        retired: true,
        ownerEvents: true,
      });
    });
  }
}

for (const kind of ["chart", "data-table"] as const) {
  for (const mode of [
    "explicit",
    "automatic",
    "action",
    "adopted",
    "disposed-first",
    "facade",
  ] as const) {
    test(`${kind} supports ${mode} reporting document ownership`, async ({ page }) => {
      await page.goto("/components/lab/");
      const result = await page.evaluate(
        async ({ runtimeURL, factoryURL, kind, mode }) => {
          const runtime = (await import(runtimeURL)) as {
            exerciseReportingOwnership: typeof exerciseReportingOwnership;
          };
          const { jQueryFactory } = (await import(factoryURL)) as {
            jQueryFactory(owner: Window): JQueryStatic;
          };
          return runtime.exerciseReportingOwnership(jQueryFactory, kind, mode);
        },
        { runtimeURL, factoryURL, kind, mode },
      );
      expect(result).toEqual({
        enhancedBeforeFacade: true,
        retainedAfterAdoption: true,
        rejectedPreviousOwner: true,
        operated: true,
        stable: true,
        currentParts: true,
        nativeBehavior: true,
        reentered: true,
        recovered: true,
        constraints: true,
        preserved: true,
        rejectedRemovedRoot: true,
        retired: true,
        ownerEvents: true,
      });
    });
  }
}

test("data-table bounds real-browser row work while preserving native pages", async ({ page }) => {
  await page.goto("/components/lab/");
  const samples = await page.evaluate(
    async ({ runtimeURL, factoryURL }) => {
      const runtime = (await import(runtimeURL)) as {
        exerciseDataTableCost: typeof exerciseDataTableCost;
      };
      const { jQueryFactory } = (await import(factoryURL)) as {
        jQueryFactory(owner: Window): JQueryStatic;
      };
      return runtime.exerciseDataTableCost(jQueryFactory);
    },
    { runtimeURL, factoryURL },
  );
  expect(samples.map(({ size }) => size)).toEqual([12, 24, 48]);
  for (const sample of samples) {
    expect(sample.visible).toEqual(["row-4", "row-5", "row-6", "row-7"]);
    expect(sample.status).toBe(`5–8 of ${sample.size}`);
    expect(sample.queries).toBeLessThanOrEqual(60);
  }
  for (const key of ["initial", "page", "repeated"] as const) {
    for (let index = 1; index < samples.length; index++) {
      const current = samples[index];
      const previous = samples[index - 1];
      if (!current || !previous) throw new Error("Missing Data Table cost sample.");
      expect(current[key]).toBeLessThanOrEqual(Math.ceil(previous[key] * 2.75));
    }
  }
});
