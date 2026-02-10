const { gql } = require("apollo-server-express");

const insightsTypeDefs = gql`
  type RecurringPayee {
    payee: Payee!
    transactionCount: Int!
    totalAmount: Float!
    lastPaidAt: String
  }

  extend type Query {
    topRecurringPayees(
      limit: Int = 10
      direction: TransactionDirection = DEBIT
    ): [RecurringPayee!]!
  }
`;

module.exports = insightsTypeDefs;