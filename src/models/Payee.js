const mongoose = require("mongoose");
const { hash } = require("../services/maskingService");

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

    payeeType: {
      type: String,
      enum: ["P2P", "P2M", "UNKNOWN"],
      default: "UNKNOWN",
      index: true,
    },

    metadata: {
      vpa: String,
      phone: String,
      isVerifiedMerchant: Boolean,
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
  const hashedName = `PAYEE_${hash(name).slice(0, 12)}`;

  return this.findOne({
    $or: [
      { normalizedName: normalized },
      { hashedName },
    ],
  });
};

module.exports = mongoose.model("Payee", payeeSchema);
