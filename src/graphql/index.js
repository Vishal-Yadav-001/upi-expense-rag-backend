const userTypeDefs = require('./typeDefs/user.typeDefs');
const userResolvers = require('./resolvers/user.resolvers');
const transactionTypeDefs = require('./typeDefs/transaction.typeDefs');
const transactionResolvers = require('./resolvers/transaction.resolvers');

module.exports = {
  typeDefs: [userTypeDefs, transactionTypeDefs],
  resolvers: [userResolvers, transactionResolvers],
};