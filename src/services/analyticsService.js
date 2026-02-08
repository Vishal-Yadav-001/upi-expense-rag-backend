const Transaction = require("../models/Transaction");

async function totalSpendByCategory({ fromDate, toDate }) {
  const match = { direction: "DEBIT" };

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

module.exports = {
  totalSpendByCategory,
};
