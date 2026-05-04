const { Type } = require("@google/genai");

/**
 * Tool definitions for Gemini function calling.
 * Each entry describes one callable tool - Gemini reads these and decides
 * which one(s) to invoke based on the user's question.
 *
 * These map 1:1 to your existing service functions and MongoDB queries.
 */
const toolDefinitions = [
  {
    name: "get_monthly_spend",
    description:
      "Returns total debit (money spent) grouped by month. Use this when the user asks about spending trends, monthly breakdown, how spending changed over time, or comparisons between months.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        fromDate: {
          type: Type.STRING,
          description: "Start date in ISO format YYYY-MM-DD (optional)",
        },
        toDate: {
          type: Type.STRING,
          description: "End date in ISO format YYYY-MM-DD (optional)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_spend_by_category",
    description:
      "Returns total amount spent grouped by payee category (e.g. Food, Entertainment, Utilities). Use this when the user asks how much they spent on a specific category or wants a category breakdown.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        fromDate: {
          type: Type.STRING,
          description: "Start date in ISO format YYYY-MM-DD (optional)",
        },
        toDate: {
          type: Type.STRING,
          description: "End date in ISO format YYYY-MM-DD (optional)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_subscriptions",
    description:
      "Detects recurring payments that look like subscriptions (monthly or weekly). Returns payee name, frequency, average amount, confidence score, and whether the price has drifted. Use this when the user asks about subscriptions, recurring bills, or repeated merchant charges.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: {
          type: Type.NUMBER,
          description: "Maximum number of subscriptions to return (default 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_upcoming_bills",
    description:
      "Predicts upcoming subscription payments within a given number of days based on historical patterns. Use this when the user asks about upcoming bills, what they will be charged soon, or future payment reminders.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        days: {
          type: Type.NUMBER,
          description: "Number of days ahead to look for upcoming payments (default 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_top_payees",
    description:
      "Returns the most frequent payees by transaction count and total amount. Use this when the user asks who they pay most, top merchants, biggest expenses by recipient, or frequent transfers.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: {
          type: Type.NUMBER,
          description: "Maximum number of payees to return (default 10)",
        },
        direction: {
          type: Type.STRING,
          enum: ["DEBIT", "CREDIT"],
          description: "DEBIT for money sent out, CREDIT for money received",
        },
      },
      required: ["direction"],
    },
  },
  {
    name: "get_transactions",
    description:
      "Returns a filtered list of transactions. Use this when the user asks to see recent transactions, transactions in a date range, failed transactions, or credits/debits.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          enum: ["SUCCESS", "FAILED"],
          description: "Filter by transaction status (optional)",
        },
        direction: {
          type: Type.STRING,
          enum: ["DEBIT", "CREDIT"],
          description: "DEBIT for money sent, CREDIT for money received (optional)",
        },
        fromDate: {
          type: Type.STRING,
          description: "Start date in ISO format YYYY-MM-DD (optional)",
        },
        toDate: {
          type: Type.STRING,
          description: "End date in ISO format YYYY-MM-DD (optional)",
        },
        limit: {
          type: Type.NUMBER,
          description: "Maximum number of transactions to return (default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_overall_summary",
    description:
      "Returns the overall date range (min and max dates) and the total money spent (debit) and received (credit) for the user's data. Use this when asked for a high-level summary of an uploaded statement or total spending overview.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "query_database",
    description:
      "Execute a raw MongoDB aggregation pipeline for complex queries that other tools cannot answer. Use this for filtered counts, custom groupings, finding specific high/low values, or multi-collection joins.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        collection: {
          type: Type.STRING,
          enum: ["transactions", "payees"],
          description: "The collection to query",
        },
        pipeline: {
          type: Type.STRING,
          description: "JSON stringified array of MongoDB aggregation stages",
        },
      },
      required: ["collection", "pipeline"],
    },
  },
];

module.exports = toolDefinitions;
