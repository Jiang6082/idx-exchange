const express = require("express");
const pool = require("../db/mysql");
const { serializePropertySummary } = require("../utils/propertyTransforms");

const router = express.Router();

router.get("/estimate", async (req, res) => {
  try {
    const city = String(req.query.city || "").trim();
    const beds = Number(req.query.beds || 0);
    const baths = Number(req.query.baths || 0);
    const sqft = Number(req.query.sqft || 0);

    if (!city) {
      return res.status(400).json({ error: "city is required" });
    }

    const conditions = ["L_City = ?"];
    const values = [city];

    if (beds > 0) {
      conditions.push("L_Keyword2 >= ?");
      values.push(beds);
    }

    if (baths > 0) {
      conditions.push("LM_Dec_3 >= ?");
      values.push(baths);
    }

    if (sqft > 0) {
      conditions.push("LM_Int2_3 BETWEEN ? AND ?");
      values.push(Math.max(0, sqft * 0.8), sqft * 1.2);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const [[summary]] = await pool.query(
      `SELECT
        COUNT(*) AS totalComps,
        ROUND(AVG(L_SystemPrice)) AS averagePrice,
        ROUND(MIN(L_SystemPrice)) AS lowPrice,
        ROUND(MAX(L_SystemPrice)) AS highPrice
       FROM rets_property
       ${whereClause}`,
      values
    );

    const [compRows] = await pool.query(
      `SELECT *
       FROM rets_property
       ${whereClause}
       ORDER BY ABS(COALESCE(LM_Int2_3, 0) - ?) ASC, ListingContractDate DESC
       LIMIT 6`,
      [...values, sqft || 0]
    );

    return res.json({
      estimate: {
        city,
        totalComps: summary?.totalComps || 0,
        averagePrice: summary?.averagePrice || null,
        suggestedRangeLow: summary?.averagePrice
          ? Math.round(summary.averagePrice * 0.96)
          : summary?.lowPrice || null,
        suggestedRangeHigh: summary?.averagePrice
          ? Math.round(summary.averagePrice * 1.04)
          : summary?.highPrice || null,
        positioning:
          (summary?.totalComps || 0) > 15
            ? "Competitive market with enough comps to position confidently."
            : "Thinner comp set, so pricing should stay flexible.",
      },
      comps: compRows.map(serializePropertySummary),
    });
  } catch (error) {
    console.error("Seller estimate error:", error);
    return res.status(500).json({ error: "Failed to calculate seller estimate" });
  }
});

module.exports = router;
