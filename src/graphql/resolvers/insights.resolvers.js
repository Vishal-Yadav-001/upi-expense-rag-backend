const {
  getTopRecurringPayees,
  getSubscriptions,
  getUpcomingSubscriptions,
} = require("../../services/insightsService");

const insightsResolvers = {
  Query: {
    topRecurringPayees: async (_, args, context) => {
      return getTopRecurringPayees({ ...args, sessionId: context.sessionId });
    },

    detectSubscriptions: async (_, { limit = 10 }, context) => {
      return getSubscriptions({ limit, sessionId: context.sessionId });
    },

    upcomingSubscriptions: async (_, { days = 10 }, context) => {
      return getUpcomingSubscriptions({ days, sessionId: context.sessionId });
    },
  },
};

module.exports = insightsResolvers;
