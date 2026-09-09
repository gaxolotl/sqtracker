import SiteSettings from "../schema/siteSettings.js";
import { isAdmin } from "../utils/roles.js";
import {
  applyRuntimeSettings,
  getRuntimeSettings,
  runtimeSettingsSchema,
} from "../utils/runtimeSettings.js";

export const fetchSettings = async (req, res, next) => {
  try {
    if (!isAdmin(req.userRole)) {
      res.status(403).send("Only admins can view site settings");
      return;
    }
    res.json(getRuntimeSettings());
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    if (!isAdmin(req.userRole)) {
      res.status(403).send("Only admins can change site settings");
      return;
    }

    const settings = await runtimeSettingsSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: false,
    });
    for (const [category, sources] of Object.entries(
      settings.SQ_TORRENT_CATEGORIES,
    )) {
      if (
        !category.trim() ||
        !Array.isArray(sources) ||
        sources.some((source) => typeof source !== "string")
      ) {
        res
          .status(400)
          .send("Torrent categories must map category names to source arrays");
        return;
      }
    }

    await SiteSettings.findByIdAndUpdate(
      "runtime",
      {
        $set: { values: settings, updated: Date.now(), updatedBy: req.userId },
      },
      { upsert: true },
    );
    applyRuntimeSettings(settings);
    res.json(settings);
  } catch (error) {
    if (error.name === "ValidationError") {
      res.status(400).send(error.errors.join("; "));
      return;
    }
    next(error);
  }
};
