const { mergeTypeDefs, mergeResolvers } = require('@graphql-tools/merge');

const userTypeDefs = require('./typeDefs/user.typeDefs');
const userResolvers = require('./resolvers/user.resolvers');
const transactionTypeDefs = require('./typeDefs/transaction.typeDefs');
const transactionResolvers = require('./resolvers/transaction.resolvers');
const payeeTypeDefs = require('./typeDefs/payee.typeDefs');
const payeeResolvers = require('./resolvers/payee.resolvers');
const analyticsResolvers = require('./resolvers/analytics.resolvers');
const analyticsTypeDefs = require('./typeDefs/analytics.typeDefs');
const insightsResolvers = require('./resolvers/insights.resolvers');
const insightsTypeDefs = require('./typeDefs/insights.typeDefs');
const importBatchResolvers = require("./resolvers/importBatch.resolvers");
const importBatchTypeDefs = require("./typeDefs/importBatch.typeDefs");
const aiResolvers = require("./resolvers/ai.resolvers");
const aiTypeDefs = require("./typeDefs/ai.typeDefs");
const feedbackTypeDefs = require("./typeDefs/feedback.typeDefs");
const feedbackResolvers = require("./resolvers/feedback.resolvers");

// Include payee typeDefs and resolvers
const typeDefsArray = [
  userTypeDefs,
  transactionTypeDefs,
  payeeTypeDefs,
  analyticsTypeDefs,
  insightsTypeDefs,
  importBatchTypeDefs,
  aiTypeDefs,
  feedbackTypeDefs,
];
const resolversArray = [
  userResolvers,
  transactionResolvers,
  payeeResolvers,
  analyticsResolvers,
  insightsResolvers,
  importBatchResolvers,
  aiResolvers,
  feedbackResolvers,
];
// Merging ensures nested objects (like Query/Mutation) are unified
const typeDefs = mergeTypeDefs(typeDefsArray);
const resolvers = mergeResolvers(resolversArray);

module.exports = { typeDefs, resolvers };
