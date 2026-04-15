const router = require("express").Router();
const auth = require("../middleware/auth");
const { syncJobsFromUpstream } = require("../services/jobSync");

// POST /api/jobs/sync
router.post("/sync", auth, async (req, res, next) => {
  try {
    const force = req.query.force === "true";
    const result = await syncJobsFromUpstream({ force });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
