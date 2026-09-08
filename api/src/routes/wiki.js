import express from "express";
import ratelimit from "express-rate-limit";
import {
  createWiki,
  getWiki,
  deleteWiki,
  updateWiki,
} from "../controllers/wiki.js";

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
  router.post("/new", createWiki);
  router.post("/update/:wikiId", updateWiki);
  router.get("*", getWiki);
  router.delete("*", deleteWiki);
  return router;
};
