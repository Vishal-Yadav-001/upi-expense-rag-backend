/**
 * Converts a date to a monthly period string in "YYYY-MM" format.
 * @param {Date} date
 * @returns {string} e.g. "2025-03"
 */
function toMonthStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Converts a date to the ISO date string of the preceding Monday (start of week).
 * @param {Date} date
 * @returns {string} e.g. "2025-03-10"
 */
function toWeekStr(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

/**
 * Collects unique month and week period strings from an array of transactions.
 * @param {Array<{date: Date|string}>} transactions
 * @returns {{ uniqueMonths: Set<string>, uniqueWeeks: Set<string> }}
 */
function collectPeriods(transactions) {
  const uniqueMonths = new Set();
  const uniqueWeeks = new Set();

  for (const tx of transactions) {
    const date = new Date(tx.date);
    uniqueMonths.add(toMonthStr(date));
    uniqueWeeks.add(toWeekStr(date));
  }

  return { uniqueMonths, uniqueWeeks };
}

module.exports = { toMonthStr, toWeekStr, collectPeriods };
