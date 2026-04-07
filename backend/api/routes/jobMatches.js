const router = require("express").Router();
const auth = require("../middleware/auth");
const Resume = require("../models/Resume");
const Job = require("../models/Job");
const JobMatch = require("../models/JobMatch");

// helper: normalize strings
const normalize = (str) => str.toLowerCase().trim();

// weighted skill scoring
const calculateSkillScore = (resumeSkills, jobSkills) => {
  let score = 0;
  let totalWeight = 0;
  const missingSkills = [];

  const resumeSet = new Set(
    resumeSkills.map((s) => normalize(s.name))
  );

  for (const skill of jobSkills) {
    const weight = skill.weight || 1;
    totalWeight += weight;

    if (resumeSet.has(normalize(skill.name))) {
      score += weight;
    } else {
      missingSkills.push(skill.name);
    }
  }

  const finalScore =
    totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;

  return { finalScore, missingSkills };
};

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
      const { finalScore, missingSkills } = calculateSkillScore(
        resume.parsed.skills,
        job.requiredSkills
      );

      // simple threshold (adjust if needed)
      if (finalScore < 30) continue;

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
            reasoning: `Matched ${
              resume.parsed.skills.length - missingSkills.length
            } skills. Missing: ${missingSkills.join(", ")}`,
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