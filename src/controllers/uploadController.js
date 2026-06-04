const { processUpiImport } = require("../services/importService");

exports.uploadUpiPdf = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json({
        success: false,
        message: "No PDF uploaded. Use form-data with key 'file'.",
      });
    }

    // Support both boolean and string "true"/"false" from form-data
    let storePii = req.body.storePii;
    if (storePii === "true") storePii = true;
    if (storePii === "false") storePii = false;
    if (typeof storePii !== "boolean") storePii = undefined;

    const apiKeyOverride = req.header("X-Gemini-API-Key");

    const result = await processUpiImport({
      filePath: req.file.path,
      originalFileName: req.file.originalname,
      source: req.upiPdfSource || "SUPER_MONEY",
      sessionId: req.sessionId,
      storePii,
      apiKeyOverride,
    });

    res.status(200).json({
      success: true,
      ...result,
      message: "UPI PDF ingested successfully",
    });
  } catch (error) {
    console.error("[uploadController] UPI PDF ingestion failed:", error);
    
    let friendlyMessage = error.message || "Failed to ingest UPI PDF";
    
    // Intercept Google Gemini AI rate limits and quota errors
    if (friendlyMessage.includes("429") || friendlyMessage.toLowerCase().includes("exhausted")) {
      friendlyMessage = "The AI processing engine is currently at capacity (Rate Limited). Please add your own Gemini API key in the Settings page to continue immediately!";
    }

    res.status(500).json({
      success: false,
      message: friendlyMessage,
    });
  }
};
