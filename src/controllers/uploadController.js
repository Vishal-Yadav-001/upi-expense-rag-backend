const ingestUpiPdf = require("../services/upiIngestionService");
const Transaction = require("../models/Transaction");
const Payee = require("../models/Payee");
const {updatePayeeConfidence,resolvePayee} = require("../services/payeeService");

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
      let payee = await resolvePayee(tx.name);
      // If not found, create a new Payee
      await updatePayeeConfidence(payee, payee.category, "AUTO");
      // Attach Payee refrence to Transaction
      await Transaction.create({
        ...tx,
        payee: payee._id,
      });
    }
    // Bulk insert transactions with Payee references

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
