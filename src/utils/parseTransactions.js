const parserFactory = require("./parserFactory");

/**
 * parseTransactions
 * Legacy entry point. Now delegates to the ParserFactory Strategy.
 */
function parseTransactions(rawText) {
  if (!rawText) return [];
  return parserFactory(rawText);
}

module.exports = parseTransactions;
