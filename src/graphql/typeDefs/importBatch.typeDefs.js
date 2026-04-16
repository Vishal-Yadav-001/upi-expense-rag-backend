const { gql } = require("apollo-server-express");

const importBatchTypeDefs = gql`
  type ImportBatch {
    id: ID!
    originalFileName: String!
    storedFilePath: String!
    source: String!
    transactionCount: Int!
    parsedCount: Int!
    importedCount: Int!
    skippedCount: Int!
    status: String!
    errorMessage: String
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    importBatches(limit: Int = 20): [ImportBatch!]!
  }
`;

module.exports = importBatchTypeDefs;
