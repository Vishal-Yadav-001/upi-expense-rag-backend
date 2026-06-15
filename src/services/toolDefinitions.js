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
      "Returns an exact list of transactions and their total sum. ALWAYS use this (with the merchantName parameter) when the user asks about a specific merchant, company, or payee. Do NOT use semantic_search for specific merchants.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          enum: ["SUCCESS", "FAILED"],
          description: "Filter by transaction status (optional)",
        },
        merchantName: {
          type: Type.STRING,
          description: "Search for a specific merchant or payee name. This searches the raw UPI transaction name (e.g. 'Super.money', 'Swiggy', 'HDFC') as well as the resolved payee display name. Use the exact brand name as it appears in UPI (optional).",
        },
        category: {
          type: Type.STRING,
          description: "Filter transactions by a specific category like 'Food', 'Family', 'Travel', 'Utilities'. Use this when the user asks for transactions within a category. Case-insensitive. (optional)",
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
          description: "Maximum number of transactions to return (default 10)",
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
  {
    name: "semantic_search",
    description:
      "Find transactions using fuzzy or meaning-based search. Use this ONLY for broad topics like 'food', 'travel', or 'utilities'. Do NOT use this tool if the user asks for a specific merchant name (use get_transactions with merchantName instead).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "The search query (e.g. 'recent food expenses')",
        },
        limit: {
          type: Type.NUMBER,
          description: "Maximum number of transactions to return (default 5)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_financial_summary",
    description:
      "Returns pre-aggregated financial summaries for a specific period type (MONTHLY or WEEKLY). Use this for broad questions about spending trends, total monthly budget, or comparing months. It is much faster and more accurate than scanning individual transactions for high-level numbers.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          enum: ["MONTHLY", "WEEKLY"],
          description: "The aggregation level — MONTHLY for monthly totals, WEEKLY for week-by-week breakdown (default: MONTHLY)",
        },
        limit: {
          type: Type.NUMBER,
          description: "Number of periods to return, starting from most recent (default: 6)",
        },
      },
      required: [],
    },
  },
  {
    name: "set_user_budget",
    description: "Updates the user's monthly spending limit (budget). Use this when the user asks to set, change, or update their budget.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: {
          type: Type.NUMBER,
          description: "The new monthly budget amount (e.g. 20000)"
        }
      },
      required: ["amount"]
    }
  },
];

module.exports = toolDefinitions;
