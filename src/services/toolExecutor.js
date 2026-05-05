const { totalSpendByCategory, monthlySpend, getOverallSummary } = require("./analyticsService");
const {
  getTopRecurringPayees,
  getSubscriptions,
  getUpcomingSubscriptions,
} = require("./insightsService");
const Transaction = require("../models/Transaction");
const { generateEmbedding } = require("./embeddingService");

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
 * Validates that a date string is a valid ISO date (YYYY-MM-DD).
 * Rejects bad inputs before they reach MongoDB to prevent query errors.
 */
function isValidDate(str) {
  if (!str) return true; // optional fields are fine
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(new Date(str).getTime());
}

async function executeTool(toolName, args = {}) {
  // Validate date args on every tool that accepts them
  if (args.fromDate && !isValidDate(args.fromDate)) {
    throw new Error(`Invalid fromDate: "${args.fromDate}". Use YYYY-MM-DD format.`);
  }
  if (args.toDate && !isValidDate(args.toDate)) {
    throw new Error(`Invalid toDate: "${args.toDate}". Use YYYY-MM-DD format.`);
  }

  const { sessionId } = args;

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
      const { status, direction, fromDate, toDate, limit = 10 } = args;

      const query = { sessionId };
      if (status) query.status = status;
      if (direction) query.direction = direction;
      if (fromDate || toDate) {
        query.date = {};
        if (fromDate) query.date.$gte = new Date(fromDate);
        if (toDate) query.date.$lte = new Date(toDate);
      }

      const transactions = await Transaction.find(query)
        .populate("payee", "displayName category")
        .sort({ date: -1 })
        .limit(limit)
        .lean();

      // Return a clean flat shape - drop raw `name` since `payee` covers it
      return transactions.map((tx) => ({
        payee: tx.payee?.displayName || tx.name,
        category: tx.payee?.category || "UNCATEGORIZED",
        amount: tx.amount,
        direction: tx.direction,
        date: new Date(tx.date).toISOString().split("T")[0],
        status: tx.status,
      }));
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

      return Transaction.aggregate(pipeline);
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

module.exports = { executeTool };
