const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./src/models/User");

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/upi-expense-rag");
    console.log("Connected to MongoDB");

    const users = await User.find({ email: "admin@upisense.com" });
    console.log(`Found ${users.length} users with email admin@upisense.com`);
    
    users.forEach((u, i) => {
      console.log(`User ${i}:`, JSON.stringify(u, null, 2));
    });

    if (users.length > 0) {
      const u = users[0];
      if (!u.name) {
        console.log("Fixing missing name...");
        u.name = "Admin User";
        await u.save();
        console.log("Fixed!");
      }
    } else {
      console.log("No admin user found. Creating one...");
      await User.create({
        name: "Admin User",
        email: "admin@upisense.com",
        password: "password123",
        monthlyBudget: 50000
      });
      console.log("Created!");
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkUser();
