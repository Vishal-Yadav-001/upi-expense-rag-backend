require("dotenv").config();
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Payee = require("../models/Payee");
const { generateBatchEmbeddings } = require("../services/embeddingService");

const BATCH_SIZE = 100;

async function migrate() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected.");

  console.log("Fetching all transactions...");
  const transactions = await Transaction.find({}).populate("payee").lean();
  console.log(`Found ${transactions.length} transactions to re-embed.`);

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const chunk = transactions.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(transactions.length / BATCH_SIZE)}...`);
    
    // Generate embedding strings
    const texts = chunk.map(tx => {
      const merchant = tx.payee ? tx.payee.displayName : tx.name;
      const category = tx.payee ? tx.payee.category : "UNCATEGORIZED";
      return `Merchant: ${merchant}, Category: ${category}, Amount: ${tx.amount}`;
    });

    // Generate new embeddings locally
    console.log(`Generating local embeddings for ${texts.length} items...`);
    const embeddings = await generateBatchEmbeddings(texts);

    // Prepare bulk updates
    const bulkOps = chunk.map((tx, idx) => ({
      updateOne: {
        filter: { _id: tx._id },
        update: { $set: { embedding: embeddings[idx] } }
      }
    }));

    console.log(`Updating DB for batch...`);
    await Transaction.bulkWrite(bulkOps);
  }

  console.log("Migration complete!");
  process.exit(0);
}

migrate().catch(console.error);
