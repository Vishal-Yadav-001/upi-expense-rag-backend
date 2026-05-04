const { executeTool } = require("./toolExecutor");
const Transaction = require("../models/Transaction");
const Payee = require("../models/Payee");

jest.mock("../models/Transaction");
jest.mock("../models/Payee");

describe("toolExecutor - query_database", () => {
  const sessionId = "test-session-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should execute a valid aggregation pipeline on transactions", async () => {
    const pipeline = JSON.stringify([{ $match: { amount: { $gt: 100 } } }]);
    const mockResult = [{ _id: "1", amount: 150 }];
    
    Transaction.aggregate.mockResolvedValue(mockResult);

    const result = await executeTool("query_database", {
      collection: "transactions",
      pipeline,
      sessionId
    });

    expect(result).toEqual(mockResult);
    // Verify sessionId injection
    expect(Transaction.aggregate).toHaveBeenCalledWith([
      { $match: { sessionId } },
      { $match: { amount: { $gt: 100 } } }
    ]);
  });

  test("should throw error for invalid JSON pipeline", async () => {
    await expect(executeTool("query_database", {
      collection: "transactions",
      pipeline: "invalid-json",
      sessionId
    })).rejects.toThrow("Invalid JSON in pipeline argument");
  });

  test("should throw error for unsupported collection", async () => {
    await expect(executeTool("query_database", {
      collection: "users",
      pipeline: "[]",
      sessionId
    })).rejects.toThrow("Unsupported collection: users");
  });
});
