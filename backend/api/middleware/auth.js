const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  let decoded;

  try {
    const token = header.split(" ")[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const user = await User.findById(decoded.userId).select(
      "accountStatus emailVerified"
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (user.accountStatus !== "active") {
      return res.status(403).json({ error: "Account is disabled" });
    }

    if (user.emailVerified === false) {
      return res.status(403).json({
        error: "Please verify your email before continuing.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    req.userId = decoded.userId;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = auth;
