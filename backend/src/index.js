require("dotenv").config();

const { initializeDatabase } = require("./db/bootstrap");
const { startAlertJob } = require("./jobs/alerts");
const { createApp } = require("./app");

const PORT = process.env.PORT || 5050;
const app = createApp();

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    startAlertJob();
  })
  .catch((error) => {
    console.error("Failed to initialize database tables:", error);
    process.exit(1);
  });
