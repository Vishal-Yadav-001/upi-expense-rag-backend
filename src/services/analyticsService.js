const Transaction = require("../models/Transaction");

async function totalSpendByCategory({ fromDate, toDate, sessionId }) {
  const match = { direction: "DEBIT", status: "SUCCESS", sessionId };

  if (fromDate || toDate) {
    match.date = {};
    if (fromDate) match.date.$gte = new Date(fromDate);
    if (toDate) match.date.$lte = new Date(toDate);
  }

  return Transaction.aggregate([
    { $match: match }, // Filter to debits and optional date range
    {
      $lookup: {
        from: "payees", // Join with payees collection
        localField: "payee", // Transaction.payee
        foreignField: "_id", // Payee._id
        as: "payee", // Place matched payee docs in "payee" array
      },
    },
    { $unwind: "$payee" }, // Flatten the joined payee array
    {
      $group: {
        _id: "$payee.category", // Group by payee category
        total: { $sum: "$amount" }, // Sum amounts per category
      },
    },
    {
      $project: {
        category: "$_id", // Rename _id to category
        total: 1, // Keep total
        _id: 0, // Drop internal _id
      },
    },
    { $sort: { total: -1 } }, // Sort categories by total desc
  ]);
}

async function monthlySpend({ fromDate, toDate, sessionId }) {
  const match = {
    direction: "DEBIT",
    status: "SUCCESS",
    sessionId,
  };

  if (fromDate || toDate) {
    match.date = {};
    if (fromDate) match.date.$gte = new Date(fromDate);
    if (toDate) match.date.$lte = new Date(toDate);
  }

  return Transaction.aggregate([
    { $match: match },

    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
        },
        total: { $sum: "$amount" },
      },
    },

    {
      $project: {
        _id: 0,
        month: {
          $concat: [
            { $toString: "$_id.year" },
            "-",
            {
              $cond: [
                { $lt: ["$_id.month", 10] },
                { $concat: ["0", { $toString: "$_id.month" }] },
                { $toString: "$_id.month" },
              ],
            },
          ],
        },
        total: 1,
      },
    },

    { $sort: { month: 1 } },
  ]);
}

function detectFrequency(dates) {
  if (dates.length < 3) return null;
  const sortedDates = [...dates].sort((a, b) => a - b);

  const intervals = [];
  for (let i = 1; i < sortedDates.length; i++) {
    const diffDays = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
    intervals.push(diffDays);
  }

  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  if (avg > 27 && avg < 32) return "MONTHLY";
  if (avg > 6 && avg < 8) return "WEEKLY";
  return null;
}

module.exports = {
  totalSpendByCategory,
  monthlySpend,
  detectFrequency
};
