const router = require("express").Router();
const axios = require("axios");
const auth = require("../middleware/auth");
const Job = require("../models/Job");
const { extractJobSkills } = require("../services/jobMatching");

const JOBS_URL =
  "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json";
const JOB_SYNC_BATCH_SIZE = 500;
const JOB_SYNC_FRESHNESS_MINUTES = 15;

// POST /api/jobs/sync
router.post("/sync", auth, async (req, res, next) => {
  try {
    const recentSyncCutoff = new Date(
      Date.now() - JOB_SYNC_FRESHNESS_MINUTES * 60 * 1000
    );
    const recentSync = await Job.findOne({
      source: "simplifyjobs",
      updatedAt: { $gte: recentSyncCutoff },
    })
      .sort({ updatedAt: -1 })
      .select({ updatedAt: 1 })
      .lean();

    if (recentSync) {
      return res.json({
        message: "Jobs already synced recently",
        totalProcessed: 0,
        skipped: true,
        lastSyncedAt: recentSync.updatedAt,
      });
    }

    const { data } = await axios.get(JOBS_URL, {
      timeout: 15000,
    });

    if (!Array.isArray(data)) {
      const error = new Error("Jobs sync source returned an invalid payload.");
      error.status = 502;
      throw error;
    }

    const now = new Date();
    const operations = data
      .map((job) => {
        const externalJobId = job.id || job.url;
        if (!externalJobId) return null;

        return {
          updateOne: {
            filter: {
              source: "simplifyjobs",
              externalJobId,
            },
            update: {
              $set: {
                title: job.title || "",
                company: job.company_name || job.company || "",
                location: Array.isArray(job.locations)
                  ? job.locations.join(", ")
                  : job.location || "",
                description: job.description || job.category || "",
                requiredSkills: extractJobSkills(job),
                minExperienceYears: 0,
                jobUrl: job.url,
                source: "simplifyjobs",
                externalJobId,
                isActive: job.active !== false,
                updatedAt: now,
              },
              $setOnInsert: {
                createdAt: now,
              },
            },
            upsert: true,
          },
        };
      })
      .filter(Boolean);

    for (let start = 0; start < operations.length; start += JOB_SYNC_BATCH_SIZE) {
      const batch = operations.slice(start, start + JOB_SYNC_BATCH_SIZE);
      await Job.bulkWrite(batch, { ordered: false });
    }

    res.json({ message: "Jobs synced", totalProcessed: operations.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
