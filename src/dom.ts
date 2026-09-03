export function isElementNode(node: Node): node is Element {
  return node.nodeType === 1;
}

export function isInputElement(element: Element): element is HTMLInputElement {
  const Input = element.ownerDocument.defaultView?.HTMLInputElement;
  return Input ? element instanceof Input : element.localName === "input";
}

export function isSelectElement(element: Element): element is HTMLSelectElement {
  const Select = element.ownerDocument.defaultView?.HTMLSelectElement;
  return Select ? element instanceof Select : element.localName === "select";
}
