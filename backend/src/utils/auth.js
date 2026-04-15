const pool = require("../db/mysql");

function getUserIdentity(req) {
  const email = String(req.header("x-user-email") || "").trim().toLowerCase();
  const name = String(req.header("x-user-name") || "").trim();

  if (!email) {
    return null;
  }

  return { email, name: name || null };
}

async function getOrCreateUser(identity) {
  const [existing] = await pool.query(
    "SELECT id, email, name, created_at, updated_at FROM app_users WHERE email = ? LIMIT 1",
    [identity.email]
  );

  if (existing.length > 0) {
    const user = existing[0];

    if (identity.name && identity.name !== user.name) {
      await pool.query("UPDATE app_users SET name = ? WHERE id = ?", [
        identity.name,
        user.id,
      ]);
      user.name = identity.name;
    }

    return user;
  }

  const [insertResult] = await pool.query(
    "INSERT INTO app_users (email, name) VALUES (?, ?)",
    [identity.email, identity.name]
  );

  return {
    id: insertResult.insertId,
    email: identity.email,
    name: identity.name,
  };
}

async function requireUser(req, res, next) {
  try {
    const identity = getUserIdentity(req);

    if (!identity) {
      return res.status(400).json({ error: "User email is required" });
    }

    req.user = await getOrCreateUser(identity);
    return next();
  } catch (error) {
    console.error("User route error:", error);
    return res.status(500).json({ error: "Failed to load user account" });
  }
}

module.exports = {
  getUserIdentity,
  getOrCreateUser,
  requireUser,
};
