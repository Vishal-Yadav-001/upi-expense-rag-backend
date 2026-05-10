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
  Query: {
    availableCategories: async (_, __, context) => {
      const fixedCategories = ["Food", "Shopping", "Travel", "Health", "Investment", "Salary", "Rent", "Bill", "Other"];
      const { sessionId } = context;

      // Get unique categories currently used in this session's payees
      const payeesForSession = await Transaction.distinct("payee", { sessionId });
      const dynamicCategories = await Payee.distinct("category", { 
        _id: { $in: payeesForSession },
        category: { $ne: "UNCATEGORIZED" }
      });

      const allCategories = new Set([...fixedCategories, ...dynamicCategories]);
      return Array.from(allCategories);
    }
  },
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
    updatePayeeCategory: async (_, { payeeId, category }, context) => {
      const { sessionId } = context;

      // Scoping: Ensure user has a transaction with this payee
      const hasTransaction = await Transaction.exists({ payee: payeeId, sessionId });
      if (!hasTransaction) {
        throw new Error("Payee not found or not associated with this session");
      }

      const payee = await Payee.findById(payeeId);
      if (!payee) {
        throw new Error("Payee not found");
      }

      payee.category = category;
      payee.confidence = 0.9; // user-confirmed
      await payee.save();

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
