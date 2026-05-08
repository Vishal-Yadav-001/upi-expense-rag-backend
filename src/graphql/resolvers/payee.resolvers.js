const Payee = require("../../models/Payee");
const Transaction = require("../../models/Transaction");
const { updatePayeeConfidence } = require("../../services/payeeService");
const { generateBatchEmbeddings } = require("../../services/embeddingService");

/**
 * Background worker to update embeddings for all transactions of a payee.
 * This is async and does not block the GraphQL response.
 */
async function reindexTransactions(payeeId, newCategory) {
  try {
    const transactions = await Transaction.find({ payee: payeeId });
    if (transactions.length === 0) return;

    console.log(`[reindex] Updating ${transactions.length} transactions for payee ${payeeId} to category: ${newCategory}`);

    const payee = await Payee.findById(payeeId);
    const displayName = payee?.displayName || "Unknown";

    const chunkSize = 50;
    for (let i = 0; i < transactions.length; i += chunkSize) {
      const chunk = transactions.slice(i, i + chunkSize);
      const embeddingStrings = chunk.map(tx => 
        `Merchant: ${displayName}, Category: ${newCategory}, Amount: ${tx.amount}`
      );

      const embeddings = await generateBatchEmbeddings(embeddingStrings);

      const ops = chunk.map((tx, idx) => ({
        updateOne: {
          filter: { _id: tx._id },
          update: { $set: { embedding: embeddings[idx] } }
        }
      }));

      await Transaction.bulkWrite(ops);
    }
    console.log(`[reindex] Successfully updated ${transactions.length} transactions.`);
  } catch (error) {
    console.error(`[reindex] Failed to reindex transactions for payee ${payeeId}:`, error.message);
  }
}

const payeeResolvers = {
  Mutation: {
    categorizePayee: async (_, { payeeId, category }) => {
      const payee = await Payee.findById(payeeId);
      if (!payee) {
        throw new Error("Payee not found");
      }
      
      const oldCategory = payee.category;
      payee.category = category;
      payee.confidence = 0.9; // user-confirmed
      await payee.save();

      // Trigger re-indexing in the background if category actually changed
      if (oldCategory !== category) {
        // We do NOT await this, so the UI updates instantly
        reindexTransactions(payeeId, category).catch(err => 
          console.error("Background reindexing error:", err)
        );
      }

      return payee;
    },
    confirmPayeeCategory: async (_, { payeeId, category }) => {
      const payee = await Payee.findById(payeeId);
      if (!payee) {
        throw new Error("Payee not found");
      }

      await updatePayeeConfidence(payee, category, "USER_CONFIRMED");
      return payee;
    },
  },
  Payee: {
    id: (doc) => (doc && doc._id ? doc._id.toString() : null),
    transactionCount: async (parent) => {
      return await Transaction.countDocuments({ payee: parent._id });
    },
  },
};

module.exports = payeeResolvers;
