import express from "express";
import ratelimit from "express-rate-limit";
import { banUser, fetchUser, unbanUser } from "../controllers/user.js";

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

export default (tracker) => {
  router.get("/:username", limiter, fetchUser(tracker));
  router.post("/ban/:username", limiter, banUser);
  router.post("/unban/:username", limiter, unbanUser);
  return router;
};
