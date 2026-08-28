import $ from "jquery";
import "../src/index";
import "../src/ui/theme.css";

interface DemoState extends Record<string, unknown> {
  componentBackendError: string | null;
  componentBackendMessage: string;
  componentBackendSaving: boolean;
  componentComboboxError: string | null;
  componentComboboxLoading: boolean;
  componentQuery: string;
  componentResultCount: number;
  projectMessage: string;
  projectSaving: boolean;
  preferencesMessage: string;
  preferencesSaving: boolean;
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

$.star.action<DemoState>("submitComponentAccount", async (context) => {
  const form = context.element?.closest("form");
  if (!(form instanceof HTMLFormElement)) throw new Error("Account action needs its form.");
  $.star.ui.form.clearErrors(form);
  context.state.componentBackendSaving = true;
  context.state.componentBackendError = null;

  try {
    let status = 200;
    let result: { errors?: Record<string, string | string[]>; message?: string };
    if (__JQS_STATIC_DEMO__) {
      await wait(180);
      const email = String(new FormData(form).get("email") ?? "");
      status = email.toLocaleLowerCase() === "taken@example.com" ? 422 : 200;
      result =
        status === 422
          ? {
              errors: {
                _form: "The server rejected one field. Your file selection was left intact.",
                email: "That account already exists. Try another email.",
              },
            }
          : { message: "Static preview accepted the same multipart request contract." };
    } else {
      const response = await fetch("/api/demo/account", {
        method: "POST",
        body: new FormData(form),
        headers: { "Datastar-Request": "true" },
      });
      status = response.status;
      result = (await response.json()) as typeof result;
    }

    if (status === 422 && result.errors) {
      $.star.ui.form.setErrors(form, result.errors);
      context.state.componentBackendMessage =
        "The 422 response became native browser validity. Edit the email to clear it.";
      return;
    }
    if (status >= 400) throw new Error(result.message ?? `Request failed with ${status}.`);
    context.state.componentBackendMessage = result.message ?? "Account saved.";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.state.componentBackendError = message;
    context.state.componentBackendMessage = message;
  } finally {
    context.state.componentBackendSaving = false;
  }
});

$.star.action<DemoState>("submitProject", async (context) => {
  const form = context.element?.closest("form");
  if (!(form instanceof HTMLFormElement)) throw new Error("Project action needs its form.");
  if (!$.star.ui.form.validate(form)) return;
  const body = new FormData(form);
  context.state.projectSaving = true;

  try {
    if (__JQS_STATIC_DEMO__) {
      await wait(180);
      const files = body.getAll("assets").filter((value) => value instanceof File && value.name);
      const priorities = body.getAll("priority");
      context.state.projectMessage = `Static preview received ${files.length} file${files.length === 1 ? "" : "s"} and ${priorities.length} ordered priorities through FormData.`;
      return;
    }
    const response = await fetch("/api/demo/project", {
      method: "POST",
      body,
      headers: { "Datastar-Request": "true" },
    });
    const result = (await response.json()) as { message?: string };
    if (!response.ok) throw new Error(result.message ?? `Request failed with ${response.status}.`);
    context.state.projectMessage = result.message ?? "Project received.";
  } catch (error) {
    context.state.projectMessage = error instanceof Error ? error.message : String(error);
  } finally {
    context.state.projectSaving = false;
  }
});

$.star.action<DemoState>("submitPreferences", async (context) => {
  const form = context.element?.closest("form");
  if (!(form instanceof HTMLFormElement)) throw new Error("Preferences action needs its form.");
  if (!$.star.ui.form.validate(form)) return;
  const body = new FormData(form);
  context.state.preferencesSaving = true;

  try {
    if (__JQS_STATIC_DEMO__) {
      await wait(160);
      const teams = body.getAll("teams").length;
      context.state.preferencesMessage = `Static preview received ${teams} teams, ${String(body.get("review_time"))}, and ${String(body.get("accent"))} from native controls.`;
      return;
    }
    const response = await fetch("/api/demo/preferences", {
      method: "POST",
      body,
      headers: { "Datastar-Request": "true" },
    });
    const result = (await response.json()) as { message?: string };
    if (!response.ok) throw new Error(result.message ?? `Request failed with ${response.status}.`);
    context.state.preferencesMessage = result.message ?? "Preferences received.";
  } catch (error) {
    context.state.preferencesMessage = error instanceof Error ? error.message : String(error);
  } finally {
    context.state.preferencesSaving = false;
  }
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
