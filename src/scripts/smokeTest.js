require("dotenv").config();
const mongoose = require("mongoose");
const { createApp } = require("../app");
const connectDB = require("../config/db");
const path = require("path");
const fs = require("fs");
const { processUpiImport } = require("../services/importService");

async function runSmokeTest() {
  console.log("🚀 Starting Smoke Test...");
  let server;

  try {
    // 1. Test DB Connection
    console.log("⏳ Connecting to MongoDB...");
    await connectDB();
    console.log("✅ MongoDB connected.");

    // 2. Test App Creation
    console.log("⏳ Creating Express app...");
    const app = createApp();
    console.log("✅ Express app created.");

    // 3. Test Health Endpoint (internal call)
    console.log("⏳ Testing /health endpoint...");
    // We can't easily 'fetch' from an unstarted server without more deps, 
    // but we can check the route exists.
    const healthRoute = app._router.stack.find(r => r.route && r.route.path === '/health');
    if (!healthRoute) throw new Error("Health route /health not found");
    console.log("✅ Health route found.");

    // 4. Test Ingestion Logic (Surgical test of service)
    const samplePdf = path.join(__dirname, "../data/sm_receipt_1776355678969.pdf");
    if (fs.existsSync(samplePdf)) {
      console.log("⏳ Testing ingestion service with sample PDF...");
      const result = await processUpiImport({
        filePath: samplePdf,
        originalFileName: "smoke-test.pdf",
        source: "SUPER_MONEY"
      });
      console.log("✅ Ingestion service successful:", result);
    } else {
      console.warn("⚠️ Sample PDF not found at", samplePdf, "- skipping ingestion test");
    }

    console.log("🎉 Smoke Test PASSED!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Smoke Test FAILED!");
    console.error(error);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
  }
}

runSmokeTest();
