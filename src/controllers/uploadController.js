const crypto = require("crypto");
const ingestUpiPdf = require("../services/upiIngestionService");
const Transaction = require("../models/Transaction");
const ImportBatch = require("../models/ImportBatch");
const Payee = require("../models/Payee");
const { maskName, normalizeName } = require("../services/payeeService");

function buildSourceHash(tx, payeeId) {
  // Keep this fingerprint stable across re-imports so duplicate statements stay idempotent.
  const payload = [
    tx.hashedName || tx.name,
    tx.amount,
    tx.direction,
    tx.date,
    tx.status,
    payeeId ? payeeId.toString() : "",
  ].join("|");
  return crypto.createHash("sha256").update(payload).digest("hex");
}

exports.uploadUpiPdf = async (req, res) => {
  try {
    if (!req.file || !req.file.path) {
      console.log("[upload] No file found on request");
      return res.status(400).json({
        success: false,
        message: "No PDF uploaded. Use form-data with key 'file'.",
      });
    }

    const filePath = req.file.path;
    console.log("[upload] Starting ingestion for:", req.file.originalname);
    const transactions = await ingestUpiPdf(filePath);
    console.log("[upload] Transactions ready for import:", transactions.length);

    const batch = await ImportBatch.create({
      originalFileName: req.file.originalname,
      storedFilePath: filePath,
      transactionCount: transactions.length,
      parsedCount: transactions.length,
    });
    console.log("[upload] Import batch created:", batch._id.toString());

    // Resolve payees once per upload instead of querying Mongo for every transaction row.
    const uniquePayees = new Map();
    for (const tx of transactions) {
      if (!uniquePayees.has(tx.hashedName)) {
        uniquePayees.set(tx.hashedName, {
          rawName: tx.rawName || tx.name,
          hashedName: tx.hashedName,
        });
      }
    }
    console.log("[upload] Unique payees in file:", uniquePayees.size);

    const hashedNames = [...uniquePayees.keys()];
    const existingPayees = await Payee.find({ hashedName: { $in: hashedNames } });
    const payeeMap = new Map(existingPayees.map((payee) => [payee.hashedName, payee]));
    console.log("[upload] Existing payees matched:", existingPayees.length);

    const storePii = process.env.STORE_PII === "true";
    const newPayees = [];
    for (const payeeSeed of uniquePayees.values()) {
      if (payeeMap.has(payeeSeed.hashedName)) continue;
      newPayees.push({
        displayName: storePii ? payeeSeed.rawName : maskName(payeeSeed.rawName),
        normalizedName: storePii ? normalizeName(payeeSeed.rawName) : undefined,
        hashedName: payeeSeed.hashedName,
        confidence: 0.3,
      });
    }

    if (newPayees.length > 0) {
      console.log("[upload] Creating new payees:", newPayees.length);
      const createdPayees = await Payee.insertMany(newPayees, { ordered: false });
      for (const payee of createdPayees) {
        payeeMap.set(payee.hashedName, payee);
      }
    }

    if (payeeMap.size !== uniquePayees.size) {
      console.log("[upload] Refreshing payee map to cover concurrent inserts");
      const refreshedPayees = await Payee.find({ hashedName: { $in: hashedNames } });
      for (const payee of refreshedPayees) {
        payeeMap.set(payee.hashedName, payee);
      }
    }

    const ops = [];
    let processed = 0;
    const progressInterval = Math.max(10, Math.floor(transactions.length / 5));

    for (const tx of transactions) {
      const payee = payeeMap.get(tx.hashedName);
      if (!payee) {
        throw new Error(`Payee resolution failed for ${tx.hashedName}`);
      }
      const sourceHash = buildSourceHash(tx, payee._id);

      // Never persist the raw payee name unless PII storage is explicitly enabled.
      const sanitizedTx = { ...tx };
      delete sanitizedTx.rawName;
      if (process.env.STORE_PII === "true" && tx.rawName) {
        sanitizedTx.name = tx.rawName;
      }

      ops.push({
        updateOne: {
          filter: { sourceHash },
          update: {
            $setOnInsert: {
              ...sanitizedTx,
              payee: payee._id,
              sourceHash,
              importBatchId: batch._id,
            },
          },
          upsert: true,
        },
      });

      processed += 1;
      if (processed % progressInterval === 0 || processed === transactions.length) {
        console.log(`[upload] Prepared ${processed}/${transactions.length} transaction ops`);
      }
    }

    const bulkResult = ops.length
      ? await Transaction.bulkWrite(ops, { ordered: false })
      : { upsertedCount: 0 };
    const importedCount = bulkResult.upsertedCount || 0;
    const skippedCount = transactions.length - importedCount;

    batch.importedCount = importedCount;
    batch.skippedCount = skippedCount;
    batch.status = "COMPLETED";
    await batch.save();

    console.log("[upload] Bulk write complete:", {
      operations: ops.length,
      imported: importedCount,
      skipped: skippedCount,
    });
    console.log("[upload] Batch finalized:", {
      id: batch._id.toString(),
      status: batch.status,
      parsedCount: batch.parsedCount,
      importedCount: batch.importedCount,
      skippedCount: batch.skippedCount,
    });

    res.status(200).json({
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      totalParsed: transactions.length,
      importBatchId: batch._id,
      message: "UPI PDF ingested successfully",
    });
  } catch (error) {
    console.error("UPI PDF ingestion failed:", error);

    if (req.file && req.file.path) {
      const failedBatch = await ImportBatch.findOne({ storedFilePath: req.file.path }).sort({
        createdAt: -1,
      });
      if (failedBatch) {
        failedBatch.status = "FAILED";
        failedBatch.errorMessage = error.message;
        await failedBatch.save();
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to ingest UPI PDF",
    });
  }
};
