declare module "idiomorph" {
  export interface IdiomorphCallbacks {
    beforeNodeAdded?(node: Node): boolean | void;
    afterNodeAdded?(node: Node): void;
    beforeNodeMorphed?(oldNode: Node, newNode: Node): boolean | void;
    afterNodeMorphed?(oldNode: Node, newNode: Node): void;
    beforeNodeRemoved?(node: Node): boolean | void;
    afterNodeRemoved?(node: Node): void;
    beforeAttributeUpdated?(
      attributeName: string,
      node: Element,
      mutationType: "update" | "remove",
    ): boolean | void;
  }

  export interface IdiomorphOptions {
    morphStyle?: "outerHTML" | "innerHTML";
    ignoreActive?: boolean;
    ignoreActiveValue?: boolean;
    restoreFocus?: boolean;
    callbacks?: IdiomorphCallbacks;
  }

  export const Idiomorph: {
    morph(
      existingNode: Node,
      newContent: string | Node | Node[],
      options?: IdiomorphOptions,
    ): Node[];
  };
}
