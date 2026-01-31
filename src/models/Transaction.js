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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
