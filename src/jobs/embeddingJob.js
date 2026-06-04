const Transaction = require("../models/Transaction");
const { generateBatchEmbeddings } = require("../services/embeddingService");

/**
 * Background job to process transactions that have `embedding: null`.
 * To stay under Gemini's free tier rate limits (15 RPM), this job
 * runs periodically and processes a small batch of transactions.
 */
class EmbeddingJob {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.batchSize = 10; // 10 transactions per batch
    this.intervalMs = 60000; // Run every 60 seconds
  }

  start() {
    if (this.intervalId) return;
    console.log(`[embeddingJob] Started. Running every ${this.intervalMs / 1000}s`);
    this.intervalId = setInterval(() => this.processBatch(), this.intervalMs);
    // Run once immediately on start
    setTimeout(() => this.processBatch(), 2000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[embeddingJob] Stopped.");
    }
  }

  async processBatch() {
    if (this.isRunning) return;
    
    try {
      this.isRunning = true;
      
      // Find transactions without embeddings
      const transactions = await Transaction.find({ embedding: null })
        .populate("payee")
        .limit(this.batchSize)
        .lean();

      if (transactions.length === 0) {
        this.isRunning = false;
        return; // Nothing to process
      }

      console.log(`[embeddingJob] Found ${transactions.length} transactions to embed...`);

      // Prepare text strings for embedding
      const embeddingStrings = transactions.map(tx => {
        // If it was created from payee.resolvers or sync, it might have metadata
        if (tx.embeddingMetadata) {
          return `Merchant: ${tx.embeddingMetadata.merchant}, Category: ${tx.embeddingMetadata.category}, Amount: ${tx.amount}`;
        }
        
        // Otherwise derive it
        const merchant = tx.payee ? tx.payee.displayName : tx.name;
        const category = tx.payee ? tx.payee.category : "UNCATEGORIZED";
        return `Merchant: ${merchant}, Category: ${category}, Amount: ${tx.amount}`;
      });

      // Generate embeddings using Gemini API
      const embeddings = await generateBatchEmbeddings(embeddingStrings);

      // Bulk update the database
      const bulkOps = transactions.map((tx, index) => ({
        updateOne: {
          filter: { _id: tx._id },
          update: { $set: { embedding: embeddings[index] } }
        }
      }));

      await Transaction.bulkWrite(bulkOps);
      console.log(`[embeddingJob] Successfully embedded ${transactions.length} transactions.`);

    } catch (error) {
      // If we hit a 429 rate limit, it's fine, we'll just try again next minute
      if (error.status === 429) {
        console.warn("[embeddingJob] Rate limit reached. Will retry later.");
      } else {
        console.error("[embeddingJob] Error generating embeddings:", error);
      }
    } finally {
      this.isRunning = false;
    }
  }
}

module.exports = new EmbeddingJob();
