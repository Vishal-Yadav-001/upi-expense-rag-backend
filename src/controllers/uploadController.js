const ingestUpiPdf = require("../services/upiIngestionService");
const Transaction = require("../models/Transaction");;

exports.uploadUpiPdf = async (req, res) => {
  try {
    /**
     * TEMP: hardcoded PDF path
     * Later this will come from multer / cloud storage
     */
    const filePath = "./src/data/sm_transactions_1769354327041.pdf";

    const transactions = await ingestUpiPdf(filePath);

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
