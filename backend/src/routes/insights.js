const express = require("express");
const pool = require("../db/mysql");

const router = express.Router();

router.get("/market", async (req, res) => {
  try {
    const city = String(req.query.city || "").trim();

    const conditions = [];
    const values = [];

    if (city) {
      conditions.push("L_City = ?");
      values.push(city);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [[summary]] = await pool.query(
      `SELECT
        COUNT(*) AS listingCount,
        ROUND(AVG(L_SystemPrice)) AS averagePrice,
        ROUND(AVG(LM_Int2_3)) AS averageSqft,
        ROUND(AVG(DaysOnMarket)) AS averageDaysOnMarket,
        MAX(COALESCE(ListingContractDate, OnMarketDate)) AS newestListingDate
       FROM rets_property
       ${whereClause}`,
      values
    );

    const [statusMix] = await pool.query(
      `SELECT COALESCE(StandardStatus, L_Status, 'Unknown') AS status, COUNT(*) AS total
       FROM rets_property
       ${whereClause}
       GROUP BY COALESCE(StandardStatus, L_Status, 'Unknown')
       ORDER BY total DESC
       LIMIT 8`,
      values
    );

    const [topCities] = await pool.query(
      `SELECT L_City AS city, COUNT(*) AS listingCount, ROUND(AVG(L_SystemPrice)) AS averagePrice
       FROM rets_property
       WHERE L_City IS NOT NULL AND TRIM(L_City) != ''
       GROUP BY L_City
       ORDER BY listingCount DESC
       LIMIT 10`
    );

    const [priceBands] = await pool.query(
      `SELECT
        SUM(CASE WHEN L_SystemPrice < 750000 THEN 1 ELSE 0 END) AS under750k,
        SUM(CASE WHEN L_SystemPrice BETWEEN 750000 AND 1499999 THEN 1 ELSE 0 END) AS midMarket,
        SUM(CASE WHEN L_SystemPrice >= 1500000 THEN 1 ELSE 0 END) AS luxury
       FROM rets_property
       ${whereClause}`,
      values
    );

    return res.json({
      summary,
      statusMix,
      topCities,
      priceBands: priceBands?.[0] || {
        under750k: 0,
        midMarket: 0,
        luxury: 0,
      },
    });
  } catch (error) {
    console.error("Insights error:", error);
    return res.status(500).json({ error: "Failed to load market insights" });
  }
});

module.exports = router;
