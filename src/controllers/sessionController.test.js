const request = require("supertest");
const { createApp } = require("../app");
const sessionService = require("../services/sessionService");

// Mock the session service
jest.mock("../services/sessionService");

describe("Session Controller", () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe("DELETE /api/session/clear", () => {
    it("should return 200 and success message when session is cleared", async () => {
      const mockResult = { transactionsDeleted: 5, batchesDeleted: 1 };
      sessionService.wipeSessionData.mockResolvedValue(mockResult);

      const response = await request(app)
        .delete("/api/session/clear")
        .set("X-Session-ID", "test-session-123");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Session data cleared successfully",
        details: mockResult,
      });
      expect(sessionService.wipeSessionData).toHaveBeenCalledWith("test-session-123");
    });

    it("should return 400 when X-Session-ID header is missing", async () => {
      const response = await request(app)
        .delete("/api/session/clear");

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("No session ID provided");
    });

    it("should return 500 when wipeSessionData fails", async () => {
      sessionService.wipeSessionData.mockRejectedValue(new Error("Database error"));

      const response = await request(app)
        .delete("/api/session/clear")
        .set("X-Session-ID", "test-session-123");

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Failed to clear session data");
      expect(response.body.error).toBe("Database error");
    });
  });
});
