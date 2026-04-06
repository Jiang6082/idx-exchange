const express = require("express");
const router = express.Router();
const pool = require("../db/mysql");

const PROPERTY_LISTING_ID_COL = "L_ListingID";
const OPENHOUSE_LISTING_ID_COL = "L_ListingID";

function validateListingId(id) {
  if (!id || String(id).trim() === "") {
    return { valid: false, error: "Listing ID is required" };
  }
  if (String(id).length > 50) {
    return { valid: false, error: "Listing ID is too long" };
  }
  return { valid: true };
}

// GET /api/properties/:id/openhouses
router.get("/:id/openhouses", async (req, res) => {
  try {
    const { id } = req.params;

    const validation = validateListingId(id);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const [propertyCheck] = await pool.query(
      `SELECT ${PROPERTY_LISTING_ID_COL} 
       FROM rets_property 
       WHERE ${PROPERTY_LISTING_ID_COL} = ? 
       LIMIT 1`,
      [id]
    );

    if (propertyCheck.length === 0) {
      return res.status(404).json({
        error: "Property not found",
        message: `No property exists with ID: ${id}`,
      });
    }

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

// GET /api/properties/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const validation = validateListingId(id);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const [results] = await pool.query(
      `SELECT * 
       FROM rets_property 
       WHERE ${PROPERTY_LISTING_ID_COL} = ?`,
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

// GET /api/properties
router.get("/", async (req, res) => {
  try {
    const limit =
      req.query.limit !== undefined ? parseInt(req.query.limit, 10) : 20;
    const offset =
      req.query.offset !== undefined ? parseInt(req.query.offset, 10) : 0;

    const {
      city,
      zipcode,
      minPrice,
      maxPrice,
      beds,
      baths,
      north,
      south,
      east,
      west,
      sortBy,
      sortOrder,
    } = req.query;

    if (Number.isNaN(limit) || limit < 1 || limit > 1000) {
      return res
        .status(400)
        .json({ error: "limit must be an integer between 1 and 1000" });
    }

    if (Number.isNaN(offset) || offset < 0) {
      return res
        .status(400)
        .json({ error: "offset must be a non-negative integer" });
    }

    if (
      minPrice !== undefined &&
      minPrice !== "" &&
      Number.isNaN(Number(minPrice))
    ) {
      return res.status(400).json({ error: "minPrice must be a number" });
    }

    if (
      maxPrice !== undefined &&
      maxPrice !== "" &&
      Number.isNaN(Number(maxPrice))
    ) {
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
      return res
        .status(400)
        .json({ error: "minPrice cannot be greater than maxPrice" });
    }

    const hasBounds =
      north !== undefined ||
      south !== undefined ||
      east !== undefined ||
      west !== undefined;

    if (
      hasBounds &&
      [north, south, east, west].some(
        (value) => value === undefined || value === "" || Number.isNaN(Number(value))
      )
    ) {
      return res.status(400).json({
        error: "north, south, east, and west must all be valid numbers",
      });
    }

    if (hasBounds && Number(south) > Number(north)) {
      return res.status(400).json({ error: "south cannot be greater than north" });
    }

    if (hasBounds && Number(west) > Number(east)) {
      return res.status(400).json({ error: "west cannot be greater than east" });
    }

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
      conditions.push("L_Keyword2 >= ?");
      values.push(parseInt(beds, 10));
    }

    if (baths !== undefined && baths !== "") {
      conditions.push("LM_Dec_3 >= ?");
      values.push(parseFloat(baths));
    }

    if (hasBounds) {
      conditions.push("LMD_MP_Latitude IS NOT NULL");
      conditions.push("LMD_MP_Longitude IS NOT NULL");
      conditions.push("LMD_MP_Latitude != 0");
      conditions.push("LMD_MP_Longitude != 0");
      conditions.push("LMD_MP_Latitude BETWEEN ? AND ?");
      conditions.push("LMD_MP_Longitude BETWEEN ? AND ?");
      values.push(Number(south), Number(north), Number(west), Number(east));
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const validSortFields = {
      L_SystemPrice: "L_SystemPrice",
      ListingContractDate: "ListingContractDate",
      LM_Int2_3: "LM_Int2_3",
      L_Keyword2: "L_Keyword2",
    };

    let orderClause = "";
    if (sortBy && validSortFields[sortBy]) {
      const order =
        sortOrder && String(sortOrder).toUpperCase() === "DESC" ? "DESC" : "ASC";
      orderClause = `ORDER BY ${validSortFields[sortBy]} ${order}`;
    }

    const countSql = `SELECT COUNT(*) AS total FROM rets_property ${whereClause}`;
    const [countRows] = await pool.query(countSql, values);
    const total = countRows?.[0]?.total ?? 0;

    const dataSql = `
      SELECT *
      FROM rets_property
      ${whereClause}
      ${orderClause}
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
