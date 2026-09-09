import mongoose from "mongoose";

const ForumPost = new mongoose.Schema({
  thread: mongoose.Schema.ObjectId,
  userId: mongoose.Schema.ObjectId,
  body: String,
  created: Number,
  edited: Number,
});

ForumPost.index({ thread: 1, created: 1 });

export default mongoose.model("forumPost", ForumPost);
