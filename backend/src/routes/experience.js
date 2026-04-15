const express = require("express");
const pool = require("../db/mysql");
const { requireUser } = require("../utils/auth");
const { serializePropertySummary } = require("../utils/propertyTransforms");

const router = express.Router();

async function getPropertySummariesByIds(ids) {
  if (!ids.length) {
    return [];
  }

  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT *
     FROM rets_property
     WHERE L_ListingID IN (${placeholders})`,
    ids
  );

  return ids
    .map((id) => rows.find((row) => String(row.L_ListingID) === String(id)))
    .filter(Boolean)
    .map(serializePropertySummary);
}

async function getRecommendationsForUser(userId) {
  const [seedRows] = await pool.query(
    `SELECT listing_id
     FROM (
       SELECT listing_id, MAX(created_at) AS stamp
       FROM user_favorites
       WHERE user_id = ?
       GROUP BY listing_id
       UNION ALL
       SELECT listing_id, MAX(viewed_at) AS stamp
       FROM user_property_views
       WHERE user_id = ?
       GROUP BY listing_id
     ) seeds
     ORDER BY stamp DESC
     LIMIT 6`,
    [userId, userId]
  );

  const seedIds = seedRows.map((row) => row.listing_id);
  if (!seedIds.length) {
    return [];
  }

  const seedProperties = await getPropertySummariesByIds(seedIds);
  const preferredCity = seedProperties[0]?.L_City || seedProperties[0]?.summary?.city || "";
  const prices = seedProperties
    .map((item) => Number(item.summary?.price || item.L_SystemPrice))
    .filter((value) => !Number.isNaN(value) && value > 0);
  const medianPrice =
    prices.length > 0 ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)] : null;

  const values = [preferredCity];
  let priceClause = "";
  if (medianPrice) {
    values.push(Math.max(0, medianPrice * 0.8), medianPrice * 1.2);
    priceClause = "AND L_SystemPrice BETWEEN ? AND ?";
  }

  if (seedIds.length > 0) {
    values.push(...seedIds);
  }

  const excludeClause =
    seedIds.length > 0
      ? `AND L_ListingID NOT IN (${seedIds.map(() => "?").join(", ")})`
      : "";

  const [rows] = await pool.query(
    `SELECT *
     FROM rets_property
     WHERE L_City = ?
     ${priceClause}
     ${excludeClause}
     ORDER BY ListingContractDate DESC, L_SystemPrice DESC
     LIMIT 8`,
    values
  );

  return rows.map(serializePropertySummary);
}

router.get("/workspace", requireUser, async (req, res) => {
  const [folderRows] = await pool.query(
    `SELECT f.id, f.name, f.color, COUNT(fp.id) AS itemCount
     FROM user_folders f
     LEFT JOIN folder_properties fp ON fp.folder_id = f.id
     WHERE f.user_id = ?
     GROUP BY f.id
     ORDER BY f.updated_at DESC`,
    [req.user.id]
  );

  const [folderItems] = await pool.query(
    `SELECT fp.id, fp.folder_id, fp.listing_id, fp.note, fp.stage, fp.created_at
     FROM folder_properties fp
     INNER JOIN user_folders f ON f.id = fp.folder_id
     WHERE f.user_id = ?
     ORDER BY fp.created_at DESC
     LIMIT 24`,
    [req.user.id]
  );

  const folderProperties = await getPropertySummariesByIds(
    folderItems.map((item) => item.listing_id)
  );

  const [tourRows] = await pool.query(
    `SELECT id, listing_id, scheduled_for, status
     FROM property_tours
     WHERE user_id = ?
     ORDER BY scheduled_for ASC
     LIMIT 10`,
    [req.user.id]
  );

  const [checklistRows] = await pool.query(
    `SELECT id, listing_id, title, status, updated_at
     FROM transaction_checklist_items
     WHERE user_id = ?
     ORDER BY updated_at DESC
     LIMIT 20`,
    [req.user.id]
  );

  const [boardRows] = await pool.query(
    `SELECT id, name, description, created_at
     FROM shared_boards
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 8`,
    [req.user.id]
  );

  const [boardItems] = await pool.query(
    `SELECT sbi.id, sbi.board_id, sbi.listing_id, sbi.comment, sbi.reaction, sbi.created_at
     FROM shared_board_items sbi
     INNER JOIN shared_boards sb ON sb.id = sbi.board_id
     WHERE sb.user_id = ?
     ORDER BY sbi.created_at DESC
     LIMIT 20`,
    [req.user.id]
  );

  const [[preferences]] = await pool.query(
    `SELECT instant_alerts, daily_digest, price_drops, open_houses
     FROM notification_preferences
     WHERE user_id = ?
     LIMIT 1`,
    [req.user.id]
  );

  const tourProperties = await getPropertySummariesByIds(tourRows.map((item) => item.listing_id));
  const boardProperties = await getPropertySummariesByIds(boardItems.map((item) => item.listing_id));
  const checklistProperties = await getPropertySummariesByIds(
    checklistRows.map((item) => item.listing_id).filter(Boolean)
  );
  const recommendations = await getRecommendationsForUser(req.user.id);

  return res.json({
    folders: folderRows.map((folder) => ({
      ...folder,
      itemCount: Number(folder.itemCount || 0),
      items: folderItems
        .filter((item) => item.folder_id === folder.id)
        .map((item) => ({
          ...item,
          property:
            folderProperties.find(
              (property) => String(property.L_ListingID) === String(item.listing_id)
            ) || null,
        })),
    })),
    tours: tourRows.map((tour) => ({
      ...tour,
      property:
        tourProperties.find(
          (property) => String(property.L_ListingID) === String(tour.listing_id)
        ) || null,
    })),
    checklist: checklistRows.map((item) => ({
      ...item,
      property:
        checklistProperties.find(
          (property) => String(property.L_ListingID) === String(item.listing_id)
        ) || null,
    })),
    boards: boardRows.map((board) => ({
      ...board,
      items: boardItems
        .filter((item) => item.board_id === board.id)
        .map((item) => ({
          ...item,
          property:
            boardProperties.find(
              (property) => String(property.L_ListingID) === String(item.listing_id)
            ) || null,
        })),
    })),
    preferences: preferences || {
      instant_alerts: 1,
      daily_digest: 1,
      price_drops: 1,
      open_houses: 1,
    },
    recommendations,
  });
});

router.post("/folders", requireUser, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const color = String(req.body?.color || "#0f766e").trim();

  if (!name) {
    return res.status(400).json({ error: "Folder name is required" });
  }

  const [insertResult] = await pool.query(
    "INSERT INTO user_folders (user_id, name, color) VALUES (?, ?, ?)",
    [req.user.id, name, color]
  );

  return res.json({ id: insertResult.insertId, name, color });
});

router.post("/folders/:id/listings", requireUser, async (req, res) => {
  const listingId = String(req.body?.listingId || "").trim();
  const note = String(req.body?.note || "").trim();
  const stage = String(req.body?.stage || "shortlist").trim();

  if (!listingId) {
    return res.status(400).json({ error: "listingId is required" });
  }

  await pool.query(
    `INSERT INTO folder_properties (folder_id, listing_id, note, stage)
     SELECT ?, ?, ?, ?
     FROM user_folders
     WHERE id = ? AND user_id = ?`,
    [req.params.id, listingId, note || null, stage, req.params.id, req.user.id]
  );

  return res.json({ ok: true });
});

router.patch("/folder-items/:id", requireUser, async (req, res) => {
  const note = req.body?.note !== undefined ? String(req.body.note).trim() : undefined;
  const stage = req.body?.stage !== undefined ? String(req.body.stage).trim() : undefined;
  const updates = [];
  const values = [];

  if (note !== undefined) {
    updates.push("note = ?");
    values.push(note || null);
  }

  if (stage !== undefined) {
    updates.push("stage = ?");
    values.push(stage || "shortlist");
  }

  if (!updates.length) {
    return res.status(400).json({ error: "No folder item updates provided" });
  }

  values.push(req.params.id, req.user.id);

  await pool.query(
    `UPDATE folder_properties fp
     INNER JOIN user_folders uf ON uf.id = fp.folder_id
     SET ${updates.join(", ")}
     WHERE fp.id = ? AND uf.user_id = ?`,
    values
  );

  return res.json({ ok: true });
});

router.post("/tours", requireUser, async (req, res) => {
  const listingId = String(req.body?.listingId || "").trim();
  const scheduledFor = String(req.body?.scheduledFor || "").trim();

  if (!listingId || !scheduledFor) {
    return res.status(400).json({ error: "listingId and scheduledFor are required" });
  }

  const [insertResult] = await pool.query(
    `INSERT INTO property_tours (user_id, listing_id, scheduled_for)
     VALUES (?, ?, ?)`,
    [req.user.id, listingId, scheduledFor]
  );

  return res.json({ id: insertResult.insertId, ok: true });
});

router.patch("/tours/:id", requireUser, async (req, res) => {
  const status = String(req.body?.status || "").trim();

  if (!status) {
    return res.status(400).json({ error: "status is required" });
  }

  await pool.query(
    `UPDATE property_tours
     SET status = ?
     WHERE id = ? AND user_id = ?`,
    [status, req.params.id, req.user.id]
  );

  return res.json({ ok: true });
});

router.post("/checklist-items", requireUser, async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const listingId = String(req.body?.listingId || "").trim();

  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }

  const [insertResult] = await pool.query(
    `INSERT INTO transaction_checklist_items (user_id, listing_id, title)
     VALUES (?, ?, ?)`,
    [req.user.id, listingId || null, title]
  );

  return res.json({ id: insertResult.insertId, ok: true });
});

router.patch("/checklist-items/:id", requireUser, async (req, res) => {
  const status = String(req.body?.status || "").trim();

  if (!status) {
    return res.status(400).json({ error: "status is required" });
  }

  await pool.query(
    `UPDATE transaction_checklist_items
     SET status = ?
     WHERE id = ? AND user_id = ?`,
    [status, req.params.id, req.user.id]
  );

  return res.json({ ok: true });
});

router.post("/boards", requireUser, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const description = String(req.body?.description || "").trim();

  if (!name) {
    return res.status(400).json({ error: "Board name is required" });
  }

  const [insertResult] = await pool.query(
    `INSERT INTO shared_boards (user_id, name, description)
     VALUES (?, ?, ?)`,
    [req.user.id, name, description || null]
  );

  return res.json({ id: insertResult.insertId, name, description });
});

router.post("/boards/:id/items", requireUser, async (req, res) => {
  const listingId = String(req.body?.listingId || "").trim();
  const comment = String(req.body?.comment || "").trim();
  const reaction = String(req.body?.reaction || "interested").trim();

  if (!listingId) {
    return res.status(400).json({ error: "listingId is required" });
  }

  await pool.query(
    `INSERT INTO shared_board_items (board_id, listing_id, comment, reaction)
     SELECT ?, ?, ?, ?
     FROM shared_boards
     WHERE id = ? AND user_id = ?`,
    [req.params.id, listingId, comment || null, reaction, req.params.id, req.user.id]
  );

  return res.json({ ok: true });
});

router.patch("/preferences", requireUser, async (req, res) => {
  const instantAlerts = req.body?.instantAlerts === false ? 0 : 1;
  const dailyDigest = req.body?.dailyDigest === false ? 0 : 1;
  const priceDrops = req.body?.priceDrops === false ? 0 : 1;
  const openHouses = req.body?.openHouses === false ? 0 : 1;

  await pool.query(
    `INSERT INTO notification_preferences
      (user_id, instant_alerts, daily_digest, price_drops, open_houses)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      instant_alerts = VALUES(instant_alerts),
      daily_digest = VALUES(daily_digest),
      price_drops = VALUES(price_drops),
      open_houses = VALUES(open_houses)`,
    [req.user.id, instantAlerts, dailyDigest, priceDrops, openHouses]
  );

  return res.json({ ok: true });
});

router.post("/assistant", requireUser, async (req, res) => {
  const message = String(req.body?.message || "").trim();
  const currentFilters = req.body?.currentFilters || {};

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  const [recentViewRows] = await pool.query(
    `SELECT listing_id
     FROM user_property_views
     WHERE user_id = ?
     ORDER BY viewed_at DESC
     LIMIT 3`,
    [req.user.id]
  );

  const recentHomes = await getPropertySummariesByIds(
    recentViewRows.map((row) => row.listing_id)
  );

  const hints = [];
  if (currentFilters.city) {
    hints.push(`You are currently focused on ${currentFilters.city}.`);
  }
  if (currentFilters.maxPrice) {
    hints.push(`Your current upper price target is about $${Number(currentFilters.maxPrice).toLocaleString()}.`);
  }
  if (recentHomes[0]?.summary?.address) {
    hints.push(`Recent interest suggests homes like ${recentHomes[0].summary.address} are relevant.`);
  }

  return res.json({
    reply: [
      "Here is a practical next step based on your search activity.",
      hints.join(" "),
      "Try saving the strongest two homes into a folder, schedule one tour, and compare price-per-square-foot before making your shortlist smaller.",
    ]
      .filter(Boolean)
      .join(" "),
  });
});

module.exports = router;
