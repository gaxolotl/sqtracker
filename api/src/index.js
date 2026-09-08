import express from "express";
import morgan from "morgan";
import chalk from "chalk";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import ratelimit from "express-rate-limit";
import Tracker from "bittorrent-tracker";
import * as Sentry from "@sentry/node";
import config from "../../config.js";
import validateConfig from "./utils/validateConfig.js";
import createTrackerRoute from "./tracker/routes.js";
import auth from "./middleware/auth.js";
import {
  accountRoutes,
  userRoutes,
  torrentRoutes,
  announcementRoutes,
  reportRoutes,
  adminRoutes,
  requestRoutes,
  groupRoutes,
  wikiRoutes,
} from "./routes/index.js";
import {
  register,
  login,
  initiatePasswordReset,
  finalisePasswordReset,
  verifyUserEmail,
} from "./controllers/user.js";
import {
  downloadTorrent,
  fetchTorrent,
  listLatest,
  listTags,
  searchTorrents,
} from "./controllers/torrent.js";
import { getWiki } from "./controllers/wiki.js";
import { rssFeed } from "./controllers/rss.js";
import createAdminUser from "./setup/createAdminUser.js";
import { envFlag } from "./utils/env.js";

mongoose.set("strictQuery", true);

validateConfig(config).then(() => {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 1.0,
      environment:
        process.env.NODE_ENV === "production" ? "production" : "development",
    });

    Sentry.setContext("deployment", {
      name: process.env.SQ_SITE_NAME,
      url: process.env.SQ_BASE_URL,
      adminEmail: process.env.SQ_ADMIN_EMAIL,
    });
  }

  let mail;

  if (!envFlag("SQ_DISABLE_EMAIL")) {
    mail = nodemailer.createTransport({
      host: process.env.SQ_SMTP_HOST,
      port: process.env.SQ_SMTP_PORT,
      secure: envFlag("SQ_SMTP_SECURE"),
      auth: {
        user: process.env.SQ_SMTP_USER,
        pass: process.env.SQ_SMTP_PASS,
      },
    });
  }

  const connectToDb = () => {
    console.log("[sq] initiating db connection...");
    mongoose.connect(process.env.SQ_MONGO_URL).catch((e) => {
      console.error(`[sq] error on initial db connection: ${e.message}`);
      setTimeout(connectToDb, 5000);
    });
  };
  connectToDb();

  mongoose.connection.once("open", async () => {
    console.log("[sq] connected to mongodb successfully");
    await createAdminUser(mail);
  });

  const app = express();
  app.set("trust proxy", true);
  app.disable("x-powered-by");

  const colorizeStatus = (status) => {
    if (!status) return "?";
    if (status.startsWith("2")) {
      return chalk.green(status);
    } else if (status.startsWith("4") || status.startsWith("5")) {
      return chalk.red(status);
    } else {
      return chalk.cyan(status);
    }
  };

  app.use(
    morgan((tokens, req, res) => {
      return [
        chalk.grey(new Date().toISOString()),
        chalk.magenta(req.headers["x-forwarded-for"] ?? req.ip),
        chalk.yellow(tokens.method(req, res)),
        tokens.url(req, res),
        colorizeStatus(tokens.status(req, res)),
        `(${tokens["response-time"](req, res)} ms)`,
      ].join(" ");
    }),
  );

  app.use(cors());

  // rate limit all API routes. if the request comes from Next SSR rather than
  // the client browser, we need to make use of the forwarded IP rather than
  // the origin of the request, as this will be the same for all users. to
  // prevent avoiding a client spoofing this to avoid the limit, we also verify
  // a secret only available to the server
  const rateLimitOptions = (max, windowMs) => ({
    windowMs,
    max,
    keyGenerator: (req) => {
      if (
        req.headers["x-forwarded-for"] &&
        req.headers["x-sq-server-secret"] === process.env.SQ_SERVER_SECRET
      )
        return req.headers["x-forwarded-for"].split(",")[0];
      return req.ip;
    },
    skip: (req) => {
      return process.env.NODE_ENV !== "production" || req.method === "OPTIONS";
    },
  });

  // coarse global limit shared by every route
  const limiter = ratelimit(rateLimitOptions(120, 1000 * 60));
  app.use(limiter);

  // stricter limits on endpoints that are attractive to brute force
  const authLimiter = ratelimit(rateLimitOptions(10, 1000 * 60 * 15));

  const tracker = new Tracker.Server({
    http: false,
    udp: false,
    ws: false,
  });
  const onTrackerRequest = tracker._onRequest.bind(tracker);
  app.get("/announce/:uid", createTrackerRoute("announce", onTrackerRequest));
  app.get(
    "/announce/:uid/scrape",
    createTrackerRoute("scrape", onTrackerRequest),
  );
  // legacy tracker path, kept so already-downloaded torrents keep announcing
  app.get("/sq/*/announce", createTrackerRoute("announce", onTrackerRequest));
  app.get("/sq/*/scrape", createTrackerRoute("scrape", onTrackerRequest));

  app.use(bodyParser.json({ limit: "5mb" }));
  app.use(cookieParser());

  app.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.send(`■ sqtracker running: ${process.env.SQ_SITE_NAME}`).status(200);
  });

  // Public, read-only configuration used by the Next.js client. Never expose
  // secrets, SMTP settings, or database credentials here.
  app.get("/config", (req, res) => {
    const parseJson = (value, fallback) => {
      if (!value) return fallback;
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    };

    res.json({
      siteName: process.env.SQ_SITE_NAME,
      siteDescription: process.env.SQ_SITE_DESCRIPTION,
      allowRegister: process.env.SQ_ALLOW_REGISTER,
      allowAnonymousUploads: process.env.SQ_ALLOW_ANONYMOUS_UPLOADS === "true",
      categories: parseJson(process.env.SQ_TORRENT_CATEGORIES, {}),
      siteWideFreeleech: process.env.SQ_SITE_WIDE_FREELEECH === "true",
      allowUnregisteredView: process.env.SQ_ALLOW_UNREGISTERED_VIEW === "true",
      defaultLocale: process.env.SQ_SITE_DEFAULT_LOCALE || "en",
      customTheme: parseJson(process.env.SQ_CUSTOM_THEME, undefined),
    });
  });

  // auth routes
  app.post("/register", authLimiter, register(mail));
  app.post("/login", authLimiter, login);
  app.post(
    "/reset-password/initiate",
    authLimiter,
    initiatePasswordReset(mail),
  );
  app.post("/reset-password/finalise", authLimiter, finalisePasswordReset);
  app.post("/verify-email", authLimiter, verifyUserEmail);

  // rss feed (auth handled in cookies)
  app.get("/rss", rssFeed(tracker));

  // torrent file download (can download without auth, will not be able to announce)
  app.get("/torrent/download/:infoHash/:userId", downloadTorrent);

  if (envFlag("SQ_ALLOW_UNREGISTERED_VIEW")) {
    app.get("/torrent/info/:infoHash", fetchTorrent(tracker));
    app.get("/torrent/latest", listLatest(tracker));
    app.get("/torrent/search", searchTorrents(tracker));
    app.get("/torrent/tags", listTags);
    app.get("/wiki", getWiki);
    app.get("/wiki/*", getWiki);
  }

  // everything from here on requires user auth
  app.use(auth);

  app.use("/account", accountRoutes(tracker, mail));
  app.use("/user", userRoutes(tracker));
  app.use("/torrent", torrentRoutes(tracker));
  app.use("/announcements", announcementRoutes());
  app.use("/reports", reportRoutes());
  app.use("/admin", adminRoutes(tracker));
  app.use("/requests", requestRoutes());
  app.use("/group", groupRoutes());
  app.use("/wiki", wikiRoutes());

  app.use((err, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    console.error("[sq] error in", req.url, err);
    res.type("text/plain").status(500).send("sqtracker API error");
  });

  const port = process.env.SQ_PORT || 3001;
  app.listen(port, () => {
    console.log(`[sq] ■ sqtracker running http://localhost:${port}`);
  });
});
