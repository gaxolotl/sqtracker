import express from "express";
import {
  removeTorrentFromGroup,
  findFuzzyGroupMatches,
} from "../controllers/group.js";

const router = express.Router();

export default () => {
  router.post("/remove/:infoHash", removeTorrentFromGroup);
  router.get("/search", findFuzzyGroupMatches);
  return router;
};
