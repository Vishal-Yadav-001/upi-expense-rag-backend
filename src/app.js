const express = require("express");
const cors = require("cors");
const uploadRoutes = require("./routes/upload.routes");
const sessionRoutes = require("./routes/session.routes");

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use((req, res, next) => {
    req.sessionId = req.header("X-Session-ID");
    next();
  });

  // Health check - used by deployment platforms and smoke tests.
  app.get("/health", (_, res) =>
    res.json({ status: "ok", timestamp: new Date().toISOString() }),
  );

  app.use("/api", uploadRoutes);
  app.use("/api/session", sessionRoutes);

  return app;
}

module.exports = { createApp };
