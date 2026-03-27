const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    years: Number,
    level: { type: String, enum: ["beginner", "intermediate", "advanced"] },
  },
  { _id: false }
);

const parsedSchema = new mongoose.Schema(
  {
    skills: [skillSchema],
    experienceYears: { type: Number, required: true },
    location: String,
    education: [String],
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    pdfData: { type: Buffer, required: true, select: false },
    pdfMimeType: { type: String, required: true, select: false },
    pdfSize: { type: Number, required: true },
    textExtracted: { type: String, required: true },
    parsed: { type: parsedSchema, required: true },
    status: {
      type: String,
      enum: ["uploaded", "parsed", "analyzed", "revised", "archived"],
      default: "uploaded",
    },
  },
  { timestamps: true }
);

resumeSchema.index({ userId: 1, updatedAt: -1 });
resumeSchema.index({ userId: 1, fileName: 1 }, { unique: true });
resumeSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model("Resume", resumeSchema);
