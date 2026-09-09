import mongoose from "mongoose";

const ForumThread = new mongoose.Schema({
  category: mongoose.Schema.ObjectId,
  title: String,
  body: String,
  createdBy: mongoose.Schema.ObjectId,
  created: Number,
  updated: Number,
  pinned: Boolean,
  locked: Boolean,
  views: Number,
  lastPost: {
    userId: mongoose.Schema.ObjectId,
    body: String,
    created: Number,
  },
});

ForumThread.index({ category: 1, pinned: -1, updated: -1 });

export default mongoose.model("forumThread", ForumThread);
