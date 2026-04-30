const Feedback = require("../../models/Feedback");

const feedbackResolvers = {
  Mutation: {
    submitFeedback: async (_, { input }) => {
      try {
        const { sessionId, message, rating, context } = input;
        
        let parsedContext = context;
        if (typeof context === "string") {
          try {
            parsedContext = JSON.parse(context);
          } catch (e) {
            // If it is not valid JSON, just store it as is or as a string
            parsedContext = { raw: context };
          }
        }

        await Feedback.create({
          sessionId,
          message,
          rating,
          context: parsedContext,
        });

        return true;
      } catch (error) {
        console.error("Error submitting feedback:", error);
        throw new Error("Failed to submit feedback");
      }
    },
  },
};

module.exports = feedbackResolvers;
