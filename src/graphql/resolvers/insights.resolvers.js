const Transaction = require("../../models/Transaction");
const { detectFrequency } = require("../../services/analyticsService");

const insightsResolvers = {
  Query: {
    topRecurringPayees: async (_, { limit = 10, direction }) => {
      return Transaction.aggregate([
        {
          $match: {
            direction,
            payee: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$payee",
            transactionCount: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            lastPaidAt: { $max: "$date" },
          },
        },
        {
          $sort: {
            transactionCount: -1,
            totalAmount: -1,
          },
        },
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
    },

    detectSubscriptions: async (_, { limit = 10 }) => {
      const grouped = await Transaction.aggregate([
        {
          $match: {
            direction: "DEBIT",
            payee: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$payee",
            // LINKED: Pushing an object instead of two separate arrays
            history: {
              $push: { date: "$date", amount: "$amount" },
            },
            count: { $sum: 1 },
            lastPaidAt: { $max: "$date" },
          },
        },
        { $match: { count: { $gte: 3 } } },
        { $limit: limit },
      ]);

      const results = [];

      for (const g of grouped) {
        // SORTING: Now sort the history objects by their date property
        const sortedHistory = g.history.sort(
          (a, b) => new Date(a.date) - new Date(b.date),
        );

        // Extract only the dates for the detector
        const dates = sortedHistory.map((h) => h.date);
        const frequency = detectFrequency(dates);

        if (!frequency) continue;

        // Use the correctly linked amounts for the average
        const avgAmount =
          sortedHistory.reduce((sum, item) => sum + item.amount, 0) /
          sortedHistory.length;

        // Price Drift Logic
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
          payee: g._id,
          frequency,
          avgAmount,
          lastPaidAt: g.lastPaidAt,
          confidence: Math.min(0.9, g.count / 6),
          priceChange,
        });
      }

      return results;
    },
  },
};

module.exports = insightsResolvers;
