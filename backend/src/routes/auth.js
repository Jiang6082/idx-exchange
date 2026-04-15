const express = require("express");
const pool = require("../db/mysql");
const {
  createSession,
  destroySession,
  getOrCreateUser,
  getUserFromSession,
  hashPassword,
  verifyPassword,
} = require("../utils/auth");

const router = express.Router();

router.get("/me", async (req, res) => {
  const user = await getUserFromSession(req);
  return res.json({ user: user || null });
});

router.post("/register", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const name = String(req.body?.name || "").trim();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await getOrCreateUser({ email, name: name || null });
    const { passwordHash, passwordSalt } = hashPassword(password);

    await pool.query(
      `INSERT INTO app_user_credentials (user_id, password_hash, password_salt)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
        password_hash = VALUES(password_hash),
        password_salt = VALUES(password_salt)`,
      [user.id, passwordHash, passwordSalt]
    );

    const session = await createSession(user.id);
    return res.json({
      user,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Failed to register account" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const [rows] = await pool.query(
      `SELECT u.id, u.email, u.name, c.password_hash, c.password_salt
       FROM app_users u
       INNER JOIN app_user_credentials c ON c.user_id = u.id
       WHERE u.email = ?
       LIMIT 1`,
      [email]
    );

    if (!rows.length || !verifyPassword(password, rows[0].password_hash, rows[0].password_salt)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const session = await createSession(rows[0].id);
    return res.json({
      user: {
        id: rows[0].id,
        email: rows[0].email,
        name: rows[0].name,
      },
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Failed to log in" });
  }
});

router.post("/logout", async (req, res) => {
  const token = String(req.header("x-session-token") || "").trim();
  if (token) {
    await destroySession(token);
  }
  return res.json({ ok: true });
});

module.exports = router;
