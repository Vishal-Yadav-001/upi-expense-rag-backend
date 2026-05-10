const { askAI } = require("../../services/aiService");
const { syncSessionData } = require("../../services/syncService");

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
    syncAIPatterns: async (_, __, context) => {
      try {
        const result = await syncSessionData(context.sessionId);
        return {
          success: true,
          updatedTransactions: result.updatedTransactions,
          updatedSummaries: result.updatedSummaries
        };
      } catch (error) {
        console.error("[aiResolvers] syncAIPatterns error:", error);
        return {
          success: false,
          updatedTransactions: 0,
          updatedSummaries: 0
        };
      }
    }
  },
};

module.exports = aiResolvers;
