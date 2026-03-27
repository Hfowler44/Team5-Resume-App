const router = require("express").Router();
const auth = require("../middleware/auth");
const Resume = require("../models/Resume");
const ResumeSuggestion = require("../models/ResumeSuggestion");
const { analyzeResume } = require("../services/geminiAnalyzer");

// POST /api/resumes/:resumeId/analyze — trigger AI analysis
router.post("/:resumeId/analyze", auth, async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      userId: req.userId,
    });
    if (!resume) return res.status(404).json({ error: "Resume not found" });

    // Create a queued suggestion record
    const suggestion = await ResumeSuggestion.create({
      resumeId: resume._id,
      userId: req.userId,
      overallScore: 0,
      analysisStatus: "running",
      suggestions: [],
      modelUsed: "gemini-2.0-flash",
    });

    try {
      const analysis = await analyzeResume(resume.textExtracted);

      suggestion.overallScore = analysis.overallScore;
      suggestion.suggestions = analysis.suggestions;
      suggestion.analysisStatus = "completed";
      await suggestion.save();

      // Update resume status
      resume.status = "analyzed";
      await resume.save();
    } catch (aiErr) {
      suggestion.analysisStatus = "failed";
      await suggestion.save();
      throw aiErr;
    }

    res.status(201).json(suggestion);
  } catch (err) {
    next(err);
  }
});

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
