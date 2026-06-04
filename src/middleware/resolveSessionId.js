const { verifyToken } = require("@clerk/clerk-sdk-node");

/**
 * Resolves the sessionId from an incoming request.
 * Checks for a Clerk JWT in the Authorization header first,
 * falling back to the X-Session-ID header.
 *
 * @param {import("express").Request} req
 * @returns {Promise<string|undefined>} The resolved session ID.
 */
async function resolveSessionId(req) {
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

  return sessionId;
}

module.exports = { resolveSessionId };
