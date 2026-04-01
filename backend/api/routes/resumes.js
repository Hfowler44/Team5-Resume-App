const router = require("express").Router();
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const Resume = require("../models/Resume");
const ResumeVersion = require("../models/ResumeVersion");
const ResumeSuggestion = require("../models/ResumeSuggestion");
const { extractText } = require("../services/pdfParser");

// POST /api/resumes — upload a PDF resume (handles re-uploads of the same filename)
router.post("/", auth, upload.single("resume"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    const textExtracted = await extractText(req.file.buffer);

    // Check if a resume with this filename already exists for the user
    const existing = await Resume.findOne({
      userId: req.userId,
      fileName: req.file.originalname,
    }).select("+pdfData");

    if (existing) {
      // Skip if the content is identical to the current version
      if (existing.textExtracted === textExtracted) {
        return res.status(200).json(existing);
      }

      // Re-upload: update the existing resume with new content
      existing.pdfData = req.file.buffer;
      existing.pdfMimeType = req.file.mimetype;
      existing.pdfSize = req.file.size;
      existing.textExtracted = textExtracted;
      existing.status = "uploaded";
      await existing.save();

      // Create a new version
      const lastVersion = await ResumeVersion.findOne({
        resumeId: existing._id,
      }).sort({ versionNumber: -1 });

      const nextVersion = lastVersion ? lastVersion.versionNumber + 1 : 1;

      await ResumeVersion.create({
        resumeId: existing._id,
        userId: req.userId,
        versionNumber: nextVersion,
        textExtracted,
        changeSummary: `Re-uploaded (version ${nextVersion}).`,
        improvementScore: 0,
        pdfData: req.file.buffer,
        pdfMimeType: req.file.mimetype,
      });

      return res.status(200).json(existing);
    }

    // First upload of this filename
    const resume = await Resume.create({
      userId: req.userId,
      fileName: req.file.originalname,
      fileUrl: "/api/resumes/pending/file",
      pdfData: req.file.buffer,
      pdfMimeType: req.file.mimetype,
      pdfSize: req.file.size,
      textExtracted,
      parsed: {
        skills: [],
        experienceYears: 0,
        location: "",
        education: [],
      },
      status: "uploaded",
    });

    resume.fileUrl = `/api/resumes/${resume._id}/file`;
    await resume.save();

    // Create initial version
    await ResumeVersion.create({
      resumeId: resume._id,
      userId: req.userId,
      versionNumber: 1,
      textExtracted,
      changeSummary: "Initial upload.",
      improvementScore: 0,
      pdfData: req.file.buffer,
      pdfMimeType: req.file.mimetype,
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

// GET /api/resumes/:id/file
router.get("/:id/file", auth, async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).select("+pdfData +pdfMimeType");

    if (!resume) return res.status(404).json({ error: "Resume not found" });
    if (!resume.pdfData) {
      return res.status(404).json({ error: "Stored PDF not available" });
    }

    res.setHeader("Content-Type", resume.pdfMimeType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(resume.fileName)}"`
    );
    res.send(resume.pdfData);
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
