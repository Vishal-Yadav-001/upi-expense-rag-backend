const {gql} = require('apollo-server-express');

const analyticsTypeDefs = gql`

type CategorySpend{
    category:String,
    total:Float
}

  type MonthlySpend {
    month: String
    total: Float
  }

  type TopCategory {
    category: String
    amount: Float
  }

  type FinancialSummary {
    id: ID!
    type: String!
    period: String!
    totalDebit: Float!
    totalCredit: Float!
    transactionCount: Int!
    topCategories: [TopCategory!]!
    lastUpdated: String
  }

extend type Query{
    totalSpendByCategory(
        fromDate:String,
        toDate:String
    ):[CategorySpend!]!

      monthlySpend(
      fromDate: String
      toDate: String
    ): [MonthlySpend!]!

    financialSummaries(
      type: String
      limit: Int
    ): [FinancialSummary!]!
}

`;

module.exports = analyticsTypeDefs;