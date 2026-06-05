const User = require("../../models/User");

/**
 * User resolvers — Clerk-aware.
 *
 * Since we use Clerk for auth, context.sessionId === Clerk userId (decoded.sub).
 * We store that as User.clerkId.  The old email/password mock admin is kept
 * only for the legacy createUser mutation; me and updateUserBudget now
 * operate entirely via clerkId so every user gets their own budget.
 */
const userResolvers = {
  Query: {
    users: async () => {
      throw new Error("The users query is disabled.");
    },

    me: async (_, __, context) => {
      const { sessionId } = context;
      if (!sessionId) return null;

      // Find or create a User record keyed by Clerk userId
      return User.findOneAndUpdate(
        { clerkId: sessionId },
        { clerkId: sessionId }, // ensure it's set on upsert
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).lean();
    },
  },

  Mutation: {
    createUser: async (_, { name, email, password }) => {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error("User already exists");
      }
      return User.create({ name, email, password });
    },

    updateUserBudget: async (_, { amount }, context) => {
      const { sessionId } = context;
      if (!sessionId) throw new Error("Not authenticated");

      return User.findOneAndUpdate(
        { clerkId: sessionId },
        { monthlyBudget: amount, clerkId: sessionId },
        { new: true, upsert: true }
      );
    },
  },

  User: {
    id: (doc) => (doc && doc._id ? doc._id.toString() : null),
    createdAt: (doc) =>
      doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: (doc) =>
      doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
  },
};

module.exports = userResolvers;
