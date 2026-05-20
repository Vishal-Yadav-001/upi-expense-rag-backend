require("dotenv").config();
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const { generateWeeklySummary, generateMonthlySummary } = require("../services/summaryService");

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
      const uniqueMonths = new Set();
      const uniqueWeeks = new Set();

      sessionTxs.forEach(tx => {
        const date = new Date(tx.date);
        
        // Monthly string: YYYY-MM
        const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        uniqueMonths.add(monthStr);

        // Weekly string: YYYY-MM-DD of Monday
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        const weekStr = monday.toISOString().split("T")[0];
        uniqueWeeks.add(weekStr);
      });

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
