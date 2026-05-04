const { gql } = require("apollo-server-express");

const payeeTypeDefs = gql`
  type Payee {
    id: ID!
    displayName: String!
    hashedName: String
    normalizedName: String
    aliases: [String]
    category: String
    confidence: Float
    source: String
    transactionCount: Int
    createdAt: String
    updatedAt: String
  }

  extend type Mutation {
    categorizePayee(payeeId: ID!, category: String!): Payee

    confirmPayeeCategory(payeeId: ID!, category: String!): Payee
  }
`;

module.exports = payeeTypeDefs;
