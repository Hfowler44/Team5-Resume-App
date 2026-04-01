const router = require("express").Router();
const auth = require("../middleware/auth");
const Resume = require("../models/Resume");
const ResumeVersion = require("../models/ResumeVersion");
const ResumeSuggestion = require("../models/ResumeSuggestion");
const { analyzeResume, GEMINI_MODEL } = require("../services/geminiAnalyzer");

const crypto = require("crypto");

const hashText = (text) =>
  crypto.createHash("sha256").update(text).digest("hex");

// POST /api/resumes/:resumeId/analyze — trigger AI analysis
router.post("/:resumeId/analyze", auth, async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      userId: req.userId,
    });
    if (!resume) return res.status(404).json({ error: "Resume not found" });

    // Find the latest version for this resume
    const latestVersion = await ResumeVersion.findOne({
      resumeId: resume._id,
    }).sort({ versionNumber: -1 });

    const contentHash = hashText(resume.textExtracted);

    // Return existing analysis if the same resume text was already analyzed
    const existing = await ResumeSuggestion.findOne({
      userId: req.userId,
      contentHash,
      analysisStatus: "completed",
    });

    if (existing) {
      // Update links in case it was from a different upload
      let changed = false;
      if (!existing.resumeId.equals(resume._id)) {
        existing.resumeId = resume._id;
        changed = true;
      }
      if (latestVersion && !existing.resumeVersionId?.equals(latestVersion._id)) {
        existing.resumeVersionId = latestVersion._id;
        changed = true;
      }
      if (changed) await existing.save();

      resume.status = "analyzed";
      await resume.save();

      // Update improvement score on the version
      if (latestVersion) {
        await updateImprovementScore(resume._id, latestVersion, existing.overallScore);
      }

      return res.status(200).json(existing);
    }

    const analysis = await analyzeResume(resume.textExtracted);

    const suggestion = await ResumeSuggestion.create({
      resumeId: resume._id,
      userId: req.userId,
      resumeVersionId: latestVersion?._id,
      contentHash,
      overallScore: analysis.overallScore,
      detectedField: analysis.detectedField,
      roleMatches: analysis.roleMatches,
      analysisStatus: "completed",
      suggestions: analysis.suggestions,
      modelUsed: GEMINI_MODEL,
    });

    // Update resume status
    resume.status = "analyzed";
    await resume.save();

    // Update improvement score on the version
    if (latestVersion) {
      await updateImprovementScore(resume._id, latestVersion, analysis.overallScore);
    }

    res.status(201).json(suggestion);
  } catch (err) {
    next(err);
  }
});

// Compute improvement score: difference from the previous version's analysis
async function updateImprovementScore(resumeId, currentVersion, currentScore) {
  if (currentVersion.versionNumber <= 1) {
    currentVersion.improvementScore = currentScore;
    await currentVersion.save();
    return;
  }

  const prevVersion = await ResumeVersion.findOne({
    resumeId,
    versionNumber: currentVersion.versionNumber - 1,
  });

  if (!prevVersion) {
    currentVersion.improvementScore = currentScore;
    await currentVersion.save();
    return;
  }

  // Find the analysis linked to the previous version
  const prevAnalysis = await ResumeSuggestion.findOne({
    resumeId,
    resumeVersionId: prevVersion._id,
    analysisStatus: "completed",
  });

  const prevScore = prevAnalysis ? prevAnalysis.overallScore : 0;
  currentVersion.improvementScore = Math.max(0, Math.min(100, currentScore - prevScore));
  await currentVersion.save();
}

// GET /api/resumes/:resumeId/suggestions — list analyses
router.get("/:resumeId/suggestions", auth, async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      userId: req.userId,
    });
    if (!resume) return res.status(404).json({ error: "Resume not found" });

    const suggestions = await ResumeSuggestion.find({
      resumeId: resume._id,
      analysisStatus: "completed",
    }).sort({ createdAt: -1 });

    res.json(suggestions);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/suggestions/:id/items/:suggestionId — apply or rate a suggestion
router.patch("/suggestions/:id/items/:suggestionId", auth, async (req, res, next) => {
  try {
    const doc = await ResumeSuggestion.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!doc)
      return res.status(404).json({ error: "Suggestion record not found" });

    const item = doc.suggestions.find(
      (s) => s.suggestionId === req.params.suggestionId
    );
    if (!item)
      return res.status(404).json({ error: "Suggestion item not found" });

    if (req.body.isApplied !== undefined) item.isApplied = req.body.isApplied;
    if (req.body.userRating !== undefined) item.userRating = req.body.userRating;

    await doc.save();
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
