const express = require("express");
const cors = require("cors");
const { verifyToken } = require("@clerk/clerk-sdk-node");
const uploadRoutes = require("./routes/upload.routes");
const sessionRoutes = require("./routes/session.routes");

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use(async (req, res, next) => {
    let sessionId = req.header("X-Session-ID");
    
    const authHeader = req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const decoded = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY,
        });
        sessionId = decoded.sub; // Map Clerk userId to sessionId
      } catch (err) {
        console.warn("[Auth REST] Clerk token verification failed:", err.message);
      }
    }
    
    req.sessionId = sessionId;
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
