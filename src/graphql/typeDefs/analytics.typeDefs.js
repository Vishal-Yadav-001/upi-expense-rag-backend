const {gql} = require('apollo-server-express');

const analyticsTypeDefs = gql`

type CategorySpend{
    category:String,
    total:Float
}

extend type Query{
    totalSpendByCategory(
        fromDate:String,
        toDate:String
    ):[CategorySpend!]!
}

`;

module.exports = analyticsTypeDefs;