const Transaction = require("../../models/Transaction");
const Payee = require("../../models/Payee");
const { hash } = require("../../services/maskingService");

const transactionResolvers = {
  Query: {
    transactions: async (_, args, context) => {
      const { status, direction, fromDate, toDate, limit = 50, offset = 0 } = args;

      const query = { sessionId: context.sessionId };

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
        .populate("payee")
        .sort({ date: -1 }) // latest first
        .skip(offset)
        .limit(limit)
        .lean();
    },
    transactionsByPayee: async (_, { payeeId, payeeName, limit = 50 }, context) => {
      let resolvedPayeeId = payeeId;

      // 1. If no ID, attempt to resolve the name to an ID
      if (!resolvedPayeeId && payeeName) {
        // Strategy A (PII on): query by normalizedName via findByRawName.
        // Strategy B (PII off): normalizedName is never stored, so fall back to
        // querying by hashedName - the same deterministic hash used during ingestion.
        let payee = await Payee.findByRawName(payeeName);
        if (!payee) {
          const hashedName = `PAYEE_${hash(payeeName).slice(0, 12)}`;
          payee = await Payee.findOne({ hashedName });
        }
        if (!payee) return []; // Return empty if name doesn't exist
        resolvedPayeeId = payee._id;
      }

      // 2. Validate we have a target for the search
      if (!resolvedPayeeId) {
        throw new Error("Either payeeId or a valid payeeName must be provided");
      }

      // 3. Execute query with index-backed search and sorting
      return Transaction.find({ payee: resolvedPayeeId, sessionId: context.sessionId })
        .populate("payee")
        .sort({ date: -1 })
        .limit(limit);
    },
  },
  Transaction: {
    id: (doc) => (doc && doc._id ? doc._id.toString() : null),
    date: (doc) => (doc.date instanceof Date ? doc.date.toISOString() : doc.date),
    payee: async (doc) => {
      if (!doc || !doc.payee) return null;
      if (typeof doc.payee === "object") return doc.payee;
      return Payee.findById(doc.payee);
    },
  },
};

module.exports = transactionResolvers;
