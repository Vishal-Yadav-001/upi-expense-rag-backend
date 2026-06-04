const express = require("express");
const cors = require("cors");
const { resolveSessionId } = require("./middleware/resolveSessionId");
const uploadRoutes = require("./routes/upload.routes");
const sessionRoutes = require("./routes/session.routes");

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use(async (req, res, next) => {
    req.sessionId = await resolveSessionId(req);
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
