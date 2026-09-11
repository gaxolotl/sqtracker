import crypto from "node:crypto";

const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;

const deepFreeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value))
    return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
};

export class PluginEventBus {
  constructor({ logger = console } = {}) {
    this.logger = logger;
    this.subscribers = new Map();
  }

  subscribe(pluginId, type, handler) {
    if (!EVENT_TYPE_PATTERN.test(type || "")) {
      throw new TypeError(`Invalid plugin event type: ${type}`);
    }
    if (typeof handler !== "function") {
      throw new TypeError("Plugin event subscriber must be a function");
    }
    const subscribers = this.subscribers.get(type) ?? [];
    const subscription = { pluginId, handler };
    subscribers.push(subscription);
    this.subscribers.set(type, subscribers);
    return () => {
      const current = this.subscribers.get(type) ?? [];
      this.subscribers.set(
        type,
        current.filter((candidate) => candidate !== subscription),
      );
    };
  }

  createEnvelope(type, data, actor = null) {
    if (!EVENT_TYPE_PATTERN.test(type || "")) {
      throw new TypeError(`Invalid plugin event type: ${type}`);
    }
    return deepFreeze({
      id: crypto.randomUUID(),
      type,
      apiVersion: 1,
      occurredAt: new Date().toISOString(),
      actor: actor === null ? null : structuredClone(actor),
      data: structuredClone(data ?? {}),
    });
  }

  async deliver(envelope) {
    const subscribers = [...(this.subscribers.get(envelope.type) ?? [])];
    await Promise.all(
      subscribers.map(async ({ pluginId, handler }) => {
        try {
          await handler(envelope);
        } catch (error) {
          this.logger.error(
            `[sq] plugin ${pluginId} failed handling ${envelope.type}: ${error.message}`,
          );
        }
      }),
    );
    return envelope;
  }

  emit(type, data, actor = null) {
    return this.deliver(this.createEnvelope(type, data, actor));
  }

  emitDetached(type, data, actor = null) {
    const envelope = this.createEnvelope(type, data, actor);
    queueMicrotask(() => {
      this.deliver(envelope).catch((error) => {
        this.logger.error(
          `[sq] failed dispatching plugin event ${type}: ${error.message}`,
        );
      });
    });
  }
}

const pluginEvents = new PluginEventBus();

export default pluginEvents;
