declare module "@sqtrackr/plugin-reseed-radar/manifest" {
  import type { PluginManifest } from "@sqtrackr/plugin-sdk/client";

  const manifest: PluginManifest & {
    apiVersion: number;
    sqtrackr: string;
  };
  export default manifest;
}
