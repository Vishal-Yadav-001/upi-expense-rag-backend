const {
  getTopRecurringPayees,
  getSubscriptions,
  getUpcomingSubscriptions,
} = require("../../services/insightsService");

const insightsResolvers = {
  Query: {
    topRecurringPayees: async (_, { limit = 10, direction }) => {
      return getTopRecurringPayees({ limit, direction });
    },

    detectSubscriptions: async (_, { limit = 10 }) => {
      return getSubscriptions({ limit });
    },

    upcomingSubscriptions: async (_, { days = 10 }) => {
      return getUpcomingSubscriptions({ days });
    },
  },
};

module.exports = insightsResolvers;
