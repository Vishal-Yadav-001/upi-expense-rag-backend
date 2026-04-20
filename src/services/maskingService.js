const crypto = require("crypto");

/**
 * Normalizes a string by converting to lowercase and collapsing whitespace.
 */
function normalize(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Creates a stable SHA-256 hash of a string.
 * Useful for deduplication and joining data without storing PII.
 */
function hash(str) {
  const normalized = normalize(str);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Masks a name (e.g., "John Doe" -> "J*** D**").
 */
function maskName(name) {
  if (!name) return "";
  const parts = name.split(/\s+/).filter(Boolean);
  return parts
    .map((part) => {
      const first = part[0] || "";
      return first ? `${first}${"*".repeat(Math.max(1, part.length - 1))}` : "*";
    })
    .join(" ");
}

/**
 * Masks PII like account numbers or VPA IDs.
 * (e.g., "12345678" -> "****5678")
 */
function maskPII(str, visibleChars = 4) {
  if (!str) return "";
  if (str.length <= visibleChars) return "*".repeat(str.length);
  const visiblePart = str.slice(-visibleChars);
  return "*".repeat(str.length - visibleChars) + visiblePart;
}

module.exports = {
  normalize,
  hash,
  maskName,
  maskPII,
};
