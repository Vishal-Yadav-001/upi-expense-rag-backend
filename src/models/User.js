const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    // Legacy field — optional for Clerk users
    name: {
      type: String,
      trim: true,
    },
    // Legacy field — optional for Clerk users; sparse so Clerk-only docs don't collide
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    // Legacy field — optional for Clerk users
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    monthlyBudget: {
      type: Number,
      default: 0,
    },
    clerkId: {
      type: String,
      index: true,
      sparse: true, // optional: not all rows may have it (e.g. mock admin)
    },
  },
  {
    timestamps: true,
  },
);

function hashPassword(raw) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(raw, salt, 100000, 64, "sha512")
    .toString("hex");
  return `pbkdf2$${salt}$${hash}`;
}

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = hashPassword(this.password);
});

module.exports = mongoose.model("User",userSchema);
