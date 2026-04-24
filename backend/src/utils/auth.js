const pool = require("../db/mysql");
const crypto = require("crypto");

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

async function getUserByEmail(email) {
  const [rows] = await pool.query(
    "SELECT id, email, name, created_at, updated_at FROM app_users WHERE email = ? LIMIT 1",
    [email]
  );

  return rows[0] || null;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const passwordHash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");

  return {
    passwordHash,
    passwordSalt: salt,
  };
}

function verifyPassword(password, hash, salt) {
  const candidate = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");

  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}

async function createSession(userId) {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const ttlDays = Number(process.env.SESSION_TTL_DAYS || 14);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * ttlDays);

  await pool.query(
    `INSERT INTO app_sessions (user_id, session_token, expires_at)
     VALUES (?, ?, ?)`,
    [userId, sessionToken, expiresAt]
  );

  return {
    sessionToken,
    expiresAt,
  };
}

async function getUserFromSession(req) {
  const token = String(req.header("x-session-token") || "").trim();

  if (!token) {
    return null;
  }

  const [rows] = await pool.query(
    `SELECT u.id, u.email, u.name, u.created_at, u.updated_at
     FROM app_sessions s
     INNER JOIN app_users u ON u.id = s.user_id
     WHERE s.session_token = ?
       AND s.expires_at > NOW()
     LIMIT 1`,
    [token]
  );

  return rows[0] || null;
}

async function destroySession(token) {
  await pool.query("DELETE FROM app_sessions WHERE session_token = ?", [token]);
}

function isAdminUser(user) {
  const configuredAdmins = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(user?.email) && configuredAdmins.includes(String(user.email).toLowerCase());
}

async function requireSessionUser(req, res, next) {
  try {
    const sessionUser = await getUserFromSession(req);
    if (!sessionUser) {
      return res.status(401).json({ error: "Sign in is required" });
    }

    req.user = sessionUser;
    return next();
  } catch (error) {
    console.error("Session auth error:", error);
    return res.status(500).json({ error: "Failed to validate session" });
  }
}

async function requireAdminUser(req, res, next) {
  try {
    const sessionUser = await getUserFromSession(req);
    if (!sessionUser) {
      return res.status(401).json({ error: "Sign in is required" });
    }

    if (!isAdminUser(sessionUser)) {
      return res.status(403).json({ error: "Admin access is required" });
    }

    req.user = sessionUser;
    return next();
  } catch (error) {
    console.error("Admin auth error:", error);
    return res.status(500).json({ error: "Failed to validate admin session" });
  }
}

async function requireUser(req, res, next) {
  try {
    const sessionUser = await getUserFromSession(req);
    if (sessionUser) {
      req.user = sessionUser;
      return next();
    }

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
  getUserByEmail,
  hashPassword,
  verifyPassword,
  createSession,
  getUserFromSession,
  destroySession,
  isAdminUser,
  requireUser,
  requireSessionUser,
  requireAdminUser,
};
