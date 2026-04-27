const { gql } = require("apollo-server-express");

const aiTypeDefs = gql`
  type AIResponse {
    answer: String!
    toolsUsed: [String!]!
    data: String
  }

  extend type Mutation {
    askAI(question: String!): AIResponse!
  }
`;

module.exports = aiTypeDefs;
