const { totalSpendByCategory, monthlySpend } = require("../../services/analyticsService");
const { getSummaries } = require("../../services/summaryService");

const analyticsResolvers = {
  Query: {
    totalSpendByCategory: async (_, args, context) => {
      return totalSpendByCategory({ ...args, sessionId: context.sessionId });
    },

    monthlySpend: async (_, args, context) => {
      return monthlySpend({ ...args, sessionId: context.sessionId });
    },

    financialSummaries: async (_, args, context) => {
      return getSummaries({ ...args, sessionId: context.sessionId });
    },
  },
};

module.exports = analyticsResolvers;
