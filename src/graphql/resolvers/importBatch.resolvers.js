const ImportBatch = require("../../models/ImportBatch");

const importBatchResolvers = {
  Query: {
    importBatches: async (_, { limit = 20 }, context) => {
      const { sessionId } = context;
      return ImportBatch.find({ sessionId })
        .sort({ createdAt: -1 })
        .limit(limit);
    },
  },
  ImportBatch: {
    id: (doc) => (doc && doc._id ? doc._id.toString() : null),
    createdAt: (doc) => (doc && doc.createdAt ? new Date(doc.createdAt).toISOString() : null),
    updatedAt: (doc) => (doc && doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null),
  },
};

module.exports = importBatchResolvers;
