const { hash, maskName } = require("../../services/maskingService");

const monthMap = {
  January: "01", February: "02", March: "03", April: "04",
  May: "05", June: "06", July: "07", August: "08",
  September: "09", October: "10", November: "11", December: "12",
};

/**
 * ICICI Parser Strategy
 * Identifies transactions based on ICICI statement patterns.
 */
const iciciParser = {
  name: "ICICI_BANK",
  
  // A quick check to see if this parser should handle the text
  canHandle: (text) => text.includes("ICICI") && /X+84/.test(text),

  parse: (cleanText) => {
    const results = [];
    const regex = /(?<name>.+?)\s*ICICI\s*X+84\s*(?<sign>[+-])?(?<amount>\d+\.\d{2})\s*(?<day>\d{1,2})\s+(?<month>January|February|March|April|May|June|July|August|September|October|November|December)\s+(?<year>\d{4})\s*(?<status>SUCCESS|FAILED)/g;

    let match;
    while ((match = regex.exec(cleanText)) !== null) {
      const g = match.groups;
      
      let cleanName = g.name.trim()
        .replace(/.*NameBankAmountDateStatus/g, "")
        .replace(/.*History/g, "")
        .trim();

      let direction = "DEBIT"; 
      if (g.sign === "+") {
        direction = "CREDIT";
      }

      const hashedName = `PAYEE_${hash(cleanName).slice(0, 12)}`;
      const maskedName = maskName(cleanName);

      results.push({
        name: maskedName,
        rawName: cleanName,
        hashedName,
        amount: parseFloat(g.amount),
        direction: direction,
        date: `${g.year}-${monthMap[g.month]}-${g.day.padStart(2, "0")}`,
        status: g.status,
        bank: "ICICI",
      });
    }
    return results;
  }
};

module.exports = iciciParser;
