const Transaction = require("../models/Transaction");
const { generateBatchEmbeddings } = require("./embeddingService");
const { 
  generateMonthlySummary, 
  generateWeeklySummary 
} = require("./summaryService");
const { toMonthStr, toWeekStr } = require("../utils/dateUtils");

/**
 * Synchronizes session data by identifying "stale" transactions 
 * (where payee details have changed) and regenerating their embeddings and summaries.
 * 
 * @param {string} sessionId - The session ID to sync.
 * @returns {Promise<{ updatedTransactions: number, updatedSummaries: number }>}
 */
async function syncSessionData(sessionId) {
  console.log(`[syncService] Starting sync for session: ${sessionId}`);

  // 1. Find all transactions with a payee for this session
  const transactions = await Transaction.find({ 
    sessionId, 
    payee: { $exists: true } 
  }).populate("payee");

  // 2. Filter for stale transactions
  // Stale if:
  // - Payee category != embeddingMetadata category OR
  // - Payee displayName != embeddingMetadata merchant
  const staleTransactions = transactions.filter((tx) => {
    if (!tx.payee) return false;
    
    const currentCategory = tx.payee.category;
    const currentMerchant = tx.payee.displayName;
    
    const storedCategory = tx.embeddingMetadata?.category;
    const storedMerchant = tx.embeddingMetadata?.merchant;

    return currentCategory !== storedCategory || currentMerchant !== storedMerchant;
  });

  if (staleTransactions.length === 0) {
    console.log("[syncService] No stale transactions found.");
    return { updatedTransactions: 0, updatedSummaries: 0 };
  }

  console.log(`[syncService] Found ${staleTransactions.length} stale transactions.`);

  // 3. Process in chunks of 50 for re-embedding
  const chunkSize = 50;
  let totalUpdated = 0;
  const uniqueMonths = new Set();
  const uniqueWeeks = new Set();

  for (let i = 0; i < staleTransactions.length; i += chunkSize) {
    const chunk = staleTransactions.slice(i, i + chunkSize);
    
    // Prepare embedding strings
    const embeddingStrings = chunk.map(tx => 
      `Merchant: ${tx.payee.displayName}, Category: ${tx.payee.category}, Amount: ${tx.amount}`
    );

    console.log(`[syncService] Generating embeddings for chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(staleTransactions.length / chunkSize)}`);
    const embeddings = await generateBatchEmbeddings(embeddingStrings);

    // Prepare bulk updates
    const bulkOps = chunk.map((tx, index) => {
      // Collect periods for summary updates
      const date = new Date(tx.date);
      uniqueMonths.add(toMonthStr(date));
      uniqueWeeks.add(toWeekStr(date));

      return {
        updateOne: {
          filter: { _id: tx._id },
          update: {
            $set: {
              embedding: embeddings[index],
              embeddingMetadata: {
                merchant: tx.payee.displayName,
                category: tx.payee.category
              }
            }
          }
        }
      };
    });

    const result = await Transaction.bulkWrite(bulkOps);
    totalUpdated += (result.modifiedCount || 0);
  }

  // 4. Update summaries for affected periods
  console.log(`[syncService] Updating summaries for months: ${[...uniqueMonths].join(", ")}`);
  for (const monthStr of uniqueMonths) {
    await generateMonthlySummary(sessionId, monthStr);
  }

  console.log(`[syncService] Updating summaries for weeks: ${[...uniqueWeeks].join(", ")}`);
  for (const weekStr of uniqueWeeks) {
    await generateWeeklySummary(sessionId, weekStr);
  }

  return {
    updatedTransactions: totalUpdated,
    updatedSummaries: uniqueMonths.size + uniqueWeeks.size
  };
}

module.exports = { syncSessionData };
