const cache = new Map();
let redisClient = null;
let redisUnavailable = false;

async function getRedisClient() {
  if (redisUnavailable || !process.env.REDIS_URL) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  try {
    // Optional dependency: when unavailable, the app transparently falls back to memory.
    const { createClient } = require("redis");
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", () => {});
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    redisUnavailable = true;
    return null;
  }
}

function getCacheKey(prefix, payload) {
  return `${prefix}:${JSON.stringify(payload)}`;
}

async function readCache(key) {
  const redis = await getRedisClient();
  if (redis) {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

async function writeCache(key, value, ttlMs = 15000) {
  const redis = await getRedisClient();
  if (redis) {
    await redis.set(key, JSON.stringify(value), {
      PX: ttlMs,
    });
    return;
  }

  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

module.exports = {
  getCacheKey,
  readCache,
  writeCache,
};
