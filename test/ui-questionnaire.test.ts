import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#build-brief")!;
}

function form(): HTMLFormElement {
  return document.querySelector<HTMLFormElement>("#brief-form")!;
}

function item(value: string): HTMLFieldSetElement {
  return root().querySelector<HTMLFieldSetElement>(`[data-part="item"][data-value="${value}"]`)!;
}

function control(name: string, value: string): HTMLInputElement {
  return root().querySelector<HTMLInputElement>(`input[name="${name}"][value="${value}"]`)!;
}

describe("jQuery Star Questionnaire", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <form id="brief-form">
          <section id="build-brief" data-jqs="questionnaire" data-value="direction">
            <p data-part="progress-label"></p>
            <progress data-part="progress"></progress>

            <fieldset data-part="item" data-value="direction" data-name="direction" data-required>
              <legend>What should we build?</legend>
              <p data-part="description">Choose a direction or write one.</p>
              <label data-part="choice" data-shortcut="1">
                <input data-part="control" type="radio" name="direction" value="component"> Component
              </label>
              <label data-part="choice" data-shortcut="2">
                <input data-part="control" type="radio" name="direction" value="workflow"> Workflow
              </label>
              <label>Another direction <input data-part="freeform"></label>
              <p data-part="error" role="alert"></p>
            </fieldset>

            <fieldset data-part="item" data-value="constraints" data-name="constraints"
              data-multiple data-required data-min="1" data-max="2" data-skippable>
              <legend>Which constraints matter?</legend>
              <p data-part="description">Choose up to two.</p>
              <label data-part="choice" data-shortcut="1">
                <input data-part="control" type="checkbox" name="constraints" value="accessible"> Accessible
              </label>
              <label data-part="choice" data-shortcut="2">
                <input data-part="control" type="checkbox" name="constraints" value="server"> Server-ready
              </label>
              <label data-part="choice" data-shortcut="3">
                <input data-part="control" type="checkbox" name="constraints" value="portable"> Portable
              </label>
              <p data-part="error" role="alert"></p>
            </fieldset>

            <fieldset data-part="item" data-value="delivery" data-name="delivery" data-required>
              <legend>How should it ship?</legend>
              <label data-part="choice">
                <input data-part="control" type="radio" name="delivery" value="source"> Source files
              </label>
              <label data-part="choice">
                <input data-part="control" type="radio" name="delivery" value="package"> Package
              </label>
              <p data-part="error" role="alert"></p>
            </fieldset>

            <nav data-part="actions">
              <button data-part="previous">Previous</button>
              <button data-part="skip">Skip</button>
              <button data-part="next">Next</button>
              <button data-part="reset">Reset</button>
              <button data-part="submit">Submit</button>
            </nav>
            <p data-part="status"></p>
          </section>
        </form>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("uses native fieldsets, legends, controls, and progress", () => {
    expect(item("direction").hidden).toBe(false);
    expect(item("constraints").hidden).toBe(true);
    expect(item("direction").querySelector("legend")?.textContent).toContain("What should");
    expect(item("direction").getAttribute("aria-describedby")).toContain("description");
    expect(root().querySelector<HTMLProgressElement>('[data-part="progress"]')?.value).toBe(1);
    expect(root().querySelector('[data-part="progress-label"]')?.textContent).toBe(
      "Question 1 of 3",
    );
    expect(root().querySelector<HTMLButtonElement>('[data-part="previous"]')?.disabled).toBe(true);
    expect(root().querySelector<HTMLButtonElement>('[data-part="skip"]')?.hidden).toBe(true);
  });

  it("blocks forward navigation until the current required answer is valid", () => {
    const invalid = vi.fn();
    const applicationSubmit = vi.fn();
    root().addEventListener("jquery-star:questionnaire:invalid", invalid);
    $.star.ui.questionnaire.next(root());
    expect($.star.ui.questionnaire.value(root())).toBe("direction");
    expect(item("direction").getAttribute("aria-invalid")).toBe("true");
    expect(item("direction").querySelector('[data-part="error"]')?.textContent).toBe(
      "Choose an answer to continue.",
    );
    expect(document.activeElement).toBe(control("direction", "component"));
    expect(invalid).toHaveBeenCalledOnce();

    form().addEventListener("submit", applicationSubmit);
    $.star.ui.questionnaire.submit(root());
    expect(applicationSubmit).not.toHaveBeenCalled();
  });

  it("handles shortcuts once and allows a freeform alternative", () => {
    const change = vi.fn();
    root().addEventListener("jquery-star:questionnaire:answer-change", change);
    root().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "2" }));
    expect(control("direction", "workflow").checked).toBe(true);
    expect(change).toHaveBeenCalledOnce();

    const freeform = item("direction").querySelector<HTMLInputElement>('[data-part="freeform"]')!;
    freeform.value = "Documentation";
    freeform.dispatchEvent(new Event("input", { bubbles: true }));
    expect(control("direction", "workflow").checked).toBe(false);
    expect(new FormData(form()).get("direction")).toBe("Documentation");
    expect(change).toHaveBeenCalledTimes(2);
  });

  it("writes API answers through native events and preserves FormData", () => {
    const nativeInput = vi.fn();
    const nativeChange = vi.fn();
    control("direction", "component").addEventListener("input", nativeInput);
    control("direction", "component").addEventListener("change", nativeChange);

    $.star.ui.questionnaire.answer(root(), "direction", "component");
    $.star.ui.questionnaire.answer(root(), "constraints", ["accessible", "server"]);
    $.star.ui.questionnaire.answer(root(), "delivery", "source");

    expect(nativeInput).toHaveBeenCalledOnce();
    expect(nativeChange).toHaveBeenCalledOnce();
    expect($.star.ui.questionnaire.answers(root())).toEqual({
      constraints: ["accessible", "server"],
      delivery: "source",
      direction: "component",
    });
    const data = new FormData(form());
    expect(data.get("direction")).toBe("component");
    expect(data.getAll("constraints")).toEqual(["accessible", "server"]);
    expect(data.get("delivery")).toBe("source");
  });

  it("serializes an explicit skip and advances to the next enabled item", () => {
    $.star.ui.questionnaire.answer(root(), "direction", "workflow");
    $.star.ui.questionnaire.next(root());
    expect(root().querySelector<HTMLButtonElement>('[data-part="skip"]')?.hidden).toBe(false);
    $.star.ui.questionnaire.skip(root());
    expect($.star.ui.questionnaire.value(root())).toBe("delivery");
    expect($.star.ui.questionnaire.answers(root()).constraints).toBe("__skipped");
    expect(new FormData(form()).get("constraints")).toBe("__skipped");
  });

  it("accepts server-patched steps and excludes conditionally disabled items", () => {
    const authoredDisabled = control("constraints", "portable");
    authoredDisabled.disabled = true;
    item("constraints").dataset.disabled = "true";
    $.star.ui.enhance(root());
    expect(root().querySelector('[data-part="progress-label"]')?.textContent).toBe(
      "Question 1 of 2",
    );
    expect(control("constraints", "accessible").disabled).toBe(true);

    item("constraints").dataset.disabled = "false";
    root().dataset.value = "constraints";
    $.star.ui.enhance(root());
    expect($.star.ui.questionnaire.value(root())).toBe("constraints");
    expect(control("constraints", "accessible").disabled).toBe(false);
    expect(authoredDisabled.disabled).toBe(true);
    expect(root().querySelector('[data-part="progress-label"]')?.textContent).toBe(
      "Question 2 of 3",
    );
  });

  it("removes an explicitly skipped conditional question from native submission", () => {
    $.star.ui.questionnaire.answer(root(), "direction", "workflow");
    $.star.ui.questionnaire.next(root());
    $.star.ui.questionnaire.skip(root());
    expect(new FormData(form()).get("constraints")).toBe("__skipped");

    item("constraints").dataset.disabled = "true";
    $.star.ui.enhance(root());
    expect(new FormData(form()).get("constraints")).toBeNull();
    expect($.star.ui.questionnaire.answers(root()).constraints).toBe("__skipped");
  });

  it("validates every enabled answer and emits a cancelable native submit", () => {
    const submit = vi.fn((event: Event) => event.preventDefault());
    const lifecycle = vi.fn();
    form().addEventListener("submit", submit);
    root().addEventListener("jquery-star:questionnaire:submit", lifecycle);
    $.star.ui.questionnaire.answer(root(), "direction", "component");
    $.star.ui.questionnaire.answer(root(), "constraints", "accessible");
    $.star.ui.questionnaire.answer(root(), "delivery", "package");
    $.star.ui.questionnaire.submit(root());
    expect(submit).toHaveBeenCalledOnce();
    expect(lifecycle).toHaveBeenCalledOnce();
    expect(root().dataset.state).toBe("submitted");

    const cancel = (event: Event): void => event.preventDefault();
    root().addEventListener("jquery-star:questionnaire:before-change", cancel);
    $.star.ui.questionnaire.go(root(), "constraints");
    expect($.star.ui.questionnaire.value(root())).toBe("direction");
  });
});
