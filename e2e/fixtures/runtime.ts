import jquery from "jquery";
import { patchElements } from "../../src/patch";
import { installStar } from "../../src/compatibility";
import { createRenderAdapter } from "../../src/render-adapter";
import { createResponseController, createStarHarness, runCoreConformance } from "../../src/testing";

export {
  createRenderAdapter,
  createResponseController,
  createStarHarness,
  installStar,
  jquery,
  patchElements,
  runCoreConformance,
};
