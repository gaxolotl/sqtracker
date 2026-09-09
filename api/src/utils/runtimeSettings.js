import * as yup from "yup";
import SiteSettings from "../schema/siteSettings.js";

const hexColor = /^#[a-f0-9]{6}$/i;

export const runtimeSettingsSchema = yup
  .object({
    SQ_SITE_NAME: yup.string().trim().min(1).max(20).required(),
    SQ_SITE_DESCRIPTION: yup.string().trim().min(1).max(80).required(),
    SQ_SHOW_PAGE_IN_TITLE: yup.boolean().required(),
    SQ_ALLOW_REGISTER: yup
      .string()
      .oneOf(["open", "invite", "closed"])
      .required(),
    SQ_ALLOW_ANONYMOUS_UPLOADS: yup.boolean().required(),
    SQ_MINIMUM_RATIO: yup.number().min(-1).max(100).required(),
    SQ_MAXIMUM_HIT_N_RUNS: yup.number().integer().min(-1).max(10000).required(),
    SQ_TORRENT_CATEGORIES: yup.object().required(),
    SQ_BP_EARNED_PER_GB: yup.number().min(0).max(100000).required(),
    SQ_BP_EARNED_PER_FILLED_REQUEST: yup.number().min(0).max(100000).required(),
    SQ_BP_COST_PER_INVITE: yup.number().min(0).max(100000).required(),
    SQ_BP_COST_PER_GB: yup.number().min(0).max(100000).required(),
    SQ_SITE_WIDE_FREELEECH: yup.boolean().required(),
    SQ_ALLOW_UNREGISTERED_VIEW: yup.boolean().required(),
    SQ_EXTENSION_BLACKLIST: yup
      .array()
      .of(yup.string().trim().max(20))
      .required(),
    SQ_SITE_DEFAULT_LOCALE: yup
      .string()
      .oneOf(["en", "bg", "es", "it", "ru", "de", "zh", "eo", "fr"])
      .required(),
    SQ_CUSTOM_THEME: yup
      .object({
        primary: yup.string().matches(hexColor).required(),
        background: yup.string().matches(hexColor).optional(),
        sidebar: yup.string().matches(hexColor).optional(),
        border: yup.string().matches(hexColor).optional(),
        text: yup.string().matches(hexColor).optional(),
        grey: yup.string().matches(hexColor).optional(),
      })
      .required(),
    SQ_AVATAR_MAX_RESOLUTION: yup
      .number()
      .integer()
      .min(64)
      .max(2048)
      .required(),
    SQ_AVATAR_MAX_SIZE_KB: yup.number().integer().min(32).max(5120).required(),
    SQ_ALLOW_GIF_AVATARS: yup.boolean().required(),
  })
  .strict()
  .noUnknown()
  .required();

const jsonKeys = new Set([
  "SQ_TORRENT_CATEGORIES",
  "SQ_EXTENSION_BLACKLIST",
  "SQ_CUSTOM_THEME",
]);
const booleanKeys = new Set([
  "SQ_SHOW_PAGE_IN_TITLE",
  "SQ_ALLOW_ANONYMOUS_UPLOADS",
  "SQ_SITE_WIDE_FREELEECH",
  "SQ_ALLOW_UNREGISTERED_VIEW",
  "SQ_ALLOW_GIF_AVATARS",
]);
const numberKeys = new Set([
  "SQ_MINIMUM_RATIO",
  "SQ_MAXIMUM_HIT_N_RUNS",
  "SQ_BP_EARNED_PER_GB",
  "SQ_BP_EARNED_PER_FILLED_REQUEST",
  "SQ_BP_COST_PER_INVITE",
  "SQ_BP_COST_PER_GB",
  "SQ_AVATAR_MAX_RESOLUTION",
  "SQ_AVATAR_MAX_SIZE_KB",
]);

const parseEnvironmentValue = (key, value) => {
  if (jsonKeys.has(key)) {
    try {
      return JSON.parse(
        value ||
          (key === "SQ_TORRENT_CATEGORIES"
            ? "{}"
            : key === "SQ_CUSTOM_THEME"
              ? '{"primary":"#f45d48"}'
              : "[]"),
      );
    } catch {
      return key === "SQ_TORRENT_CATEGORIES"
        ? {}
        : key === "SQ_CUSTOM_THEME"
          ? { primary: "#f45d48" }
          : [];
    }
  }
  if (booleanKeys.has(key)) return value === "true";
  if (numberKeys.has(key)) return Number(value);
  return value;
};

export const getRuntimeSettings = () => {
  const settings = {};
  for (const key of Object.keys(runtimeSettingsSchema.fields)) {
    const fallback =
      key === "SQ_AVATAR_MAX_RESOLUTION"
        ? "512"
        : key === "SQ_AVATAR_MAX_SIZE_KB"
          ? "512"
          : key === "SQ_ALLOW_GIF_AVATARS"
            ? "true"
            : key === "SQ_SHOW_PAGE_IN_TITLE"
              ? "true"
              : "";
    settings[key] = parseEnvironmentValue(key, process.env[key] ?? fallback);
  }
  return settings;
};

export const applyRuntimeSettings = (settings) => {
  for (const [key, value] of Object.entries(settings)) {
    process.env[key] =
      value !== null && typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  }
};

export const loadRuntimeSettings = async () => {
  const saved = await SiteSettings.findById("runtime").lean();
  if (saved?.values) applyRuntimeSettings(saved.values);
};
