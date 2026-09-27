import type { ActionRegistrar } from "../registry";
import type { StarCodeBlockStatic } from "../types";
import { createCopies } from "./copy";

interface CodeBlockCollection {
  api: StarCodeBlockStatic;
  enhance(root: ParentNode): void;
}

export function createCodeBlocks(registerAction: ActionRegistrar): CodeBlockCollection {
  const copies = createCopies("code-block");
  const api: StarCodeBlockStatic = { copy: (target) => copies.copy(target), text: copies.text };
  registerAction("ui.code-block.copy", (context) =>
    api.copy(copies.controlled(context, context.args?.[0])),
  );
  return { api, enhance: copies.enhance };
}
