const parseUpiPdf = require('../utils/parseUpiPdf');
const parseTransactions = require('../utils/parseTransactions');

async function ingestUpiPdf(filePath){
    const rawText = await parseUpiPdf(filePath);
    const transactions = parseTransactions(rawText);
    return transactions;
};

module.exports = ingestUpiPdf;