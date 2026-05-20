const FinancialSummary = require("../models/FinancialSummary");
const Transaction = require("../models/Transaction");

/**
 * Shared helper to update a financial summary document.
 */
async function updateSummary(sessionId, type, period, startDate, endDate) {
  const stats = await Transaction.aggregate([
    { $match: { sessionId, date: { $gte: startDate, $lt: endDate }, status: "SUCCESS" } },
    {
      $group: {
        _id: null,
        totalDebit: { $sum: { $cond: [{ $eq: ["$direction", "DEBIT"] }, "$amount", 0] } },
        totalCredit: { $sum: { $cond: [{ $eq: ["$direction", "CREDIT"] }, "$amount", 0] } },
        count: { $sum: 1 }
      }
    }
  ]);

  const categories = await Transaction.aggregate([
    { $match: { sessionId, date: { $gte: startDate, $lt: endDate }, status: "SUCCESS", direction: "DEBIT" } },
    {
      $lookup: {
        from: "payees",
        localField: "payee",
        foreignField: "_id",
        as: "payeeInfo"
      }
    },
    { $unwind: "$payeeInfo" },
    { $group: { _id: "$payeeInfo.category", amount: { $sum: "$amount" } } },
    { $sort: { amount: -1 } },
    { $limit: 5 }
  ]);

  if (stats.length === 0) return null;

  return FinancialSummary.findOneAndUpdate(
    { sessionId, type, period },
    {
      data: {
        totalDebit: stats[0].totalDebit,
        totalCredit: stats[0].totalCredit,
        transactionCount: stats[0].count,
        topCategories: categories.map(c => ({ category: c._id, amount: c.amount }))
      },
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );
}

/**
 * Generates or updates a monthly summary.
 * @param {string} sessionId
 * @param {string} monthStr - Month in "YYYY-MM" format.
 */
async function generateMonthlySummary(sessionId, monthStr) {
  const startDate = new Date(`${monthStr}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(startDate.getMonth() + 1);
  return updateSummary(sessionId, "MONTHLY", monthStr, startDate, endDate);
}

/**
 * Generates or updates a weekly summary.
 * @param {string} sessionId
 * @param {string} weekStr - Start of week in "YYYY-MM-DD" format (usually Monday).
 */
async function generateWeeklySummary(sessionId, weekStr) {
  const startDate = new Date(weekStr);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 7);
  return updateSummary(sessionId, "WEEKLY", weekStr, startDate, endDate);
}

/**
 * Generates or updates a daily summary.
 * @param {string} sessionId
 * @param {string} dateStr - Date in "YYYY-MM-DD" format.
 */
async function generateDailySummary(sessionId, dateStr) {
  const startDate = new Date(dateStr);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 1);
  return updateSummary(sessionId, "DAILY", dateStr, startDate, endDate);
}

async function getSummaries({ sessionId, type = "MONTHLY", limit = 12 }) {
  const summaries = await FinancialSummary.find({ sessionId, type })
    .sort({ period: -1 })
    .limit(limit)
    .lean();

  return summaries.map(s => ({
    id: s._id,
    type: s.type,
    period: s.period,
    totalDebit: s.data.totalDebit,
    totalCredit: s.data.totalCredit,
    transactionCount: s.data.transactionCount,
    topCategories: s.data.topCategories,
    lastUpdated: s.lastUpdated ? s.lastUpdated.toISOString() : null
  }));
}

module.exports = { 
  generateMonthlySummary, 
  generateWeeklySummary, 
  generateDailySummary,
  getSummaries 
};
