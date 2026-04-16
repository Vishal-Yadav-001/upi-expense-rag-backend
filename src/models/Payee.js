const mongoose = require("mongoose");

const payeeSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      required: true,
    },

    normalizedName: {
      type: String,
      index: true,
      set: (v) => {
        if (!v) return undefined;
        return v.toLowerCase().replace(/\s+/g, " ").trim();
      },
    },

    hashedName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    aliases: {
      type: [String],
      default: [],
    },

    category: {
      type: String,
      default: "UNCATEGORIZED",
      index: true,
    },

    confidence: {
      type: Number,
      default: 0.3, // low confidence initially
    },

    source: {
      type: String,
      default: "UPI_PDF",
    },
  },
  { timestamps: true },
);

payeeSchema.statics.findByRawName = function (name) {
  const normalized = name.toLowerCase().replace(/\s+/g, " ").trim();

  return this.findOne({ normalizedName: normalized });
};

module.exports = mongoose.model("Payee", payeeSchema);
