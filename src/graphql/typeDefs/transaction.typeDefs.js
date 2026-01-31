const { gql } = require("apollo-server-express");

const transactionTypeDefs = gql`
  type Transaction {
    id: ID!
    name: String!
    bank: String
    amount: Float!
    direction: String!
    date: String!
    status: String!
  }

  type Query {
    transactions(limit: Int): [Transaction!]!
  }
`;

module.exports = transactionTypeDefs;