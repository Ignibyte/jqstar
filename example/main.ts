import $ from "jquery";
import "../src/index";
import "../src/ui/theme.css";

interface DemoState extends Record<string, unknown> {
  componentComboboxError: string | null;
  componentComboboxLoading: boolean;
  componentQuery: string;
  componentResultCount: number;
  serverCount: number;
  serverError: string | null;
  serverLoading: boolean;
  serverMessage: string;
}

const componentSystems = [
  ["jquery-star", "jQuery Star"],
  ["datastar", "Datastar"],
  ["daisyui", "daisyUI"],
  ["radix", "Radix Primitives"],
  ["tailwind", "Tailwind CSS"],
  ["bootstrap", "Bootstrap"],
  ["shoelace", "Shoelace"],
] as const;

const wait = (duration: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, duration));

$.star.action<{ itemCount: number }>("removeItem", ({ $element, state }) => {
  const $item = $element!.closest("li");

  $item.fadeOut(180, function () {
    $(this).remove();
  });

  state.itemCount = Math.max(0, state.itemCount - 1);
});

$.star.action<DemoState>("searchComponents", async (context) => {
  if (!__JQS_STATIC_DEMO__) {
    return $.star.get<DemoState>("/api/demo/autocomplete", {
      pending: "componentComboboxLoading",
      error: "componentComboboxError",
      retry: "never",
      requestCancellation: "auto",
    })(context);
  }

  const { state } = context;
  state.componentComboboxLoading = true;
  state.componentComboboxError = null;
  await wait(120);
  const query = String(state.componentQuery).trim().toLocaleLowerCase();
  const matches = componentSystems.filter(([, label]) => label.toLocaleLowerCase().includes(query));
  const content = context.root.querySelector("#technology-combobox-content");
  if (content) {
    $(content).html(
      matches.length
        ? matches
            .map(([value, label]) => `<div data-part="option" data-value="${value}">${label}</div>`)
            .join("") +
            '<div data-part="loading" hidden>Searching…</div><div data-part="empty" hidden>No matching systems</div>'
        : '<div data-part="loading" hidden>Searching…</div><div data-part="empty">No matching systems</div>',
    );
    $.star.ui.enhance(content);
  }
  state.componentResultCount = matches.length;
  state.componentComboboxLoading = false;
});

$.star.action<DemoState>("serverIncrement", async (context) => {
  if (!__JQS_STATIC_DEMO__) {
    return $.star.post<DemoState>("/api/demo/increment", {
      pending: "serverLoading",
      error: "serverError",
    })(context);
  }

  context.state.serverLoading = true;
  context.state.serverError = null;
  await wait(160);
  context.state.serverCount += 10;
  context.state.serverMessage =
    "Static Pages preview simulated the JSON signal patch. The same action uses the backend locally.";
  context.state.serverLoading = false;
});

$.star.action<DemoState>("serverStream", async (context) => {
  if (!__JQS_STATIC_DEMO__) {
    return $.star.get<DemoState>("/api/demo/stream", {
      pending: "serverLoading",
      error: "serverError",
    })(context);
  }

  context.state.serverLoading = true;
  context.state.serverError = null;
  await wait(160);
  context.state.serverCount += 1;
  context.state.serverMessage =
    "Static Pages preview simulated the SDK signal event; our future backend can emit it unchanged.";
  await wait(180);
  $("#server-feed").append(
    "<li>Static SDK event preview <button data-on:click=\"$(el).closest('li').fadeOut()\">Fade it out</button></li>",
  );
  context.instance.refresh();
  context.state.serverLoading = false;
});

$("#app").star();

if (__JQS_STATIC_DEMO__) {
  const state = $("#app").star<DemoState>("state");
  if (state) {
    state.serverMessage =
      "Static GitHub Pages preview. Connect our backend later without changing component markup.";
  }
  document.documentElement.dataset.deployment = "static";
}
