const { gql } = require("apollo-server-express");

const aiTypeDefs = gql`
  type AIResponse {
    answer: String!
    toolsUsed: [String!]!
    data: String
  }

  type SyncResult {
    success: Boolean
    updatedTransactions: Int
    updatedSummaries: Int
  }

  input ChatMessage {
    role: String!
    content: String!
  }

  extend type Mutation {
    askAI(question: String!, history: [ChatMessage], model: String, apiKey: String): AIResponse!
    syncAIPatterns: SyncResult
  }
`;

module.exports = aiTypeDefs;
