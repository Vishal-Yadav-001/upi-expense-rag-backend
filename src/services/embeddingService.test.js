require("dotenv").config();
const { generateEmbedding } = require("./embeddingService");

describe("embeddingService", () => {
  test("should return a 384-dimension vector for a given string", async () => {
    // Note: This will download the Xenova/all-MiniLM-L6-v2 model on first run
    // and run inference locally via Transformers.js
    const text = "Merchant: Zomato, Category: Food, Amount: 500";
    const vector = await generateEmbedding(text);
    expect(Array.isArray(vector)).toBe(true);
    expect(vector.length).toBe(384);
  }, 30000); // Increase timeout for initial model download
});
