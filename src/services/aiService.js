const { GoogleGenAI } = require("@google/genai");
const toolDefinitions = require("./toolDefinitions");
const { executeTool } = require("./toolExecutor");
const { getDatabaseSchema } = require("../utils/schemaContext");
const { getOverallSummary } = require("./analyticsService");

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

${getDatabaseSchema()}

Rules you must always follow:

1. Always use the Rs symbol for amounts. Format large numbers in Indian style (e.g. Rs 1,20,000 not Rs 120,000).
2. Only use exact numbers returned by tools. Never estimate, guess, or hallucinate figures.
3. If a tool returns an empty array or no data, say "I don't have enough data to answer that" - do not make up an answer.
4. Always mention the time period your answer covers when relevant (e.g. "this month", "in the last 3 months").
5. Be concise. 2-4 sentences for simple questions. Use bullet points only when listing 3+ items.
6. If the user asks about a specific payee or merchant, look for it in the tool results - do not assume it exists.
7. For broad questions about spending trends, total monthly budget, or comparing months (e.g. "how much did I spend this year?"), ALWAYS use "get_financial_summary" first. It provides pre-calculated, accurate aggregates. Adjust the "limit" parameter based on how far back the user is asking (e.g. limit: 12 for a year).
8. For complex questions that static tools cannot answer, use "query_database" with a valid MongoDB aggregation pipeline.

9. SMART DEFAULTS — Never ask for clarification on these; just assume and state it:
   - "debit or credit?" → assume DEBIT (money spent) unless the user mentions income, received, or earnings.
   - "which time period?" → assume the LAST 3 MONTHS unless the user specifies otherwise.
   - "should I categorise?" → YES, always group by category unless the user asks for a flat list.
   - "top N?" → assume TOP 10 unless specified.
   Apply the default, answer immediately, then add one line: "I've shown debit transactions — say 'credit' to switch."

10. INFER FROM CONTEXT — Before asking anything, re-read the user's message for implicit signals:
    - "where am I spending" / "what am I paying" → debit
    - "what am I receiving" / "who pays me" / "income" → credit
    - "this month" / "last month" / "this year" → use that exact window
    - a payee name → filter to that payee; don't ask which one
    If you can infer the answer, infer it. Do not ask.

11. ONE CLARIFICATION MAX — If you genuinely cannot answer without one missing piece of information, ask ONLY that one question — never a list of questions. If you asked a clarifying question in a previous turn, treat the user's reply as the answer to that question AND all future similar questions in this session. Do not re-ask the same type of question twice.`;

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
 * @param {{ modelName?: string, apiKey?: string, history?: Array }} [options] - Optional Gemini config
 * @returns {Promise<{ answer: string, toolsUsed: string[], data: string|null }>}
 */
async function askAI(question, sessionId, options = {}) {
  const modelName = options.modelName || DEFAULT_MODEL;
  const hasUserApiKey = Boolean(options.apiKey && options.apiKey.trim());
  const history = options.history || [];

  try {
    const ai = getAI(options.apiKey);
    if (!ai) {
      return {
        answer: "AI is not configured yet. Add GEMINI_API_KEY to use this feature.",
        toolsUsed: [],
        data: null,
      };
    }

    // Fetch user's data timeline to anchor relative date calculations
    const summary = await getOverallSummary({ sessionId });
    const maxDate = summary.maxDate || new Date().toISOString().split('T')[0];
    
    const dynamicSystemPrompt = `${SYSTEM_PROMPT}

12. DATA TIMELINE CONTEXT: The user's most recent transaction in the database is from ${maxDate}. 
CRITICAL: When the user asks for relative time periods like "last month", "this month", "last 3 months", or "recent", you MUST calculate the fromDate and toDate relative to ${maxDate}, NOT the current real-world date. For example, if maxDate is 2024-03-15, "last month" means February 2024.
IMPORTANT EXPLANATION: If you use this relative time shifting, you MUST briefly mention it in your response so the user understands why you chose those dates. (e.g., "Since your most recent records are from May 2024, here is your spending for the 3 months leading up to that.")`;

    const config = {
      tools: [{ functionDeclarations: toolDefinitions }],
      systemInstruction: dynamicSystemPrompt,
      generationConfig: { maxOutputTokens: 600 },
    };

    // Step 1: Map incoming history to Gemini format
    const mappedHistory = history
      .filter(m => !m.content.includes("I encountered an error"))
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

    const contents = [
      ...mappedHistory,
      { role: "user", parts: [{ text: question }] },
    ];

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config,
    });

    const functionCalls = response.functionCalls;
    
    // If Gemini answered directly (e.g. greeting), return it
    if (!functionCalls || functionCalls.length === 0) {
      return { answer: response.text, toolsUsed: [], data: null };
    }

    // Step 3: Execute tools
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
        console.error(`[aiService] Tool ${toolCall.name} failed:`, toolErr.message);
        return {
          answer: "I encountered an error fetching your data. Please try again.",
          toolsUsed,
          data: null,
        };
      }

      allData[toolCall.name] = result;
      functionResponseParts.push({
        functionResponse: {
          name: toolCall.name,
          response: { result },
          id: toolCall.id,
        },
      });
    }

    // Step 4 & 5: Feed results back and get final answer
    const finalContents = [
      ...contents,
      response.candidates[0].content, // Gemini's call
      { role: "user", parts: functionResponseParts }, // Tool result
    ];

    const finalResponse = await ai.models.generateContent({
      model: modelName,
      contents: finalContents,
      config,
    });

    return {
      answer: finalResponse.text,
      toolsUsed,
      data: JSON.stringify(allData),
    };

  } catch (err) {
    console.error("[aiService] askAI failed:", err.message);
    return {
      answer: formatAIError(err, { hasUserApiKey }),
      toolsUsed: [],
      data: null,
    };
  }
}

module.exports = { askAI };
