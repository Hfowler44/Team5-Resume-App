const router = require("express").Router();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const {
  ensureSmtpConfigured,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} = require("../services/mailer");

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const PASSWORD_RESET_RESPONSE =
  "If an account exists for that email, a password reset link has been sent.";
const EMAIL_VERIFICATION_RESPONSE =
  "If the account needs verification, a verification email has been sent.";
const EMAIL_VERIFICATION_SENT =
  "Check your email to verify your account before logging in.";

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getTokenLifetimeMs = (envKey, defaultMinutes) => {
  const minutes = Number(process.env[envKey] || defaultMinutes);
  return (
    Number.isFinite(minutes) && minutes > 0 ? minutes : defaultMinutes
  ) * 60 * 1000;
};

const getFrontendBaseUrl = (req, overrideEnvKey) => {
  if (process.env[overrideEnvKey]) {
    return process.env[overrideEnvKey];
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

const buildTokenUrl = (req, overrideEnvKey, queryParam, token) => {
  const url = new URL(getFrontendBaseUrl(req, overrideEnvKey));
  url.searchParams.set(queryParam, token);
  return url.toString();
};

const buildPasswordResetUrl = (req, token) =>
  buildTokenUrl(req, "PASSWORD_RESET_URL", "reset", token);

const buildEmailVerificationUrl = (req, token) =>
  buildTokenUrl(req, "EMAIL_VERIFICATION_URL", "verify", token);

const serializeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  emailVerified: user.emailVerified !== false,
});

const setEmailVerificationToken = (user) => {
  const token = crypto.randomBytes(32).toString("hex");
  user.emailVerificationTokenHash = hashToken(token);
  user.emailVerificationExpiresAt = new Date(
    Date.now() +
      getTokenLifetimeMs("EMAIL_VERIFICATION_TOKEN_TTL_MINUTES", 24 * 60)
  );
  return token;
};

const setPasswordResetToken = (user) => {
  const token = crypto.randomBytes(32).toString("hex");
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpiresAt = new Date(
    Date.now() + getTokenLifetimeMs("PASSWORD_RESET_TOKEN_TTL_MINUTES", 60)
  );
  return token;
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

      ensureSmtpConfigured();

      const { fullName, email, password } = req.body;
      const normalizedEmail = email.toLowerCase();
      const passwordHash = await bcrypt.hash(password, 10);

      const user = new User({
        fullName,
        email: normalizedEmail,
        passwordHash,
        emailVerified: false,
        emailVerifiedAt: null,
      });

      const verificationToken = setEmailVerificationToken(user);
      await user.save();

      try {
        await sendEmailVerificationEmail({
          to: user.email,
          fullName: user.fullName,
          verificationUrl: buildEmailVerificationUrl(req, verificationToken),
        });
      } catch (error) {
        await User.deleteOne({ _id: user._id });
        error.status = error.status || 502;
        error.message =
          error.message || "Unable to send verification email right now";
        throw error;
      }

      res.status(201).json({
        message: EMAIL_VERIFICATION_SENT,
        user: serializeUser(user),
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

      if (user.emailVerified === false) {
        return res.status(403).json({
          error: "Please verify your email before logging in.",
          code: "EMAIL_NOT_VERIFIED",
        });
      }

      const token = signToken(user._id);
      res.json({
        token,
        user: serializeUser(user),
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/verify-email
router.post(
  "/verify-email",
  [body("token").trim().notEmpty().withMessage("Verification token is required")],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findOne({
        emailVerificationTokenHash: hashToken(req.body.token),
        emailVerificationExpiresAt: { $gt: new Date() },
      });

      if (!user) {
        return res.status(400).json({
          error: "This email verification link is invalid or has expired.",
        });
      }

      if (user.accountStatus !== "active") {
        return res.status(403).json({ error: "Account is disabled" });
      }

      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      user.emailVerificationTokenHash = null;
      user.emailVerificationExpiresAt = null;
      await user.save();

      res.json({ message: "Email verified. You can log in now." });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/resend-verification
router.post(
  "/resend-verification",
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

      if (
        !user ||
        user.accountStatus !== "active" ||
        user.emailVerified !== false
      ) {
        return res.json({ message: EMAIL_VERIFICATION_RESPONSE });
      }

      const previousTokenHash = user.emailVerificationTokenHash;
      const previousExpiresAt = user.emailVerificationExpiresAt;
      const verificationToken = setEmailVerificationToken(user);
      await user.save();

      try {
        await sendEmailVerificationEmail({
          to: user.email,
          fullName: user.fullName,
          verificationUrl: buildEmailVerificationUrl(req, verificationToken),
        });
      } catch (error) {
        user.emailVerificationTokenHash = previousTokenHash;
        user.emailVerificationExpiresAt = previousExpiresAt;
        await user.save();
        error.status = error.status || 502;
        error.message =
          error.message || "Unable to send verification email right now";
        throw error;
      }

      res.json({ message: EMAIL_VERIFICATION_RESPONSE });
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

      if (
        !user ||
        user.accountStatus !== "active" ||
        user.emailVerified === false
      ) {
        return res.json({ message: PASSWORD_RESET_RESPONSE });
      }

      const token = setPasswordResetToken(user);
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
        passwordResetTokenHash: hashToken(token),
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
