import mongoose from "mongoose";

const PluginSettings = new mongoose.Schema({
  _id: { type: String, required: true },
  values: { type: mongoose.Schema.Types.Mixed, default: {} },
  enabled: { type: Boolean, default: true },
  installed: { type: Boolean, default: true },
  installedAt: Date,
  removedAt: Date,
  updated: Number,
  updatedBy: mongoose.Schema.ObjectId,
});

export default mongoose.model(
  "PluginSettings",
  PluginSettings,
  "pluginSettings",
);
