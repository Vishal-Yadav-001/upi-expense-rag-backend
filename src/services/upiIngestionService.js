const parseUpiPdf = require("../utils/parseUpiPdf");
const parseTransactions = require("../utils/parseTransactions");
const { assertSupportedPdfSource } = require("./pdfSourceService");

async function ingestUpiPdf(filePath, source = "SUPER_MONEY") {
  // Validate source before doing any work
  assertSupportedPdfSource(source);

  console.log("[ingestion] Starting PDF parse:", filePath);
  const rawText = await parseUpiPdf(filePath);
  console.log("[ingestion] Extracted text length:", rawText.length);
  const transactions = parseTransactions(rawText);
  console.log("[ingestion] Parsed transactions:", transactions.length);
  return transactions;
}

module.exports = ingestUpiPdf;
