const terminalStates = new Set(["canceled", "committed", "failed"]);

function assertElement(value, label) {
  const elementConstructor = value?.ownerDocument?.defaultView?.Element;
  if (!elementConstructor || !(value instanceof elementConstructor)) {
    throw new TypeError(`${label} must be an Element.`);
  }
}

function overlaps(left, right) {
  return left === right || left.contains(right) || right.contains(left);
}

function validateVersion(version, minimum, maximumExclusive) {
  if (!/^\d+\.\d+\.\d+$/u.test(version)) {
    throw new Error(`Unsupported host version ${version}. Stable major.minor.patch is required.`);
  }
  const parts = (value) => value.split(".").map(Number);
  const compare = (left, right) => {
    for (let index = 0; index < 3; index += 1) {
      if (left[index] !== right[index]) return left[index] - right[index];
    }
    return 0;
  };
  const current = parts(version);
  if (compare(current, parts(minimum)) < 0 || compare(current, parts(maximumExclusive)) >= 0) {
    throw new Error(
      `Unsupported host version ${version}. Expected >=${minimum} <${maximumExclusive}.`,
    );
  }
}

function candidates(root, marker) {
  const matches = [];
  if (root.matches(`[${marker}][id]`)) matches.push(root);
  matches.push(...root.querySelectorAll(`[${marker}][id]`));
  return matches;
}

function documentIdCount(document, id) {
  return [...document.querySelectorAll("[id]")].filter((element) => element.id === id).length;
}

export function matchingPreservedRoots({ outgoing, incoming, marker }) {
  assertElement(outgoing, "The outgoing root");
  assertElement(incoming, "The incoming root");
  if (!new Set(["data-turbo-permanent", "hx-preserve"]).has(marker)) {
    throw new Error(`Unsupported host preservation marker ${String(marker)}.`);
  }
  if (outgoing.ownerDocument !== incoming.ownerDocument) {
    throw new Error("Preservation roots must belong to one Document.");
  }
  const oldById = new Map();
  const newCounts = new Map();
  for (const element of candidates(outgoing, marker)) {
    if (!element.isConnected || !outgoing.contains(element)) continue;
    const values = oldById.get(element.id) ?? [];
    values.push(element);
    oldById.set(element.id, values);
  }
  for (const element of candidates(incoming, marker)) {
    newCounts.set(element.id, (newCounts.get(element.id) ?? 0) + 1);
  }
  const preserved = [];
  for (const [id, values] of oldById) {
    if (
      values.length === 1 &&
      documentIdCount(outgoing.ownerDocument, id) === 1 &&
      newCounts.get(id) === 1
    ) {
      preserved.push(values[0]);
    }
  }
  return Object.freeze(preserved);
}

export function createExternalRenderCoordinator(options) {
  const { adapter, host, version, minimumVersion, maximumVersionExclusive } = options;
  if (!adapter || typeof adapter.begin !== "function") {
    throw new TypeError("An installed public render adapter is required.");
  }
  if (!new Set(["turbo", "htmx"]).has(host)) throw new Error(`Unsupported host ${String(host)}.`);
  validateVersion(version, minimumVersion, maximumVersionExclusive);
  const observations = [];
  const operations = new Set();
  let bridgeSequence = 0;
  let disposed = false;
  let terminalDisposalPromise;

  function publish(operation, phase, outcome = "none") {
    observations.push(
      Object.freeze({
        sequence: observations.length + 1,
        bridgeOperationId: operation.bridgeOperationId,
        renderOperationId: operation.renderOperationId ?? null,
        host,
        version,
        flowId: operation.flowId,
        boundaryCategory: operation.boundaryCategory,
        phase,
        outcome,
        removalCount: operation.removalCount,
      }),
    );
  }

  function settle(operation, state, outcome) {
    if (terminalStates.has(operation.state)) return;
    operation.state = state;
    operation.boundary = undefined;
    operation.incomingRoots = undefined;
    operations.delete(operation);
    publish(operation, state, outcome);
  }

  function prepare({ flowId, boundary, boundaryCategory = "region" }) {
    if (disposed) throw new Error("The external render coordinator has been disposed.");
    if (!/^(turbo|htmx)\.[a-z0-9.-]+$/u.test(flowId)) {
      throw new Error(`Invalid external flow ID ${String(flowId)}.`);
    }
    assertElement(boundary, "The outgoing boundary");
    let facade;
    const operation = {
      bridgeOperationId: ++bridgeSequence,
      renderOperationId: undefined,
      flowId,
      boundaryCategory,
      boundary,
      incomingRoots: undefined,
      transaction: undefined,
      terminalPromise: undefined,
      state: "prepared",
      removalCount: 0,
      removed: new WeakSet(),
      cancel() {
        if (operation.state !== "prepared") {
          throw new Error(`Cannot cancel an external render in ${operation.state}.`);
        }
        settle(operation, "canceled", "canceled-before-mutation");
      },
      beginMutation(preserveRoots = []) {
        if (operation.state !== "prepared") {
          throw new Error(`Cannot begin an external mutation in ${operation.state}.`);
        }
        for (const other of operations) {
          if (
            other !== operation &&
            !new Set(["prepared", ...terminalStates]).has(other.state) &&
            overlaps(boundary, other.boundary)
          ) {
            throw new Error("Overlapping external render boundaries are rejected.");
          }
        }
        try {
          operation.transaction = adapter.begin(boundary, { preserveRoots });
        } catch (error) {
          settle(operation, "failed", "failed-before-mutation");
          throw error;
        }
        operation.renderOperationId = operation.transaction.operationId;
        operation.state = "removing";
        publish(operation, "removing");
        return facade;
      },
      beforeRemove(removalBoundary) {
        if (operation.state !== "removing") {
          throw new Error(`Cannot release ownership in ${operation.state}.`);
        }
        assertElement(removalBoundary, "The removal boundary");
        if (
          removalBoundary.ownerDocument !== boundary.ownerDocument ||
          !boundary.contains(removalBoundary)
        ) {
          throw new Error("The removal boundary must be inside the active external boundary.");
        }
        if (!operation.removed.has(removalBoundary)) {
          operation.removed.add(removalBoundary);
          operation.removalCount += 1;
          operation.transaction.beforeRemove(removalBoundary);
          publish(operation, "removing");
        }
      },
      mutated(incomingRoots = []) {
        if (operation.state !== "removing") {
          throw new Error(`Cannot record an external mutation in ${operation.state}.`);
        }
        const roots = [...incomingRoots];
        for (const incomingRoot of roots) {
          assertElement(incomingRoot, "An incoming root");
          if (incomingRoot.ownerDocument !== boundary.ownerDocument || !incomingRoot.isConnected) {
            throw new Error("Incoming roots must be connected to the active host Document.");
          }
        }
        operation.incomingRoots = Object.freeze(roots);
        operation.state = "externally-mutated";
        publish(operation, "externally-mutated");
      },
      commit() {
        if (operation.state !== "externally-mutated") {
          throw new Error(`Cannot commit an external render in ${operation.state}.`);
        }
        operation.state = "enhancing";
        publish(operation, "enhancing");
        operation.terminalPromise = Promise.resolve()
          .then(() => operation.transaction.commit(operation.incomingRoots))
          .then(
            () => settle(operation, "committed", "completed"),
            (error) => {
              settle(operation, "failed", "failed-after-mutation");
              throw error;
            },
          );
        return operation.terminalPromise;
      },
      async fail(error) {
        if (terminalStates.has(operation.state)) return;
        if (!operation.transaction) {
          settle(operation, "failed", "failed-before-mutation");
          return;
        }
        const outcome =
          operation.state === "externally-mutated" || operation.state === "enhancing"
            ? "failed-after-mutation"
            : "failed-after-removal";
        try {
          await operation.transaction.fail(error);
        } catch {
          // The public render adapter rejects with the supplied host error after cleanup.
        } finally {
          settle(operation, "failed", outcome);
        }
      },
      snapshot() {
        return Object.freeze({
          bridgeOperationId: operation.bridgeOperationId,
          renderOperationId: operation.renderOperationId ?? null,
          flowId,
          state: operation.state,
          removalCount: operation.removalCount,
        });
      },
    };
    operations.add(operation);
    publish(operation, "prepared");
    facade = Object.freeze({
      cancel: operation.cancel,
      beginMutation: operation.beginMutation,
      beforeRemove: operation.beforeRemove,
      mutated: operation.mutated,
      commit: operation.commit,
      fail: operation.fail,
      snapshot: operation.snapshot,
    });
    return facade;
  }

  return Object.freeze({
    prepare,
    observations() {
      return Object.freeze(observations.map((entry) => entry));
    },
    dispose() {
      if (terminalDisposalPromise) return terminalDisposalPromise;
      disposed = true;
      const prepared = [...operations].filter(({ state }) => state === "prepared");
      const rendering = [...operations].filter(({ state }) => state !== "prepared");
      for (const operation of prepared) operation.cancel();
      terminalDisposalPromise = Promise.all(
        rendering.map((operation) =>
          operation.state === "enhancing"
            ? operation.terminalPromise.catch(() => undefined)
            : operation.fail(new Error("Bridge disposed.")),
        ),
      ).then(() =>
        Object.freeze({
          schema: "jqstar-external-render-disposal/1",
          attempted: prepared.length + rendering.length,
          remaining: operations.size,
        }),
      );
      return terminalDisposalPromise;
    },
  });
}
