/**
 * Returns a stringified representation of the database schema for the LLM.
 * This context helps the LLM generate valid MongoDB aggregation pipelines.
 */
function getDatabaseSchema() {
  return `
DATABASE SCHEMA:

Collection: "transactions" (Model: Transaction)
Fields:
- name: string (Original raw name from statement)
- amount: number (Transaction value)
- direction: enum ["CREDIT", "DEBIT", "UNKNOWN"] (DEBIT is money spent)
- date: date (ISO format)
- status: enum ["SUCCESS", "FAILED"]
- payee: ObjectId (Reference to "payees" collection)
- sessionId: string (Security boundary - ALWAYS auto-injected by backend)

Collection: "payees" (Model: Payee)
Fields:
- displayName: string (Cleaned name for display)
- normalizedName: string (Lowercased/trimmed name for lookups)
- category: string (e.g. "Food & Dining", "Shopping", "Travel", "Utilities", "Entertainment", "Health", "Transfer", "Investments", "Personal Care", "Other")
- payeeType: enum ["P2P", "P2M", "UNKNOWN"]
- confidence: number (Classification confidence 0-1)

IMPORTANT AGGREGATION RULES:
1. "payees" are referenced via the "payee" field in "transactions". Use $lookup if you need to filter or group by category.
2. The backend ALWAYS injects { sessionId } into your first $match stage. Do not include it yourself unless you are filtering for a specific session (rare).
3. Use $match, $group, $sort, $limit, $project, $unwind, $lookup.
4. For date filtering, use ISODate strings (e.g., { "$gte": "2024-01-01T00:00:00.000Z" }).
5. Example $lookup:
   {
     "$lookup": {
       "from": "payees",
       "localField": "payee",
       "foreignField": "_id",
       "as": "payeeDetails"
     }
   }
`.trim();
}

module.exports = { getDatabaseSchema };
