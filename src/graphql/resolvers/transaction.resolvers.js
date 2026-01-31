const Transaction = require("../../models/Transaction");

const transactionResolvers = {
  Query: {
    transactions: async (_, { limit = 50 }) => {
      return await Transaction.find().sort({ date: -1 }).limit(limit);
    },
  },
};

module.exports = transactionResolvers;
