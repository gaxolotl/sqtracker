import {
  PLUGIN_API_VERSION,
  PLUGIN_PERMISSIONS,
} from "@sqtrackr/plugin-sdk/server";

export const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/;

const ensureNonEmptyString = (value, field, pluginId) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(
      `Plugin ${pluginId || "manifest"} must have a non-empty ${field}`,
    );
  }
};

export const validatePluginManifest = (manifest) => {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new TypeError("Plugin manifest must be an object");
  }
  if (!PLUGIN_ID_PATTERN.test(manifest.id || "")) {
    throw new TypeError(`Invalid plugin id: ${manifest.id || "(missing)"}`);
  }

  ensureNonEmptyString(manifest.name, "name", manifest.id);
  ensureNonEmptyString(manifest.version, "version", manifest.id);
  ensureNonEmptyString(
    manifest.sqtrackr,
    "sqtrackr compatibility",
    manifest.id,
  );
  if (manifest.apiVersion !== PLUGIN_API_VERSION) {
    throw new TypeError(
      `Plugin ${manifest.id} requires unsupported API version ${manifest.apiVersion}`,
    );
  }

  if (!Array.isArray(manifest.permissions)) {
    throw new TypeError(`Plugin ${manifest.id} permissions must be an array`);
  }
  const permissions = new Set();
  for (const permission of manifest.permissions) {
    if (!PLUGIN_PERMISSIONS.includes(permission)) {
      throw new TypeError(
        `Plugin ${manifest.id} has unrecognized permission: ${permission}`,
      );
    }
    if (permissions.has(permission)) {
      throw new TypeError(
        `Plugin ${manifest.id} has duplicate permission: ${permission}`,
      );
    }
    permissions.add(permission);
  }

  const dependencies = manifest.dependencies ?? [];
  if (!Array.isArray(dependencies)) {
    throw new TypeError(`Plugin ${manifest.id} dependencies must be an array`);
  }
  const dependencyIds = new Set();
  for (const dependency of dependencies) {
    if (!PLUGIN_ID_PATTERN.test(dependency || "")) {
      throw new TypeError(
        `Plugin ${manifest.id} has invalid dependency: ${dependency}`,
      );
    }
    if (dependencyIds.has(dependency)) {
      throw new TypeError(
        `Plugin ${manifest.id} has duplicate dependency: ${dependency}`,
      );
    }
    dependencyIds.add(dependency);
  }

  return Object.freeze({
    ...manifest,
    permissions: Object.freeze([...manifest.permissions]),
    ...(manifest.dependencies
      ? { dependencies: Object.freeze([...dependencies]) }
      : {}),
  });
};

export const orderPluginRegistry = (registry) => {
  if (!Array.isArray(registry)) {
    throw new TypeError("Plugin registry must be an array");
  }

  const entries = new Map();
  for (const entry of registry) {
    if (!entry || typeof entry !== "object") {
      throw new TypeError("Plugin registry entries must be objects");
    }
    const manifest = validatePluginManifest(entry.manifest);
    if (entries.has(manifest.id)) {
      throw new TypeError(`Duplicate plugin id: ${manifest.id}`);
    }
    if (!entry.server || typeof entry.server.register !== "function") {
      throw new TypeError(`Plugin ${manifest.id} must export register()`);
    }
    entries.set(manifest.id, { ...entry, manifest });
  }

  for (const { manifest } of entries.values()) {
    for (const dependency of manifest.dependencies ?? []) {
      if (!entries.has(dependency)) {
        throw new TypeError(
          `Plugin ${manifest.id} depends on missing plugin ${dependency}`,
        );
      }
    }
  }

  const dependencyCount = new Map();
  const dependents = new Map();
  for (const id of entries.keys()) dependents.set(id, []);
  for (const [id, { manifest }] of entries) {
    const dependencies = manifest.dependencies ?? [];
    dependencyCount.set(id, dependencies.length);
    for (const dependency of dependencies) {
      dependents.get(dependency).push(id);
    }
  }

  const available = [...entries.keys()]
    .filter((id) => dependencyCount.get(id) === 0)
    .sort();
  const ordered = [];
  while (available.length) {
    const id = available.shift();
    ordered.push(entries.get(id));
    for (const dependent of dependents.get(id).sort()) {
      const nextCount = dependencyCount.get(dependent) - 1;
      dependencyCount.set(dependent, nextCount);
      if (nextCount === 0) {
        available.push(dependent);
        available.sort();
      }
    }
  }

  if (ordered.length !== entries.size) {
    const cyclicIds = [...entries.keys()]
      .filter((id) => dependencyCount.get(id) > 0)
      .sort();
    throw new TypeError(
      `Plugin dependency cycle detected: ${cyclicIds.join(", ")}`,
    );
  }

  return ordered;
};

export const getSafeManifest = (manifest) => ({
  id: manifest.id,
  name: manifest.name,
  version: manifest.version,
  apiVersion: manifest.apiVersion,
  sqtrackr: manifest.sqtrackr,
  permissions: [...manifest.permissions],
  ...(manifest.dependencies
    ? { dependencies: [...manifest.dependencies] }
    : {}),
});
