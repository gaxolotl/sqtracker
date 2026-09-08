import express from "express";
import ratelimit from "express-rate-limit";
import {
  addComment,
  createAnnouncement,
  deleteAnnouncement,
  editAnnouncement,
  fetchAnnouncement,
  getAnnouncements,
  getPinnedAnnouncements,
  pinAnnouncement,
  getLatestAnnouncement,
} from "../controllers/announcement.js";

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

export default () => {
  router.post("/new", createAnnouncement);
  router.get("/pinned", getPinnedAnnouncements);
  router.get("/latest", getLatestAnnouncement);
  router.get("/page/:page", getAnnouncements);
  router.get("/:slug", fetchAnnouncement);
  router.delete("/:slug", deleteAnnouncement);
  router.post("/pin/:announcementId/:action", pinAnnouncement);
  router.post("/edit/:announcementId", editAnnouncement);
  router.post("/comment/:announcementId", addComment);
  return router;
};
