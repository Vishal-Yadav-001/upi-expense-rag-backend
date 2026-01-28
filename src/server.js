require("dotenv").config(); // 1. Load env vars first
const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const User = require("./models/User");
const { typeDefs, resolvers } = require("./graphql");
const ingestUpiPdf = require("./services/upiIngestionService");
// attempt to connect to the database
const connectDB = require("./config/db");
connectDB();

async function startServer() {
  const app = express();
  app.use(express.json());

  // Endpoint to ingest UPI PDF
  app.post("/upload-upi-pdf", async (req, res) => {
    try {
      const filepath = "../src/data/sm_transactions_1769354327041.pdf";
      const transactions = await ingestUpiPdf(filepath);
      res.json({
        count: transactions.length,
        transactions,
      });
    } catch (error) {
      console.error("Error ingesting UPI PDF:", error);
      res.status(500).json({ error: "Failed to ingest UPI PDF" });
    }
  });

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
