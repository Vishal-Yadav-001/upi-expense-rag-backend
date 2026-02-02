const ingestUpiPdf = require("../services/upiIngestionService");
const Transaction = require("../models/Transaction");
const Payee = require("../models/Payee");

exports.uploadUpiPdf = async (req, res) => {
  try {
    /**
     * TEMP: hardcoded PDF path
     * Later this will come from multer / cloud storage
     */
    const filePath = "./src/data/sm_transactions_1769354327041.pdf";

    const transactions = await ingestUpiPdf(filePath);

    const transactionsToInsert = [];

    for (const tx of transactions) {
      // Try to find existing Payee by normalized name
      let payee = await Payee.findByRawName(tx.name);
      // If not found, create a new Payee
      if (!payee) {
        payee = await Payee.create({
          displayName: tx.name,
          normalizedName: tx.name,
          category: "UNCATEGORIZED",
          confidence: 0.3,
        });
      }
      // Attach Payee refrence to Transaction
      transactionsToInsert.push({
        ...tx,
        payee: payee._id,
      });
    }
    // Bulk insert transactions with Payee references
    await Transaction.insertMany(transactions);

    res.status(200).json({
      success: true,
      count: transactions.length,
      message: "UPI PDF ingested successfully",
      transactions,
    });
  } catch (error) {
    console.error("UPI PDF ingestion failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to ingest UPI PDF",
    });
  }
};
