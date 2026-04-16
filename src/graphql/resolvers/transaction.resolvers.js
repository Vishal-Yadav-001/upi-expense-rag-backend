const Transaction = require("../../models/Transaction");
const Payee = require("../../models/Payee");

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
    transactionsByPayee: async (_, { payeeId, payeeName, limit = 50 }) => {
      let resolvedPayeeId = payeeId;

      // 1. If no ID, attempt to resolve the name to an ID
      if (!resolvedPayeeId && payeeName) {
        const payee = await Payee.findByRawName(payeeName);
        if (!payee) return []; // Return empty if name doesn't exist
        resolvedPayeeId = payee._id;
      }

      // 2. Validate we have a target for the search
      if (!resolvedPayeeId) {
        throw new Error("Either payeeId or a valid payeeName must be provided");
      }

      // 3. Execute query with index-backed search and sorting
      return Transaction.find({ payee: resolvedPayeeId })
        .populate("payee")
        .sort({ date: -1 })
        .limit(limit);
    },
  },
  Transaction: {
    id: (doc) => (doc && doc._id ? doc._id.toString() : null),
    payee: async (doc) => {
      if (!doc || !doc.payee) return null;
      if (doc.payee.displayName) return doc.payee;
      return Payee.findById(doc.payee);
    },
  },
};

module.exports = transactionResolvers;
