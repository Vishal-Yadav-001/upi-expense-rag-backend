const { mergeTypeDefs, mergeResolvers } = require('@graphql-tools/merge');

const userTypeDefs = require('./typeDefs/user.typeDefs');
const userResolvers = require('./resolvers/user.resolvers');
const transactionTypeDefs = require('./typeDefs/transaction.typeDefs');
const transactionResolvers = require('./resolvers/transaction.resolvers');

// Merging ensures nested objects (like Query/Mutation) are unified
const typeDefs = mergeTypeDefs([userTypeDefs, transactionTypeDefs]);
const resolvers = mergeResolvers([userResolvers, transactionResolvers]);

module.exports = { typeDefs, resolvers };
