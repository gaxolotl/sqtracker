import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import mongoose from "mongoose";
import reseedManifest from "../../plugins/reseed-radar/manifest.js";
import reseedServer from "../../plugins/reseed-radar/server.js";
import { PluginEventBus } from "../src/plugins/eventBus.js";
import { createPluginHost } from "../src/plugins/host.js";
import {
  getDefaultSettings,
  getPublicSettings,
  validatePluginSettings,
  validateSettingsDescriptors,
} from "../src/plugins/settings.js";
import { orderPluginRegistry } from "../src/plugins/validation.js";
import {
  evaluateRequestEligibility,
  fuzzyScore,
  getCooldownRemainingMs,
  isRequestExpired,
  normalizeInfoHash,
} from "../../plugins/reseed-radar/server.js";

const manifest = (id, dependencies = []) => ({
  id,
  name: id,
  version: "1.0.0",
  apiVersion: 1,
  sqtrackr: ">=2.1.0",
  permissions: ["routes"],
  dependencies,
});

const serverPlugin = { register() {} };

test("validates and deterministically orders plugin dependencies", () => {
  const ordered = orderPluginRegistry([
    { manifest: manifest("zz-plugin", ["aa-plugin"]), server: serverPlugin },
    { manifest: manifest("bb-plugin"), server: serverPlugin },
    { manifest: manifest("aa-plugin"), server: serverPlugin },
  ]);

  assert.deepEqual(
    ordered.map((entry) => entry.manifest.id),
    ["aa-plugin", "bb-plugin", "zz-plugin"],
  );
  assert.equal(ordered[2].manifest.sqtrackr, ">=2.1.0");
});

test("rejects invalid manifests, duplicate IDs, missing dependencies, and cycles", () => {
  assert.throws(
    () =>
      orderPluginRegistry([
        {
          manifest: { ...manifest("bad-plugin"), permissions: ["filesystem"] },
          server: serverPlugin,
        },
      ]),
    /unrecognized permission/,
  );
  assert.throws(
    () =>
      orderPluginRegistry([
        { manifest: manifest("same-plugin"), server: serverPlugin },
        { manifest: manifest("same-plugin"), server: serverPlugin },
      ]),
    /Duplicate plugin id/,
  );
  assert.throws(
    () =>
      orderPluginRegistry([
        {
          manifest: manifest("dependent", ["missing-plugin"]),
          server: serverPlugin,
        },
      ]),
    /missing plugin/,
  );
  assert.throws(
    () =>
      orderPluginRegistry([
        {
          manifest: manifest("first-plugin", ["second-plugin"]),
          server: serverPlugin,
        },
        {
          manifest: manifest("second-plugin", ["first-plugin"]),
          server: serverPlugin,
        },
      ]),
    /cycle/,
  );
});

test("loads defaults and strictly validates complete plugin settings", () => {
  const descriptors = validateSettingsDescriptors({
    enabled: { type: "boolean", default: true, public: true },
    count: { type: "integer", default: 3, min: 1, max: 5 },
    ratio: { type: "number", default: 1.5, min: 0 },
    mode: {
      type: "string",
      default: "normal",
      maxLength: 10,
      options: ["normal", "fast"],
    },
  });

  assert.deepEqual(getDefaultSettings(descriptors), {
    enabled: true,
    count: 3,
    ratio: 1.5,
    mode: "normal",
  });
  assert.deepEqual(
    getPublicSettings(descriptors, getDefaultSettings(descriptors)),
    {
      enabled: true,
    },
  );
  assert.throws(
    () =>
      validatePluginSettings(descriptors, {
        enabled: true,
        count: 3,
        ratio: 1.5,
      }),
    /Missing plugin setting: mode/,
  );
  assert.throws(
    () =>
      validatePluginSettings(descriptors, {
        enabled: true,
        count: 3,
        ratio: 1.5,
        mode: "normal",
        secret: "unexpected",
      }),
    /Unknown plugin setting/,
  );
  assert.throws(
    () =>
      validatePluginSettings(descriptors, {
        enabled: true,
        count: 3.5,
        ratio: 1.5,
        mode: "normal",
      }),
    /must be an integer/,
  );
});

test("admin plugin settings persist full updates and refresh public values", async (t) => {
  const documents = new Map();
  const settingsModel = {
    findById(id) {
      return { lean: async () => documents.get(id) ?? null };
    },
    async findByIdAndUpdate(id, update) {
      const current = documents.get(id) ?? { _id: id };
      documents.set(id, { ...current, ...update.$set });
    },
  };
  const settingsPlugin = {
    register({ settings }) {
      settings.register({
        threshold: {
          type: "integer",
          default: 2,
          min: 1,
          max: 10,
          public: true,
        },
        internalLabel: {
          type: "string",
          default: "private",
          maxLength: 20,
        },
      });
    },
  };
  const settingsManifest = {
    ...manifest("settings-test"),
    permissions: ["settings"],
  };
  const host = createPluginHost({
    registry: [{ manifest: settingsManifest, server: settingsPlugin }],
    settingsModel,
  });
  await host.register();
  await host.initialize();
  await host.ready();

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.userId = "507f1f77bcf86cd799439011";
    req.userRole = req.headers["x-test-role"];
    next();
  });
  app.use("/admin/plugins", host.managementRouter);
  app.use("/plugins", host.publicRouter);
  const listener = await new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
  t.after(async () => {
    await host.stop();
    await new Promise((resolve) => listener.close(resolve));
  });
  const { port } = listener.address();
  const url = `http://127.0.0.1:${port}`;

  assert.deepEqual(documents.get("settings-test").values, {
    threshold: 2,
    internalLabel: "private",
  });
  assert.equal((await fetch(`${url}/admin/plugins`)).status, 403);
  const adminResponse = await fetch(`${url}/admin/plugins`, {
    headers: { "x-test-role": "admin" },
  });
  const adminPlugin = (await adminResponse.json()).plugins[0];
  assert.equal(adminPlugin.health, "healthy");
  assert.equal(adminPlugin.descriptors[0].key, "threshold");
  assert.equal(adminPlugin.values.threshold, 2);

  const incomplete = await fetch(
    `${url}/admin/plugins/settings-test/settings`,
    {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-test-role": "admin",
      },
      body: JSON.stringify({ threshold: 4 }),
    },
  );
  assert.equal(incomplete.status, 400);

  const updated = await fetch(`${url}/admin/plugins/settings-test/settings`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "x-test-role": "admin",
    },
    body: JSON.stringify({ threshold: 4, internalLabel: "hidden" }),
  });
  assert.equal(updated.status, 200);
  const publicResponse = await fetch(`${url}/plugins`);
  const publicPlugin = (await publicResponse.json()).plugins[0];
  assert.deepEqual(publicPlugin.settings, { threshold: 4 });
});

test("admins can disable, enable, remove, and reinstall plugins", async (t) => {
  const documents = new Map();
  const settingsModel = {
    findById(id) {
      return { lean: async () => documents.get(id) ?? null };
    },
    async findByIdAndUpdate(id, update) {
      const current = documents.get(id) ?? { _id: id };
      documents.set(id, { ...current, ...update.$set });
    },
    async findByIdAndDelete(id) {
      documents.delete(id);
    },
  };
  const plugin = {
    register({ routes, settings }) {
      settings.register({
        threshold: {
          type: "integer",
          default: 2,
          min: 1,
          max: 10,
          public: true,
        },
      });
      routes.user.get("/ping", (req, res) => res.send("pong"));
    },
  };
  const host = createPluginHost({
    registry: [
      {
        manifest: {
          ...manifest("manage-test"),
          permissions: ["settings", "routes:user"],
        },
        server: plugin,
      },
    ],
    settingsModel,
  });
  await host.register();
  await host.initialize();
  await host.ready();

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.userId = "507f1f77bcf86cd799439011";
    req.userRole = req.headers["x-test-role"];
    next();
  });
  app.use("/plugins", host.publicRouter);
  app.use("/plugins", host.userRouter);
  app.use("/admin/plugins", host.managementRouter);
  const listener = await new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
  t.after(async () => {
    await host.stop();
    await new Promise((resolve) => listener.close(resolve));
  });
  const { port } = listener.address();
  const base = `http://127.0.0.1:${port}`;
  const admin = (path, options = {}) =>
    fetch(`${base}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        "x-test-role": "admin",
        ...(options.headers ?? {}),
      },
    });
  const publicPlugins = async () =>
    (await (await fetch(`${base}/plugins`)).json()).plugins.length;
  const ping = () =>
    fetch(`${base}/plugins/manage-test/ping`, {
      headers: { "x-test-role": "user" },
    });

  assert.equal(await publicPlugins(), 1);
  assert.equal(await (await ping()).text(), "pong");

  const disabled = await admin("/admin/plugins/manage-test/enabled", {
    method: "PUT",
    body: JSON.stringify({ enabled: false }),
  });
  assert.equal(disabled.status, 200);
  assert.equal((await disabled.json()).enabled, false);
  assert.equal(await publicPlugins(), 0);
  assert.equal((await ping()).status, 404);

  await admin("/admin/plugins/manage-test/enabled", {
    method: "PUT",
    body: JSON.stringify({ enabled: true }),
  });
  assert.equal(await publicPlugins(), 1);
  assert.equal(await (await ping()).text(), "pong");

  const removed = await admin("/admin/plugins/manage-test", {
    method: "DELETE",
  });
  assert.equal(removed.status, 200);
  const removedBody = await removed.json();
  assert.equal(removedBody.installed, false);
  assert.equal(documents.has("manage-test"), false);
  assert.equal(await publicPlugins(), 0);

  const installed = await admin("/admin/plugins/manage-test/install", {
    method: "POST",
  });
  assert.equal(installed.status, 200);
  assert.equal((await installed.json()).installed, true);
  assert.equal(await publicPlugins(), 1);
});

test("event envelopes are immutable and subscriber failures are isolated", async () => {
  const errors = [];
  const bus = new PluginEventBus({
    logger: { error: (message) => errors.push(message) },
  });
  let received;
  bus.subscribe("broken-plugin", "torrent.deleted", async () => {
    throw new Error("subscriber failed");
  });
  bus.subscribe("healthy-plugin", "torrent.deleted", (event) => {
    received = event;
  });

  const emitted = await bus.emit(
    "torrent.deleted",
    { id: "torrent-id", nested: { safe: true } },
    { userId: "user-id" },
  );

  assert.equal(received, emitted);
  assert.equal(emitted.apiVersion, 1);
  assert.ok(Object.isFrozen(emitted));
  assert.ok(Object.isFrozen(emitted.data.nested));
  assert.throws(() => {
    emitted.data.nested.safe = false;
  }, TypeError);
  assert.equal(errors.length, 1);
  assert.doesNotMatch(errors[0], /torrent-id|user-id/);
});

test("plugin routes are namespaced, role-gated, and forward async failures", async (t) => {
  const testPlugin = {
    register({ routes }) {
      routes.public.get("/public", (req, res) => res.send("public"));
      routes.user.get("/user", (req, res) => res.send("user"));
      routes.public.get("/shared", (req, res) => res.send("public"));
      routes.user.get("/shared", (req, res) => res.send("private"));
      routes.staff.get("/staff", (req, res) => res.send("staff"));
      routes.admin.get("/admin", (req, res) => res.send("admin"));
      routes.public.get("/failure", async () => {
        throw new Error("expected failure");
      });
    },
  };
  const host = createPluginHost({
    registry: [{ manifest: manifest("route-test"), server: testPlugin }],
  });
  await host.register();

  const app = express();
  app.use("/plugins", host.publicRouter);
  app.use((req, res, next) => {
    req.userId = "user-id";
    req.userRole = req.headers["x-test-role"];
    next();
  });
  app.use("/plugins", host.userRouter);
  app.use("/plugins", host.staffRouter);
  app.use("/plugins", host.adminRouter);
  app.use((error, req, res, next) => {
    res.status(555).send(error.message);
  });

  const listener = await new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
  t.after(async () => {
    await host.stop();
    await new Promise((resolve) => listener.close(resolve));
  });
  const { port } = listener.address();
  const request = (path, role, authenticated = false) =>
    fetch(`http://127.0.0.1:${port}${path}`, {
      headers: {
        ...(role ? { "x-test-role": role } : {}),
        ...(authenticated ? { authorization: "Bearer test" } : {}),
      },
    });

  assert.equal((await request("/plugins/route-test/public")).status, 200);
  assert.equal((await request("/route-test/public")).status, 404);
  assert.equal((await request("/plugins/route-test/user", "user")).status, 200);
  assert.equal(
    await (await request("/plugins/route-test/shared")).text(),
    "public",
  );
  assert.equal(
    await (await request("/plugins/route-test/shared", "user", true)).text(),
    "private",
  );
  assert.equal(
    (await request("/plugins/route-test/staff", "user")).status,
    403,
  );
  assert.equal(
    (await request("/plugins/route-test/staff", "staff")).status,
    200,
  );
  assert.equal(
    (await request("/plugins/route-test/admin", "staff")).status,
    403,
  );
  assert.equal(
    (await request("/plugins/route-test/admin", "admin")).status,
    200,
  );
  assert.equal((await request("/plugins/route-test/failure")).status, 555);
});

test("plugin role guards only apply to phases the plugin registers", async (t) => {
  const userOnly = {
    register({ routes }) {
      routes.user.get("/ping", (req, res) => res.send("pong"));
    },
  };
  const host = createPluginHost({
    registry: [
      {
        manifest: { ...manifest("user-only"), permissions: ["routes:user"] },
        server: userOnly,
      },
    ],
  });
  await host.register();

  const app = express();
  app.use((req, res, next) => {
    req.userId = "user-id";
    req.userRole = req.headers["x-test-role"];
    next();
  });
  app.use("/plugins", host.userRouter);
  app.use("/plugins", host.staffRouter);
  app.use("/plugins", host.adminRouter);
  const listener = await new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
  t.after(async () => {
    await host.stop();
    await new Promise((resolve) => listener.close(resolve));
  });
  const { port } = listener.address();
  const base = `http://127.0.0.1:${port}`;

  assert.equal(
    (
      await fetch(`${base}/plugins/user-only/ping`, {
        headers: { "x-test-role": "user" },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await fetch(`${base}/plugins/user-only/missing`, {
        headers: { "x-test-role": "user" },
      })
    ).status,
    404,
  );
});

test("Reseed Radar domain helpers enforce age, seeders, completion, limits, and cooldown", () => {
  const now = new Date("2026-09-11T12:00:00.000Z");
  const settings = {
    minimumAgeDays: 7,
    requestCooldownHours: 24,
    maxActivePerUser: 5,
    completedDownloadersOnly: true,
  };
  const torrent = {
    created: now.getTime() - 8 * 24 * 60 * 60 * 1000,
  };

  assert.equal(
    evaluateRequestEligibility({
      torrent,
      seeders: 0,
      completed: true,
      activeCount: 4,
      settings,
      now,
    }).eligible,
    true,
  );
  assert.equal(
    evaluateRequestEligibility({
      torrent,
      seeders: 1,
      completed: true,
      activeCount: 0,
      settings,
      now,
    }).code,
    "torrent-has-seeders",
  );
  assert.equal(
    evaluateRequestEligibility({
      torrent: { created: now.getTime() - 6 * 24 * 60 * 60 * 1000 },
      seeders: 0,
      completed: true,
      activeCount: 0,
      settings,
      now,
    }).code,
    "torrent-too-new",
  );
  assert.equal(
    evaluateRequestEligibility({
      torrent,
      seeders: 0,
      completed: false,
      activeCount: 0,
      settings,
      now,
    }).code,
    "download-not-completed",
  );
  assert.equal(
    evaluateRequestEligibility({
      torrent,
      seeders: 0,
      completed: true,
      activeCount: 5,
      settings,
      now,
    }).code,
    "active-request-limit",
  );

  assert.equal(normalizeInfoHash("A".repeat(40)), "a".repeat(40));
  assert.equal(normalizeInfoHash("not-a-hash"), null);
  assert.equal(
    getCooldownRemainingMs(
      new Date(now.getTime() - 23 * 60 * 60 * 1000),
      24,
      now,
    ),
    60 * 60 * 1000,
  );
  assert.equal(
    isRequestExpired({ expiresAt: new Date(now.getTime() - 1) }, now),
    true,
  );
});

test("Reseed Radar request model keeps fulfillment metadata", async () => {
  const host = createPluginHost({
    registry: [{ manifest: reseedManifest, server: reseedServer }],
  });
  await host.register();
  try {
    const model = mongoose.models.Plugin_reseed_radar_request;
    assert.ok(model, "expected the Reseed Radar request model to register");
    assert.ok(model.schema.path("fulfilledAt"));
    assert.ok(model.schema.path("closeReason"));
  } finally {
    await host.stop();
  }
});

test("Reseed Radar fuzzy search matches substrings, tokens, and subsequences", () => {
  const name = "The.Last.of.Us.S02E04.2160p.WEB-DL";

  assert.ok(fuzzyScore(name, "last of us") > 0);
  assert.ok(fuzzyScore(name, "the last") > 0);
  assert.ok(fuzzyScore(name, "us") > 0);
  assert.ok(fuzzyScore(name, "tLoU") > 0);
  assert.equal(fuzzyScore(name, "dune part two"), 0);
  assert.equal(fuzzyScore(name, "   "), 0);

  const exact = fuzzyScore(name, "last");
  const loose = fuzzyScore(name, "tlou");
  assert.ok(exact > loose);
});
