const express = require("express");
const { getIntegrationStatus } = require("../services/integrations");

const router = express.Router();

router.get("/status", async (req, res) => {
  return res.json({
    integrations: getIntegrationStatus(),
  });
});

module.exports = router;
