import express from "express";
import ratelimit from "express-rate-limit";
import {
  fetchInvites,
  generateInvite,
  changePassword,
  getUserStats,
  getUserRole,
  getUserVerifiedEmailStatus,
  buyItems,
  generateTotpSecret,
  enableTotp,
  disableTotp,
  deleteAccount,
  getUserBookmarks,
} from "../controllers/user.js";

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

export default (tracker, mail) => {
  router.get("/invites", fetchInvites);
  router.post("/generate-invite", generateInvite(mail));
  router.post("/change-password", changePassword(mail));
  router.get("/get-stats", getUserStats);
  router.get("/get-role", getUserRole);
  router.get("/get-verified", getUserVerifiedEmailStatus);
  router.post("/buy", buyItems);
  router.get("/totp/generate", generateTotpSecret);
  router.post("/totp/enable", enableTotp);
  router.post("/totp/disable", disableTotp);
  router.post("/delete", deleteAccount);
  router.get("/bookmarks", getUserBookmarks(tracker));
  return router;
};
