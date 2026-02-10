const Transaction = require("../../models/Transaction");

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
  },
};

module.exports = insightsResolvers;
