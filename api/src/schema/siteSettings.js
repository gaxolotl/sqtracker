import mongoose from "mongoose";

const SiteSettings = new mongoose.Schema({
  _id: { type: String, default: "runtime" },
  values: { type: mongoose.Schema.Types.Mixed, default: {} },
  updated: Number,
  updatedBy: mongoose.Schema.ObjectId,
});

export default mongoose.model("siteSettings", SiteSettings);
