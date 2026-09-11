const SETTING_TYPES = new Set(["boolean", "integer", "number", "string"]);
const DESCRIPTOR_FIELDS = new Set([
  "type",
  "default",
  "min",
  "max",
  "maxLength",
  "options",
  "public",
]);
const SETTING_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,62}$/;

const clone = (value) => structuredClone(value);

const validateType = (type, value, key) => {
  if (type === "boolean" && typeof value !== "boolean") {
    throw new TypeError(`Plugin setting ${key} must be a boolean`);
  }
  if (
    (type === "number" || type === "integer") &&
    (typeof value !== "number" || !Number.isFinite(value))
  ) {
    throw new TypeError(`Plugin setting ${key} must be a finite number`);
  }
  if (type === "integer" && !Number.isInteger(value)) {
    throw new TypeError(`Plugin setting ${key} must be an integer`);
  }
  if (type === "string" && typeof value !== "string") {
    throw new TypeError(`Plugin setting ${key} must be a string`);
  }
};

const validateValue = (key, descriptor, value) => {
  validateType(descriptor.type, value, key);
  if (typeof value === "number") {
    if (descriptor.min !== undefined && value < descriptor.min) {
      throw new RangeError(
        `Plugin setting ${key} must be at least ${descriptor.min}`,
      );
    }
    if (descriptor.max !== undefined && value > descriptor.max) {
      throw new RangeError(
        `Plugin setting ${key} must be at most ${descriptor.max}`,
      );
    }
  }
  if (
    typeof value === "string" &&
    descriptor.maxLength !== undefined &&
    value.length > descriptor.maxLength
  ) {
    throw new RangeError(
      `Plugin setting ${key} cannot exceed ${descriptor.maxLength} characters`,
    );
  }
  if (
    descriptor.options &&
    !descriptor.options.some((option) => Object.is(option, value))
  ) {
    throw new RangeError(`Plugin setting ${key} must be one of its options`);
  }
};

export const validateSettingsDescriptors = (descriptors) => {
  if (
    !descriptors ||
    typeof descriptors !== "object" ||
    Array.isArray(descriptors)
  ) {
    throw new TypeError("Plugin settings descriptors must be an object");
  }

  const validated = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!SETTING_KEY_PATTERN.test(key)) {
      throw new TypeError(`Invalid plugin setting key: ${key}`);
    }
    if (
      !descriptor ||
      typeof descriptor !== "object" ||
      Array.isArray(descriptor)
    ) {
      throw new TypeError(`Plugin setting descriptor ${key} must be an object`);
    }
    for (const field of Object.keys(descriptor)) {
      if (!DESCRIPTOR_FIELDS.has(field)) {
        throw new TypeError(
          `Plugin setting descriptor ${key} has unknown field ${field}`,
        );
      }
    }
    if (!SETTING_TYPES.has(descriptor.type)) {
      throw new TypeError(`Plugin setting ${key} has unsupported type`);
    }
    if (!("default" in descriptor)) {
      throw new TypeError(`Plugin setting ${key} must define a default`);
    }
    if (
      descriptor.public !== undefined &&
      typeof descriptor.public !== "boolean"
    ) {
      throw new TypeError(`Plugin setting ${key} public must be a boolean`);
    }

    if (descriptor.type === "boolean") {
      if (
        descriptor.min !== undefined ||
        descriptor.max !== undefined ||
        descriptor.maxLength !== undefined
      ) {
        throw new TypeError(`Boolean plugin setting ${key} has invalid limits`);
      }
    } else if (descriptor.type === "string") {
      if (descriptor.min !== undefined || descriptor.max !== undefined) {
        throw new TypeError(`String plugin setting ${key} has invalid limits`);
      }
      if (
        descriptor.maxLength !== undefined &&
        (!Number.isInteger(descriptor.maxLength) || descriptor.maxLength < 0)
      ) {
        throw new TypeError(
          `Plugin setting ${key} maxLength must be a non-negative integer`,
        );
      }
    } else {
      if (descriptor.maxLength !== undefined) {
        throw new TypeError(
          `Numeric plugin setting ${key} cannot use maxLength`,
        );
      }
      for (const bound of ["min", "max"]) {
        if (
          descriptor[bound] !== undefined &&
          (typeof descriptor[bound] !== "number" ||
            !Number.isFinite(descriptor[bound]))
        ) {
          throw new TypeError(
            `Plugin setting ${key} ${bound} must be a number`,
          );
        }
      }
      if (
        descriptor.min !== undefined &&
        descriptor.max !== undefined &&
        descriptor.min > descriptor.max
      ) {
        throw new TypeError(`Plugin setting ${key} min cannot exceed max`);
      }
    }

    if (descriptor.options !== undefined) {
      if (!Array.isArray(descriptor.options) || !descriptor.options.length) {
        throw new TypeError(
          `Plugin setting ${key} options must be a non-empty array`,
        );
      }
      const seen = new Set();
      for (const option of descriptor.options) {
        validateValue(key, descriptor, option);
        const serialized = JSON.stringify(option);
        if (seen.has(serialized)) {
          throw new TypeError(`Plugin setting ${key} options must be unique`);
        }
        seen.add(serialized);
      }
    }

    validateValue(key, descriptor, descriptor.default);
    validated[key] = Object.freeze({
      ...descriptor,
      ...(descriptor.options
        ? { options: Object.freeze([...descriptor.options]) }
        : {}),
      public: descriptor.public === true,
    });
  }

  return Object.freeze(validated);
};

export const getDefaultSettings = (descriptors) =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(descriptors).map(([key, descriptor]) => [
        key,
        clone(descriptor.default),
      ]),
    ),
  );

export const validatePluginSettings = (
  descriptors,
  values,
  { requireAll = true } = {},
) => {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new TypeError("Plugin settings must be an object");
  }
  for (const key of Object.keys(values)) {
    if (!Object.hasOwn(descriptors, key)) {
      throw new TypeError(`Unknown plugin setting: ${key}`);
    }
  }

  const validated = {};
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!(key in values)) {
      if (requireAll) throw new TypeError(`Missing plugin setting: ${key}`);
      validated[key] = clone(descriptor.default);
      continue;
    }
    validateValue(key, descriptor, values[key]);
    validated[key] = clone(values[key]);
  }
  return Object.freeze(validated);
};

export const getPublicSettings = (descriptors, values) =>
  Object.fromEntries(
    Object.keys(descriptors)
      .filter((key) => descriptors[key].public)
      .map((key) => [key, clone(values[key])]),
  );
