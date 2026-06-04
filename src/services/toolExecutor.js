const { totalSpendByCategory, monthlySpend, getOverallSummary } = require("./analyticsService");
const {
  getTopRecurringPayees,
  getSubscriptions,
  getUpcomingSubscriptions,
} = require("./insightsService");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const { generateEmbedding } = require("./embeddingService");
const FinancialSummary = require("../models/FinancialSummary");

/**
 * Executes the tool Gemini chose and returns structured data.
 * The returned data is sent back to Gemini so it can compose a natural language answer.
 *
 * Each case maps to one toolDefinition name and calls your existing
 * service functions or MongoDB queries directly.
 *
 * @param {string} toolName - The Gemini returned in functionCalls[0].name
 * @param {object} args - The arguments Gemini extracted from the user's question
 * @returns {Promise<any>} - Raw data (array or object) for Gemini to narrate
 */

/**
 * Validates that a date string is a valid date (supports YYYY-MM-DD and ISO strings).
 * Returns the normalized YYYY-MM-DD string or throws if invalid.
 */
function normalizeDate(str) {
  if (!str) return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: "${str}". Please use YYYY-MM-DD format.`);
  }
  return d.toISOString().split("T")[0];
}

async function executeTool(toolName, args = {}) {
  const { sessionId } = args;

  // Normalize date args on every tool that accepts them
  try {
    if (args.fromDate) args.fromDate = normalizeDate(args.fromDate);
    if (args.toDate) args.toDate = normalizeDate(args.toDate);
  } catch (err) {
    throw err;
  }

  switch (toolName) {
    case "get_monthly_spend": {
      const { fromDate, toDate } = args;
      return monthlySpend({ fromDate, toDate, sessionId });
    }

    case "get_spend_by_category": {
      const { fromDate, toDate } = args;
      return totalSpendByCategory({ fromDate, toDate, sessionId });
    }

    case "get_overall_summary": {
      return getOverallSummary({ sessionId });
    }

    case "get_subscriptions": {
      const { limit = 10 } = args;
      const results = await getSubscriptions({ limit, sessionId });

      return results.map((item) => ({
        payeeName: item.payee.displayName,
        category: item.payee.category,
        frequency: item.frequency,
        avgAmount: item.avgAmount,
        transactionCount: item.transactionCount,
        lastPaidAt: new Date(item.lastPaidAt).toISOString().split("T")[0],
        confidence: item.confidence,
        priceChange: item.priceChange,
      }));
    }

    case "get_upcoming_bills": {
      const { days = 10 } = args;
      const results = await getUpcomingSubscriptions({ days, sessionId });

      return results.map((item) => ({
        payeeName: item.payee.displayName,
        category: item.payee.category,
        expectedDate: item.expectedDate.split("T")[0],
        avgAmount: item.avgAmount,
        confidence: item.confidence,
      }));
    }

    case "get_top_payees": {
      const { limit = 10, direction } = args;
      const results = await getTopRecurringPayees({ limit, direction, sessionId });

      return results.map((item) => ({
        payeeName: item.payee.displayName,
        category: item.payee.category,
        transactionCount: item.transactionCount,
        totalAmount: item.totalAmount,
        lastPaidAt: new Date(item.lastPaidAt).toISOString().split("T")[0],
      }));
    }

    case "get_transactions": {
      // Cap at 10 rows - sending 20 transactions to Gemini risks exceeding token budget
      const { status, direction, fromDate, toDate, merchantName, limit = 10 } = args;

      const query = { sessionId };
      if (status) query.status = status;
      if (direction) query.direction = direction;
      if (merchantName) {
        // Search the raw transaction name for matches
        query.name = { $regex: merchantName, $options: "i" };
      }
      
      if (fromDate || toDate) {
        query.date = {};
        if (fromDate) query.date.$gte = new Date(fromDate);
        if (toDate) {
          const d = new Date(toDate);
          d.setUTCHours(23, 59, 59, 999);
          query.date.$lte = d;
        }
      }

      const transactions = await Transaction.find(query)
        .populate("payee", "displayName category")
        .sort({ date: -1 })
        .limit(limit)
        .lean();

      let totalSum = 0;
      const mappedTransactions = transactions.map((tx) => {
        totalSum += tx.amount;
        return {
          payee: tx.payee?.displayName || tx.name,
          category: tx.payee?.category || "UNCATEGORIZED",
          amount: tx.amount,
          direction: tx.direction,
          date: new Date(tx.date).toISOString().split("T")[0],
          status: tx.status,
        };
      });

      return {
        totalSumCalculated: totalSum,
        results: mappedTransactions,
      };
    }

    case "query_database": {
      const { collection, pipeline, sessionId } = args;
      let parsedPipeline;
      try {
        parsedPipeline = JSON.parse(pipeline);
      } catch (e) {
        throw new Error("Invalid JSON in pipeline argument");
      }

      if (!Array.isArray(parsedPipeline)) {
        throw new Error("Pipeline must be an array");
      }

      // SECURITY: Block destructive or leak-prone aggregation stages
      const FORBIDDEN_STAGES = ["$out", "$merge", "$lookup", "$unionWith", "$function", "$accumulator"];
      const hasForbiddenStage = parsedPipeline.some(stage => {
        const stageName = Object.keys(stage)[0];
        return FORBIDDEN_STAGES.includes(stageName);
      });

      if (hasForbiddenStage) {
        throw new Error("Pipeline contains unauthorized operations. Read-only queries allowed.");
      }

      // Security: Always scope to sessionId in the first stage
      const scopedPipeline = [{ $match: { sessionId } }, ...parsedPipeline];

      if (collection === "transactions") {
        return Transaction.aggregate(scopedPipeline);
      } else if (collection === "payees") {
        return Payee.aggregate(scopedPipeline);
      } else {
        throw new Error(`Unsupported collection: ${collection}`);
      }
    }

    case "semantic_search": {
      const { query, limit = 5 } = args;
      const queryVector = await generateEmbedding(query);

      const pipeline = [
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector,
            numCandidates: 100,
            limit,
            filter: { sessionId },
          },
        },
        {
          $lookup: {
            from: "payees",
            localField: "payee",
            foreignField: "_id",
            as: "payeeInfo",
          },
        },
        {
          $unwind: {
            path: "$payeeInfo",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            payee: { $ifNull: ["$payeeInfo.displayName", "$name"] },
            category: { $ifNull: ["$payeeInfo.category", "UNCATEGORIZED"] },
            amount: 1,
            direction: 1,
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            status: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ];

      const results = await Transaction.aggregate(pipeline);
      let totalSum = 0;
      results.forEach((r) => {
        totalSum += r.amount;
      });

      return {
        totalSumCalculated: totalSum,
        results,
      };
    }

    case "get_financial_summary": {
      const { type = "MONTHLY", limit = 6 } = args;
      const summaries = await FinancialSummary.find({ sessionId, type })
        .sort({ period: -1 })
        .limit(limit)
        .lean();

      return summaries.map(s => ({
        period: s.period,
        totalDebit: s.data.totalDebit,
        totalCredit: s.data.totalCredit,
        transactionCount: s.data.transactionCount,
        topCategories: s.data.topCategories
      }));
    }

    case "set_user_budget": {
      const { amount } = args;
      const user = await User.findOneAndUpdate(
        { sessionId: sessionId },
        { monthlyBudget: amount },
        { new: true, upsert: true }
      );
      return { success: true, newBudget: user.monthlyBudget };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

module.exports = { executeTool };
