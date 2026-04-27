const { askAI } = require("../../services/aiService");

const aiResolvers = {
  Mutation: {
    askAI: async (_, { question }) => {
      if (!question || question.trim().length === 0) {
        throw new Error("Question cannot be empty");
      }

      return askAI(question.trim());
    },
  },
};

module.exports = aiResolvers;
