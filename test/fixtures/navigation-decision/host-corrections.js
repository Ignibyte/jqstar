const { document, window } = globalThis;

export function installNavigationHostCorrections(documentHost, host, showRecovery, handledError) {
  const knownErrors = new WeakSet();
  const configure = (root) => {
    if (host === "turbo") {
      for (const link of root.querySelectorAll('a[href^="#"], a[href="/navigation/no-content"]'))
        link.setAttribute("data-turbo", "false");
    }
    if (host === "htmx") root.setAttribute("hx-indicator", "body");
  };
  configure(document.body);
  if (host === "turbo") {
    documentHost.listen(document, "turbo:before-render", (event) =>
      configure(event.detail.newBody),
    );
    documentHost.listen(document, "turbo:before-prefetch", (event) => event.preventDefault());
    documentHost.listen(document, "turbo:fetch-request-error", (event) => {
      event.preventDefault();
      if (event.detail.error && typeof event.detail.error === "object")
        knownErrors.add(event.detail.error);
      showRecovery();
    });
    documentHost.listen(window, "unhandledrejection", (event) => {
      if (knownErrors.has(event.reason)) {
        event.preventDefault();
        handledError();
        showRecovery();
      }
    });
    documentHost.listen(document, "turbo:before-fetch-response", (event) => {
      const response = event.detail.fetchResponse;
      if (
        event.target.tagName === "FORM" &&
        event.target.method.toLowerCase() !== "get" &&
        response.statusCode === 200 &&
        !response.redirected
      ) {
        // Turbo requires a redirect for a successful write. An invalid response
        // must show recovery without dispatching the accepted write again.
        event.preventDefault();
        showRecovery();
      }
    });
    documentHost.listen(document, "turbo:submit-end", (event) => {
      if (event.detail.success !== true) showRecovery();
    });
    documentHost.listen(document, "turbo:frame-missing", (event) => {
      event.preventDefault();
      event.detail.visit(event.detail.response);
    });
  }
  if (host === "htmx") {
    documentHost.listen(document, "htmx:beforeSwap", (event) => {
      if (event.detail.target?.id !== "activity") return;
      const incoming = new window.DOMParser().parseFromString(
        event.detail.serverResponse,
        "text/html",
      );
      if (incoming.querySelector("#activity")) return;
      event.preventDefault();
      const url = new window.URL(event.detail.xhr.responseURL);
      if (url.origin === window.location.origin && event.detail.requestConfig?.verb === "get")
        window.location.assign(url.href);
      else showRecovery();
    });
  }
}
