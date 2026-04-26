const User = require("../../models/User");

const userResolvers = {
  Query: {
    users: async () => {
      throw new Error("The users query is disabled until authentication is implemented.");
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
