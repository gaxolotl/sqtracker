import { defineServerPlugin } from "@sqtrackr/plugin-sdk/server";

const INFO_HASH_PATTERN = /^[a-f0-9]{40}$/i;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export const normalizeInfoHash = (value) => {
  if (typeof value !== "string" || !INFO_HASH_PATTERN.test(value)) return null;
  return value.toLowerCase();
};

export const isRequestExpired = (request, now = new Date()) =>
  new Date(request.expiresAt).getTime() <= now.getTime();

export const getCooldownRemainingMs = (
  lastRequestedAt,
  requestCooldownHours,
  now = new Date(),
) => {
  if (!lastRequestedAt) return 0;
  return Math.max(
    0,
    new Date(lastRequestedAt).getTime() +
      requestCooldownHours * HOUR_MS -
      now.getTime(),
  );
};

export const evaluateRequestEligibility = ({
  torrent,
  seeders,
  completed,
  activeCount,
  settings,
  now = new Date(),
}) => {
  if (!torrent) return { eligible: false, code: "torrent-not-found" };
  if (seeders !== 0) return { eligible: false, code: "torrent-has-seeders" };
  const createdAt = new Date(torrent.created).getTime();
  if (
    !Number.isFinite(createdAt) ||
    now.getTime() - createdAt < settings.minimumAgeDays * DAY_MS
  ) {
    return { eligible: false, code: "torrent-too-new" };
  }
  if (settings.completedDownloadersOnly && !completed) {
    return { eligible: false, code: "download-not-completed" };
  }
  if (activeCount >= settings.maxActivePerUser) {
    return { eligible: false, code: "active-request-limit" };
  }
  return { eligible: true };
};

const eligibilityMessages = {
  "torrent-has-seeders": "Torrent already has an active seeder",
  "torrent-too-new": "Torrent is not old enough for a reseed request",
  "download-not-completed": "Only completed downloaders can request a reseed",
  "active-request-limit": "Maximum active reseed requests reached",
};

let Request;
let pluginContext;

const getSettings = () => pluginContext.settings.get();

const expireRequests = async (now = new Date()) => {
  await Request.updateMany(
    { status: "open", expiresAt: { $lte: now } },
    {
      $set: {
        status: "expired",
        closeReason: "expired",
        closedAt: now,
        fulfilledAt: null,
        updatedAt: now,
      },
    },
  );
};

const closeRequest = async (infoHash, reason, now = new Date()) => {
  await Request.updateOne(
    { infoHash, status: "open" },
    {
      $set: {
        status: "closed",
        closeReason: reason,
        closedAt: now,
        fulfilledAt: null,
        updatedAt: now,
      },
    },
  );
};

const fulfillRequest = async (infoHash, now = new Date()) => {
  await Request.updateOne(
    { infoHash, status: "open" },
    {
      $set: {
        status: "closed",
        closeReason: "seeders-available",
        fulfilledAt: now,
        closedAt: now,
        updatedAt: now,
      },
    },
  );
};

const canModerate = (role) => role === "staff" || role === "admin";

const purgeCompleted = async (now = new Date()) => {
  const retentionDays = getSettings().completedRetentionDays;
  if (!retentionDays) return;
  const cutoff = new Date(now.getTime() - retentionDays * DAY_MS);
  await Request.deleteMany({
    status: "closed",
    closeReason: "seeders-available",
    fulfilledAt: { $lt: cutoff },
  });
};

const getRequesterActivity = (request, userId) => {
  const activity = request?.requesterActivity;
  if (!activity) return undefined;
  if (activity instanceof Map) return activity.get(userId);
  return activity[userId];
};

const torrentDto = (torrent, swarm) => ({
  id: torrent.id,
  infoHash: torrent.infoHash,
  name: torrent.name,
  created: torrent.created,
  seeders: swarm.seeders,
  leechers: swarm.leechers,
});

const requestDto = (request, torrent, swarm, userId, seededByMe = false) => ({
  id: request._id.toString(),
  _id: request._id.toString(),
  infoHash: request.infoHash,
  status: request.status,
  requestCount: request.requesterIds.length,
  requestedByMe: userId ? request.requesterIds.includes(userId) : false,
  seededByMe,
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
  expiresAt: request.expiresAt,
  fulfilledAt: request.fulfilledAt ?? null,
  torrent: torrentDto(torrent, swarm),
});

const resolveRequestDto = async (request, userId, seededByMe = false) => {
  const torrent = await pluginContext.services.torrents.findByInfoHash(
    request.infoHash,
  );
  if (!torrent) return null;
  const swarm = pluginContext.services.tracker.getSwarmStats(request.infoHash);
  return requestDto(request, torrent, swarm, userId, seededByMe);
};

const normalizeSearch = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const fuzzyScore = (name, query) => {
  const haystack = normalizeSearch(name);
  const needle = normalizeSearch(query);
  if (!needle) return 0;
  if (haystack.includes(needle)) return 100 - haystack.indexOf(needle);

  const tokens = needle.split(" ").filter(Boolean);
  const words = haystack.split(" ").filter(Boolean);
  const matchedTokens = tokens.filter((token) =>
    words.some((word) => word.startsWith(token)),
  ).length;
  if (matchedTokens === tokens.length) return 50 + matchedTokens;

  let cursor = 0;
  for (const character of needle.replaceAll(" ", "")) {
    cursor = haystack.indexOf(character, cursor);
    if (cursor === -1) return 0;
    cursor += 1;
  }
  return 20;
};

const parsePagination = (query) => {
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 50)
      : 25;
  return { page, limit };
};

const reconcileRequests = async () => {
  const now = new Date();
  await expireRequests(now);
  const requests = await Request.find({ status: "open" }).lean();
  for (const request of requests) {
    const torrent = await pluginContext.services.torrents.findByInfoHash(
      request.infoHash,
    );
    if (!torrent) {
      await closeRequest(request.infoHash, "torrent-deleted", now);
      continue;
    }
    const swarm = pluginContext.services.tracker.getSwarmStats(
      request.infoHash,
    );
    if (swarm.seeders >= getSettings().autoCloseSeederThreshold) {
      await fulfillRequest(request.infoHash, now);
    }
  }
};

const serverPlugin = defineServerPlugin({
  register(context) {
    pluginContext = context;
    context.settings.register({
      minimumAgeDays: {
        type: "integer",
        default: 7,
        min: 0,
        max: 3650,
        public: true,
      },
      requestCooldownHours: {
        type: "integer",
        default: 24,
        min: 0,
        max: 8760,
        public: true,
      },
      maxActivePerUser: {
        type: "integer",
        default: 5,
        min: 1,
        max: 100,
        public: true,
      },
      requestExpiryDays: {
        type: "integer",
        default: 14,
        min: 1,
        max: 3650,
        public: true,
      },
      autoCloseSeederThreshold: {
        type: "integer",
        default: 1,
        min: 1,
        max: 100000,
        public: true,
      },
      completedDownloadersOnly: {
        type: "boolean",
        default: false,
        public: true,
      },
      completedRetentionDays: {
        type: "integer",
        default: 30,
        min: 0,
        max: 3650,
      },
    });

    Request = context.storage.registerModel("request", {
      infoHash: { type: String, required: true, unique: true, index: true },
      torrentId: { type: String, required: true },
      requesterIds: { type: [String], default: [] },
      requesterActivity: { type: Object, default: {} },
      status: {
        type: String,
        enum: ["open", "closed", "expired"],
        default: "open",
        index: true,
      },
      closeReason: String,
      createdAt: { type: Date, required: true },
      updatedAt: { type: Date, required: true },
      expiresAt: { type: Date, required: true, index: true },
      closedAt: Date,
      fulfilledAt: { type: Date, index: true },
    });

    const router = context.routes.user;

    router.get("/requests", async (req, res) => {
      const now = new Date();
      await expireRequests(now);
      const { page, limit } = parsePagination(req.query);
      const query =
        typeof req.query.q === "string" ? req.query.q.slice(0, 100) : "";
      const requests = await Request.find({
        status: "open",
        expiresAt: { $gt: now },
      })
        .sort({ createdAt: -1, _id: 1 })
        .limit(200)
        .lean();
      const userId = req.userId.toString();
      const [torrents, seeded] = await Promise.all([
        context.services.torrents.findMany(
          requests.map((request) => request.infoHash),
        ),
        context.services.progress.findSeeded(
          userId,
          requests.map((request) => request.infoHash),
        ),
      ]);
      const torrentMap = new Map(
        torrents.map((torrent) => [torrent.infoHash, torrent]),
      );
      const seededSet = new Set(seeded);

      const items = requests
        .map((request) => {
          const torrent = torrentMap.get(request.infoHash);
          if (!torrent) return null;
          const score = query ? fuzzyScore(torrent.name, query) : 1;
          if (query && score === 0) return null;
          const swarm = context.services.tracker.getSwarmStats(
            request.infoHash,
          );
          return {
            ...requestDto(
              request,
              torrent,
              swarm,
              userId,
              seededSet.has(request.infoHash),
            ),
            score,
          };
        })
        .filter(Boolean);

      items.sort(
        (left, right) =>
          Number(right.seededByMe) - Number(left.seededByMe) ||
          (query ? right.score - left.score : 0) ||
          right.requestCount - left.requestCount ||
          new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
      );

      const total = items.length;
      const pageItems = items
        .slice((page - 1) * limit, page * limit)
        .map(({ score, ...request }) => request);
      res.json({ requests: pageItems, page, limit, total });
    });

    router.get("/status/:infoHash", async (req, res) => {
      const infoHash = normalizeInfoHash(req.params.infoHash);
      if (!infoHash) {
        res.status(400).send("Invalid torrent info hash");
        return;
      }
      await expireRequests();
      const torrent = await context.services.torrents.findByInfoHash(infoHash);
      if (!torrent) {
        res.status(404).send("Torrent does not exist");
        return;
      }
      const swarm = context.services.tracker.getSwarmStats(infoHash);
      const request = await Request.findOne({
        infoHash,
        status: "open",
      }).lean();
      res.json({
        torrent: torrentDto(torrent, swarm),
        request: request
          ? requestDto(request, torrent, swarm, req.userId.toString())
          : null,
      });
    });

    router.get("/helping", async (req, res) => {
      const now = new Date();
      await expireRequests(now);
      const requests = await Request.find({
        status: "open",
        expiresAt: { $gt: now },
      })
        .sort({ createdAt: -1, _id: 1 })
        .limit(20)
        .lean();
      const userId = req.userId.toString();
      const seeded = new Set(
        await context.services.progress.findSeeded(
          userId,
          requests.map((request) => request.infoHash),
        ),
      );
      const resolved = await Promise.all(
        requests
          .filter((request) => seeded.has(request.infoHash))
          .map((request) => resolveRequestDto(request, userId, true)),
      );
      res.json({ requests: resolved.filter(Boolean) });
    });

    router.get("/fulfilled", async (req, res) => {
      const now = new Date();
      const userId = req.userId.toString();
      const since = new Date(now.getTime() - 7 * DAY_MS);
      const requests = await Request.find({
        status: "closed",
        closeReason: "seeders-available",
        requesterIds: userId,
        fulfilledAt: { $gte: since },
      })
        .sort({ fulfilledAt: -1, _id: 1 })
        .limit(20)
        .lean();
      const resolved = await Promise.all(
        requests.map((request) => resolveRequestDto(request, userId, true)),
      );
      res.json({ requests: resolved.filter(Boolean) });
    });

    router.get("/completed", async (req, res) => {
      await purgeCompleted();
      const { page, limit } = parsePagination(req.query);
      const query =
        typeof req.query.q === "string" ? req.query.q.slice(0, 100) : "";
      const userId = req.userId.toString();
      const requests = await Request.find({
        status: "closed",
        closeReason: "seeders-available",
      })
        .sort({ fulfilledAt: -1, _id: 1 })
        .limit(200)
        .lean();
      const torrents = await context.services.torrents.findMany(
        requests.map((request) => request.infoHash),
      );
      const torrentMap = new Map(
        torrents.map((torrent) => [torrent.infoHash, torrent]),
      );

      const items = requests
        .map((request) => {
          const torrent = torrentMap.get(request.infoHash);
          if (!torrent) return null;
          const score = query ? fuzzyScore(torrent.name, query) : 1;
          if (query && score === 0) return null;
          const swarm = context.services.tracker.getSwarmStats(
            request.infoHash,
          );
          return {
            ...requestDto(request, torrent, swarm, userId, false),
            score,
          };
        })
        .filter(Boolean);

      items.sort(
        (left, right) =>
          Number(right.requestedByMe) - Number(left.requestedByMe) ||
          (query ? right.score - left.score : 0) ||
          new Date(right.fulfilledAt).getTime() -
            new Date(left.fulfilledAt).getTime(),
      );

      const total = items.length;
      const pageItems = items
        .slice((page - 1) * limit, page * limit)
        .map(({ score, ...request }) => request);
      res.json({ requests: pageItems, page, limit, total });
    });

    router.delete("/completed/:requestId", async (req, res) => {
      if (!canModerate(req.userRole)) {
        res.status(403).send("Only staff can delete completed requests");
        return;
      }
      const { requestId } = req.params;
      if (!/^[a-f0-9]{24}$/i.test(requestId)) {
        res.status(400).send("Invalid request id");
        return;
      }
      const deleted = await Request.findOneAndDelete({
        _id: requestId,
        status: "closed",
        closeReason: "seeders-available",
      });
      if (!deleted) {
        res.status(404).send("Completed request does not exist");
        return;
      }
      res.sendStatus(204);
    });

    const submitRequest = async (req, res) => {
      const infoHash = normalizeInfoHash(req.params.infoHash);
      if (!infoHash) {
        res.status(400).send("Invalid torrent info hash");
        return;
      }

      const now = new Date();
      await expireRequests(now);
      const settings = getSettings();
      const torrent = await context.services.torrents.findByInfoHash(infoHash);
      if (!torrent) {
        res.status(404).send("Torrent does not exist");
        return;
      }
      const userId = req.userId.toString();
      const existing = await Request.findOne({ infoHash }).lean();
      const alreadyActive =
        existing?.status === "open" && existing.requesterIds.includes(userId);
      const [activeCount, completed] = await Promise.all([
        alreadyActive
          ? 0
          : Request.countDocuments({ status: "open", requesterIds: userId }),
        settings.completedDownloadersOnly
          ? context.services.progress.hasCompleted(userId, infoHash)
          : Promise.resolve(true),
      ]);
      const swarm = context.services.tracker.getSwarmStats(infoHash);
      const eligibility = evaluateRequestEligibility({
        torrent,
        seeders: swarm.seeders,
        completed,
        activeCount,
        settings,
        now,
      });
      if (!eligibility.eligible) {
        res.status(409).send(eligibilityMessages[eligibility.code]);
        return;
      }

      const cooldownRemaining = getCooldownRemainingMs(
        getRequesterActivity(existing, userId),
        settings.requestCooldownHours,
        now,
      );
      if (cooldownRemaining > 0) {
        res.status(429).json({
          message: "Reseed request is on cooldown",
          retryAfterSeconds: Math.ceil(cooldownRemaining / 1000),
        });
        return;
      }

      const expiresAt = new Date(
        now.getTime() + settings.requestExpiryDays * DAY_MS,
      );
      const activityPath = `requesterActivity.${userId}`;
      let request;
      let created = false;
      if (!existing) {
        request = await Request.create({
          infoHash,
          torrentId: torrent.id,
          requesterIds: [userId],
          requesterActivity: { [userId]: now },
          status: "open",
          createdAt: now,
          updatedAt: now,
          expiresAt,
        });
        created = true;
      } else if (existing.status !== "open") {
        request = await Request.findByIdAndUpdate(
          existing._id,
          {
            $set: {
              torrentId: torrent.id,
              requesterIds: [userId],
              requesterActivity: { [userId]: now },
              status: "open",
              closeReason: null,
              closedAt: null,
              fulfilledAt: null,
              createdAt: now,
              updatedAt: now,
              expiresAt,
            },
          },
          { new: true },
        );
        created = true;
      } else {
        request = await Request.findOneAndUpdate(
          { _id: existing._id },
          {
            $addToSet: { requesterIds: userId },
            $set: {
              [activityPath]: now,
              updatedAt: now,
              expiresAt,
            },
          },
          { new: true },
        );
      }

      const plainRequest = request.toObject ? request.toObject() : request;
      res
        .status(created ? 201 : 200)
        .json(requestDto(plainRequest, torrent, swarm, userId));
    };

    router.post("/requests/:infoHash", submitRequest);

    router.delete("/requests/:infoHash", async (req, res) => {
      const infoHash = normalizeInfoHash(req.params.infoHash);
      if (!infoHash) {
        res.status(400).send("Invalid torrent info hash");
        return;
      }
      await expireRequests();
      const userId = req.userId.toString();
      const request = await Request.findOneAndUpdate(
        { infoHash, status: "open", requesterIds: userId },
        {
          $pull: { requesterIds: userId },
          $unset: { [`requesterActivity.${userId}`]: "" },
          $set: { updatedAt: new Date() },
        },
        { new: true },
      );
      if (!request) {
        res.status(404).send("Active reseed request does not exist");
        return;
      }
      if (!request.requesterIds.length) {
        await closeRequest(infoHash, "cancelled");
      }
      res.sendStatus(204);
    });

    context.events.on("tracker.announce.accepted", async ({ data }) => {
      if (data.seeders >= getSettings().autoCloseSeederThreshold) {
        await fulfillRequest(data.infoHash);
      }
    });
    context.events.on("torrent.deleted", async ({ data }) => {
      await closeRequest(data.infoHash, "torrent-deleted");
    });
  },

  async initialize() {
    await reconcileRequests();
    await purgeCompleted();
  },
});

export default serverPlugin;
