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
  feedbackMessage: string;
  feedbackSaving: boolean;
  feedMessage: string;
  feedQuery: string;
  serverCount: number;
  serverError: string | null;
  serverLoading: boolean;
  serverMessage: string;
}

interface FeedResult {
  value: string;
  title: string;
  description: string;
  meta: string;
}

interface FeedResponse {
  cursor: string;
  done: boolean;
  items: FeedResult[];
  message: string;
  total: number;
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

const feedItems: FeedResult[] = [
  {
    value: "jquery-star",
    title: "jQuery Star",
    description: "Reactive HTML components with real jQuery expressions and native forms.",
    meta: "Runtime · Source owned",
  },
  {
    value: "datastar",
    title: "Datastar",
    description: "Server-driven signals and HTML patch events through the official SDK.",
    meta: "Server channel · SDK",
  },
  {
    value: "tailwind",
    title: "Tailwind CSS",
    description: "Build-time utility CSS used to author the compiled jQuery Star theme.",
    meta: "Styling · Build time",
  },
  {
    value: "daisyui",
    title: "daisyUI",
    description: "A Tailwind component plugin built around reusable class combinations.",
    meta: "Styling · Plugin",
  },
  {
    value: "radix",
    title: "Radix Primitives",
    description: "Unstyled React primitives focused on interaction and accessibility behavior.",
    meta: "React · Primitives",
  },
  {
    value: "shadcn",
    title: "shadcn/ui",
    description: "A source-owned component distribution model that inspired this registry.",
    meta: "Source registry · React",
  },
  {
    value: "bootstrap",
    title: "Bootstrap",
    description: "A broad CSS and JavaScript component framework with established conventions.",
    meta: "Framework · CSS and JS",
  },
  {
    value: "shoelace",
    title: "Shoelace",
    description: "Framework-agnostic components distributed as standards-based custom elements.",
    meta: "Web components · Runtime",
  },
  {
    value: "alpine",
    title: "Alpine.js",
    description: "Attribute-driven client behavior for server-rendered HTML applications.",
    meta: "HTML-first · Runtime",
  },
  {
    value: "htmx",
    title: "htmx",
    description: "HTML attributes that extend links and forms with server-driven requests.",
    meta: "HTML-first · Server driven",
  },
  {
    value: "lit",
    title: "Lit",
    description: "A small library for creating standards-based web components.",
    meta: "Web components · Authoring",
  },
  {
    value: "native-html",
    title: "Native HTML",
    description: "Platform controls, forms, dialogs, popovers, and semantic document structure.",
    meta: "Platform · No dependency",
  },
];

const wait = (duration: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, duration));

function feedPage(query: string, requestedCursor: string): FeedResponse {
  const normalized = query.trim().toLocaleLowerCase();
  const value = Number(requestedCursor);
  const cursor = Number.isInteger(value) && value >= 0 ? value : 0;
  const matches = feedItems.filter((item) =>
    `${item.title} ${item.description} ${item.meta}`.toLocaleLowerCase().includes(normalized),
  );
  const items = matches.slice(cursor, cursor + 3);
  const nextCursor = cursor + items.length;
  return {
    cursor: String(nextCursor),
    done: nextCursor >= matches.length,
    items,
    message: `${nextCursor} of ${matches.length} matching results loaded.`,
    total: matches.length,
  };
}

function appendFeedItems(items: FeedResult[]): void {
  const $content = $("#component-results-feed > [data-part='content']");
  for (const item of items) {
    const initials = item.title
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toLocaleUpperCase();
    const $item = $("<article>", {
      "data-jqs": "item",
      "data-part": "item",
      "data-value": item.value,
    });
    const $media = $("<div>", { "aria-hidden": "true", "data-part": "media" }).text(initials);
    const $copy = $("<div>", { "data-part": "content" }).append(
      $("<h3>", { "data-part": "title" }).text(item.title),
      $("<p>", { "data-part": "description" }).text(item.description),
      $("<span>", { "data-part": "meta" }).text(item.meta),
    );
    const $actions = $("<div>", { "data-part": "actions" }).append(
      $("<button>", {
        "data-jqs": "button",
        "data-size": "sm",
        "data-variant": "outline",
        type: "button",
      }).text("Inspect"),
    );
    $item.append($media, $copy, $actions);
    $content.append($item);
  }
}

$.star.action<DemoState>("loadMoreResults", async (context) => {
  const feed = document.querySelector<HTMLElement>("#component-results-feed")!;
  const cursor = $.star.ui.feed.state(feed).cursor ?? "0";
  const query = String(context.state.feedQuery ?? "");
  try {
    let result: FeedResponse;
    if (__JQS_STATIC_DEMO__) {
      await wait(140);
      result = feedPage(query, cursor);
    } else {
      const params = new URLSearchParams({ cursor, query });
      const response = await fetch(`/api/demo/feed?${params}`);
      result = (await response.json()) as FeedResponse;
      if (!response.ok) throw new Error(`Request failed with ${response.status}.`);
    }
    feed.dataset.total = String(result.total);
    appendFeedItems(result.items);
    $.star.ui.feed.complete(feed, {
      added: result.items.length,
      cursor: result.cursor,
      done: result.done,
    });
    context.state.feedMessage = result.message;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    $.star.ui.feed.fail(feed, message);
    context.state.feedMessage = message;
  }
});

$.star.action<DemoState>("searchResultFeed", () => {
  const feed = document.querySelector<HTMLElement>("#component-results-feed")!;
  $(feed).children('[data-part="content"]').empty();
  feed.removeAttribute("data-total");
  $.star.ui.feed.reset(feed, { cursor: "0", message: "Searching the catalog…" });
  $.star.ui.feed.load(feed);
});

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

function appendFeedbackMessage(body: FormData): void {
  const reply = String(body.get("reply") ?? "").trim();
  const rating = String(body.get("rating") ?? "");
  const $message = $("<article>", {
    "aria-label": "Message from You",
    "data-jqs": "message",
    "data-side": "sent",
  });
  const $header = $("<header>", { "data-part": "header" }).append(
    $("<strong>", { "data-part": "author" }).text("You"),
    $("<time>", { datetime: new Date().toISOString() }).text("Now"),
  );
  const $content = $("<div>", { "data-part": "content" }).append($("<p>").text(reply));
  const $footer = $("<footer>", { "data-part": "footer" }).text(
    `${rating} star${rating === "1" ? "" : "s"} · Delivered`,
  );
  $message.append($header, $content, $footer);
  $("#support-thread > [data-part='viewport'] > [data-part='content']").append($message);
}

$.star.action<DemoState>("submitFeedback", async (context) => {
  const form = context.element?.closest("form");
  if (!(form instanceof HTMLFormElement)) throw new Error("Feedback action needs its form.");
  if (!$.star.ui.form.validate(form)) return;
  const body = new FormData(form);
  context.state.feedbackSaving = true;

  try {
    if (__JQS_STATIC_DEMO__) {
      await wait(160);
      context.state.feedbackMessage = `Static preview received rating ${String(body.get("rating"))} and a ${String(body.get("reply")).length} character reply.`;
    } else {
      const response = await fetch("/api/demo/feedback", {
        method: "POST",
        body,
        headers: { "Datastar-Request": "true" },
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok)
        throw new Error(result.message ?? `Request failed with ${response.status}.`);
      context.state.feedbackMessage = result.message ?? "Feedback received.";
    }
    appendFeedbackMessage(body);
  } catch (error) {
    context.state.feedbackMessage = error instanceof Error ? error.message : String(error);
  } finally {
    context.state.feedbackSaving = false;
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
