const { gql } = require("apollo-server-express");

const userTypeDefs = gql`
  type User {
    id: ID!
    name: String
    email: String
    monthlyBudget: Float
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    users: [User!]!
    me: User
  }

  extend type Mutation {
    createUser(name: String!, email: String!, password: String!): User!
    updateUserBudget(amount: Float!): User
  }
`;

module.exports = userTypeDefs;