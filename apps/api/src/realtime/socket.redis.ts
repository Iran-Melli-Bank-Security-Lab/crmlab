// src/realtime/socket.redis.ts

import Redis from "ioredis";

export type SocketRedisClients = {
  pubClient: Redis;
  subClient: Redis;
  close: () => Promise<void>;
};

let clients: SocketRedisClients | null = null;

type CreateSocketRedisClientsOptions = {
  redisUrl: string;
};

export async function createSocketRedisClients(
  options: CreateSocketRedisClientsOptions
): Promise<SocketRedisClients> {
  if (clients) return clients;

  const { redisUrl } = options;

  if (!redisUrl) {
    throw new Error("redisUrl is required for Socket.IO Redis adapter");
  }

  const pubClient = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: 10_000,
    retryStrategy(times) {
      return Math.min(times * 100, 5_000);
    },
  });

  const subClient = pubClient.duplicate();

  pubClient.on("error", (error) => {
    console.error("[socket:redis:pub:error]", error.message);
  });

  subClient.on("error", (error) => {
    console.error("[socket:redis:sub:error]", error.message);
  });

  pubClient.on("connect", () => {
    console.info("[socket:redis:pub:connect]");
  });

  subClient.on("connect", () => {
    console.info("[socket:redis:sub:connect]");
  });

  pubClient.on("ready", () => {
    console.info("[socket:redis:pub:ready]");
  });

  subClient.on("ready", () => {
    console.info("[socket:redis:sub:ready]");
  });

  pubClient.on("reconnecting", () => {
    console.warn("[socket:redis:pub:reconnecting]");
  });

  subClient.on("reconnecting", () => {
    console.warn("[socket:redis:sub:reconnecting]");
  });

  await Promise.all([pubClient.connect(), subClient.connect()]);

  clients = {
    pubClient,
    subClient,

    close: async () => {
      const currentClients = clients;
      clients = null;

      if (!currentClients) return;

      await Promise.allSettled([
        currentClients.pubClient.quit(),
        currentClients.subClient.quit(),
      ]);
    },
  };

  return clients;
}