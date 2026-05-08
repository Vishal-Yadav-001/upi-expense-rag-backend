const mongoose = require("mongoose");

const financialSummarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  sessionId: { type: String, required: true, index: true },
  type: { type: String, enum: ["DAILY", "WEEKLY", "MONTHLY"], required: true },
  period: { type: String, required: true }, // e.g., "2026-05"
  data: {
    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
    transactionCount: { type: Number, default: 0 },
    topCategories: [{
      category: String,
      amount: Number
    }]
  },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

financialSummarySchema.index({ sessionId: 1, type: 1, period: 1 }, { unique: true });

module.exports = mongoose.model("FinancialSummary", financialSummarySchema);
