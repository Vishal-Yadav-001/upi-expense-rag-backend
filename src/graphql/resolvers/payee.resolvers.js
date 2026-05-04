const Payee = require("../../models/Payee");
const Transaction = require("../../models/Transaction");
const { updatePayeeConfidence } = require("../../services/payeeService");

const payeeResolvers = {
  Mutation: {
    categorizePayee: async (_, { payeeId, category }) => {
      const payee = await Payee.findById(payeeId);
      if (!payee) {
        throw new Error("Payee not found");
      }
      payee.category = category;
      payee.confidence = 0.9; // user-confirmed
      await payee.save();
      return payee;
    },
    confirmPayeeCategory: async (_, { payeeId, category }) => {
      const payee = await Payee.findById(payeeId);
      if (!payee) {
        throw new Error("Payee not found");
      }

      await updatePayeeConfidence(payee, category, "USER_CONFIRMED");
      return payee;
    },
  },
  Payee: {
    id: (doc) => (doc && doc._id ? doc._id.toString() : null),
    transactionCount: async (parent) => {
      return await Transaction.countDocuments({ payee: parent._id });
    },
  },
};

module.exports = payeeResolvers;
