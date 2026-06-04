require("dotenv").config(); // Load env vars first
const { ApolloServer } = require("apollo-server-express");
const { typeDefs, resolvers } = require("./graphql");
const connectDB = require("./config/db");
const { createApp } = require("./app");
const { resolveSessionId } = require("./middleware/resolveSessionId");
const embeddingJob = require("./jobs/embeddingJob");

async function startServer() {
  await connectDB();
  embeddingJob.start();
  const app = createApp();

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      const sessionId = await resolveSessionId(req);
      return { sessionId };
    },
  });
  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: "/graphql" });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`REST API:  http://localhost:${PORT}/api/upload-upi-pdf`);
    console.log(`GraphQL:   http://localhost:${PORT}/graphql`);
  });
}

startServer();
