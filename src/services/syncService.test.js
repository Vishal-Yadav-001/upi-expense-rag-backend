const { syncSessionData } = require("./syncService");
const Transaction = require("../models/Transaction");
const { generateBatchEmbeddings } = require("./embeddingService");
const { generateMonthlySummary, generateWeeklySummary } = require("./summaryService");

jest.mock("../models/Transaction");
jest.mock("./embeddingService");
jest.mock("./summaryService");

describe("syncService", () => {
  const sessionId = "session-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return zero updates when no stale transactions found", async () => {
    // Setup: 1 fresh transaction
    const mockTx = {
      _id: "tx1",
      amount: 100,
      payee: {
        _id: "p1",
        displayName: "Merchant A",
        category: "Food"
      },
      embeddingMetadata: {
        merchant: "Merchant A",
        category: "Food"
      }
    };

    Transaction.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([mockTx])
    });

    const result = await syncSessionData(sessionId);

    expect(result).toEqual({ updatedTransactions: 0, updatedSummaries: 0 });
    expect(generateBatchEmbeddings).not.toHaveBeenCalled();
    expect(generateMonthlySummary).not.toHaveBeenCalled();
  });

  test("should identify and update stale transactions", async () => {
    // Setup: 
    // tx1: stale (different merchant)
    // tx2: stale (different category)
    // tx3: fresh
    const staleTx1 = {
      _id: "tx1",
      amount: 100,
      date: new Date("2024-01-15"),
      payee: {
        _id: "p1",
        displayName: "New Merchant A",
        category: "Food"
      },
      embeddingMetadata: {
        merchant: "Old Merchant A",
        category: "Food"
      }
    };

    const staleTx2 = {
      _id: "tx2",
      amount: 200,
      date: new Date("2024-02-15"),
      payee: {
        _id: "p2",
        displayName: "Merchant B",
        category: "Shopping"
      },
      embeddingMetadata: {
        merchant: "Merchant B",
        category: "Misc"
      }
    };

    const freshTx = {
      _id: "tx3",
      amount: 300,
      date: new Date("2024-01-20"),
      payee: {
        _id: "p3",
        displayName: "Merchant C",
        category: "Travel"
      },
      embeddingMetadata: {
        merchant: "Merchant C",
        category: "Travel"
      }
    };

    Transaction.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([staleTx1, staleTx2, freshTx])
    });

    const mockEmbeddings = [[0.1, 0.2], [0.3, 0.4]];
    generateBatchEmbeddings.mockResolvedValue(mockEmbeddings);
    Transaction.bulkWrite.mockResolvedValue({ modifiedCount: 2 });

    const result = await syncSessionData(sessionId);

    expect(result).toEqual({ updatedTransactions: 2, updatedSummaries: 4 });

    // Verify re-embedding strings
    expect(generateBatchEmbeddings).toHaveBeenCalledWith([
      "Merchant: New Merchant A, Category: Food, Amount: 100",
      "Merchant: Merchant B, Category: Shopping, Amount: 200"
    ]);

    // Verify bulk write content
    expect(Transaction.bulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { _id: "tx1" },
          update: {
            $set: {
              embedding: [0.1, 0.2],
              embeddingMetadata: { merchant: "New Merchant A", category: "Food" }
            }
          }
        }
      },
      {
        updateOne: {
          filter: { _id: "tx2" },
          update: {
            $set: {
              embedding: [0.3, 0.4],
              embeddingMetadata: { merchant: "Merchant B", category: "Shopping" }
            }
          }
        }
      }
    ]);

    // Verify summary updates
    expect(generateMonthlySummary).toHaveBeenCalledWith(sessionId, "2024-01");
    expect(generateMonthlySummary).toHaveBeenCalledWith(sessionId, "2024-02");
    expect(generateWeeklySummary).toHaveBeenCalledWith(sessionId, "2024-01-14");
    expect(generateWeeklySummary).toHaveBeenCalledWith(sessionId, "2024-02-11");
  });

  test("should handle missing embeddingMetadata as stale", async () => {
    const staleTx = {
      _id: "tx1",
      amount: 150,
      date: new Date("2024-03-10"),
      payee: {
        _id: "p1",
        displayName: "Merchant D",
        category: "Health"
      }
      // embeddingMetadata is missing
    };

    Transaction.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([staleTx])
    });

    generateBatchEmbeddings.mockResolvedValue([[0.5, 0.6]]);
    Transaction.bulkWrite.mockResolvedValue({ modifiedCount: 1 });

    const result = await syncSessionData(sessionId);

    expect(result.updatedTransactions).toBe(1);
    expect(generateBatchEmbeddings).toHaveBeenCalledWith([
      "Merchant: Merchant D, Category: Health, Amount: 150"
    ]);
  });
});
