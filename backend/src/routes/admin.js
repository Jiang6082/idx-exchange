const express = require("express");
const pool = require("../db/mysql");

const router = express.Router();

router.get("/overview", async (req, res) => {
  try {
    const [
      [userTotals],
      [favoriteTotals],
      [searchTotals],
      [alertTotals],
      [tourTotals],
      [boardTotals],
      [checklistTotals],
      [topCities],
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) AS totalUsers FROM app_users"),
      pool.query("SELECT COUNT(*) AS totalFavorites FROM user_favorites"),
      pool.query("SELECT COUNT(*) AS totalSavedSearches FROM saved_searches"),
      pool.query(
        "SELECT COUNT(*) AS unreadAlerts FROM saved_search_alerts WHERE is_read = 0"
      ),
      pool.query("SELECT COUNT(*) AS totalTours FROM property_tours"),
      pool.query("SELECT COUNT(*) AS totalBoards FROM shared_boards"),
      pool.query(
        "SELECT COUNT(*) AS totalChecklistItems FROM transaction_checklist_items"
      ),
      pool.query(
        `SELECT L_City AS city, COUNT(*) AS listings, ROUND(AVG(L_SystemPrice)) AS averagePrice
         FROM rets_property
         WHERE L_City IS NOT NULL AND TRIM(L_City) != ''
         GROUP BY L_City
         ORDER BY listings DESC
         LIMIT 8`
      ),
    ]);

    return res.json({
      metrics: {
        totalUsers: userTotals?.[0]?.totalUsers || 0,
        totalFavorites: favoriteTotals?.[0]?.totalFavorites || 0,
        totalSavedSearches: searchTotals?.[0]?.totalSavedSearches || 0,
        unreadAlerts: alertTotals?.[0]?.unreadAlerts || 0,
        totalTours: tourTotals?.[0]?.totalTours || 0,
        totalBoards: boardTotals?.[0]?.totalBoards || 0,
        totalChecklistItems: checklistTotals?.[0]?.totalChecklistItems || 0,
      },
      topCities,
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return res.status(500).json({ error: "Failed to load admin overview" });
  }
});

module.exports = router;
