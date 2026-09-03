(() => {
  const { WebAssembly, window } = globalThis;
  const proof = {
    canary: { blocked: false, errorName: "none" },
    events: [],
    instrumentation: true,
    runtimeCalls: { eval: 0, function: 0, stringTimer: 0, wasm: 0 },
  };
  window.__jqstarCSP = proof;
  window.addEventListener("securitypolicyviolation", (event) => {
    proof.events.push({
      blockedURI: event.blockedURI === "eval" ? "eval" : "redacted",
      disposition: event.disposition,
      effectiveDirective: event.effectiveDirective,
    });
  });

  const NativeFunction = window.Function;
  try {
    new NativeFunction("return 1");
  } catch (error) {
    proof.canary.blocked = true;
    proof.canary.errorName = error instanceof Error ? error.name : "Error";
  }

  const nativeEval = window.eval;
  const nativeSetTimeout = window.setTimeout.bind(window);
  const nativeSetInterval = window.setInterval.bind(window);
  const wasmMethods = ["compile", "compileStreaming", "instantiate", "instantiateStreaming"];
  const nativeWasm = new Map(
    wasmMethods
      .filter((name) => typeof window.WebAssembly?.[name] === "function")
      .map((name) => [name, window.WebAssembly[name]]),
  );
  let armed = false;
  proof.arm = () => {
    if (armed) return;
    armed = true;
    window.Function = new Proxy(NativeFunction, {
      apply() {
        proof.runtimeCalls.function += 1;
        throw new EvalError("Dynamic Function use reached the CSP proof.");
      },
      construct() {
        proof.runtimeCalls.function += 1;
        throw new EvalError("Dynamic Function use reached the CSP proof.");
      },
    });
    window.eval = () => {
      proof.runtimeCalls.eval += 1;
      throw new EvalError("eval use reached the CSP proof.");
    };
    for (const name of ["setTimeout", "setInterval"]) {
      const nativeTimer = name === "setTimeout" ? nativeSetTimeout : nativeSetInterval;
      window[name] = (callback, timeout, ...arguments_) => {
        if (typeof callback === "string") {
          proof.runtimeCalls.stringTimer += 1;
          throw new EvalError("A string timer reached the CSP proof.");
        }
        return nativeTimer(callback, timeout, ...arguments_);
      };
    }
    for (const name of nativeWasm.keys()) {
      window.WebAssembly[name] = () => {
        proof.runtimeCalls.wasm += 1;
        return Promise.reject(new WebAssembly.CompileError("WebAssembly compilation reached CSP."));
      };
    }
  };
  proof.restore = () => {
    if (!armed) return;
    armed = false;
    window.Function = NativeFunction;
    window.eval = nativeEval;
    window.setTimeout = nativeSetTimeout;
    window.setInterval = nativeSetInterval;
    for (const [name, method] of nativeWasm) window.WebAssembly[name] = method;
  };
  proof.arm();
})();
