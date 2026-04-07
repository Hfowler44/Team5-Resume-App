const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: String,
    company: String,
    location: String,
    description: String,
    requiredSkills: [
      {
        name: String,
        weight: Number,
      },
    ],
    minExperienceYears: Number,
    jobUrl: String,
    source: String,
    externalJobId: String,
    isActive: Boolean,
  },
  { timestamps: true }
);

jobSchema.index(
  { source: 1, externalJobId: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model("Job", jobSchema);