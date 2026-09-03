/// <reference types="vite/client" />

declare const __JQS_STATIC_DEMO__: boolean;

declare module "*.html?raw" {
  const source: string;
  export default source;
}
