const User = require("../../models/User");

const userResolvers = {
  Query: {
    users: async () => {
      throw new Error("The users query is disabled until authentication is implemented.");
    },
    me: async () => {
      // Temporary mock user until full auth is implemented
      return await User.findOne({ email: "admin@upisense.com" });
    },
  },

  Mutation: {
    createUser: async(root,{ name, email, password }) => {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error("User already exists");
        }

        const newUser = await User.create({ name, email, password });
        return newUser;
    },
    updateUserBudget: async (root, { amount }) => {
      // Temporary logic updating the mock admin user
      return await User.findOneAndUpdate(
        { email: "admin@upisense.com" },
        { $set: { monthlyBudget: amount } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    },
  }
};

module.exports = userResolvers;
