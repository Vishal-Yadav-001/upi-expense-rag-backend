const { pipeline } = require("@huggingface/transformers");

// We keep a singleton instance of the extractor pipeline
let extractorInstance = null;

async function getExtractor() {
  if (!extractorInstance) {
    // all-MiniLM-L6-v2 outputs 384-dimensional embeddings
    extractorInstance = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return extractorInstance;
}

/**
 * Generate embedding for a single text using local transformers.js.
 * @param {string} text - The input text.
 * @param {string} [apiKeyOverride] - Ignored, kept for API compatibility.
 * @returns {Promise<number[]>} - 384-dimensional vector.
 */
async function generateEmbedding(text, apiKeyOverride) {
  if (!text) return null;
  try {
    const extractor = await getExtractor();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts using local transformers.js.
 * Note: While Gemini supported batching via API, Transformers.js pipeline
 * handles arrays of strings natively.
 * @param {string[]} texts - Array of input texts.
 * @param {string} [apiKeyOverride] - Ignored, kept for API compatibility.
 * @returns {Promise<number[][]>} - Array of 384-dimensional vectors.
 */
async function generateBatchEmbeddings(texts, apiKeyOverride) {
  if (!texts || texts.length === 0) return [];
  try {
    const extractor = await getExtractor();
    const output = await extractor(texts, { pooling: "mean", normalize: true });
    
    // The output is a tensor of shape [batch_size, 384]
    // We need to split it into an array of arrays
    const result = [];
    const size = output.dims[1]; // 384
    for (let i = 0; i < output.dims[0]; i++) {
      const start = i * size;
      const end = start + size;
      result.push(Array.from(output.data.subarray(start, end)));
    }
    
    return result;
  } catch (error) {
    console.error("Error generating batch embeddings:", error);
    throw error;
  }
}

module.exports = { generateEmbedding, generateBatchEmbeddings };
