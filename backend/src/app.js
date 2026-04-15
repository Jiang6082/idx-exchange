const express = require("express");
const cors = require("cors");
const pool = require("./db/mysql");
const propertiesRouter = require("./routes/properties");
const usersRouter = require("./routes/users");
const authRouter = require("./routes/auth");
const experienceRouter = require("./routes/experience");
const adminRouter = require("./routes/admin");
const insightsRouter = require("./routes/insights");
const sellerRouter = require("./routes/seller");
const aiRouter = require("./routes/ai");
const integrationsRouter = require("./routes/integrations");
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

  app.use("/api/auth", authRouter);
  app.use("/api/properties", propertiesRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/experience", experienceRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/insights", insightsRouter);
  app.use("/api/seller", sellerRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/integrations", integrationsRouter);

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
