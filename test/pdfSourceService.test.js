const test = require("node:test");
const assert = require("node:assert/strict");

const { resolvePdfSource, assertSupportedPdfSource } = require("../src/services/pdfSourceService");
const ingestUpiPdf = require("../src/services/upiIngestionService");

test("resolvePdfSource defaults to SUPER_MONEY", () => {
  assert.equal(resolvePdfSource(), "SUPER_MONEY");
  assert.equal(resolvePdfSource(""), "SUPER_MONEY");
});

test("resolvePdfSource normalizes supported values", () => {
  assert.equal(resolvePdfSource("super_money"), "SUPER_MONEY");
  assert.equal(resolvePdfSource("  SUPER_MONEY "), "SUPER_MONEY");
});

test("assertSupportedPdfSource rejects unsupported sources", () => {
  assert.throws(
    () => assertSupportedPdfSource("GPAY"),
    /Phase 1 only supports SUPER_MONEY/,
  );
});

test("ingestUpiPdf rejects unsupported sources before parsing", async () => {
  await assert.rejects(
    () => ingestUpiPdf("fake.pdf", "PHONEPE"),
    /Phase 1 only supports SUPER_MONEY/,
  );
});
