let nodeTypeDescriptor: PropertyDescriptor | undefined;

function nodeType(value: unknown): unknown {
  try {
    nodeTypeDescriptor ??= Object.getOwnPropertyDescriptor(Node.prototype, "nodeType");
    return nodeTypeDescriptor?.get?.call(value);
  } catch {
    return undefined;
  }
}

export function isNode(value: unknown): value is Node {
  return typeof nodeType(value) === "number";
}

export function isElementNode(value: unknown): value is Element {
  return nodeType(value) === 1;
}

export function isHTMLElement(value: unknown): value is HTMLElement {
  return isElementNode(value) && value.namespaceURI === "http://www.w3.org/1999/xhtml";
}

export function isHTMLTag<Tag extends keyof HTMLElementTagNameMap>(
  value: unknown,
  tag: Tag,
): value is HTMLElementTagNameMap[Tag] {
  return isHTMLElement(value) && value.localName === tag;
}

export function isInputElement(element: Element): element is HTMLInputElement {
  return isHTMLTag(element, "input");
}

export function isSelectElement(element: Element): element is HTMLSelectElement {
  return isHTMLTag(element, "select");
}
