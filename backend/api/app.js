require("dotenv").config();
const express = require("express");
const cors = require("cors");
const errorHandler = require("./utils/errorHandler");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const resumeRoutes = require("./routes/resumes");
const resumeVersionRoutes = require("./routes/resumeVersions");
const resumeSuggestionRoutes = require("./routes/resumeSuggestions");
const jobRoutes = require("./routes/jobs");
const jobMatchRoutes = require("./routes/jobMatches");

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/resumes", resumeVersionRoutes);
app.use("/api/resumes", resumeSuggestionRoutes);
app.use("/api", resumeSuggestionRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/jobs", jobMatchRoutes);

app.use(errorHandler);

module.exports = app;
