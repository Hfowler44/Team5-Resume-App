const mongoose = require("mongoose");

const jobMatchSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: "Resume" },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },

    matchScore: Number,
    skillScore: Number,
    experienceScore: Number,
    educationScore: Number,

    reasoning: String,
    missingSkills: [String],

    recommendationStatus: {
      type: String,
      enum: ["suggested", "saved", "applied", "dismissed"],
      default: "suggested",
    },
  },
  { timestamps: true }
);

jobMatchSchema.index(
  { userId: 1, resumeId: 1, jobId: 1 },
  { unique: true }
);

module.exports = mongoose.model("JobMatch", jobMatchSchema);