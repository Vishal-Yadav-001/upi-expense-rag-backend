const { generateTransactionHash } = require("../utils/cryptoUtils");
const ingestUpiPdf = require("./upiIngestionService");
const Transaction = require("../models/Transaction");
const ImportBatch = require("../models/ImportBatch");
const Payee = require("../models/Payee");
const { normalizeName } = require("./payeeService");
const { maskName } = require("./maskingService");
const { generateBatchEmbeddings } = require("./embeddingService");
const { 
  generateMonthlySummary, 
  generateWeeklySummary 
} = require("./summaryService");
const { collectPeriods } = require("../utils/dateUtils");

/**
 * Main service to process a UPI PDF import.
 * Handles parsing, batch tracking, payee resolution, and transaction deduplication.
 */
async function processUpiImport({ filePath, originalFileName, source, sessionId, storePii: storePiiOverride, apiKeyOverride }) {
  console.log("[importService] Starting processing for:", originalFileName);

  // 1. Parse the PDF
  const transactions = await ingestUpiPdf(filePath, source);
  console.log("[importService] Transactions parsed:", transactions.length);

  // 2. Create the Import Batch
  console.log("[importService] Creating batch for session:", sessionId);
  const batch = await ImportBatch.create({
    originalFileName,
    storedFilePath: filePath,
    source,
    sessionId,
    transactionCount: transactions.length,
    parsedCount: transactions.length,
    status: "PROCESSING",
  });
  console.log("[importService] Batch created:", batch._id);

  try {
    // 3. Resolve Payees (once per upload to minimize DB hits)
    console.log("[importService] Resolving payees...");
    const uniquePayees = new Map();
    for (const tx of transactions) {
      if (!uniquePayees.has(tx.hashedName)) {
        uniquePayees.set(tx.hashedName, {
          rawName: tx.rawName || tx.name,
          hashedName: tx.hashedName,
        });
      }
    }

    const hashedNames = [...uniquePayees.keys()];
    const existingPayees = await Payee.find({ hashedName: { $in: hashedNames } });
    const payeeMap = new Map(existingPayees.map((payee) => [payee.hashedName, payee]));
    console.log("[importService] Found existing payees:", existingPayees.length);

    // Determine if we should store PII. 
    // If override is provided (true/false), use it. Otherwise fall back to env var.
    const storePii = typeof storePiiOverride === "boolean" 
      ? storePiiOverride 
      : (process.env.STORE_PII === "true");

    const newPayees = [];
    for (const payeeSeed of uniquePayees.values()) {
      if (payeeMap.has(payeeSeed.hashedName)) continue;
      newPayees.push({
        displayName: storePii ? payeeSeed.rawName : maskName(payeeSeed.rawName),
        normalizedName: storePii ? normalizeName(payeeSeed.rawName) : undefined,
        hashedName: payeeSeed.hashedName,
        confidence: 0.3,
      });
    }

    if (newPayees.length > 0) {
      console.log("[importService] Creating new payees:", newPayees.length);
      const createdPayees = await Payee.insertMany(newPayees, { ordered: false });
      for (const payee of createdPayees) {
        payeeMap.set(payee.hashedName, payee);
      }
    }

    // 4. Removed Inline Embeddings (Deferred to Background Job)
    // To avoid Gemini API rate limits on the free tier, we no longer
    // embed during import. Transactions are created with `embedding: null`
    // and processed by `embeddingJob.js` in the background.
    // 5. Prepare Transaction Operations with Deduplication
    console.log("[importService] Preparing bulk write for transactions...");
    const ops = [];
    const uploadHashCounts = new Map();
    const hashPreviewMap = new Map();

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const payee = payeeMap.get(tx.hashedName);
      if (!payee) continue; // Should not happen

      const sourceHash = generateTransactionHash(tx, payee._id);
      uploadHashCounts.set(sourceHash, (uploadHashCounts.get(sourceHash) || 0) + 1);
      
      if (!hashPreviewMap.has(sourceHash)) {
        hashPreviewMap.set(sourceHash, {
          name: tx.name,
          amount: tx.amount,
          date: tx.date,
        });
      }

      const sanitizedTx = { ...tx };
      delete sanitizedTx.rawName;
      if (storePii && tx.rawName) {
        sanitizedTx.name = tx.rawName;
      }

      ops.push({
        updateOne: {
          filter: { sourceHash, sessionId },
          update: {
            $setOnInsert: {
              ...sanitizedTx,
              payee: payee._id,
              sourceHash,
              sessionId,
              importBatchId: batch._id,
              embedding: null,
              embeddingMetadata: {
                merchant: payee.displayName,
                category: payee.category
              }
            },
          },
          upsert: true,
        },
      });
    }

    // 6. Bulk Write
    console.log("[importService] Executing bulk write of ops:", ops.length);
    const bulkResult = ops.length
      ? await Transaction.bulkWrite(ops, { ordered: false })
      : { upsertedCount: 0 };
    
    const importedCount = bulkResult.upsertedCount || 0;
    const skippedCount = transactions.length - importedCount;
    console.log(`[importService] Bulk write complete. Imported: ${importedCount}, Skipped: ${skippedCount}`);

    // 7. Finalize Batch
    batch.importedCount = importedCount;
    batch.skippedCount = skippedCount;
    batch.status = "COMPLETED";
    batch.duplicateHashes = [...uploadHashCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([hash]) => hash);
    await batch.save();

    // 8. Generate Summaries for affected periods
    const { uniqueMonths, uniqueWeeks } = collectPeriods(transactions);

    console.log("[importService] Updating summaries for months:", [...uniqueMonths]);
    for (const monthStr of uniqueMonths) {
      await generateMonthlySummary(sessionId, monthStr);
    }

    console.log("[importService] Updating summaries for weeks:", [...uniqueWeeks]);
    for (const weekStr of uniqueWeeks) {
      await generateWeeklySummary(sessionId, weekStr);
    }

    return {
      success: true,
      batchId: batch._id,
      imported: importedCount,
      skipped: skippedCount,
      totalParsed: transactions.length,
    };
  } catch (error) {
    batch.status = "FAILED";
    batch.errorMessage = error.message;
    await batch.save();
    throw error;
  }
}

module.exports = { processUpiImport };
