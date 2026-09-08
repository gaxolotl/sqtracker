import express from "express";
import ratelimit from "express-rate-limit";
import {
  acceptCandidate,
  addCandidate,
  addComment as addCommentRequest,
  createRequest,
  deleteRequest,
  fetchRequest,
  getRequests,
} from "../controllers/request.js";

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
  router.post("/new", createRequest);
  router.get("/page/:page", getRequests);
  router.get("/:index", fetchRequest);
  router.delete("/:index", deleteRequest);
  router.post("/comment/:requestId", addCommentRequest);
  router.post("/suggest/:requestId", addCandidate);
  router.post("/accept/:requestId", acceptCandidate);
  return router;
};
