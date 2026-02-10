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

// Include payee typeDefs and resolvers
const typeDefsArray = [userTypeDefs, transactionTypeDefs, payeeTypeDefs,analyticsTypeDefs, insightsTypeDefs];
const resolversArray = [userResolvers, transactionResolvers, payeeResolvers, analyticsResolvers, insightsResolvers];   
// Merging ensures nested objects (like Query/Mutation) are unified
const typeDefs = mergeTypeDefs(typeDefsArray);
const resolvers = mergeResolvers(resolversArray);

module.exports = { typeDefs, resolvers };
