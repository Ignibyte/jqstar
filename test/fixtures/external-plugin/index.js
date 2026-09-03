import { STAR_PLUGIN_API_VERSION } from "jquery-star/core";

export function createExternalPlugin(ledger = []) {
  return Object.freeze({
    name: "acme.external",
    version: "1.0.0",
    apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
    install(registrar) {
      ledger.push("install");
      registrar.action("acme.external.mark", ({ state }) => {
        state.externalMarked = true;
        ledger.push("action");
      });
      registrar.directive({
        id: "acme.external.label",
        match: { name: "data-acme.external:label" },
        mount(context) {
          context.$element.text(String(context.helpers.acme.external.label));
          ledger.push("directive");
          return () => ledger.push("directive-cleanup");
        },
      });
      registrar.helper("acme.external.label", "external-ready");
      registrar.observeOperations((observation) => {
        ledger.push(`observation:${observation.kind}:${observation.phase}`);
      });
      registrar.requestMiddleware({
        id: "record",
        async handle(_descriptor, next) {
          ledger.push("middleware:before");
          const outcome = await next();
          ledger.push(`middleware:${outcome.phase}`);
          return outcome;
        },
      });
      registrar.application((application) => {
        ledger.push(`application:${application.mode}`);
        return () => ledger.push(`application-cleanup:${application.mode}`);
      });
      registrar.cleanup(() => ledger.push("plugin-cleanup"));
      return Object.freeze({
        label: "external-ready",
        ledger,
      });
    },
  });
}

export function createFailingExternalPlugin(ledger = []) {
  return Object.freeze({
    name: "acme.external-failure",
    version: "1.0.0",
    apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
    install(registrar) {
      registrar.cleanup(() => ledger.push("failed-install-cleanup"));
      throw new Error("external fixture install failed");
    },
  });
}

export function createCleanupFailingExternalPlugin(ledger = []) {
  return Object.freeze({
    name: "acme.external-cleanup-failure",
    version: "1.0.0",
    apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
    install(registrar) {
      registrar.cleanup(() => ledger.push("cleanup-after-failure"));
      registrar.cleanup(() => {
        ledger.push("cleanup-failure");
        throw new Error("external fixture cleanup failed");
      });
      return Object.freeze({ ledger });
    },
  });
}
