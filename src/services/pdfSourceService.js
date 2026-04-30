const SUPPORTED_PDF_SOURCE = "SUPER_MONEY";

function resolvePdfSource(source) {
  if (!source || typeof source !== "string") return SUPPORTED_PDF_SOURCE;
  const normalized = source.trim().toUpperCase();
  if (normalized === "") return SUPPORTED_PDF_SOURCE;
  return normalized;
}

function assertSupportedPdfSource(source) {
  const resolved = resolvePdfSource(source);
  if (resolved !== SUPPORTED_PDF_SOURCE) {
    throw new Error(`Unsupported PDF source "${resolved}". Phase 1 only supports ${SUPPORTED_PDF_SOURCE}.`);
  }
  return resolved;
}

module.exports = {
  resolvePdfSource,
  assertSupportedPdfSource,
  SUPPORTED_PDF_SOURCE,
};
