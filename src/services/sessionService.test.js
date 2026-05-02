const { wipeSessionData } = require("./sessionService");
const Transaction = require("../models/Transaction");
const ImportBatch = require("../models/ImportBatch");

jest.mock("../models/Transaction");
jest.mock("../models/ImportBatch");

describe("sessionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("wipeSessionData", () => {
    it("should throw an error if sessionId is not provided", async () => {
      await expect(wipeSessionData()).rejects.toThrow("Session ID is required for data wipe");
    });

    it("should delete transactions and import batches for the given sessionId", async () => {
      const sessionId = "test-session-id";
      
      Transaction.deleteMany.mockResolvedValue({ deletedCount: 5 });
      ImportBatch.deleteMany.mockResolvedValue({ deletedCount: 2 });

      const result = await wipeSessionData(sessionId);

      expect(Transaction.deleteMany).toHaveBeenCalledWith({ sessionId });
      expect(ImportBatch.deleteMany).toHaveBeenCalledWith({ sessionId });
      expect(result).toEqual({
        transactionsDeleted: 5,
        batchesDeleted: 2
      });
    });

    it("should delete transactions BEFORE import batches", async () => {
      const sessionId = "test-session-id";
      const callOrder = [];

      Transaction.deleteMany.mockImplementation(async () => {
        callOrder.push("transactions");
        return { deletedCount: 0 };
      });
      ImportBatch.deleteMany.mockImplementation(async () => {
        callOrder.push("batches");
        return { deletedCount: 0 };
      });

      await wipeSessionData(sessionId);

      expect(callOrder).toEqual(["transactions", "batches"]);
    });
  });
});
