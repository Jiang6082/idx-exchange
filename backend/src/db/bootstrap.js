const pool = require("./mysql");

async function ensureIndex(tableName, indexName, definition) {
  const [rows] = await pool.query(`SHOW INDEX FROM ${tableName} WHERE Key_name = ?`, [
    indexName,
  ]);

  if (rows.length === 0) {
    await pool.query(`CREATE INDEX ${indexName} ON ${tableName} (${definition})`);
  }
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(191) NOT NULL UNIQUE,
      name VARCHAR(191) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      listing_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_favorite (user_id, listing_id),
      CONSTRAINT fk_user_favorites_user
        FOREIGN KEY (user_id) REFERENCES app_users(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_searches (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(191) NOT NULL,
      filters JSON NOT NULL,
      alert_enabled TINYINT(1) NOT NULL DEFAULT 1,
      last_seen_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_saved_searches_user
        FOREIGN KEY (user_id) REFERENCES app_users(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_search_alerts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      saved_search_id INT NOT NULL,
      user_id INT NOT NULL,
      title VARCHAR(191) NOT NULL,
      message TEXT NOT NULL,
      match_count INT NOT NULL DEFAULT 0,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_saved_search_alerts_search
        FOREIGN KEY (saved_search_id) REFERENCES saved_searches(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_saved_search_alerts_user
        FOREIGN KEY (user_id) REFERENCES app_users(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_property_views (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      listing_id VARCHAR(255) NOT NULL,
      viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_views_user_viewed_at (user_id, viewed_at),
      CONSTRAINT fk_user_property_views_user
        FOREIGN KEY (user_id) REFERENCES app_users(id)
        ON DELETE CASCADE
    )
  `);

  await ensureIndex("rets_property", "idx_property_city", "L_City");
  await ensureIndex("rets_property", "idx_property_zip", "L_Zip");
  await ensureIndex("rets_property", "idx_property_price", "L_SystemPrice");
  await ensureIndex("rets_property", "idx_property_listing_date", "ListingContractDate");
  await ensureIndex(
    "rets_property",
    "idx_property_lat_lng",
    "LMD_MP_Latitude, LMD_MP_Longitude"
  );
}

module.exports = {
  initializeDatabase
};
