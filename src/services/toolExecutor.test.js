const { executeTool } = require("./toolExecutor");
const Transaction = require("../models/Transaction");
const Payee = require("../models/Payee");
const User = require("../models/User");

jest.mock("../models/Transaction");
jest.mock("../models/Payee");
jest.mock("../models/User");

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

describe("toolExecutor - set_user_budget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should update the monthly budget for admin user", async () => {
    const amount = 50000;
    const mockUser = {
      email: "admin@upisense.com",
      monthlyBudget: amount
    };
    
    User.findOneAndUpdate.mockResolvedValue(mockUser);

    const result = await executeTool("set_user_budget", { amount });

    expect(result).toEqual({ success: true, newBudget: amount });
    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { email: "admin@upisense.com" },
      { monthlyBudget: amount },
      { new: true, upsert: true }
    );
  });
});
