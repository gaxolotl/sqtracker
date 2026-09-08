import express from "express";
import ratelimit from "express-rate-limit";
import {
  addComment as addCommentTorrent,
  addVote,
  deleteTorrent,
  fetchTorrent,
  listLatest,
  listAll,
  removeVote,
  searchTorrents,
  toggleFreeleech,
  uploadTorrent,
  editTorrent,
  toggleBookmark,
  listTags,
} from "../controllers/torrent.js";
import { createReport } from "../controllers/moderation.js";

const router = express.Router();

const limiter = ratelimit({
  windowMs: 1000 * 60,
  max: 120,
  keyGenerator: (req) => {
    if (
      req.headers["x-forwarded-for"] &&
      req.headers["x-sq-server-secret"] === process.env.SQ_SERVER_SECRET
    ) {
      return req.headers["x-forwarded-for"].split(",")[0];
    }
    return req.ip;
  },
  skip: (req) => {
    return process.env.NODE_ENV !== "production" || req.method === "OPTIONS";
  },
});

router.use(limiter);

export default (tracker) => {
  router.post("/upload", uploadTorrent);
  router.get("/info/:infoHash", fetchTorrent(tracker));
  router.delete("/delete/:infoHash", deleteTorrent);
  router.post("/edit/:infoHash", editTorrent);
  router.post("/comment/:infoHash", addCommentTorrent);
  router.post("/vote/:infoHash/:vote", addVote);
  router.post("/unvote/:infoHash/:vote", removeVote);
  router.post("/report/:infoHash", createReport);
  router.post("/toggle-freeleech/:infoHash", toggleFreeleech);
  router.post("/bookmark/:infoHash", toggleBookmark);
  router.get("/latest", listLatest(tracker));
  router.get("/all", listAll);
  router.get("/search", searchTorrents(tracker));
  router.get("/tags", listTags);
  return router;
};
