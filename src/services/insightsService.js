const Transaction = require("../models/Transaction");
const { detectFrequency } = require("./analyticsService");

function calculateSubscriptionConfidence(history, count) {
  const countScore = Math.min(1, count / 6);

  const gaps = [];
  for (let i = 1; i < history.length; i++) {
    const prev = new Date(history[i - 1].date);
    const curr = new Date(history[i].date);
    const diffDays = Math.abs((curr - prev) / (1000 * 60 * 60 * 24));
    gaps.push(diffDays);
  }

  const avgGap = gaps.reduce((a, b) => a + b, 0) / (gaps.length || 1);
  const gapVariance =
    gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) /
    (gaps.length || 1);
  const gapStdDev = Math.sqrt(gapVariance);

  let frequencyScore;
  if (gapStdDev < 3) frequencyScore = 1;
  else if (gapStdDev < 7) frequencyScore = 0.7;
  else if (gapStdDev < 12) frequencyScore = 0.4;
  else frequencyScore = 0.1;

  const amounts = history.map((h) => h.amount);
  const avgAmount =
    amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const amountVariance =
    amounts.reduce(
      (sum, amt) => sum + Math.pow(amt - avgAmount, 2),
      0,
    ) / amounts.length;
  const amountStdDev = Math.sqrt(amountVariance);
  const variationPercent = (amountStdDev / (avgAmount || 1)) * 100;

  let amountScore;
  if (variationPercent < 5) amountScore = 1;
  else if (variationPercent < 10) amountScore = 0.7;
  else if (variationPercent < 20) amountScore = 0.4;
  else amountScore = 0.1;

  return parseFloat((
    countScore * 0.4 + frequencyScore * 0.4 + amountScore * 0.2
  ).toFixed(2));
}

function buildRecurringMatch(direction) {
  return {
    direction,
    status: "SUCCESS",
    payee: { $ne: null },
  };
}

function buildRecurringGroupedPipeline(direction) {
  return [
    { $match: buildRecurringMatch(direction) },
    {
      $group: {
        _id: "$payee",
        history: { $push: { date: "$date", amount: "$amount" } },
        count: { $sum: 1 },
        lastPaidAt: { $max: "$date" },
      },
    },
    { $match: { count: { $gte: 3 } } },
    {
      $lookup: {
        from: "payees",
        localField: "_id",
        foreignField: "_id",
        as: "payee",
      },
    },
    { $unwind: "$payee" },
  ];
}

async function getTopRecurringPayees({ limit = 10, direction = "DEBIT" } = {}) {
  return Transaction.aggregate([
    { $match: buildRecurringMatch(direction) },
    {
      $group: {
        _id: "$payee",
        transactionCount: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        lastPaidAt: { $max: "$date" },
      },
    },
    { $sort: { transactionCount: -1, totalAmount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "payees",
        localField: "_id",
        foreignField: "_id",
        as: "payee",
      },
    },
    { $unwind: "$payee" },
  ]);
}

async function getSubscriptions({ limit = 10 } = {}) {
  const grouped = await Transaction.aggregate(buildRecurringGroupedPipeline("DEBIT"));
  const results = [];

  for (const g of grouped) {
    const sortedHistory = g.history.sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    const dates = sortedHistory.map((h) => new Date(h.date));
    const frequency = detectFrequency(dates);
    if (!frequency) continue;

    const avgAmount =
      sortedHistory.reduce((sum, item) => sum + item.amount, 0) /
      sortedHistory.length;

    let priceChange = null;
    if (sortedHistory.length >= 4) {
      const lastTwo = sortedHistory.slice(-2);
      const previous = sortedHistory.slice(0, -2);

      const recentAvg =
        lastTwo.reduce((sum, h) => sum + h.amount, 0) / lastTwo.length;
      const oldAvg =
        previous.reduce((sum, h) => sum + h.amount, 0) / previous.length;
      const changePercent = ((recentAvg - oldAvg) / oldAvg) * 100;

      if (Math.abs(changePercent) > 15) {
        priceChange = parseFloat(changePercent.toFixed(2));
      }
    }

    results.push({
      payee: g.payee,
      frequency,
      avgAmount: parseFloat(avgAmount.toFixed(2)),
      lastPaidAt: g.lastPaidAt,
      confidence: calculateSubscriptionConfidence(sortedHistory, g.count),
      priceChange,
      transactionCount: g.count,
    });
  }

  return results.slice(0, limit);
}

async function getUpcomingSubscriptions({ days = 10 } = {}) {
  const today = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(today.getDate() + days);

  const grouped = await Transaction.aggregate(buildRecurringGroupedPipeline("DEBIT"));
  const results = [];

  for (const g of grouped) {
    const sortedHistory = g.history.sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    const dates = sortedHistory.map((h) => new Date(h.date));
    const frequency = detectFrequency(dates);
    if (frequency !== "MONTHLY") continue;

    const gaps = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    }
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    const lastDate = new Date(g.lastPaidAt);
    const expectedDate = new Date(lastDate);
    expectedDate.setDate(lastDate.getDate() + Math.round(avgGap));

    if (expectedDate >= today && expectedDate <= thresholdDate) {
      const avgAmount =
        sortedHistory.reduce((sum, h) => sum + h.amount, 0) /
        sortedHistory.length;

      results.push({
        payee: g.payee,
        expectedDate: expectedDate.toISOString(),
        avgAmount: parseFloat(avgAmount.toFixed(2)),
        confidence: calculateSubscriptionConfidence(sortedHistory, g.count),
      });
    }
  }

  return results;
}

module.exports = {
  getTopRecurringPayees,
  getSubscriptions,
  getUpcomingSubscriptions,
};
