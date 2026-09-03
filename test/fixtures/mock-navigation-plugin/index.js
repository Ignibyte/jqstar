import { createRenderAdapter, STAR_PLUGIN_API_VERSION } from "jquery-star/core";

function incomingFragment(root, html, preserved) {
  if (typeof html !== "string") throw new TypeError("Mock navigation HTML must be a string.");
  const template = root.ownerDocument.createElement("template");
  template.innerHTML = html;
  for (const current of preserved) {
    if (!current.id) continue;
    const replacement = [...template.content.querySelectorAll("[data-jqs-preserve]")].find(
      (candidate) => candidate.id === current.id,
    );
    replacement?.replaceWith(current);
  }
  return template.content;
}

export function createMockNavigationPlugin($, ledger = []) {
  return Object.freeze({
    name: "acme.mock-navigation",
    version: "1.0.0",
    apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
    install(registrar) {
      const render = createRenderAdapter($);
      registrar.observeOperations((observation) => {
        if (observation.kind === "action" && observation.label === "acme.mock-navigation.visit") {
          ledger.push(
            Object.freeze({
              id: observation.id,
              phase: observation.phase,
            }),
          );
        }
      });
      registrar.action("acme.mock-navigation.visit", async ({ args }) => {
        const [root, html] = args ?? [];
        if (!(root instanceof registrar.documentHost.window.Element)) {
          throw new TypeError("Mock navigation needs a render root from the installed realm.");
        }
        const transaction = render.begin(root);
        try {
          const preserved = [
            ...(root.matches("[data-jqs-preserve]") ? [root] : []),
            ...root.querySelectorAll("[data-jqs-preserve]"),
          ];
          const fragment = incomingFragment(root, html, preserved);
          for (const child of [...root.children]) transaction.beforeRemove(child);
          root.replaceChildren(fragment);
        } catch (error) {
          return transaction.fail(error);
        }
        const incoming = [
          ...(root.matches("[data-jqs]") ? [root] : []),
          ...root.querySelectorAll("[data-jqs]"),
        ];
        await transaction.commit(incoming);
      });
      return Object.freeze({
        ledger,
        visit(application, root, html) {
          return application.run("acme.mock-navigation.visit", { args: [root, html] });
        },
      });
    },
  });
}
