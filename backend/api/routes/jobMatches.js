const router = require("express").Router();
const auth = require("../middleware/auth");
const Resume = require("../models/Resume");
const Job = require("../models/Job");
const JobMatch = require("../models/JobMatch");
const { calculateSkillScore } = require("../services/jobMatching");

const normalizeSearch = (value) => String(value || "").toLowerCase().trim();

const getSearchTerms = (search) =>
  normalizeSearch(search)
    .split(/\s+/)
    .filter(Boolean);

const buildSearchHaystack = (job, matchDoc = {}) =>
  [
    job?.title,
    job?.company,
    job?.location,
    job?.description,
    job?.source,
    ...(Array.isArray(job?.requiredSkills)
      ? job.requiredSkills.map((skill) => skill?.name)
      : []),
    matchDoc.reasoning,
    ...(Array.isArray(matchDoc.missingSkills) ? matchDoc.missingSkills : []),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

const matchesPartialSearch = (job, matchDoc, search) => {
  const terms = getSearchTerms(search);
  if (terms.length === 0) return true;

  const haystack = buildSearchHaystack(job, matchDoc);
  return terms.every((term) => haystack.includes(term));
};

const serializeMatch = (job, matchDoc) => ({
  job,
  matchScore: matchDoc.matchScore,
  skillScore: matchDoc.skillScore,
  experienceScore: matchDoc.experienceScore,
  educationScore: matchDoc.educationScore,
  reasoning: matchDoc.reasoning,
  missingSkills: matchDoc.missingSkills,
  recommendationStatus: matchDoc.recommendationStatus,
});

// POST /api/jobs/match/:resumeId
router.post("/match/:resumeId", auth, async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      userId: req.userId,
    });

    if (!resume) return res.status(404).json({ error: "Resume not found" });

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
        { upsert: true, returnDocument: "after" }
      );

      results.push(serializeMatch(job, matchDoc));
    }

    const filteredResults = results
      .filter((result) =>
        matchesPartialSearch(result.job, result, req.query.search)
      )
      .sort((a, b) => b.matchScore - a.matchScore);

    res.json(filteredResults.slice(0, 20));
  } catch (err) {
    next(err);
  }
});

// GET /api/jobs/match/:resumeId
router.get("/match/:resumeId", auth, async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      userId: req.userId,
    });

    if (!resume) return res.status(404).json({ error: "Resume not found" });

    const storedMatches = await JobMatch.find({
      userId: req.userId,
      resumeId: resume._id,
    }).populate("jobId");

    const results = storedMatches
      .filter((matchDoc) => matchDoc.jobId?.isActive)
      .map((matchDoc) => serializeMatch(matchDoc.jobId, matchDoc))
      .filter((result) =>
        matchesPartialSearch(result.job, result, req.query.search)
      )
      .sort((a, b) => b.matchScore - a.matchScore);

    res.json(results.slice(0, 20));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
