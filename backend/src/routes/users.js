const express = require("express");
const pool = require("../db/mysql");

const router = express.Router();

function getUserIdentity(req) {
  const email = String(req.header("x-user-email") || "").trim().toLowerCase();
  const name = String(req.header("x-user-name") || "").trim();

  if (!email) {
    return null;
  }

  return { email, name: name || null };
}

async function getOrCreateUser(identity) {
  const [existing] = await pool.query(
    "SELECT id, email, name, created_at, updated_at FROM app_users WHERE email = ? LIMIT 1",
    [identity.email]
  );

  if (existing.length > 0) {
    const user = existing[0];

    if (identity.name && identity.name !== user.name) {
      await pool.query("UPDATE app_users SET name = ? WHERE id = ?", [
        identity.name,
        user.id,
      ]);
      user.name = identity.name;
    }

    return user;
  }

  const [insertResult] = await pool.query(
    "INSERT INTO app_users (email, name) VALUES (?, ?)",
    [identity.email, identity.name]
  );

  return {
    id: insertResult.insertId,
    email: identity.email,
    name: identity.name,
  };
}

async function requireUser(req, res, next) {
  try {
    const identity = getUserIdentity(req);

    if (!identity) {
      return res.status(400).json({ error: "User email is required" });
    }

    req.user = await getOrCreateUser(identity);
    return next();
  } catch (error) {
    console.error("User route error:", error);
    return res.status(500).json({ error: "Failed to load user account" });
  }
}

router.get("/me", requireUser, async (req, res) => {
  const [favoritesRows] = await pool.query(
    "SELECT listing_id FROM user_favorites WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id]
  );

  const [searchRows] = await pool.query(
    `SELECT id, name, filters, alert_enabled, last_seen_count, created_at, updated_at
     FROM saved_searches
     WHERE user_id = ?
     ORDER BY updated_at DESC`,
    [req.user.id]
  );

  const [viewRows] = await pool.query(
    `SELECT listing_id, viewed_at
     FROM user_property_views
     WHERE user_id = ?
     ORDER BY viewed_at DESC
     LIMIT 12`,
    [req.user.id]
  );

  const [alertRows] = await pool.query(
    `SELECT id, title, message, match_count, is_read, created_at
     FROM saved_search_alerts
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 20`,
    [req.user.id]
  );

  return res.json({
    user: req.user,
    favorites: favoritesRows.map((row) => row.listing_id),
    savedSearches: searchRows.map((row) => ({
      id: row.id,
      name: row.name,
      filters:
        typeof row.filters === "string" ? JSON.parse(row.filters) : row.filters || {},
      alertEnabled: Boolean(row.alert_enabled),
      lastSeenCount: row.last_seen_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    recentViews: viewRows,
    alerts: alertRows.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      matchCount: row.match_count,
      isRead: Boolean(row.is_read),
      createdAt: row.created_at,
    })),
  });
});

router.get("/me/favorite-properties", requireUser, async (req, res) => {
  const limit =
    req.query.limit !== undefined ? Math.min(50, Math.max(1, Number(req.query.limit))) : 20;
  const offset =
    req.query.offset !== undefined ? Math.max(0, Number(req.query.offset)) : 0;

  const [[countRow]] = await pool.query(
    "SELECT COUNT(*) AS total FROM user_favorites WHERE user_id = ?",
    [req.user.id]
  );

  const [rows] = await pool.query(
    `SELECT p.*
     FROM user_favorites f
     INNER JOIN rets_property p ON p.L_ListingID = f.listing_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`,
    [req.user.id, limit, offset]
  );

  return res.json({
    total: countRow?.total || 0,
    limit,
    offset,
    results: rows,
  });
});

router.put("/me", requireUser, async (req, res) => {
  const nextName = String(req.body?.name || "").trim();

  await pool.query("UPDATE app_users SET name = ? WHERE id = ?", [
    nextName || null,
    req.user.id,
  ]);

  return res.json({
    user: {
      ...req.user,
      name: nextName || null,
    },
  });
});

router.post("/me/favorites", requireUser, async (req, res) => {
  const listingId = String(req.body?.listingId || "").trim();

  if (!listingId) {
    return res.status(400).json({ error: "listingId is required" });
  }

  await pool.query(
    "INSERT IGNORE INTO user_favorites (user_id, listing_id) VALUES (?, ?)",
    [req.user.id, listingId]
  );

  return res.json({ ok: true });
});

router.delete("/me/favorites/:listingId", requireUser, async (req, res) => {
  await pool.query(
    "DELETE FROM user_favorites WHERE user_id = ? AND listing_id = ?",
    [req.user.id, req.params.listingId]
  );

  return res.json({ ok: true });
});

router.post("/me/saved-searches", requireUser, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const filters = req.body?.filters || {};
  const alertEnabled = req.body?.alertEnabled !== false;

  if (!name) {
    return res.status(400).json({ error: "Search name is required" });
  }

  const [insertResult] = await pool.query(
    `INSERT INTO saved_searches (user_id, name, filters, alert_enabled)
     VALUES (?, ?, ?, ?)`,
    [req.user.id, name, JSON.stringify(filters), alertEnabled ? 1 : 0]
  );

  return res.json({
    id: insertResult.insertId,
    name,
    filters,
    alertEnabled,
  });
});

router.patch("/me/saved-searches/:id", requireUser, async (req, res) => {
  const updates = [];
  const values = [];

  if (req.body?.name !== undefined) {
    updates.push("name = ?");
    values.push(String(req.body.name).trim() || "Saved search");
  }

  if (req.body?.filters !== undefined) {
    updates.push("filters = ?");
    values.push(JSON.stringify(req.body.filters || {}));
  }

  if (req.body?.alertEnabled !== undefined) {
    updates.push("alert_enabled = ?");
    values.push(req.body.alertEnabled ? 1 : 0);
  }

  if (req.body?.lastSeenCount !== undefined) {
    updates.push("last_seen_count = ?");
    values.push(Number(req.body.lastSeenCount) || 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No saved search updates provided" });
  }

  values.push(req.user.id, req.params.id);

  await pool.query(
    `UPDATE saved_searches
     SET ${updates.join(", ")}
     WHERE user_id = ? AND id = ?`,
    values
  );

  return res.json({ ok: true });
});

router.delete("/me/saved-searches/:id", requireUser, async (req, res) => {
  await pool.query("DELETE FROM saved_searches WHERE user_id = ? AND id = ?", [
    req.user.id,
    req.params.id,
  ]);

  return res.json({ ok: true });
});

router.post("/me/views", requireUser, async (req, res) => {
  const listingId = String(req.body?.listingId || "").trim();

  if (!listingId) {
    return res.status(400).json({ error: "listingId is required" });
  }

  await pool.query(
    "INSERT INTO user_property_views (user_id, listing_id) VALUES (?, ?)",
    [req.user.id, listingId]
  );

  return res.json({ ok: true });
});

router.patch("/me/alerts/:id/read", requireUser, async (req, res) => {
  await pool.query(
    "UPDATE saved_search_alerts SET is_read = 1 WHERE user_id = ? AND id = ?",
    [req.user.id, req.params.id]
  );

  return res.json({ ok: true });
});

module.exports = router;
