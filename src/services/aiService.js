const { GoogleGenAI } = require("@google/genai");
const toolDefinitions = require("./toolDefinitions");
const { executeTool } = require("./toolExecutor");

const DEFAULT_MODEL = "gemini-2.5-flash";

function getApiKey(apiKeyOverride) {
  if (apiKeyOverride && apiKeyOverride.trim()) {
    return apiKeyOverride.trim();
  }

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }

  return null;
}

function getAI(apiKeyOverride) {
  const apiKey = getApiKey(apiKeyOverride);
  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({ apiKey });
}

function getRetryDelaySeconds(message) {
  const match = message.match(/Please retry in\s+([\d.]+)s/i);
  if (match) {
    return Math.ceil(Number(match[1]));
  }
  return null;
}

function formatAIError(err, { hasUserApiKey = false } = {}) {
  const message = err && err.message ? err.message : "Unknown AI error";
  const isQuotaExceeded =
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("Quota exceeded") ||
    message.includes('"code":429');

  if (isQuotaExceeded) {
    const retrySeconds = getRetryDelaySeconds(message);
    if (retrySeconds) {
      if (hasUserApiKey) {
        return `AI quota is temporarily exhausted. Please try again in about ${retrySeconds} seconds, check your Gemini quota, or switch to another model.`;
      }

      return `AI quota is temporarily exhausted. Please try again in about ${retrySeconds} seconds. Add your own Gemini API key from the Add AI Key button to continue right away.`;
    }

    if (hasUserApiKey) {
      return "AI quota is temporarily exhausted. Please check your Gemini quota or switch to another model and try again.";
    }

    return "AI quota is temporarily exhausted. Please try again shortly, or Add your own Gemini API key from the Add AI Key button to continue.";
  }

  return "I'm having trouble connecting right now. Please try again in a moment.";
}

/**
 * System prompt - sets the AI's behaviour as a financial assistant.
 * Rules:
 * - Always use Rs symbol and Indian number formatting
 * - Only quote exact numbers from tool results, never estimate or hallucinate
 * - Say "I don't have enough data" if tools return empty results
 * - Always mention the time period the answer covers
 * - Be concise - 2-4 sentences unless the user asks for a list
 */
const SYSTEM_PROMPT = `You are a personal finance assistant for Indian UPI transactions.

Rules you must always follow:
1. Always use the Rs symbol for amounts. Format large numbers in Indian style (e.g. Rs 1,20,000 not Rs 120,000).
2. Only use exact numbers returned by tools. Never estimate, guess, or hallucinate figures.
3. If a tool returns an empty array or no data, say "I don't have enough data to answer that" - do not make up an answer.
4. Always mention the time period your answer covers when relevant (e.g. "this month", "in the last 3 months").
5. Be concise. 2-4 sentences for simple questions. Use bullet points only when listing 3+ items.
6. If the user asks about a specific payee or merchant, look for it in the tool results - do not assume it exists.`;

/**
 * Main AI function - sends a question to Gemini with tool definitions,
 * handles the function calling loop, and returns the final answer.
 *
 * Flow (from Gemini docs):
 * Step 1: Send question + tool definitions to Gemini
 * Step 2: Gemini returns a function call (which tool to run + args)
 * Step 3: Execute the tool against MongoDB
 * Step 4: Send the result back to Gemini
 * Step 5: Gemini composes a natural language answer using exact data
 *
 * @param {string} question - The user's natural language question
 * @param {string} sessionId - The user's session ID
 * @param {{ modelName?: string, apiKey?: string }} [options] - Optional Gemini config
 * @returns {Promise<{ answer: string, toolsUsed: string[], data: string|null }>}
 */
async function askAI(question, sessionId, options = {}) {
  const modelName = options.modelName || DEFAULT_MODEL;
  const hasUserApiKey = Boolean(options.apiKey && options.apiKey.trim());

  try {
    const ai = getAI(options.apiKey);
    if (!ai) {
      return {
        answer: "AI is not configured yet. Add GEMINI_API_KEY to use this feature.",
        toolsUsed: [],
        data: null,
      };
    }

    const config = {
      tools: [{ functionDeclarations: toolDefinitions }],
      systemInstruction: SYSTEM_PROMPT,
      // Cap output to avoid runaway token usage (guardrail: output_tokens < 300)
      generationConfig: { maxOutputTokens: 400 },
    };

    // Build the conversation - starts with just the user's question
    const contents = [
      { role: "user", parts: [{ text: question }] },
    ];

    // Step 1 & 2: Send to Gemini - it will respond with a function call or a direct answer
    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config,
    });

    // If Gemini answered directly without calling any tool, return it as-is
    const functionCalls = response.functionCalls;
    if (!functionCalls || functionCalls.length === 0) {
      return { answer: response.text, toolsUsed: [], data: null };
    }

    // Step 3: Execute every tool Gemini requested (Gemini can call multiple tools at once)
    const toolsUsed = [];
    const allData = {};
    const functionResponseParts = [];

    for (const toolCall of functionCalls) {
      toolsUsed.push(toolCall.name);
      console.log(`[aiService] Executing tool: ${toolCall.name}`, toolCall.args);

      let result;
      try {
        result = await executeTool(toolCall.name, { ...toolCall.args, sessionId });
      } catch (toolErr) {
        // Tool execution failed - return safe fallback, do not hallucinate
        console.error(`[aiService] Tool ${toolCall.name} failed:`, toolErr.message);

        return {
          answer: "I encountered an error fetching your data. Please try again.",
          toolsUsed,
          data: null,
        };
      }

      allData[toolCall.name] = result;

      // Each tool result is packaged as a functionResponse part per Gemini docs
      functionResponseParts.push({
        functionResponse: {
          name: toolCall.name,
          response: { result },
          id: toolCall.id,
        },
      });
    }

    // Step 4: Append model's function call response + our tool results to the conversation
    contents.push(response.candidates[0].content); // Gemini's function call message
    contents.push({ role: "user", parts: functionResponseParts }); // Our tool results

    // Step 5: Ask Gemini to compose a final natural language answer from the tool data
    const finalResponse = await ai.models.generateContent({
      model: modelName,
      contents,
      config,
    });

    return {
      answer: finalResponse.text,
      toolsUsed,
      // Raw data stringified so the frontend can optionally render source data cards
      data: JSON.stringify(allData),
    };
  } catch (err) {
    // Top-level catch: Gemini API error, network timeout, etc.
    console.error("[aiService] askAI failed:", err.message);
    return {
      answer: formatAIError(err, { hasUserApiKey }),
      toolsUsed: [],
      data: null,
    };
  }
}

module.exports = { askAI };
