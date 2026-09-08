import express from "express";
import { getStats, refreshStats, listTorrentPeers } from "../controllers/moderation.js";

const router = express.Router();

export default (tracker) => {
  router.get("/stats", getStats(tracker));
  router.post("/stats/refresh", refreshStats(tracker));
  router.get("/torrent/:infoHash/peers", listTorrentPeers(tracker));
  return router;
};
