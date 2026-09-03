import { datastarPlugin } from "./datastar";
import { runtimeInstallationFor } from "./runtime";
import { installStarCore, type StarCoreInstallOptions } from "./trusted-runtime";
import type { StarStatic } from "./types";
import { uiPlugin } from "./ui";

export type StarInstallOptions = StarCoreInstallOptions;

export function installStar($: JQueryStatic, options: StarInstallOptions = {}): StarStatic {
  const installed = installStarCore($, options);
  const runtime = runtimeInstallationFor($)!;
  runtime.kernel.plugins.use(datastarPlugin);
  runtime.kernel.setDefaultProtocolProfile("core.datastar");

  const star = installed.star as StarStatic;
  star.use(uiPlugin);
  return star;
}
