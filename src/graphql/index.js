const { mergeTypeDefs, mergeResolvers } = require('@graphql-tools/merge');

const userTypeDefs = require('./typeDefs/user.typeDefs');
const userResolvers = require('./resolvers/user.resolvers');
const transactionTypeDefs = require('./typeDefs/transaction.typeDefs');
const transactionResolvers = require('./resolvers/transaction.resolvers');
const payeeTypeDefs = require('./typeDefs/payee.typeDefs');
const payeeResolvers = require('./resolvers/payee.resolvers');

// Include payee typeDefs and resolvers
const typeDefsArray = [userTypeDefs, transactionTypeDefs, payeeTypeDefs];
const resolversArray = [userResolvers, transactionResolvers, payeeResolvers];   
// Merging ensures nested objects (like Query/Mutation) are unified
const typeDefs = mergeTypeDefs(typeDefsArray);
const resolvers = mergeResolvers(resolversArray);

module.exports = { typeDefs, resolvers };
