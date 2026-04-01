const router = require("express").Router();
const auth = require("../middleware/auth");
const Resume = require("../models/Resume");
const ResumeVersion = require("../models/ResumeVersion");

// GET /api/resumes/:resumeId/versions
router.get("/:resumeId/versions", auth, async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      userId: req.userId,
    });
    if (!resume) return res.status(404).json({ error: "Resume not found" });

    const versions = await ResumeVersion.find({
      resumeId: resume._id,
    }).sort({ versionNumber: -1 });

    res.json(versions);
  } catch (err) {
    next(err);
  }
});

// GET /api/resumes/:resumeId/versions/:versionNumber
router.get("/:resumeId/versions/:versionNumber", auth, async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      userId: req.userId,
    });
    if (!resume) return res.status(404).json({ error: "Resume not found" });

    const version = await ResumeVersion.findOne({
      resumeId: resume._id,
      versionNumber: Number(req.params.versionNumber),
    });
    if (!version) return res.status(404).json({ error: "Version not found" });

    res.json(version);
  } catch (err) {
    next(err);
  }
});

// GET /api/resumes/:resumeId/versions/:versionNumber/file — serve a version's PDF
router.get("/:resumeId/versions/:versionNumber/file", auth, async (req, res, next) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.resumeId,
      userId: req.userId,
    });
    if (!resume) return res.status(404).json({ error: "Resume not found" });

    const version = await ResumeVersion.findOne({
      resumeId: resume._id,
      versionNumber: Number(req.params.versionNumber),
    }).select("+pdfData");
    if (!version) return res.status(404).json({ error: "Version not found" });
    if (!version.pdfData) return res.status(404).json({ error: "PDF not available for this version" });

    res.setHeader("Content-Type", version.pdfMimeType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(resume.fileName)}"`
    );
    res.send(version.pdfData);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
