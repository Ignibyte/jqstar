import { defineOfficialPlugin, STAR_PLUGIN_API_VERSION, type StarPlugin } from "./plugin";
import { datastarProtocolProfile } from "./protocol-datastar";
import type { StarProtocolProfileDefinition } from "./protocol";
import { STAR_VERSION } from "./version";

export type DatastarPlugin = StarPlugin<StarProtocolProfileDefinition>;

export const datastarPlugin: Readonly<DatastarPlugin> = defineOfficialPlugin({
  name: "core.datastar",
  version: STAR_VERSION,
  apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
  install(registrar) {
    registrar.protocolProfile(datastarProtocolProfile);
    return datastarProtocolProfile;
  },
});

export { datastarProtocolProfile } from "./protocol-datastar";
