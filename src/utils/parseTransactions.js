const monthMap = {
  January: "01", February: "02", March: "03", April: "04",
  May: "05", June: "06", July: "07", August: "08",
  September: "09", October: "10", November: "11", December: "12",
};

function parseTransactions(rawText) {
  if (!rawText) return [];

  // Collapse all whitespace into single spaces
  const cleanText = rawText.replace(/\s+/g, " ");

  const results = [];
  
  // Regex designed to capture Name, Sign (if exists), Amount, and Date components
  const regex = /(?<name>.+?)\s*ICICI\s*X+84\s*(?<sign>[+-])?(?<amount>\d+\.\d{2})\s*(?<day>\d{1,2})\s+(?<month>January|February|March|April|May|June|July|August|September|October|November|December)\s+(?<year>\d{4})\s*(?<status>SUCCESS|FAILED)/g;

  let match;
  while ((match = regex.exec(cleanText)) !== null) {
    const g = match.groups;
    
    // Clean headers and noise from the name
    let cleanName = g.name.trim()
      .replace(/.*NameBankAmountDateStatus/g, "")
      .replace(/.*History/g, "")
      .trim();

    /** 
     * DIRECTION LOGIC:
     * 1. If sign is '+', it's always CREDIT.
     * 2. If sign is '-', it's always DEBIT.
     * 3. If it's FAILED (usually has no sign in your text), it represents a failed DEBIT attempt.
     */
    let direction = "DEBIT"; 
    if (g.sign === "+") {
      direction = "CREDIT";
    }

    results.push({
      name: cleanName,
      amount: parseFloat(g.amount),
      direction: direction,
      date: `${g.year}-${monthMap[g.month]}-${g.day.padStart(2, "0")}`,
      status: g.status,
    });
  }

  return results;
}

module.exports = parseTransactions;
