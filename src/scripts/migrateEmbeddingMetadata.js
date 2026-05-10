require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const connectDB = require('../config/db');
const Transaction = require('../models/Transaction');
const Payee = require('../models/Payee');

const migrate = async () => {
  try {
    await connectDB();
    console.log('Connected to database for migration...');

    const transactions = await Transaction.find({ payee: { $exists: true, $ne: null } }).populate('payee');
    console.log(`Found ${transactions.length} transactions with payees.`);

    let updatedCount = 0;
    for (const txn of transactions) {
      if (txn.payee) {
        txn.embeddingMetadata = {
          merchant: txn.payee.displayName,
          category: txn.payee.category
        };
        await txn.save();
        updatedCount++;
      }
    }

    console.log(`Migration complete. Updated ${updatedCount} transactions.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrate();
