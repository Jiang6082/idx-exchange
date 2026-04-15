const express = require("express");
const cors = require("cors");
const pool = require("./db/mysql");
const propertiesRouter = require("./routes/properties");
const usersRouter = require("./routes/users");
const { rateLimit } = require("./middleware/rateLimit");

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(rateLimit());

  app.use((req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();

    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(
        `[${timestamp}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`
      );
    });

    next();
  });

  app.use("/api/properties", propertiesRouter);
  app.use("/api/users", usersRouter);

  app.get("/api/health", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", database: "connected" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.get("/", (req, res) => {
    res.send("IDX Exchange API is running");
  });

  return app;
}

module.exports = {
  createApp,
};
