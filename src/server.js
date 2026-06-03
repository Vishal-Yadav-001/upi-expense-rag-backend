require("dotenv").config(); // Load env vars first
const { ApolloServer } = require("apollo-server-express");
const { typeDefs, resolvers } = require("./graphql");
const connectDB = require("./config/db");
const { createApp } = require("./app");
const { verifyToken } = require("@clerk/clerk-sdk-node");

async function startServer() {
  await connectDB();
  const app = createApp();

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      let sessionId = req.header("X-Session-ID");
      
      const authHeader = req.header("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        try {
          const decoded = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
          });
          sessionId = decoded.sub; // Map Clerk userId to sessionId
        } catch (err) {
          console.warn("[Auth] Clerk token verification failed:", err.message);
        }
      }

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
