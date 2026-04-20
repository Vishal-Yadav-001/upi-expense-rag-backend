const iciciParser = require("./parsers/iciciParser");

const parsers = [iciciParser];

/**
 * ParserFactory
 * Orchestrates the selection of the correct parsing strategy based on text content.
 */
function parserFactory(text) {
  const cleanText = text.replace(/\s+/g, " ");

  // Find a parser that says it "canHandle" the given text
  const selectedParser = parsers.find((p) => p.canHandle(cleanText));

  if (!selectedParser) {
    console.warn("[ParserFactory] No matching parser found for statement.");
    return [];
  }

  console.log(`[ParserFactory] Using Strategy: ${selectedParser.name}`);
  return selectedParser.parse(cleanText);
}

module.exports = parserFactory;
