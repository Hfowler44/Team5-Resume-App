const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpiresAt: { type: Date, default: null },
    emailVerified: { type: Boolean, default: true },
    emailVerifiedAt: { type: Date, default: null },
    emailVerificationTokenHash: { type: String, default: null },
    emailVerificationExpiresAt: { type: Date, default: null },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    accountStatus: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
    },
  },
  { timestamps: true }
);

userSchema.index({ accountStatus: 1, updatedAt: -1 });
userSchema.index(
  { emailVerificationTokenHash: 1 },
  { sparse: true, name: "users_email_verification_token" }
);

module.exports = mongoose.model("User", userSchema);
