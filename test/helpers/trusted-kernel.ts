import { createTrustedExpressionEngine } from "../../src/expression";
import type { StarExpressionEngine } from "../../src/expression-types";
import { Kernel } from "../../src/kernel";

export class TrustedKernel extends Kernel {
  constructor(
    $: JQueryStatic,
    documentHost: Document,
    expressions: StarExpressionEngine = createTrustedExpressionEngine(),
  ) {
    super($, documentHost, expressions);
  }
}
