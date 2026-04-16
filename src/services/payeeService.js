const Payee = require("../models/Payee");

/**
 * Normalize any raw payee name
 */
function normalizeName(name) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function maskName(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts
    .map((part) => {
      const first = part[0] || "";
      return first ? `${first}${"*".repeat(Math.max(1, part.length - 1))}` : "*";
    })
    .join(" ");
}

/**
 * Find or create payee
 * AUTO learning happens here
 */
async function resolvePayee({ rawName, hashedName }) {
  let payee = await Payee.findOne({ hashedName });

  if (!payee) {
    const storePii = process.env.STORE_PII === "true";
    const displayName = storePii ? rawName : maskName(rawName);
    const normalizedName = storePii ? normalizeName(rawName) : undefined;
    payee = await Payee.create({
      displayName,
      normalizedName,
      hashedName,
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
  normalizeName, // useful for GraphQL later
  maskName,
};
