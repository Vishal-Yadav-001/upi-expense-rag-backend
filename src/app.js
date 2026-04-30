const express = require("express");
const cors = require("cors");
const uploadRoutes = require("./routes/upload.routes");

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check - used by deployment platforms and smoke tests.
  app.get("/health", (_, res) =>
    res.json({ status: "ok", timestamp: new Date().toISOString() }),
  );

  app.use("/api", uploadRoutes);

  return app;
}

module.exports = { createApp };
