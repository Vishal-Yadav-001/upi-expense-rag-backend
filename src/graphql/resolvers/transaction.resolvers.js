const Transaction = require("../../models/Transaction");

const transactionResolvers = {
  Query: {
    transactions: async (_, args) => {
      const { status, direction, fromDate, toDate, limit = 50 } = args;

      const query = {};

      if (status) {
        query.status = status;
      }

      if (direction) {
        query.direction = direction;
      }

      if (fromDate || toDate) {
        query.date = {};
        if (fromDate) query.date.$gte = new Date(fromDate);
        if (toDate) query.date.$lte = new Date(toDate);
      }

      return Transaction.find(query)
        .sort({ date: -1 }) // latest first
        .limit(limit)
        .lean();
    },
  },
};

module.exports = transactionResolvers;
