require("dotenv").config();
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const { generateWeeklySummary, generateMonthlySummary } = require("../services/summaryService");
const { collectPeriods } = require("../utils/dateUtils");

async function backfill() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const transactions = await Transaction.find({});
    console.log(`Found ${transactions.length} transactions`);

    const sessions = [...new Set(transactions.map(tx => tx.sessionId))];
    console.log(`Unique sessions: ${sessions.length}`);

    for (const sessionId of sessions) {
      const sessionTxs = transactions.filter(tx => tx.sessionId === sessionId);
      const { uniqueMonths, uniqueWeeks } = collectPeriods(sessionTxs);

      console.log(`[${sessionId}] Updating ${uniqueMonths.size} months and ${uniqueWeeks.size} weeks...`);

      for (const monthStr of uniqueMonths) {
        await generateMonthlySummary(sessionId, monthStr);
      }

      for (const weekStr of uniqueWeeks) {
        await generateWeeklySummary(sessionId, weekStr);
      }
    }

    console.log("Backfill complete!");
    process.exit(0);
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exit(1);
  }
}

backfill();
