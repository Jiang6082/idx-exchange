const express = require("express");
const router = express.Router();
const pool = require("../db/mysql");
const { getCacheKey, readCache, writeCache } = require("../utils/cache");
const {
  serializePropertySummary,
  serializePropertyDetail,
} = require("../utils/propertyTransforms");

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

function validateShortText(value, label, maxLength = 120) {
  if (value !== undefined && value !== "" && String(value).trim().length > maxLength) {
    return `${label} is too long`;
  }

  return null;
}

function buildPropertyWhereClause(query) {
  const {
    q,
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
    excludeListingId,
  } = query;

  const conditions = [];
  const values = [];
  const hasBounds =
    north !== undefined ||
    south !== undefined ||
    east !== undefined ||
    west !== undefined;

  if (city) {
    conditions.push("LOWER(TRIM(L_City)) = LOWER(TRIM(?))");
    values.push(city);
  }

  if (q) {
    conditions.push(
      "(LOWER(L_City) LIKE LOWER(?) OR LOWER(L_Address) LIKE LOWER(?) OR LOWER(L_AddressStreet) LIKE LOWER(?) OR LOWER(L_ListingID) LIKE LOWER(?) OR LOWER(L_DisplayId) LIKE LOWER(?))"
    );
    const term = `%${q}%`;
    values.push(term, term, term, term, term);
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

  if (excludeListingId) {
    conditions.push(`${PROPERTY_LISTING_ID_COL} != ?`);
    values.push(excludeListingId);
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
    hasBounds,
  };
}

function buildSearchAnalytics(rows) {
  const prices = rows
    .map((row) => Number(row.L_SystemPrice))
    .filter((value) => !Number.isNaN(value) && value > 0);
  const pricePerSqft = rows
    .map((row) => {
      const price = Number(row.L_SystemPrice);
      const sqft = Number(row.LM_Int2_3);
      if (Number.isNaN(price) || Number.isNaN(sqft) || price <= 0 || sqft <= 0) {
        return null;
      }
      return price / sqft;
    })
    .filter(Boolean);
  const newestListingDate = rows
    .map((row) => row.ListingContractDate || row.OnMarketDate)
    .filter(Boolean)
    .sort()
    .reverse()[0] || null;
  const statusCounts = rows.reduce((acc, row) => {
    const status = row.StandardStatus || row.L_Status || "Unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return {
    averagePrice:
      prices.length > 0
        ? Math.round(prices.reduce((sum, value) => sum + value, 0) / prices.length)
        : null,
    medianPrice:
      prices.length > 0
        ? [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)]
        : null,
    averagePricePerSqft:
      pricePerSqft.length > 0
        ? Math.round(
            pricePerSqft.reduce((sum, value) => sum + value, 0) / pricePerSqft.length
          )
        : null,
    newestListingDate,
    statusCounts,
  };
}

function parseSearchQuery(req, res) {
  const limit =
    req.query.limit !== undefined ? parseInt(req.query.limit, 10) : 20;
  const offset =
    req.query.offset !== undefined ? parseInt(req.query.offset, 10) : 0;

  const {
    q,
    city,
    minPrice,
    maxPrice,
    beds,
    baths,
    zipcode,
    north,
    south,
    east,
    west,
  } = req.query;

  if (Number.isNaN(limit) || limit < 1 || limit > 1000) {
    res
      .status(400)
      .json({ error: "limit must be an integer between 1 and 1000" });
    return null;
  }

  if (Number.isNaN(offset) || offset < 0) {
    res.status(400).json({ error: "offset must be a non-negative integer" });
    return null;
  }

  if (minPrice !== undefined && minPrice !== "" && Number.isNaN(Number(minPrice))) {
    res.status(400).json({ error: "minPrice must be a number" });
    return null;
  }

  if (maxPrice !== undefined && maxPrice !== "" && Number.isNaN(Number(maxPrice))) {
    res.status(400).json({ error: "maxPrice must be a number" });
    return null;
  }

  if (beds !== undefined && beds !== "" && Number.isNaN(Number(beds))) {
    res.status(400).json({ error: "beds must be a number" });
    return null;
  }

  if (baths !== undefined && baths !== "" && Number.isNaN(Number(baths))) {
    res.status(400).json({ error: "baths must be a number" });
    return null;
  }

  if (zipcode !== undefined && zipcode !== "" && String(zipcode).length > 20) {
    res.status(400).json({ error: "zipcode is too long" });
    return null;
  }

  const textValidationError =
    validateShortText(q, "q") || validateShortText(city, "city", 80);

  if (textValidationError) {
    res.status(400).json({ error: textValidationError });
    return null;
  }

  if (
    minPrice !== undefined &&
    maxPrice !== undefined &&
    minPrice !== "" &&
    maxPrice !== "" &&
    Number(minPrice) > Number(maxPrice)
  ) {
    res.status(400).json({ error: "minPrice cannot be greater than maxPrice" });
    return null;
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
    res.status(400).json({
      error: "north, south, east, and west must all be valid numbers",
    });
    return null;
  }

  if (hasBounds && Number(south) > Number(north)) {
    res.status(400).json({ error: "south cannot be greater than north" });
    return null;
  }

  if (hasBounds && Number(west) > Number(east)) {
    res.status(400).json({ error: "west cannot be greater than east" });
    return null;
  }

  return { limit, offset };
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

// GET /api/properties/compare?ids=1,2,3
router.get("/compare", async (req, res) => {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 4);

    if (ids.length < 2) {
      return res.status(400).json({ error: "Provide between 2 and 4 listing ids" });
    }

    const placeholders = ids.map(() => "?").join(", ");
    const [rows] = await pool.query(
      `SELECT *
       FROM rets_property
       WHERE ${PROPERTY_LISTING_ID_COL} IN (${placeholders})`,
      ids
    );

    return res.json({
      results: ids
        .map((id) => rows.find((row) => String(row[PROPERTY_LISTING_ID_COL]) === id))
        .filter(Boolean)
        .map(serializePropertySummary),
    });
  } catch (error) {
    console.error("Database error (compare):", error);
    return res.status(500).json({ error: "Failed to fetch comparison properties" });
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

    const property = results[0];
    const timeline = [
      property.OriginalEntryTimestamp
        ? {
            label: "Entered system",
            date: property.OriginalEntryTimestamp,
          }
        : null,
      property.ListingContractDate
        ? {
            label: "Listed",
            date: property.ListingContractDate,
          }
        : null,
      property.PriceChangeTimestamp
        ? {
            label: "Price updated",
            date: property.PriceChangeTimestamp,
          }
        : null,
      property.StatusChangeTimestamp
        ? {
            label: "Status updated",
            date: property.StatusChangeTimestamp,
          }
        : null,
    ].filter(Boolean);

    const [[neighborhoodStats]] = await pool.query(
      `SELECT
        COUNT(*) AS listingCount,
        ROUND(AVG(L_SystemPrice)) AS averagePrice,
        ROUND(AVG(LM_Int2_3)) AS averageSqft,
        ROUND(AVG(DaysOnMarket)) AS averageDaysOnMarket
       FROM rets_property
       WHERE L_City = ?
         AND L_SystemPrice IS NOT NULL`,
      [property.L_City || ""]
    );

    const [relatedProperties] = await pool.query(
      `SELECT *
       FROM rets_property
       WHERE ${PROPERTY_LISTING_ID_COL} != ?
         AND L_City = ?
         AND L_SystemPrice BETWEEN ? AND ?
       ORDER BY ABS(L_SystemPrice - ?) ASC
       LIMIT 4`,
      [
        id,
        property.L_City || "",
        Math.max(0, Number(property.L_SystemPrice || 0) * 0.8),
        Number(property.L_SystemPrice || 0) * 1.2,
        Number(property.L_SystemPrice || 0),
      ]
    );

    return res.json(
      serializePropertyDetail(property, {
        neighborhoodStats,
        relatedProperties,
        timeline,
      })
    );
  } catch (error) {
    console.error("Database error (property detail):", error);
    return res.status(500).json({ error: "Failed to fetch property details" });
  }
});

// GET /api/properties
router.get("/", async (req, res) => {
  try {
    const searchQuery = parseSearchQuery(req, res);

    if (!searchQuery) {
      return;
    }

    const { limit, offset } = searchQuery;
    const { includeAnalytics, mapOnly, sortBy, sortOrder } = req.query;

    const { whereClause, values } = buildPropertyWhereClause(req.query);

    const validSortFields = {
      L_SystemPrice: "L_SystemPrice",
      ListingContractDate: "ListingContractDate",
      LM_Int2_3: "LM_Int2_3",
      L_Keyword2: "L_Keyword2",
      DaysOnMarket: "DaysOnMarket",
    };

    let orderClause = "";
    if (sortBy && validSortFields[sortBy]) {
      const order =
        sortOrder && String(sortOrder).toUpperCase() === "DESC" ? "DESC" : "ASC";
      orderClause = `ORDER BY ${validSortFields[sortBy]} ${order}`;
    } else if (sortBy) {
      return res.status(400).json({ error: "Invalid sortBy field" });
    }

    const cacheKey = getCacheKey("properties", req.query);
    const cached = await readCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const countSql = `SELECT COUNT(*) AS total FROM rets_property ${whereClause}`;
    const [countRows] = await pool.query(countSql, values);
    const total = countRows?.[0]?.total ?? 0;

    const selectColumns =
      mapOnly === "true"
        ? `${PROPERTY_LISTING_ID_COL}, L_Address, L_AddressStreet, L_City, L_State, L_Zip, L_SystemPrice, L_Photos, LMD_MP_Latitude, LMD_MP_Longitude, StandardStatus, L_Status, ListingContractDate`
        : "*";

    const dataSql = `
      SELECT ${selectColumns}
      FROM rets_property
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataSql, [...values, limit, offset]);

    const payload = {
      total,
      limit,
      offset,
      results: rows.map(serializePropertySummary),
      analytics:
        includeAnalytics === "true" ? buildSearchAnalytics(rows) : undefined,
    };

    await writeCache(cacheKey, payload, mapOnly === "true" ? 10000 : 15000);

    return res.json(payload);
  } catch (error) {
    console.error("Database error (search):", error);
    return res.status(500).json({ error: "Failed to fetch properties" });
  }
});

module.exports = router;
