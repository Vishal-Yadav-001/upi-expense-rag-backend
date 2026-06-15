const Transaction = require("../models/Transaction");

/**
 * Live-aggregation replacement for the old pre-computed FinancialSummary approach.
 *
 * Runs real-time MongoDB aggregations against Transaction + Payee collections.
 * This means category changes are reflected instantly — no sync needed.
 *
 * For a single-user UPI dataset (<2000 transactions) each aggregation
 * completes in ~50-100ms, which is negligible compared to UI render or LLM latency.
 */

/**
 * Returns live financial summaries grouped by period (MONTHLY or WEEKLY).
 * Each entry contains totals, transaction count, and top spending categories.
 */
async function getSummaries({ sessionId, type = "MONTHLY", limit = 12 }) {
  // Build the date-grouping expression based on period type
  const dateGroupExpr =
    type === "MONTHLY"
      ? { $dateToString: { format: "%Y-%m", date: "$date" } }
      : {
          $dateToString: {
            format: "%Y-%m-%d",
            date: {
              $dateTrunc: { date: "$date", unit: "week", startOfWeek: "monday" },
            },
          },
        };

  // Step 1: Get per-period totals in a single aggregation
  const periodStats = await Transaction.aggregate([
    { $match: { sessionId, status: "SUCCESS" } },
    {
      $addFields: { period: dateGroupExpr },
    },
    {
      $group: {
        _id: "$period",
        totalDebit: {
          $sum: { $cond: [{ $eq: ["$direction", "DEBIT"] }, "$amount", 0] },
        },
        totalCredit: {
          $sum: { $cond: [{ $eq: ["$direction", "CREDIT"] }, "$amount", 0] },
        },
        count: { $sum: 1 },
        maxDate: { $max: "$date" },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: limit },
  ]);

  if (periodStats.length === 0) return [];

  // Step 2: For each period, get top 5 spending categories via live $lookup
  const results = [];
  for (const stat of periodStats) {
    const dateRange = periodToDateRange(stat._id, type);

    const categories = await Transaction.aggregate([
      {
        $match: {
          sessionId,
          date: { $gte: dateRange.start, $lt: dateRange.end },
          status: "SUCCESS",
          direction: "DEBIT",
        },
      },
      {
        $lookup: {
          from: "payees",
          localField: "payee",
          foreignField: "_id",
          as: "payeeInfo",
        },
      },
      { $unwind: { path: "$payeeInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ["$payeeInfo.category", "UNCATEGORIZED"] },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 5 },
    ]);

    results.push({
      id: `${sessionId}-${type}-${stat._id}`,
      type,
      period: stat._id,
      totalDebit: stat.totalDebit,
      totalCredit: stat.totalCredit,
      transactionCount: stat.count,
      topCategories: categories.map((c) => ({
        category: c._id || "UNCATEGORIZED",
        amount: c.amount,
      })),
      lastUpdated: stat.maxDate
        ? stat.maxDate.toISOString()
        : new Date().toISOString(),
    });
  }

  return results;
}

/**
 * Converts a period string + type into a { start, end } Date range.
 */
function periodToDateRange(periodStr, type) {
  if (type === "MONTHLY") {
    const start = new Date(`${periodStr}-01`);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    return { start, end };
  }
  // WEEKLY — periodStr is "YYYY-MM-DD" (Monday)
  const start = new Date(periodStr);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

module.exports = {
  getSummaries,
};
