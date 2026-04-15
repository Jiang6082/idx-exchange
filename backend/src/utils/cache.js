const cache = new Map();

function getCacheKey(prefix, payload) {
  return `${prefix}:${JSON.stringify(payload)}`;
}

function readCache(key) {
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

function writeCache(key, value, ttlMs = 15000) {
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
