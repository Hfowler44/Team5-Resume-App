const router = require("express").Router();
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const Resume = require("../models/Resume");
const ResumeVersion = require("../models/ResumeVersion");
const ResumeSuggestion = require("../models/ResumeSuggestion");
const { extractText } = require("../services/pdfParser");

// POST /api/resumes — upload a PDF resume
router.post("/", auth, upload.single("resume"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    const textExtracted = await extractText(req.file.buffer);

    const resume = await Resume.create({
      userId: req.userId,
      fileName: req.file.originalname,
      fileUrl: "memory://uploaded", // placeholder until cloud storage is added
      textExtracted,
      parsed: {
        skills: [],
        experienceYears: 0,
        location: "",
        education: [],
      },
      status: "uploaded",
    });

    // Create initial version
    await ResumeVersion.create({
      resumeId: resume._id,
      userId: req.userId,
      versionNumber: 1,
      textExtracted,
      changeSummary: "Initial upload.",
      improvementScore: 0,
    });

    res.status(201).json(resume);
  } catch (err) {
    next(err);
  }
});

// GET /api/resumes — list current user's resumes
router.get("/", auth, async (req, res, next) => {
  try {
    const resumes = await Resume.find({ userId: req.userId }).sort({
      updatedAt: -1,
    });
    res.json(resumes);
  } catch (err) {
    next(err);
  }
});

// GET /api/resumes/:id
router.get("/:id", auth, async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!resume) return res.status(404).json({ error: "Resume not found" });
    res.json(resume);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/resumes/:id — cascade delete versions and suggestions
router.delete("/:id", auth, async (req, res, next) => {
  try {
    const resume = await Resume.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!resume) return res.status(404).json({ error: "Resume not found" });

    await ResumeVersion.deleteMany({ resumeId: resume._id });
    await ResumeSuggestion.deleteMany({ resumeId: resume._id });

    res.json({ message: "Resume deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
