const mongoose = require("mongoose");

const suggestionItemSchema = new mongoose.Schema(
  {
    suggestionId: { type: String, required: true },
    category: {
      type: String,
      enum: ["format", "grammar", "impact", "skills", "ats"],
      required: true,
    },
    message: { type: String, required: true },
    beforeText: String,
    suggestedText: String,
    score: { type: Number, required: true, min: 0, max: 100 },
    isApplied: { type: Boolean, default: false },
    userRating: { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false }
);

const resumeSuggestionSchema = new mongoose.Schema(
  {
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
    resumeVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResumeVersion",
    },
    overallScore: { type: Number, required: true, min: 0, max: 100 },
    analysisStatus: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
    },
    suggestions: [suggestionItemSchema],
    modelUsed: { type: String, required: true },
  },
  { timestamps: true }
);

resumeSuggestionSchema.index({ resumeId: 1, createdAt: -1 });
resumeSuggestionSchema.index({ userId: 1, createdAt: -1 });
resumeSuggestionSchema.index({ analysisStatus: 1, updatedAt: -1 });

module.exports = mongoose.model("ResumeSuggestion", resumeSuggestionSchema);
