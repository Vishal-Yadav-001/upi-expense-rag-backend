require("dotenv").config(); // Load env vars first
const { ApolloServer } = require("apollo-server-express");
const { typeDefs, resolvers } = require("./graphql");
const connectDB = require("./config/db");
const { createApp } = require("./app");

async function startServer() {
  await connectDB();
  const app = createApp();

  const apolloServer = new ApolloServer({ typeDefs, resolvers });
  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: "/graphql" });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`REST API:  http://localhost:${PORT}/api/upload-upi-pdf`);
    console.log(`GraphQL:   http://localhost:${PORT}/graphql`);
  });
}

startServer();
