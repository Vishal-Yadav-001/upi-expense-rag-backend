const { totalSpendByCategory, monthlySpend } = require("../../services/analyticsService");

const analyticsResolvers = {
  Query: {
    totalSpendByCategory: async (_, args) => {
      return totalSpendByCategory(args);
    },

    monthlySpend: async (_, args) => {
      return monthlySpend(args);
    },
  },
};

module.exports = analyticsResolvers;
