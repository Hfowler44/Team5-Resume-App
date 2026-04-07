const router = require("express").Router();
const axios = require("axios");
const auth = require("../middleware/auth");
const Job = require("../models/Job");

const JOBS_URL =
  "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json";

// helper: convert tags → requiredSkills
const mapSkills = (job) => {
  const tags = job.tags || [];
  const weight = tags.length > 0 ? 1 / tags.length : 1;

  return tags.map((tag) => ({
    name: tag,
    weight,
  }));
};

// POST /api/jobs/sync
router.post("/sync", auth, async (req, res, next) => {
  try {
    const { data } = await axios.get(JOBS_URL);

    let count = 0;

    for (const job of data) {
      const externalJobId = job.id || job.url;

      await Job.updateOne(
        {
          source: "simplifyjobs",
          externalJobId,
        },
        {
          $set: {
            title: job.title || "",
            company: job.company || "",
            location: job.location || "",
            description: job.description || "",
            requiredSkills: mapSkills(job),
            minExperienceYears: 0,
            jobUrl: job.url,
            source: "simplifyjobs",
            externalJobId,
            isActive: true,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      count++;
    }

    res.json({ message: "Jobs synced", totalProcessed: count });
  } catch (err) {
    next(err);
  }
});

module.exports = router;