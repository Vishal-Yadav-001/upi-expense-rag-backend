const Transaction = require("../models/Transaction");
const ImportBatch = require("../models/ImportBatch");

/**
 * Wipes all data associated with a sessionId.
 * @param {string} sessionId 
 */
async function wipeSessionData(sessionId) {
  if (!sessionId) throw new Error("Session ID is required for data wipe");

  console.log(`[sessionService] Wiping data for session: ${sessionId}`);

  // 1. Delete Transactions first (bulk data)
  const txResult = await Transaction.deleteMany({ sessionId });
  console.log(`[sessionService] Deleted ${txResult.deletedCount} transactions`);

  // 2. Delete Import Batches
  const batchResult = await ImportBatch.deleteMany({ sessionId });
  console.log(`[sessionService] Deleted ${batchResult.deletedCount} import batches`);

  return {
    transactionsDeleted: txResult.deletedCount,
    batchesDeleted: batchResult.deletedCount
  };
}

module.exports = { wipeSessionData };
