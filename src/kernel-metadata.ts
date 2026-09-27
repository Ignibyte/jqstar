import type { StarDisposalReport, StarDisposalCategory } from "./disposal";
import type {
  StarKernelMetadata,
  StarKernelMetadataAccess,
  StarKernelAttachment,
  StarKernelMetadataAdapter,
  StarMetadataDisposalCounts,
  StarMetadataTerminal,
} from "./metadata-types";

interface Slot {
  readonly version: string;
  value: unknown;
  readonly leases: Set<LeaseRecord>;
  release: (() => void) | undefined;
}

interface LeaseRecord {
  value: unknown;
  release: (() => void) | undefined;
}

function lease<Value>(record: LeaseRecord): StarKernelAttachment<Value> {
  return Object.freeze({
    get value(): Value {
      if (!record.release) throw new Error("The kernel attachment was released.");
      return record.value as Value;
    },
    release() {
      const release = record.release;
      record.release = undefined;
      record.value = undefined;
      release?.();
    },
  });
}

function terminalCell(): {
  readonly terminal: StarMetadataTerminal;
  readonly sequence: { next(): number };
  set(report: StarDisposalReport): void;
} {
  let counts: StarMetadataDisposalCounts | null = null;
  let sequence = 0;
  const count = (records: readonly { category: StarDisposalCategory }[]) => {
    const result = {
      application: 0,
      effect: 0,
      hook: 0,
      listener: 0,
      observer: 0,
      plugin: 0,
      request: 0,
      service: 0,
      subscription: 0,
      task: 0,
    };
    for (const { category } of records) result[category]++;
    return Object.freeze(result);
  };
  return {
    terminal: Object.freeze({ read: () => counts }),
    sequence: Object.freeze({
      next: () => {
        if (sequence === Number.MAX_SAFE_INTEGER) throw new Error("Metadata sequence exhausted.");
        return ++sequence;
      },
    }),
    set(report) {
      counts = Object.freeze({
        attempted: count(report.attempted),
        released: count(report.released),
        failed: count(report.failed),
        remaining: count(report.remaining),
      });
    },
  };
}

export function createKernelMetadata(
  access: StarKernelMetadataAccess | undefined,
  version: string,
): StarKernelMetadataAdapter {
  if (!access) throw new Error("Kernel metadata needs an access capability.");
  const cell = terminalCell();
  const random = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const id = `kernel-${Array.from(random, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  const slots = new Map<string, Slot>();
  const creating = new Set<string>();
  access.onDisposed((report) => {
    access = undefined;
    cell.set(report);
    slots.clear();
    creating.clear();
  });
  const active = (): StarKernelMetadataAccess => {
    if (!access) throw new Error("Kernel metadata is closed.");
    return access;
  };
  const read = (): StarKernelMetadata => {
    const source = active();
    const applications: Array<StarKernelMetadata["applications"][number]> = [];
    const ownership = { effect: 0, listener: 0, observer: 0, service: 0, subscription: 0, task: 0 };
    const [
      applicationCount,
      pendingEnhancements,
      pendingTasks,
      protocolProfiles,
      protocolBodies,
      middleware,
    ] = source.inventory(
      (owner) => {
        if (applications.length < 256) applications.push(Object.freeze({ ...owner }));
      },
      (kind) => {
        ownership[kind]++;
      },
    );
    const plugins: Array<StarKernelMetadata["plugins"][number]> = [];
    let pluginCount = 0;
    let serviceCount = 0;
    source.plugins((name, version, service) => {
      pluginCount++;
      if (service) serviceCount++;
      if (plugins.length < 256 && name.length <= 96 && version.length <= 32) {
        plugins.push(Object.freeze({ name, version }));
      }
    });
    return Object.freeze({
      applications: Object.freeze(applications),
      applicationCount,
      plugins: Object.freeze(plugins),
      pluginCount,
      serviceCount,
      ownership: Object.freeze(ownership),
      pendingEnhancements,
      pendingTasks,
      protocolProfiles,
      protocolBodies,
      middleware,
      expression: "installed",
    });
  };
  const adapter = Object.freeze<StarKernelMetadataAdapter>({
    version,
    id,
    terminal: cell.terminal,
    sequence: cell.sequence,
    read,
    services(visit) {
      let count = 0;
      active().plugins((name, _version, service) => {
        if (service && name.length <= 96 && count++ < 32) visit(service);
      });
    },
    observe: (observer) => active().observe(observer),
    own: (kind, cleanup) => active().own(kind, cleanup),
    acquire<Value>(name: string, version: string, create: () => { value: Value; dispose(): void }) {
      const owner = active();
      if (!/^[a-z][a-z0-9.-]{0,95}$/.test(name) || !/^[1-9][0-9]{0,5}$/.test(version)) {
        throw new Error("Kernel attachment identity is invalid.");
      }
      if (creating.has(name)) throw new Error("Kernel attachment creation is reentrant.");
      let slot = slots.get(name);
      if (slot && slot.version !== version) throw new Error("Kernel attachment version conflicts.");
      if (!slot) {
        creating.add(name);
        try {
          const resource = create();
          if (!resource || typeof resource.dispose !== "function") {
            throw new Error("Kernel attachment needs a cleanup capability.");
          }
          const prepared: Slot = {
            version,
            value: resource.value,
            leases: new Set(),
            release: undefined,
          };
          try {
            prepared.release = owner.own("service", () => {
              slots.delete(name);
              for (const record of prepared.leases) {
                record.value = undefined;
                record.release = undefined;
              }
              prepared.leases.clear();
              prepared.value = undefined;
              prepared.release = undefined;
              resource.dispose();
            });
          } catch (error) {
            resource.dispose();
            throw error;
          }
          slots.set(name, prepared);
          slot = prepared;
        } finally {
          creating.delete(name);
        }
      }
      const acquired = slot;
      const record: LeaseRecord = {
        value: acquired.value,
        release: () => {
          acquired.leases.delete(record);
          if (!acquired.leases.size) acquired.release?.();
        },
      };
      acquired.leases.add(record);
      return lease<Value>(record);
    },
  });
  return adapter;
}
