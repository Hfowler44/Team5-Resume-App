const router = require("express").Router();
const auth = require("../middleware/auth");
const Resume = require("../models/Resume");
const Job = require("../models/Job");
const JobMatch = require("../models/JobMatch");
const { calculateSkillScore } = require("../services/jobMatching");

// POST /api/jobs/match/:resumeId
router.post("/match/:resumeId", auth, async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      userId: req.userId,
    });

    if (!resume)
      return res.status(404).json({ error: "Resume not found" });

    const jobs = await Job.find({ isActive: true });

    const results = [];

    for (const job of jobs) {
      if (!Array.isArray(job.requiredSkills) || job.requiredSkills.length === 0) {
        continue;
      }

      const { finalScore, missingSkills, matchedSkills } = calculateSkillScore(
        resume,
        job.requiredSkills
      );

      // simple threshold (adjust if needed)
      if (finalScore < 20) continue;

      const matchDoc = await JobMatch.findOneAndUpdate(
        {
          userId: req.userId,
          resumeId: resume._id,
          jobId: job._id,
        },
        {
          $set: {
            matchScore: finalScore,
            skillScore: finalScore,
            experienceScore: 50, // placeholder
            educationScore: 50,
            reasoning: `Matched ${matchedSkills.length} key signals${
              matchedSkills.length ? ` (${matchedSkills.join(", ")})` : ""
            }${
              missingSkills.length ? `. Missing: ${missingSkills.join(", ")}` : ""
            }`,
            missingSkills,
            recommendationStatus: "suggested",
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      results.push({
        job,
        matchScore: finalScore,
      });
    }

    // sort best → worst
    results.sort((a, b) => b.matchScore - a.matchScore);

    res.json(results.slice(0, 20));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
