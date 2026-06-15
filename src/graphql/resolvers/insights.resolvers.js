const {
  getTopRecurringPayees,
  getSubscriptions,
  getUpcomingSubscriptions,
} = require("../../services/insightsService");

const insightsResolvers = {
  Query: {
    topRecurringPayees: async (_, args, context) => {
      const results = await getTopRecurringPayees({ ...args, sessionId: context.sessionId });
      return results.map(r => ({
        ...r,
        lastPaidAt: r.lastPaidAt ? new Date(r.lastPaidAt).toISOString() : null
      }));
    },

    detectSubscriptions: async (_, { limit = 10 }, context) => {
      const results = await getSubscriptions({ limit, sessionId: context.sessionId });
      return results.map(r => ({
        ...r,
        lastPaidAt: r.lastPaidAt ? new Date(r.lastPaidAt).toISOString() : null
      }));
    },

    upcomingSubscriptions: async (_, { days = 10 }, context) => {
      return getUpcomingSubscriptions({ days, sessionId: context.sessionId });
    },
  },
};

module.exports = insightsResolvers;
