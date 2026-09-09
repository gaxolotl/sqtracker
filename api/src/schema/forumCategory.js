import mongoose from "mongoose";

const ForumCategory = new mongoose.Schema({
  name: String,
  description: String,
  sortOrder: Number,
  icon: String,
  createdBy: mongoose.Schema.ObjectId,
  created: Number,
});

ForumCategory.index({ sortOrder: 1, name: 1 });

export default mongoose.model("forumCategory", ForumCategory);
