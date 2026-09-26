import type { ActionRegistrar } from "../registry";
import type { StarClipboardStatic } from "../types";
import { createCopies } from "./copy";

interface ClipboardCollection {
  api: StarClipboardStatic;
  enhance(root: ParentNode): void;
}

export function createClipboards(registerAction: ActionRegistrar): ClipboardCollection {
  const copies = createCopies("clipboard");
  const api: StarClipboardStatic = { copy: copies.copy, text: copies.text, state: copies.state };
  registerAction("ui.clipboard.copy", (context) => {
    const target = copies.controlled(context, context.args?.[0]);
    const text = context.args?.[1];
    return api.copy(target, typeof text === "string" ? text : undefined);
  });
  return { api, enhance: copies.enhance };
}
