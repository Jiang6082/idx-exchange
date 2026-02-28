// backend/src/routes/properties.js
const express = require("express");
const router = express.Router();
const pool = require("../db/mysql");

/**
 * Schema mapping (based on your DESCRIBE rets_property):
 * - Listing ID: L_ListingID
 * - City:       L_City
 * - Zip:        L_Zip
 * - Price:      L_SystemPrice
 * - Beds:       LM_Int2_3
 * - Baths:      LM_Dec_3 (decimal like 2.5)
 *
 * Week 4 guide uses "ListingId" in SQL. Your property table uses L_ListingID.
 * For openhouses, your rets_openhouse table may use ListingId (guide) or a different column.
 * If openhouses queries return "Unknown column", update OPENHOUSE_LISTING_ID_COL below.
 */
const PROPERTY_LISTING_ID_COL = "L_ListingID";
const OPENHOUSE_LISTING_ID_COL = "L_ListingId"; // change if your rets_openhouse uses a different column

// -------------------------
// Week 4 Step 2: ID Validation
// -------------------------
function validateListingId(id) {
  if (!id || String(id).trim() === "") {
    return { valid: false, error: "Listing ID is required" };
  }
  if (String(id).length > 50) {
    return { valid: false, error: "Listing ID is too long" };
  }
  return { valid: true };
}

// ======================================================
// Week 4 Step 1: Openhouses route MUST come first
// GET /api/properties/:id/openhouses
// ======================================================
router.get("/:id/openhouses", async (req, res) => {
  try {
    const { id } = req.params;

    const validation = validateListingId(id);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Check property exists (using your real listing id column)
    const [propertyCheck] = await pool.query(
      `SELECT ${PROPERTY_LISTING_ID_COL} FROM rets_property WHERE ${PROPERTY_LISTING_ID_COL} = ? LIMIT 1`,
      [id]
    );

    if (propertyCheck.length === 0) {
      return res.status(404).json({
        error: "Property not found",
        message: `No property exists with ID: ${id}`,
      });
    }

    // Fetch openhouses (column name may vary by your rets_openhouse schema)
    const [openhouses] = await pool.query(
        `SELECT *
        FROM rets_openhouse
        WHERE ${OPENHOUSE_LISTING_ID_COL} = ?
        ORDER BY OpenHouseDate, OH_StartTime`,
        [id]
    );


    

    return res.json({
      propertyId: id,
      count: openhouses.length,
      openhouses,
    });
  } catch (error) {
    console.error("Database error (openhouses):", error);
    return res.status(500).json({ error: "Failed to fetch open houses" });
  }
});

// ======================================================
// Week 4 Step 1: Property detail
// GET /api/properties/:id
// ======================================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const validation = validateListingId(id);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const [results] = await pool.query(
      `SELECT * FROM rets_property WHERE ${PROPERTY_LISTING_ID_COL} = ?`,
      [id]
    );

    if (results.length === 0) {
      return res.status(404).json({
        error: "Property not found",
        message: `No property exists with ID: ${id}`,
      });
    }

    return res.json(results[0]);
  } catch (error) {
    console.error("Database error (property detail):", error);
    return res.status(500).json({ error: "Failed to fetch property details" });
  }
});

// ======================================================
// Week 3 Step 3 + 4: Search route (keep AFTER :id routes)
// GET /api/properties
// ======================================================
router.get("/", async (req, res) => {
  try {
    // Pagination
    const limit = req.query.limit !== undefined ? parseInt(req.query.limit, 10) : 20;
    const offset = req.query.offset !== undefined ? parseInt(req.query.offset, 10) : 0;

    // Filters
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
      conditions.push("LM_Int2_3 >= ?");
      values.push(parseInt(beds, 10));
    }

    if (baths !== undefined && baths !== "") {
      conditions.push("LM_Dec_3 >= ?");
      values.push(parseFloat(baths));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // Total count
    const countSql = `SELECT COUNT(*) AS total FROM rets_property ${whereClause}`;
    const [countRows] = await pool.query(countSql, values);
    const total = countRows?.[0]?.total ?? 0;

    // Data
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
  } catch (error) {
    console.error("Database error (search):", error);
    return res.status(500).json({ error: "Failed to fetch properties" });
  }
});

module.exports = router;
