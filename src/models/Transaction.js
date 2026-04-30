const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    bank: { type: String },
    amount: { type: Number, required: true },
    direction: {
      type: String,
      enum: ["CREDIT", "DEBIT", "UNKNOWN"],
      required: true,
    },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      required: true,
    },
    source: {
      type: String,
      default: "UPI_PDF",
    },
    sourceHash: {
      type: String,
      required: true,
      index: true,
    },
    importBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ImportBatch",
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    payee:{
      type:mongoose.Schema.Types.ObjectId,
      ref:"Payee",
      index:true
    },
    sessionId: {
      type: String,
      index: true,
    }
  },
  { timestamps: true }
);

transactionSchema.index(
  { date: -1, status: 1, direction: 1 },
  { name: "txn_date_status_direction_idx" }
);
transactionSchema.index(
  { sourceHash: 1, sessionId: 1 },
  { name: "txn_source_hash_session_unique", unique: true }
);


module.exports = mongoose.model("Transaction", transactionSchema);
