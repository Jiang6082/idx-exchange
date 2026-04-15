const pool = require("../db/mysql");

async function processSavedSearchAlerts() {
  const [searches] = await pool.query(`
    SELECT id, user_id, name, filters, alert_enabled, last_seen_count
    FROM saved_searches
    WHERE alert_enabled = 1
  `);

  for (const search of searches) {
    const filters =
      typeof search.filters === "string" ? JSON.parse(search.filters) : search.filters || {};

    const conditions = [];
    const values = [];

    if (filters.q) {
      conditions.push(
        "(LOWER(L_City) LIKE LOWER(?) OR LOWER(L_Address) LIKE LOWER(?) OR LOWER(L_AddressStreet) LIKE LOWER(?) OR LOWER(L_ListingID) LIKE LOWER(?) OR LOWER(L_DisplayId) LIKE LOWER(?))"
      );
      const term = `%${filters.q}%`;
      values.push(term, term, term, term, term);
    }

    if (filters.city) {
      conditions.push("LOWER(TRIM(L_City)) = LOWER(TRIM(?))");
      values.push(filters.city);
    }

    if (filters.zipcode) {
      conditions.push("L_Zip = ?");
      values.push(filters.zipcode);
    }

    if (filters.minPrice) {
      conditions.push("L_SystemPrice >= ?");
      values.push(Number(filters.minPrice));
    }

    if (filters.maxPrice) {
      conditions.push("L_SystemPrice <= ?");
      values.push(Number(filters.maxPrice));
    }

    if (filters.beds) {
      conditions.push("L_Keyword2 >= ?");
      values.push(Number(filters.beds));
    }

    if (filters.baths) {
      conditions.push("LM_Dec_3 >= ?");
      values.push(Number(filters.baths));
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM rets_property ${whereClause}`,
      values
    );
    const total = rows[0]?.total || 0;

    if (total > Number(search.last_seen_count || 0)) {
      await pool.query(
        `INSERT INTO saved_search_alerts (saved_search_id, user_id, title, message, match_count)
         VALUES (?, ?, ?, ?, ?)`,
        [
          search.id,
          search.user_id,
          `New matches for ${search.name}`,
          `${total - Number(search.last_seen_count || 0)} new homes match your saved search.`,
          total,
        ]
      );
    }

    await pool.query("UPDATE saved_searches SET last_seen_count = ? WHERE id = ?", [
      total,
      search.id,
    ]);
  }
}

function startAlertJob() {
  const interval = setInterval(() => {
    processSavedSearchAlerts().catch((error) => {
      console.error("Saved search alert job failed:", error);
    });
  }, 5 * 60 * 1000);

  return interval;
}

module.exports = {
  processSavedSearchAlerts,
  startAlertJob,
};
