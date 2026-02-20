// backend/src/routes/properties.js
const express = require("express");
const router = express.Router();
const pool = require("../db/mysql");

/**
 * GET /api/properties
 *
 * Filters (Week 3 Step 3):
 *   ?city=Portland
 *   ?zipcode=97201
 *   ?minPrice=300000
 *   ?maxPrice=800000
 *   ?beds=3
 *   ?baths=2
 *
 * Pagination:
 *   ?limit=20&offset=0
 *
 * Your DB schema mapping (from DESCRIBE rets_property):
 *   city    -> L_City
 *   zipcode -> L_Zip
 *   price   -> L_SystemPrice
 *   beds    -> LM_Int2_3      (int)
 *   baths   -> LM_Dec_3       (decimal, e.g. 2.5)
 */

router.get("/", async (req, res) => {
  try {
    // -------------------------
    // Parse pagination
    // -------------------------
    const limit = req.query.limit !== undefined ? parseInt(req.query.limit, 10) : 20;
    const offset = req.query.offset !== undefined ? parseInt(req.query.offset, 10) : 0;

    // -------------------------
    // Read filters
    // -------------------------
    const { city, zipcode, minPrice, maxPrice, beds, baths } = req.query;

    // -------------------------
    // Week 3 Step 4: Validation
    // -------------------------
    if (Number.isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ error: "limit must be an integer between 1 and 100" });
    }
    if (Number.isNaN(offset) || offset < 0) {
      return res.status(400).json({ error: "offset must be a non-negative integer" });
    }

    // Numeric validation (only validate if provided)
    if (minPrice !== undefined && minPrice !== "" && Number.isNaN(Number(minPrice))) {
      return res.status(400).json({ error: "minPrice must be a number" });
    }
    if (maxPrice !== undefined && maxPrice !== "" && Number.isNaN(Number(maxPrice))) {
      return res.status(400).json({ error: "maxPrice must be a number" });
    }
    if (beds !== undefined && beds !== "" && Number.isNaN(Number(beds))) {
      return res.status(400).json({ error: "beds must be a number" });
    }
    if (baths !== undefined && baths !== "" && Number.isNaN(Number(baths))) {
      return res.status(400).json({ error: "baths must be a number" });
    }

    // Optional sanity checks
    if (zipcode !== undefined && zipcode !== "" && String(zipcode).length > 20) {
      return res.status(400).json({ error: "zipcode is too long" });
    }
    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice !== "" &&
      maxPrice !== "" &&
      Number(minPrice) > Number(maxPrice)
    ) {
      return res.status(400).json({ error: "minPrice cannot be greater than maxPrice" });
    }

    // -------------------------
    // Build WHERE clause safely
    // -------------------------
    const conditions = [];
    const values = [];

    if (city) {
      // Case-insensitive match
      conditions.push("LOWER(TRIM(L_City)) = LOWER(TRIM(?))");
      values.push(city);
    }

    if (zipcode) {
      conditions.push("L_Zip = ?");
      values.push(zipcode);
    }

    if (minPrice !== undefined && minPrice !== "") {
      conditions.push("L_SystemPrice >= ?");
      values.push(parseFloat(minPrice));
    }

    if (maxPrice !== undefined && maxPrice !== "") {
      conditions.push("L_SystemPrice <= ?");
      values.push(parseFloat(maxPrice));
    }

    if (beds !== undefined && beds !== "") {
      // Treat query as "at least X beds"
      conditions.push("LM_Int2_3 >= ?");
      values.push(parseInt(beds, 10));
    }

    if (baths !== undefined && baths !== "") {
      // Baths can be decimal (e.g. 2.5), treat as "at least X baths"
      conditions.push("LM_Dec_3 >= ?");
      values.push(parseFloat(baths));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // -------------------------
    // Total count query
    // -------------------------
    const countSql = `SELECT COUNT(*) AS total FROM rets_property ${whereClause}`;
    const [countRows] = await pool.query(countSql, values);
    const total = countRows?.[0]?.total ?? 0;

    // -------------------------
    // Data query (+ pagination)
    // -------------------------
    // Returning full rows can be heavy; selecting a subset is often better.
    // But to match your earlier setup, we keep SELECT *.
    const dataSql = `
      SELECT *
      FROM rets_property
      ${whereClause}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(dataSql, [...values, limit, offset]);

    return res.json({
      total,
      limit,
      offset,
      results: rows,
    });
  } catch (err) {
    console.error("GET /api/properties error:", err);
    return res.status(500).json({ error: "Failed to fetch properties" });
  }
});

module.exports = router;
