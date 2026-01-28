const path = require("path");
const parseUpiPdf = require("../utils/parseUpiPdf");

(async () => {
  const pdfPath = path.join(
    __dirname,
    "../data/sm_transactions_1769354327041.pdf",
  );
console.log(pdfPath)
  const text = await parseUpiPdf(pdfPath);
  console.log(text);
})();
