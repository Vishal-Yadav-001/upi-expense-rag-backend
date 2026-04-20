const Payee = require("../models/Payee");
const { normalize, maskName } = require("./maskingService");

const MERCHANT_KEYWORDS = [
  "limited", "ltd", "pvt", "corp", "inc", "services", "solutions",
  "store", "shop", "mart", "supermarket", "restaurant", "cafe",
  "swiggy", "zomato", "amazon", "flipkart", "uber", "ola", "jio",
  "airtel", "recharge", "bill", "payment", "cinema", "multiplex",
];

const MERCHANT_VPA_SUFFIXES = ["@okhdfcbank", "@okaxis", "@okicici", "@okbizaxis"];

/**
 * Heuristic to classify payeeType (P2P or P2M)
 */
function classifyPayee(name, vpa = "") {
  const normName = normalize(name);
  const normVpa = vpa.toLowerCase();

  // If we have a VPA, check for merchant suffixes (GPay/PhonePe merchants often use specific ones)
  if (normVpa && MERCHANT_VPA_SUFFIXES.some(s => normVpa.endsWith(s))) {
    return "P2M";
  }

  // Check for common merchant keywords in the name
  if (MERCHANT_KEYWORDS.some(k => normName.includes(k))) {
    return "P2M";
  }

  // If the name is very short (likely a personal name) or doesn't match keywords
  return "P2P"; 
}

/**
 * Find or create payee
 * AUTO learning happens here
 */
async function resolvePayee({ rawName, hashedName, vpa = "" }) {
  let payee = await Payee.findOne({ hashedName });

  if (!payee) {
    const storePii = process.env.STORE_PII === "true";
    const displayName = storePii ? rawName : maskName(rawName);
    const normalizedName = storePii ? normalize(rawName) : undefined;
    
    const payeeType = classifyPayee(rawName, vpa);

    payee = await Payee.create({
      displayName,
      normalizedName,
      hashedName,
      payeeType,
      metadata: vpa ? { vpa } : {},
      confidence: 0.3, // base confidence
    });
  }

  return payee;
}

/**
 * Update confidence based on signal
 */
async function updatePayeeConfidence(payee, category, signal = "AUTO") {
  let increment = 0;

  // Only boost if category is new or changed
  const categoryChanged = category && payee.category !== category;

  switch (signal) {
    case "AUTO":
      increment = categoryChanged ? 0.1 : 0;
      break;
    case "CATEGORY_MATCH":
      increment = categoryChanged ? 0.15 : 0;
      break;
    case "USER_CONFIRMED":
      increment = categoryChanged ? 0.3 : 0;
      break;
  }

  if (categoryChanged) {
    payee.category = category;
    payee.confidence = Math.min(0.95, payee.confidence + increment);
  }

  await payee.save();
  return payee;
}

module.exports = {
  resolvePayee,
  updatePayeeConfidence,
  normalizeName: normalize,
  maskName,
};
