const mongoose = require("mongoose");

const importBatchSchema = new mongoose.Schema(
  {
    originalFileName: { type: String, required: true },
    storedFilePath: { type: String, required: true },
    source: { type: String, default: "UPI_PDF" },
    // These counters make each upload auditable even when every transaction is deduped away.
    transactionCount: { type: Number, default: 0 },
    parsedCount: { type: Number, default: 0 },
    importedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    duplicateHashes: {
      type: [String],
      default: [],
    },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ImportBatch", importBatchSchema);
