const { gql } = require("apollo-server-express");

const transactionTypeDefs = gql`
  enum TransactionStatus {
    SUCCESS
    FAILED
  }

  enum TransactionDirection {
    CREDIT
    DEBIT
    UNKNOWN
  }

  type Transaction {
    id: ID!
    name: String
    bank: String
    amount: Float
    direction: TransactionDirection
    date: String
    status: TransactionStatus
    createdAt: String
  }

  type Query {
    transactions(
      status: TransactionStatus
      direction: TransactionDirection
      fromDate: String
      toDate: String
      limit: Int
    ): [Transaction]
  }
`;

module.exports = transactionTypeDefs;
