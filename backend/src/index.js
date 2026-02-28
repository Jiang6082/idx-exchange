const express = require("express");
const cors = require("cors");
const pool = require("./db/mysql");
require("dotenv").config();

const propertiesRouter = require("./routes/properties");

const app = express();
const PORT = process.env.PORT || 5000;

// 1) Middleware FIRST
app.use(cors());
app.use(express.json());

// 2) Request logging BEFORE routes
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// 3) Routes
app.use("/api/properties", propertiesRouter);

// 4) Health check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 5) (Optional but helpful) Root route
app.get("/", (req, res) => {
  res.send("IDX Exchange API is running");
});

// 6) Start server (near the bottom)
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
