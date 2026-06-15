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
    amount: Float!
    direction: TransactionDirection
    date: String
    status: TransactionStatus
    createdAt: String
    payee: Payee
  }

  extend type Query {
    transactions(
      status: TransactionStatus
      direction: TransactionDirection
      fromDate: String
      toDate: String
      limit: Int
      offset: Int
    ): [Transaction]

    transactionsByPayee(
      payeeId: ID
      payeeName: String
      limit: Int
    ): [Transaction!]!
  }
`;

module.exports = transactionTypeDefs;
