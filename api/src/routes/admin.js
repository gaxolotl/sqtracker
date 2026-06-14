import express from "express";
import { getStats } from "../controllers/moderation.js";

const router = express.Router();

export default (tracker) => {
  router.get("/stats", getStats(tracker));
  return router;
};
