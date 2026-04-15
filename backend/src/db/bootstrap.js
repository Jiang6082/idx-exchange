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
    CREATE TABLE IF NOT EXISTS app_user_credentials (
      user_id INT NOT NULL PRIMARY KEY,
      password_hash VARCHAR(255) NOT NULL,
      password_salt VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_app_user_credentials_user
        FOREIGN KEY (user_id) REFERENCES app_users(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_sessions (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      session_token VARCHAR(255) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_app_sessions_user
        FOREIGN KEY (user_id) REFERENCES app_users(id)
        ON DELETE CASCADE
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_folders (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(191) NOT NULL,
      color VARCHAR(40) DEFAULT '#0f766e',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_user_folders_user
        FOREIGN KEY (user_id) REFERENCES app_users(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS folder_properties (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      folder_id INT NOT NULL,
      listing_id VARCHAR(255) NOT NULL,
      note TEXT DEFAULT NULL,
      stage VARCHAR(80) DEFAULT 'shortlist',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_folder_property (folder_id, listing_id),
      CONSTRAINT fk_folder_properties_folder
        FOREIGN KEY (folder_id) REFERENCES user_folders(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS property_tours (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      listing_id VARCHAR(255) NOT NULL,
      scheduled_for DATETIME NOT NULL,
      status VARCHAR(80) NOT NULL DEFAULT 'scheduled',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_property_tours_user
        FOREIGN KEY (user_id) REFERENCES app_users(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transaction_checklist_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      listing_id VARCHAR(255) DEFAULT NULL,
      title VARCHAR(191) NOT NULL,
      status VARCHAR(80) NOT NULL DEFAULT 'todo',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_transaction_checklist_user
        FOREIGN KEY (user_id) REFERENCES app_users(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shared_boards (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(191) NOT NULL,
      description TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_shared_boards_user
        FOREIGN KEY (user_id) REFERENCES app_users(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shared_board_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      board_id INT NOT NULL,
      listing_id VARCHAR(255) NOT NULL,
      comment TEXT DEFAULT NULL,
      reaction VARCHAR(40) DEFAULT 'interested',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_shared_board_items_board
        FOREIGN KEY (board_id) REFERENCES shared_boards(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shared_board_members (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      board_id INT NOT NULL,
      email VARCHAR(191) NOT NULL,
      role_name VARCHAR(80) NOT NULL DEFAULT 'viewer',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_board_member (board_id, email),
      CONSTRAINT fk_shared_board_members_board
        FOREIGN KEY (board_id) REFERENCES shared_boards(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS shared_board_comments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      board_item_id INT NOT NULL,
      author_name VARCHAR(191) DEFAULT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_shared_board_comments_item
        FOREIGN KEY (board_item_id) REFERENCES shared_board_items(id)
        ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id INT NOT NULL PRIMARY KEY,
      instant_alerts TINYINT(1) NOT NULL DEFAULT 1,
      daily_digest TINYINT(1) NOT NULL DEFAULT 1,
      price_drops TINYINT(1) NOT NULL DEFAULT 1,
      open_houses TINYINT(1) NOT NULL DEFAULT 1,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_notification_preferences_user
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
