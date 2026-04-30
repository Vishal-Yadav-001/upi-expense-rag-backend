const { processUpiImport } = require("../services/importService");

exports.uploadUpiPdf = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({
        success: false,
        message: "No PDF uploaded. Use form-data with key 'file'.",
      });
    }

    const result = await processUpiImport({
      filePath: req.file.path,
      originalFileName: req.file.originalname,
      source: req.upiPdfSource || "SUPER_MONEY",
      sessionId: req.sessionId,
    });

    res.status(200).json({
      success: true,
      ...result,
      message: "UPI PDF ingested successfully",
    });
  } catch (error) {
    console.error("[uploadController] UPI PDF ingestion failed:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to ingest UPI PDF",
    });
  }
};
