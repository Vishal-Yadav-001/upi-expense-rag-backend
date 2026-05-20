const { gql } = require("apollo-server-express");

const baseTypeDefs = gql`
  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }
`;

module.exports = baseTypeDefs;
