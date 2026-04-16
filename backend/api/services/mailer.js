const nodemailer = require("nodemailer");

const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"]);

const isTrue = (value) => TRUTHY_VALUES.has(String(value || "").toLowerCase());

const getSmtpConfig = () => {
  const requiredFields = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const missingFields = requiredFields.filter((field) => !process.env[field]);

  if (missingFields.length > 0) {
    return {
      configured: false,
      missingFields,
    };
  }

  const port = Number(process.env.SMTP_PORT);

  return {
    configured: true,
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE
      ? isTrue(process.env.SMTP_SECURE)
      : port === 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  };
};

const ensureSmtpConfigured = () => {
  const config = getSmtpConfig();

  if (!config.configured) {
    const error = new Error(
      `SMTP is not configured. Missing: ${config.missingFields.join(", ")}`
    );
    error.status = 503;
    throw error;
  }

  if (!Number.isInteger(config.port) || config.port <= 0) {
    const error = new Error("SMTP_PORT must be a valid port number");
    error.status = 500;
    throw error;
  }

  return config;
};

const createTransporter = () => {
  const config = ensureSmtpConfigured();

  return {
    config,
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    }),
  };
};

const sendPasswordResetEmail = async ({ to, fullName, resetUrl }) => {
  const { config, transporter } = createTransporter();
  const recipientName = fullName || "there";

  return transporter.sendMail({
    from: config.from,
    to,
    subject: "Reset your Knight My Resume password",
    text: [
      `Hi ${recipientName},`,
      "",
      "We received a request to reset your Knight My Resume password.",
      "Open this link to choose a new password:",
      resetUrl,
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <p>Hi ${recipientName},</p>
      <p>We received a request to reset your Knight My Resume password.</p>
      <p><a href="${resetUrl}">Open this link to choose a new password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });
};

const sendEmailVerificationEmail = async ({ to, fullName, verificationUrl }) => {
  const { config, transporter } = createTransporter();
  const recipientName = fullName || "there";

  return transporter.sendMail({
    from: config.from,
    to,
    subject: "Verify your Knight My Resume email",
    text: [
      `Hi ${recipientName},`,
      "",
      "Welcome to Knight My Resume.",
      "Verify your email address before logging in:",
      verificationUrl,
      "",
      "If you did not create this account, you can ignore this email.",
    ].join("\n"),
    html: `
      <p>Hi ${recipientName},</p>
      <p>Welcome to Knight My Resume.</p>
      <p><a href="${verificationUrl}">Verify your email address</a> before logging in.</p>
      <p>If you did not create this account, you can ignore this email.</p>
    `,
  });
};

module.exports = {
  ensureSmtpConfigured,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
};
