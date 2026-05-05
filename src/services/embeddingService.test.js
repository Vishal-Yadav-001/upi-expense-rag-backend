require("dotenv").config();
const { generateEmbedding } = require("./embeddingService");

describe("embeddingService", () => {
  test("should return a 768-dimension vector for a given string", async () => {
    // Note: This will actually call the real API if GEMINI_API_KEY is set, 
    // or fail if it's not. In a real CI environment we would mock this.
    const text = "Merchant: Zomato, Category: Food, Amount: 500";
    const vector = await generateEmbedding(text);
    expect(Array.isArray(vector)).toBe(true);
    expect(vector.length).toBe(3072);
  }, 10000); // Increase timeout for API call
});
