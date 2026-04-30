const { gql } = require("apollo-server-express");

const feedbackTypeDefs = gql`
  type Feedback {
    id: ID!
    sessionId: String
    message: String!
    rating: Int
    context: String
    createdAt: String!
  }

  input FeedbackInput {
    sessionId: String
    message: String!
    rating: Int
    context: String
  }

  extend type Mutation {
    submitFeedback(input: FeedbackInput!): Boolean
  }
`;

module.exports = feedbackTypeDefs;
