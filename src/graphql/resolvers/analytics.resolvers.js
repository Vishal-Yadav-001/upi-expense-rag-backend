const { totalSpendByCategory } = require("../../services/analyticsService");

const analyticsResolvers = {
  Query: {
    totalSpendByCategory: async (_, args) => {
      return totalSpendByCategory(args);
    },
  },
};

module.exports = analyticsResolvers;
