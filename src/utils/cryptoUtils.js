const crypto = require("crypto");

/**
 * Generates a deterministic hash for a transaction to prevent duplicates.
 * 
 * Fingerprint includes:
 * - Payee ID (or Name if ID is not available)
 * - Amount
 * - Direction (DR/CR)
 * - Date
 * - Status (SUCCESS/FAILED)
 * - Bank name
 */
function generateTransactionHash(tx, payeeId = null) {
  const payload = [
    payeeId ? payeeId.toString() : (tx.hashedName || tx.name),
    tx.amount,
    tx.direction,
    tx.date instanceof Date ? tx.date.toISOString().split("T")[0] : tx.date,
    tx.status,
    tx.bank || "UNKNOWN",
  ].join("|");

  return crypto.createHash("sha256").update(payload).digest("hex");
}

module.exports = {
  generateTransactionHash,
};
