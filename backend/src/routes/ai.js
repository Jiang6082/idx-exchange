const express = require("express");
const pool = require("../db/mysql");
const { generateSearchFilters, explainProperty } = require("../services/openai");

const router = express.Router();

router.post("/search", async (req, res) => {
  const message = String(req.body?.message || "").trim();

  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }

  const result = await generateSearchFilters(message);
  return res.json(result);
});

router.get("/properties/:id/explanation", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT *
     FROM rets_property
     WHERE L_ListingID = ?
     LIMIT 1`,
    [req.params.id]
  );

  if (!rows.length) {
    return res.status(404).json({ error: "Property not found" });
  }

  const explanation = await explainProperty(rows[0]);
  return res.json(explanation);
});

module.exports = router;
