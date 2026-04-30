const { totalSpendByCategory, monthlySpend } = require("../../services/analyticsService");

const analyticsResolvers = {
  Query: {
    totalSpendByCategory: async (_, args, context) => {
      return totalSpendByCategory({ ...args, sessionId: context.sessionId });
    },

    monthlySpend: async (_, args, context) => {
      return monthlySpend({ ...args, sessionId: context.sessionId });
    },
  },
};

module.exports = analyticsResolvers;
