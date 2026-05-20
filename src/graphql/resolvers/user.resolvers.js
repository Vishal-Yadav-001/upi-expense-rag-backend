const User = require("../../models/User");

const userResolvers = {
  Query: {
    users: async () => {
      throw new Error("The users query is disabled until authentication is implemented.");
    },
    me: async () => {
      // Temporary mock user until full auth is implemented
      // Force name to be present via findOneAndUpdate with upsert
      return await User.findOneAndUpdate(
        { email: "admin@upisense.com" },
        { 
          $set: { name: "Admin User" },
          $setOnInsert: { 
            email: "admin@upisense.com",
            password: "password123",
            monthlyBudget: 50000
          }
        },
        { 
          new: true, 
          upsert: true, 
          runValidators: true,
          setDefaultsOnInsert: true 
        }
      ).lean();
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
        { 
          $set: { monthlyBudget: amount },
          $setOnInsert: { 
            name: "Admin User",
            password: "password123" 
          }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    },
  },

  User: {
    id: (doc) => (doc && doc._id ? doc._id.toString() : null),
    createdAt: (doc) => (doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt),
    updatedAt: (doc) => (doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt),
  },
};

module.exports = userResolvers;
