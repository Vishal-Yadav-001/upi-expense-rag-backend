const User = require("../../models/User");

const userResolvers = {
  Query: {
    users: async () => {
      return await User.find().sort({ createdAt: -1 });
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
    }
  }
};

module.exports = userResolvers;