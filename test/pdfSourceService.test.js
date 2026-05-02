const { resolvePdfSource, assertSupportedPdfSource } = require("../src/services/pdfSourceService");
const ingestUpiPdf = require("../src/services/upiIngestionService");

describe("pdfSourceService", () => {
  test("resolvePdfSource defaults to SUPER_MONEY", () => {
    expect(resolvePdfSource()).toBe("SUPER_MONEY");
    expect(resolvePdfSource("")).toBe("SUPER_MONEY");
  });

  test("resolvePdfSource normalizes supported values", () => {
    expect(resolvePdfSource("super_money")).toBe("SUPER_MONEY");
    expect(resolvePdfSource("  SUPER_MONEY ")).toBe("SUPER_MONEY");
  });

  test("assertSupportedPdfSource rejects unsupported sources", () => {
    expect(() => assertSupportedPdfSource("GPAY")).toThrow(/Phase 1 only supports SUPER_MONEY/);
  });

  test("ingestUpiPdf rejects unsupported sources before parsing", async () => {
    await expect(ingestUpiPdf("fake.pdf", "PHONEPE")).rejects.toThrow(/Phase 1 only supports SUPER_MONEY/);
  });
});
