const Payee = require("../models/Payee");

/**
 * Normalize any raw payee name
 */
function normalizeName(name) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Find or create payee
 * AUTO learning happens here
 */
async function resolvePayee(rawName) {
  const normalized = normalizeName(rawName);

  let payee = await Payee.findOne({ normalizedName: normalized });

  if (!payee) {
    payee = await Payee.create({
      displayName: rawName,
      normalizedName: normalized,
      confidence: 0.3, // base confidence
    });
  } else {
    // small auto-learning bump for recurring usage
    payee.confidence = Math.min(0.7, payee.confidence + 0.05);
    await payee.save();
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
  normalizeName, // useful for GraphQL later
};
