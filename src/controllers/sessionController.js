const { wipeSessionData } = require("../services/sessionService");

async function clearSession(req, res) {
  const sessionId = req.sessionId;

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message: "No session ID provided in headers"
    });
  }

  try {
    const result = await wipeSessionData(sessionId);
    return res.status(200).json({
      success: true,
      message: "Session data cleared successfully",
      details: result
    });
  } catch (error) {
    console.error("[sessionController] Error clearing session:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear session data",
      error: error.message
    });
  }
}

module.exports = { clearSession };
