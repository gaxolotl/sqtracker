import mongoose from "mongoose";

const Message = new mongoose.Schema({
  conversation: mongoose.Schema.ObjectId,
  sender: mongoose.Schema.ObjectId,
  body: String,
  created: Number,
  readBy: [mongoose.Schema.ObjectId],
});

Message.index({ conversation: 1, created: 1 });

export default mongoose.model("message", Message);
