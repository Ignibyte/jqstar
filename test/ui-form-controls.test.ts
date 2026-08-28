import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "../src/index";

describe("jQuery Star form component contracts", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form
        id="form-components"
        data-signals="{ email: 'start@example.com', notes: '', terms: false, notifications: true }"
      >
        <div data-jqs="field">
          <label data-part="label" for="email">Email</label>
          <input id="email" data-jqs="input" data-bind:email type="email">
        </div>
        <textarea data-jqs="textarea" data-bind:notes></textarea>
        <label data-jqs="checkbox">
          <input data-part="control" data-bind:terms type="checkbox">
          <span data-part="indicator"></span>
          <span data-part="label">Terms</span>
        </label>
        <label data-jqs="switch">
          <input data-part="control" data-bind:notifications type="checkbox" role="switch">
          <span data-part="track"><span data-part="thumb"></span></span>
          <span data-part="label">Notifications</span>
        </label>
        <output data-text="$email + ':' + $notes + ':' + $terms + ':' + $notifications"></output>
      </form>
    `;
    $("#form-components").star();
  });

  afterEach(() => {
    $("#form-components").star("destroy");
  });

  it("hydrates native controls from signals", () => {
    expect($("#email").val()).toBe("start@example.com");
    expect($("[data-jqs=textarea]").val()).toBe("");
    expect($("[data-jqs=checkbox] input").prop("checked")).toBe(false);
    expect($("[data-jqs=switch] input").prop("checked")).toBe(true);
  });

  it("writes input, textarea, checkbox, and switch changes back to signals", async () => {
    $("#email").val("proof@example.com").trigger("input");
    $("[data-jqs=textarea]").val("Verified").trigger("input");
    $("[data-jqs=checkbox] input").prop("checked", true).trigger("change");
    $("[data-jqs=switch] input").prop("checked", false).trigger("change");
    await $.star.nextUpdate();

    expect($("output").text()).toBe("proof@example.com:Verified:true:false");
  });
});
