export const PLUGIN_API_VERSION = 1;

export const PLUGIN_PERMISSIONS = Object.freeze([
  "events",
  "routes",
  "routes:admin",
  "routes:public",
  "routes:staff",
  "routes:user",
  "settings",
  "storage",
]);

export const defineServerPlugin = (plugin) => Object.freeze(plugin);
