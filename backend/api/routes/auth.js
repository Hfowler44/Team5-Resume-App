const router = require("express").Router();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const {
  ensureSmtpConfigured,
  sendPasswordResetEmail,
} = require("../services/mailer");

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const PASSWORD_RESET_RESPONSE =
  "If an account exists for that email, a password reset link has been sent.";

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getPasswordResetLifetimeMs = () => {
  const minutes = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || 60);
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 60) * 60 * 1000;
};

const getResetBaseUrl = (req) => {
  if (process.env.PASSWORD_RESET_URL) {
    return process.env.PASSWORD_RESET_URL;
  }

  const origin = req.get("origin");
  if (origin) {
    return origin;
  }

  const forwardedHost = req.get("x-forwarded-host");
  if (forwardedHost) {
    const protocol = req.get("x-forwarded-proto") || "https";
    return `${protocol}://${forwardedHost}`;
  }

  return `http://localhost:${process.env.FRONTEND_PORT || 3000}`;
};

const buildPasswordResetUrl = (req, token) => {
  const url = new URL(getResetBaseUrl(req));
  url.searchParams.set("reset", token);
  return url.toString();
};

// POST /api/auth/register
router.post(
  "/register",
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { fullName, email, password } = req.body;
      const normalizedEmail = email.toLowerCase();
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await User.create({
        fullName,
        email: normalizedEmail,
        passwordHash,
      });
      const token = signToken(user._id);

      res.status(201).json({
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.accountStatus !== "active") {
        return res.status(403).json({ error: "Account is disabled" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = signToken(user._id);
      res.json({
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Valid email is required")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      ensureSmtpConfigured();

      const email = req.body.email.toLowerCase();
      const user = await User.findOne({ email });

      if (!user || user.accountStatus !== "active") {
        return res.json({ message: PASSWORD_RESET_RESPONSE });
      }

      const token = crypto.randomBytes(32).toString("hex");
      user.passwordResetTokenHash = hashResetToken(token);
      user.passwordResetExpiresAt = new Date(
        Date.now() + getPasswordResetLifetimeMs()
      );
      await user.save();

      try {
        await sendPasswordResetEmail({
          to: user.email,
          fullName: user.fullName,
          resetUrl: buildPasswordResetUrl(req, token),
        });
      } catch (error) {
        user.passwordResetTokenHash = null;
        user.passwordResetExpiresAt = null;
        await user.save();
        error.status = error.status || 502;
        error.message =
          error.message || "Unable to send password reset email right now";
        throw error;
      }

      res.json({ message: PASSWORD_RESET_RESPONSE });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/reset-password
router.post(
  "/reset-password",
  [
    body("token").trim().notEmpty().withMessage("Reset token is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, password } = req.body;
      const user = await User.findOne({
        passwordResetTokenHash: hashResetToken(token),
        passwordResetExpiresAt: { $gt: new Date() },
      });

      if (!user) {
        return res
          .status(400)
          .json({ error: "This password reset link is invalid or has expired." });
      }

      user.passwordHash = await bcrypt.hash(password, 10);
      user.passwordResetTokenHash = null;
      user.passwordResetExpiresAt = null;
      await user.save();

      res.json({ message: "Password reset successful. You can log in now." });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
