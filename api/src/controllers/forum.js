import mongoose from "mongoose";
import ForumCategory from "../schema/forumCategory.js";
import ForumThread from "../schema/forumThread.js";
import ForumPost from "../schema/forumPost.js";
import User from "../schema/user.js";
import { canModerate, isAdmin } from "../utils/roles.js";

const pageSize = 25;

const VALID_ICONS = [
  "messages-square",
  "message-square",
  "message-circle",
  "newspaper",
  "megaphone",
  "film",
  "music",
  "headphones",
  "gamepad-2",
  "joystick",
  "book-open",
  "graduation-cap",
  "monitor",
  "smartphone",
  "tv",
  "camera",
  "palette",
  "wrench",
  "rocket",
  "heart",
  "star",
  "lightbulb",
  "coffee",
  "globe",
  "trophy",
  "shield",
  "bug",
  "plane",
];

const recentViewers = new Map();

const canCountView = (userId, threadId, now) => {
  const key = `${userId}:${threadId}`;
  const seenAt = recentViewers.get(key);
  if (seenAt && now - seenAt < 10 * 60 * 1000) return false;
  if (recentViewers.size > 5000) {
    for (const [storedKey, storedAt] of recentViewers) {
      if (now - storedAt >= 30 * 60 * 1000) recentViewers.delete(storedKey);
    }
  }
  recentViewers.set(key, now);
  return true;
};

const parsePage = (value) => Math.max(Number.parseInt(value, 10) || 0, 0);

const validateId = (id, label, res) => {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).send(`Invalid ${label} ID`);
    return false;
  }
  return true;
};

const validateText = (value, label, maxLength, res) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    res.status(400).send(`${label} is required`);
    return null;
  }

  const text = value.trim();
  if (maxLength !== undefined && text.length > maxLength) {
    res.status(400).send(`${label} cannot exceed ${maxLength} characters`);
    return null;
  }
  return text;
};

const validateBody = (value, maxLength, res) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    res.status(400).send("Body is required");
    return null;
  }
  if (maxLength !== undefined && value.length > maxLength) {
    res.status(400).send(`Body cannot exceed ${maxLength} characters`);
    return null;
  }
  return value;
};

const validateSortOrder = (value, res) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    res.status(400).send("Sort order must be a number");
    return false;
  }
  return true;
};

const authorLookup = (localField, as) => ({
  $lookup: {
    from: User.collection.name,
    let: { userId: `$${localField}` },
    pipeline: [
      { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
      { $project: { username: 1, avatarUpdated: 1 } },
    ],
    as,
  },
});

const threadSummaryStages = [
  authorLookup("createdBy", "authorLookup"),
  {
    $lookup: {
      from: ForumPost.collection.name,
      let: { threadId: "$_id" },
      pipeline: [
        { $match: { $expr: { $eq: ["$thread", "$$threadId"] } } },
        { $count: "count" },
      ],
      as: "postStats",
    },
  },
  authorLookup("lastPost.userId", "lastPostAuthorLookup"),
  {
    $set: {
      author: { $ifNull: [{ $first: "$authorLookup" }, null] },
      postCount: { $ifNull: [{ $first: "$postStats.count" }, 0] },
      "lastPost.author": {
        $ifNull: [{ $first: "$lastPostAuthorLookup" }, null],
      },
    },
  },
  { $project: { authorLookup: 0, postStats: 0, lastPostAuthorLookup: 0 } },
];

const userOwns = (record, userId, field) =>
  record[field]?.toString() === userId?.toString();

export const getForumCategories = async (req, res, next) => {
  try {
    const categories = await ForumCategory.aggregate([
      { $sort: { sortOrder: 1, name: 1 } },
      {
        $lookup: {
          from: ForumThread.collection.name,
          let: { categoryId: "$_id" },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$category", "$$categoryId"] } },
            },
            {
              $lookup: {
                from: ForumPost.collection.name,
                let: { threadId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$thread", "$$threadId"] },
                    },
                  },
                  { $count: "count" },
                ],
                as: "postStats",
              },
            },
            {
              $group: {
                _id: null,
                threadCount: { $sum: 1 },
                postCount: {
                  $sum: { $ifNull: [{ $first: "$postStats.count" }, 0] },
                },
              },
            },
          ],
          as: "threadStats",
        },
      },
      {
        $lookup: {
          from: ForumThread.collection.name,
          let: { categoryId: "$_id" },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$category", "$$categoryId"] } },
            },
            { $sort: { updated: -1, _id: -1 } },
            { $limit: 1 },
            authorLookup("createdBy", "authorLookup"),
            authorLookup("lastPost.userId", "lastPostAuthorLookup"),
            {
              $set: {
                author: {
                  $ifNull: [{ $first: "$authorLookup" }, null],
                },
                "lastPost.author": {
                  $ifNull: [{ $first: "$lastPostAuthorLookup" }, null],
                },
              },
            },
            {
              $project: {
                title: 1,
                createdBy: 1,
                created: 1,
                updated: 1,
                pinned: 1,
                locked: 1,
                lastPost: 1,
                author: 1,
              },
            },
          ],
          as: "latestThreadLookup",
        },
      },
      {
        $set: {
          threadCount: {
            $ifNull: [{ $first: "$threadStats.threadCount" }, 0],
          },
          postCount: {
            $ifNull: [{ $first: "$threadStats.postCount" }, 0],
          },
          latestThread: {
            $ifNull: [{ $first: "$latestThreadLookup" }, null],
          },
        },
      },
      { $project: { threadStats: 0, latestThreadLookup: 0 } },
    ]);

    res.send(categories);
  } catch (e) {
    next(e);
  }
};

export const createForumCategory = async (req, res, next) => {
  if (!isAdmin(req.userRole)) {
    res.status(403).send("You do not have permission to create a category");
    return;
  }

  const name = validateText(req.body.name, "Category name", 100, res);
  if (!name) return;

  if (
    req.body.description !== undefined &&
    typeof req.body.description !== "string"
  ) {
    res.status(400).send("Description must be a string");
    return;
  }
  if (req.body.description?.length > 1000) {
    res.status(400).send("Description cannot exceed 1000 characters");
    return;
  }
  const sortOrder = req.body.sortOrder ?? 0;
  if (!validateSortOrder(sortOrder, res)) return;
  const icon = req.body.icon ?? "messages-square";
  if (typeof icon !== "string" || !VALID_ICONS.includes(icon)) {
    res.status(400).send("Icon must be one of the supported forum icons");
    return;
  }

  try {
    const duplicate = await ForumCategory.findOne({
      name: {
        $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    }).lean();
    if (duplicate) {
      res.status(409).send("A category with that name already exists");
      return;
    }

    const category = new ForumCategory({
      name,
      description: req.body.description || "",
      sortOrder,
      icon,
      createdBy: req.userId,
      created: Date.now(),
    });
    await category.save();
    res.send({ _id: category._id });
  } catch (e) {
    next(e);
  }
};

export const editForumCategory = async (req, res, next) => {
  if (!isAdmin(req.userRole)) {
    res.status(403).send("You do not have permission to edit a category");
    return;
  }

  const { categoryId } = req.params;
  if (!validateId(categoryId, "category", res)) return;

  const update = {};
  if (req.body.name !== undefined) {
    const name = validateText(req.body.name, "Category name", 100, res);
    if (!name) return;
    update.name = name;
  }
  if (req.body.description !== undefined) {
    if (typeof req.body.description !== "string") {
      res.status(400).send("Description must be a string");
      return;
    }
    if (req.body.description.length > 1000) {
      res.status(400).send("Description cannot exceed 1000 characters");
      return;
    }
    update.description = req.body.description;
  }
  if (req.body.sortOrder !== undefined) {
    if (!validateSortOrder(req.body.sortOrder, res)) return;
    update.sortOrder = req.body.sortOrder;
  }
  if (req.body.icon !== undefined) {
    if (
      typeof req.body.icon !== "string" ||
      !VALID_ICONS.includes(req.body.icon)
    ) {
      res.status(400).send("Icon must be one of the supported forum icons");
      return;
    }
    update.icon = req.body.icon;
  }
  if (Object.keys(update).length === 0) {
    res
      .status(400)
      .send("Request must include name, description, sortOrder or icon");
    return;
  }

  try {
    if (update.name) {
      const duplicate = await ForumCategory.findOne({
        _id: { $ne: categoryId },
        name: {
          $regex: `^${update.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          $options: "i",
        },
      }).lean();
      if (duplicate) {
        res.status(409).send("A category with that name already exists");
        return;
      }
    }

    const category = await ForumCategory.findByIdAndUpdate(
      categoryId,
      { $set: update },
      { new: true },
    ).lean();
    if (!category) {
      res.status(404).send("Category does not exist");
      return;
    }
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
};

export const deleteForumCategory = async (req, res, next) => {
  if (!isAdmin(req.userRole)) {
    res.status(403).send("You do not have permission to delete a category");
    return;
  }

  const { categoryId } = req.params;
  if (!validateId(categoryId, "category", res)) return;

  try {
    const category = await ForumCategory.findById(categoryId).lean();
    if (!category) {
      res.status(404).send("Category does not exist");
      return;
    }
    if (await ForumThread.exists({ category: categoryId })) {
      res
        .status(409)
        .send("Category cannot be deleted while it contains threads");
      return;
    }

    await ForumCategory.deleteOne({ _id: categoryId });
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
};

export const getCategoryThreads = async (req, res, next) => {
  const { categoryId } = req.params;
  if (!validateId(categoryId, "category", res)) return;
  const page = parsePage(req.params.page);

  try {
    const category = await ForumCategory.findById(categoryId).lean();
    if (!category) {
      res.status(404).send("Category does not exist");
      return;
    }

    const categoryObjectId = new mongoose.Types.ObjectId(categoryId);
    const [total, threads] = await Promise.all([
      ForumThread.countDocuments({ category: categoryId }),
      ForumThread.aggregate([
        { $match: { category: categoryObjectId } },
        { $sort: { pinned: -1, updated: -1, _id: -1 } },
        { $skip: page * pageSize },
        { $limit: pageSize },
        ...threadSummaryStages,
        { $project: { body: 0 } },
      ]),
    ]);

    res.send({ category, total, page, pageSize, threads });
  } catch (e) {
    next(e);
  }
};

export const createForumThread = async (req, res, next) => {
  if (!validateId(req.body.category, "category", res)) return;
  const title = validateText(req.body.title, "Title", 200, res);
  if (!title) return;
  const body = validateBody(req.body.body, 50000, res);
  if (!body) return;

  try {
    const category = await ForumCategory.findById(req.body.category).lean();
    if (!category) {
      res.status(404).send("Category does not exist");
      return;
    }

    const created = Date.now();
    const thread = new ForumThread({
      category: category._id,
      title,
      body,
      createdBy: req.userId,
      created,
      updated: created,
      pinned: false,
      locked: false,
      views: 0,
      lastPost: { userId: req.userId, body, created },
    });
    await thread.save();
    res.send({ _id: thread._id });
  } catch (e) {
    next(e);
  }
};

export const getForumThread = async (req, res, next) => {
  const { threadId } = req.params;
  if (!validateId(threadId, "thread", res)) return;

  try {
    const thread = await ForumThread.findById(threadId).lean();
    if (!thread) {
      res.status(404).send("Thread does not exist");
      return;
    }

    const now = Date.now();
    const isAuthor = thread.createdBy?.toString() === req.userId?.toString();
    if (!isAuthor && canCountView(req.userId, thread._id, now)) {
      await ForumThread.updateOne({ _id: thread._id }, { $inc: { views: 1 } });
      thread.views = (thread.views || 0) + 1;
    }

    const [author, lastPostAuthor, category, postCount] = await Promise.all([
      User.findById(thread.createdBy, { username: 1, avatarUpdated: 1 }).lean(),
      User.findById(thread.lastPost?.userId, {
        username: 1,
        avatarUpdated: 1,
      }).lean(),
      ForumCategory.findById(thread.category).lean(),
      ForumPost.countDocuments({ thread: thread._id }),
    ]);
    res.send({
      ...thread,
      author,
      category,
      postCount,
      lastPost: { ...thread.lastPost, author: lastPostAuthor },
    });
  } catch (e) {
    next(e);
  }
};

export const editForumThread = async (req, res, next) => {
  const { threadId } = req.params;
  if (!validateId(threadId, "thread", res)) return;

  const update = {};
  if (req.body.title !== undefined) {
    const title = validateText(req.body.title, "Title", 200, res);
    if (!title) return;
    update.title = title;
  }
  if (req.body.body !== undefined) {
    const body = validateBody(req.body.body, 50000, res);
    if (!body) return;
    update.body = body;
  }
  if (Object.keys(update).length === 0) {
    res.status(400).send("Request must include title or body");
    return;
  }

  try {
    const thread = await ForumThread.findById(threadId);
    if (!thread) {
      res.status(404).send("Thread does not exist");
      return;
    }
    if (
      !userOwns(thread, req.userId, "createdBy") &&
      !canModerate(req.userRole)
    ) {
      res.status(403).send("You do not have permission to edit this thread");
      return;
    }

    Object.assign(thread, update);
    if (update.body !== undefined) {
      const hasReplies = await ForumPost.exists({ thread: thread._id });
      if (!hasReplies) thread.lastPost.body = update.body;
    }
    await thread.save();
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
};

export const deleteForumThread = async (req, res, next) => {
  const { threadId } = req.params;
  if (!validateId(threadId, "thread", res)) return;

  try {
    const thread = await ForumThread.findById(threadId).lean();
    if (!thread) {
      res.status(404).send("Thread does not exist");
      return;
    }
    if (
      !userOwns(thread, req.userId, "createdBy") &&
      !canModerate(req.userRole)
    ) {
      res.status(403).send("You do not have permission to delete this thread");
      return;
    }

    await ForumThread.deleteOne({ _id: thread._id });
    await ForumPost.deleteMany({ thread: thread._id });
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
};

export const setForumThreadPinned = async (req, res, next) => {
  if (!canModerate(req.userRole)) {
    res.status(403).send("You do not have permission to pin threads");
    return;
  }

  const { threadId, action } = req.params;
  if (!validateId(threadId, "thread", res)) return;
  if (!["pin", "unpin"].includes(action)) {
    res.status(400).send("Action must be pin or unpin");
    return;
  }

  try {
    const thread = await ForumThread.findByIdAndUpdate(threadId, {
      $set: { pinned: action === "pin" },
    }).lean();
    if (!thread) {
      res.status(404).send("Thread does not exist");
      return;
    }
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
};

export const setForumThreadLocked = async (req, res, next) => {
  if (!canModerate(req.userRole)) {
    res.status(403).send("You do not have permission to lock threads");
    return;
  }

  const { threadId, action } = req.params;
  if (!validateId(threadId, "thread", res)) return;
  if (!["lock", "unlock"].includes(action)) {
    res.status(400).send("Action must be lock or unlock");
    return;
  }

  try {
    const thread = await ForumThread.findByIdAndUpdate(threadId, {
      $set: { locked: action === "lock" },
    }).lean();
    if (!thread) {
      res.status(404).send("Thread does not exist");
      return;
    }
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
};

export const getForumThreadPosts = async (req, res, next) => {
  const { threadId } = req.params;
  if (!validateId(threadId, "thread", res)) return;
  const page = parsePage(req.params.page);

  try {
    if (!(await ForumThread.exists({ _id: threadId }))) {
      res.status(404).send("Thread does not exist");
      return;
    }

    const threadObjectId = new mongoose.Types.ObjectId(threadId);
    const [total, posts] = await Promise.all([
      ForumPost.countDocuments({ thread: threadId }),
      ForumPost.aggregate([
        { $match: { thread: threadObjectId } },
        { $sort: { created: 1, _id: 1 } },
        { $skip: page * pageSize },
        { $limit: pageSize },
        authorLookup("userId", "authorLookup"),
        {
          $set: {
            author: { $ifNull: [{ $first: "$authorLookup" }, null] },
          },
        },
        { $project: { authorLookup: 0 } },
      ]),
    ]);
    res.send({ total, page, pageSize, posts });
  } catch (e) {
    next(e);
  }
};

export const createForumPost = async (req, res, next) => {
  const { threadId } = req.params;
  if (!validateId(threadId, "thread", res)) return;
  const body = validateBody(req.body.body, 50000, res);
  if (!body) return;

  try {
    const thread = await ForumThread.findById(threadId).lean();
    if (!thread) {
      res.status(404).send("Thread does not exist");
      return;
    }
    if (thread.locked) {
      res.status(403).send("Thread is locked");
      return;
    }

    const created = Date.now();
    const post = new ForumPost({
      thread: thread._id,
      userId: req.userId,
      body,
      created,
    });
    await post.save();
    const updatedThread = await ForumThread.findOneAndUpdate(
      { _id: thread._id, locked: false },
      {
        $set: {
          updated: created,
          lastPost: { userId: req.userId, body, created },
        },
      },
    ).lean();
    if (!updatedThread) {
      await ForumPost.deleteOne({ _id: post._id });
      res.status(409).send("Thread was locked or deleted before replying");
      return;
    }
    res.send({ _id: post._id });
  } catch (e) {
    next(e);
  }
};

export const editForumPost = async (req, res, next) => {
  const { postId } = req.params;
  if (!validateId(postId, "post", res)) return;
  const body = validateBody(req.body.body, 50000, res);
  if (!body) return;

  try {
    const post = await ForumPost.findById(postId);
    if (!post) {
      res.status(404).send("Post does not exist");
      return;
    }
    if (!userOwns(post, req.userId, "userId") && !canModerate(req.userRole)) {
      res.status(403).send("You do not have permission to edit this post");
      return;
    }

    post.body = body;
    post.edited = Date.now();
    await post.save();

    const latestPost = await ForumPost.findOne({ thread: post.thread })
      .sort({ created: -1, _id: -1 })
      .select("_id")
      .lean();
    if (latestPost?._id.toString() === post._id.toString()) {
      await ForumThread.updateOne(
        { _id: post.thread },
        { $set: { "lastPost.body": body } },
      );
    }
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
};

export const deleteForumPost = async (req, res, next) => {
  const { postId } = req.params;
  if (!validateId(postId, "post", res)) return;

  try {
    const post = await ForumPost.findById(postId).lean();
    if (!post) {
      res.status(404).send("Post does not exist");
      return;
    }
    if (!userOwns(post, req.userId, "userId") && !canModerate(req.userRole)) {
      res.status(403).send("You do not have permission to delete this post");
      return;
    }

    await ForumPost.deleteOne({ _id: post._id });
    const latestPost = await ForumPost.findOne({ thread: post.thread })
      .sort({ created: -1, _id: -1 })
      .lean();
    const thread = await ForumThread.findById(post.thread);
    if (thread) {
      thread.lastPost = latestPost
        ? {
            userId: latestPost.userId,
            body: latestPost.body,
            created: latestPost.created,
          }
        : {
            userId: thread.createdBy,
            body: thread.body,
            created: thread.created,
          };
      thread.updated = latestPost?.created || thread.created;
      await thread.save();
    }
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
};

export const searchForumThreads = async (req, res, next) => {
  if (
    typeof req.query.query !== "string" ||
    req.query.query.trim().length === 0
  ) {
    res.status(400).send("Search query is required");
    return;
  }

  const page = parsePage(req.query.page);
  const escapedQuery = req.query.query
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query = new RegExp(escapedQuery, "i");

  try {
    const matchingPostThreads = await ForumPost.distinct("thread", {
      body: query,
    });
    const filter = {
      $or: [
        { title: query },
        { body: query },
        { _id: { $in: matchingPostThreads } },
      ],
    };
    const [total, threads] = await Promise.all([
      ForumThread.countDocuments(filter),
      ForumThread.aggregate([
        { $match: filter },
        { $sort: { updated: -1, _id: -1 } },
        { $skip: page * pageSize },
        { $limit: pageSize },
        ...threadSummaryStages,
        {
          $lookup: {
            from: ForumCategory.collection.name,
            localField: "category",
            foreignField: "_id",
            as: "categoryLookup",
          },
        },
        {
          $set: {
            category: {
              $ifNull: [{ $first: "$categoryLookup" }, null],
            },
          },
        },
        { $project: { body: 0, categoryLookup: 0 } },
      ]),
    ]);
    res.send({ total, page, pageSize, threads });
  } catch (e) {
    next(e);
  }
};
