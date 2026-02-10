const { gql } = require("apollo-server-express");

const insightsTypeDefs = gql`
  type RecurringPayee {
    payee: Payee!
    transactionCount: Int!
    totalAmount: Float!
    lastPaidAt: String
  }

type SubscriptionInsight {
  payee: Payee!
  frequency: String!
  avgAmount: Float!
  lastPaidAt: String
  confidence: Float!
}

  extend type Query {
    topRecurringPayees(
      limit: Int = 10
      direction: TransactionDirection = DEBIT
    ): [RecurringPayee!]!

    detectSubscriptions(limit: Int = 10): [SubscriptionInsight!]!
  }
`;

module.exports = insightsTypeDefs;
