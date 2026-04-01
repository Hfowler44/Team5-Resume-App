const mongoose = require("mongoose");

const resumeVersionSchema = new mongoose.Schema({
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resume",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  versionNumber: { type: Number, required: true, min: 1 },
  textExtracted: { type: String, required: true },
  changeSummary: { type: String, required: true },
  improvementScore: { type: Number, required: true, min: 0, max: 100 },
  pdfData: { type: Buffer, required: true, select: false },
  pdfMimeType: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

resumeVersionSchema.index(
  { resumeId: 1, versionNumber: 1 },
  { unique: true }
);
resumeVersionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("ResumeVersion", resumeVersionSchema);
