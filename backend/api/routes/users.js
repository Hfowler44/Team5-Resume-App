const router = require("express").Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

// GET /api/users/me
router.get("/me", auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/me
router.put("/me", auth, async (req, res, next) => {
  try {
    const { fullName } = req.body;
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: "fullName is required" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { fullName: fullName.trim() },
      { returnDocument: "after" }
    ).select("-passwordHash");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
