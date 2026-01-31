require("dotenv").config(); // 1. Load env vars first
const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const User = require("./models/User");
const { typeDefs, resolvers } = require("./graphql");
const ingestUpiPdf = require("./services/upiIngestionService");
const Transaction = require("./models/Transaction");
const uploadRoutes = require("./routes/upload.routes");
// attempt to connect to the database
const connectDB = require("./config/db");
connectDB();

async function startServer() {
  const app = express();
  app.use(express.json());

  // Endpoint to ingest UPI PDF
  app.use("/api", uploadRoutes);

  const apolloServer = new ApolloServer({ typeDefs, resolvers });
  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: "/graphql" });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 REST API: http://localhost:${PORT}/upload-upi-pdf`);
    console.log(`🚀 GraphQL:  http://localhost:${PORT}/graphql`);
  });
}

startServer();
