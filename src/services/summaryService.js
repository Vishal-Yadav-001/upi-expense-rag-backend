const FinancialSummary = require("../models/FinancialSummary");
const Transaction = require("../models/Transaction");

/**
 * Generates or updates a monthly summary for a given session and month.
 * @param {string} sessionId - The session ID to scope the summary to.
 * @param {string} monthStr - Month in "YYYY-MM" format.
 */
async function generateMonthlySummary(sessionId, monthStr) {
  // monthStr format: "YYYY-MM"
  const startDate = new Date(`${monthStr}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(startDate.getMonth() + 1);

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
    { sessionId, type: "MONTHLY", period: monthStr },
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

module.exports = { generateMonthlySummary };
