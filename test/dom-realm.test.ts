import { afterEach, describe, expect, it } from "vitest";
import { isElementNode, isInputElement, isSelectElement } from "../src/dom";

afterEach(() => document.body.replaceChildren());

function realm(): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  if (!frame.contentWindow) throw new Error("Missing fixture window");
  return frame.contentWindow;
}

describe.each(["local", "foreign", "adopted"] as const)("%s DOM identity", (kind) => {
  function element(tag: string, namespace = "http://www.w3.org/1999/xhtml") {
    const owner = kind === "local" ? document : realm().document;
    const result = owner.createElementNS(namespace, tag);
    return kind === "adopted" ? document.adoptNode(result) : result;
  }
  it("recognizes an input", () => expect(isInputElement(element("input"))).toBe(true));
  it("recognizes a select", () => expect(isSelectElement(element("select"))).toBe(true));
  it("rejects other HTML tags", () => {
    expect(isInputElement(element("button"))).toBe(false);
    expect(isSelectElement(element("textarea"))).toBe(false);
  });
  it("rejects matching names in another namespace", () => {
    expect(isInputElement(element("input", "http://www.w3.org/2000/svg"))).toBe(false);
    expect(isSelectElement(element("select", "http://www.w3.org/2000/svg"))).toBe(false);
  });
  it("distinguishes an element from other native nodes", () => {
    expect(isElementNode(element("section"))).toBe(true);
    expect(isElementNode(document.createTextNode("x"))).toBe(false);
    expect(isElementNode(document.createDocumentFragment())).toBe(false);
  });
});

it("rejects plain objects that imitate DOM node fields", () => {
  const fake = {
    nodeType: 1,
    namespaceURI: "http://www.w3.org/1999/xhtml",
    localName: "input",
    ownerDocument: document,
  } as unknown as Element;
  expect(isElementNode(fake)).toBe(false);
  expect(isInputElement(fake)).toBe(false);
});
