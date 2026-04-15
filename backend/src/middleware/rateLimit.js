const bucket = new Map();

function rateLimit({ windowMs = 60000, max = 300 } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const now = Date.now();
    const entry = bucket.get(key) || { count: 0, resetAt: now + windowMs };

    if (entry.resetAt < now) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }

    entry.count += 1;
    bucket.set(key, entry);

    if (entry.count > max) {
      return res.status(429).json({ error: "Too many requests. Please slow down." });
    }

    return next();
  };
}

module.exports = {
  rateLimit,
};
