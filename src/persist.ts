import { registerServiceMetadata } from "./service-metadata";
import {
  defineOfficialPlugin,
  STAR_PLUGIN_API_VERSION,
  type StarPlugin,
  type StarPluginRegistrar,
} from "./plugin";
import type { StarStoresFacade } from "./stores/types";
import { createCustomStorageAdapter, createMemoryStorageAdapter } from "./persist/adapters";
import { createAttachment } from "./persist/attachment";
import { fail, storageKey, StarPersistError } from "./persist/data";
import { normalize } from "./persist/envelope";
import type { StarPersistAttachment, StarPersistFacade, StarPersistOptions } from "./persist/types";

export {
  createCustomStorageAdapter,
  createLocalStorageAdapter,
  createMemoryStorageAdapter,
  createSessionStorageAdapter,
} from "./persist/adapters";
export { createFieldCodec } from "./persist/codec";
export { StarPersistError } from "./persist/data";
export type {
  StarPersistAdapter,
  StarPersistAdapterChange,
  StarPersistAttachment,
  StarPersistCodec,
  StarPersistData,
  StarPersistDisposalReport,
  StarPersistEnvelope,
  StarPersistErrorCode,
  StarPersistFacade,
  StarPersistField,
  StarPersistMigration,
  StarPersistOptions,
  StarPersistResult,
  StarPersistRevision,
  StarPersistStatus,
} from "./persist/types";

function install(registrar: StarPluginRegistrar): StarPersistFacade {
  const stores = registrar.dependency<StarStoresFacade>("core.stores");
  const owner = registrar.documentHost.window;
  const origin = Array.from(owner.crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  const memory = createMemoryStorageAdapter();
  const records = new Map<
    string,
    { name: string; options: object; attachment: StarPersistAttachment }
  >();
  const ownedAdapters = new WeakSet<object>();
  let active = true;
  let attaching = false;
  let sequence = 0;
  registerServiceMetadata(registrar, "core.persist", "attachments", () => {
    const counts = {
      installed: Number(active),
      attachments: records.size,
      pending: 0,
      disabled: 0,
      disposed: 0,
    };
    for (const { attachment } of records.values()) {
      const { outcome } = attachment.status();
      if (outcome === "pending" || outcome === "disabled" || outcome === "disposed")
        counts[outcome]++;
    }
    return counts;
  });
  registrar.cleanup(() => {
    active = false;
    const errors: StarPersistError[] = [];
    for (const { attachment } of [...records.values()].reverse()) {
      for (const code of attachment.dispose().errors) errors.push(new StarPersistError(code));
    }
    records.clear();
    memory.dispose();
    if (errors.length) throw new AggregateError(errors, "Persistence disposal failed.");
  });
  return Object.freeze({
    attach<Store extends object>(name: string, options: StarPersistOptions<Store>) {
      if (!active) fail("disposed");
      registrar.assertBeforeApplications();
      if (attaching || !options || !Object.isFrozen(options)) fail("contract");
      const normalized = normalize(options);
      const key = storageKey(options.namespace, name, options.key);
      const existing = records.get(key);
      if (existing) {
        if (existing.name === name && existing.options === options) return existing.attachment;
        fail("contract");
      }
      if ([...records.values()].some((record) => record.name === name)) fail("contract");
      const store = stores.get<Store>(name);
      if (!store) fail("contract");
      const source = options.adapter ?? memory;
      if (source.window && source.window !== owner) fail("contract");
      if (ownedAdapters.has(source)) fail("contract");
      const adapter = createCustomStorageAdapter(source);
      const owned = options.adapter !== undefined && options.ownAdapter === true;
      const prepared = createAttachment({
        id: `persist-${sequence + 1}`,
        name,
        key,
        origin,
        window: owner,
        stores,
        store,
        adapter,
        owned,
        options: normalized,
      });
      attaching = true;
      let release: (() => void) | undefined;
      try {
        release = registrar.documentHost.services!.own("service", `persist-${sequence + 1}`, () => {
          const report = prepared.attachment.dispose();
          if (!report.ok) throw new StarPersistError(report.errors[0]!);
        });
        prepared.start();
        sequence++;
        records.set(key, { name, options, attachment: prepared.attachment });
        if (owned) ownedAdapters.add(source);
        return prepared.attachment;
      } catch (error) {
        prepared.rollback();
        release?.();
        throw error;
      } finally {
        attaching = false;
      }
    },
    attachments() {
      if (!active) fail("disposed");
      return Object.freeze([...records.values()].map(({ attachment }) => attachment));
    },
  });
}

export const persistPlugin: Readonly<StarPlugin<StarPersistFacade>> = defineOfficialPlugin({
  apiVersion: STAR_PLUGIN_API_VERSION,
  name: "core.persist",
  version: "1.1.0",
  dependencies: Object.freeze({ "core.stores": "=1.1.0" }),
  install,
});
