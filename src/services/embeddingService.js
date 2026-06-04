const { GoogleGenAI } = require("@google/genai");

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateEmbedding(text, apiKeyOverride) {
  if (!text) return null;
  try {
    const ai = apiKeyOverride ? new GoogleGenAI({ apiKey: apiKeyOverride }) : genAI;
    const result = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: [{ parts: [{ text }] }],
    });
    return result.embeddings[0].values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

async function generateBatchEmbeddings(texts, apiKeyOverride) {
  if (!texts || texts.length === 0) return [];
  try {
    const ai = apiKeyOverride ? new GoogleGenAI({ apiKey: apiKeyOverride }) : genAI;
    const result = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: texts.map(text => ({ parts: [{ text }] })),
    });
    return result.embeddings.map(emb => emb.values);
  } catch (error) {
    console.error("Error generating batch embeddings:", error);
    throw error;
  }
}

module.exports = { generateEmbedding, generateBatchEmbeddings };
