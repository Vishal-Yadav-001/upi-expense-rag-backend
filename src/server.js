require("dotenv").config(); // Load env vars first
const express = require("express");
const cors = require("cors");
const { ApolloServer } = require("apollo-server-express");
const { typeDefs, resolvers } = require("./graphql");
const uploadRoutes = require("./routes/upload.routes");
const connectDB = require("./config/db");

async function startServer() {
  await connectDB();
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check - used by Railway and monitoring tools to verify the server is up
  app.get("/health", (_, res) =>
    res.json({ status: "ok", timestamp: new Date().toISOString() }),
  );

  // Endpoint to ingest UPI PDF
  app.use("/api", uploadRoutes);

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
