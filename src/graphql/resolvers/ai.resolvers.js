const { askAI } = require("../../services/aiService");

const aiResolvers = {
  Mutation: {
    askAI: async (_, { question, model, apiKey }, context) => {
      if (!question || question.trim().length === 0) {
        throw new Error("Question cannot be empty");
      }

      return askAI(question.trim(), context.sessionId, {
        modelName: model,
        apiKey,
      });
    },
  },
};

module.exports = aiResolvers;
