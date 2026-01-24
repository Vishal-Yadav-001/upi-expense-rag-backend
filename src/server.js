const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const User = require("./models/User");
const { typeDefs, resolvers } = require("./graphql");
require("dotenv").config();

// attempt to connect to the database
const connectDB = require("./config/db");
connectDB();



async function startServer() {
  const app = express();

  const apolloServer = new ApolloServer({ typeDefs, resolvers });
  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: "/graphql" });

  app.listen(4000, () => {
    console.log("Server is running on http://localhost:4000/graphql");
  });
}

startServer();
