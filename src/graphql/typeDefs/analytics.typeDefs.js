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

extend type Query{
    totalSpendByCategory(
        fromDate:String,
        toDate:String
    ):[CategorySpend!]!

      monthlySpend(
      fromDate: String
      toDate: String
    ): [MonthlySpend!]!
}

`;

module.exports = analyticsTypeDefs;