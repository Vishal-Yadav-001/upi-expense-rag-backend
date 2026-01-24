const userTypeDefs = require('./typeDefs/user.typeDefs');
const userResolvers = require('./resolvers/user.resolvers');

module.exports = {
  typeDefs: [userTypeDefs],
  resolvers: [userResolvers],
};