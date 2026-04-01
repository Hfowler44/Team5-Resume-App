process.env.JWT_SECRET = "test-secret";

jest.mock("../services/geminiAnalyzer", () => ({
  analyzeResume: jest.fn(),
  GEMINI_MODEL: "test-gemini-model",
}));

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const app = require("../app");
const Resume = require("../models/Resume");
const ResumeSuggestion = require("../models/ResumeSuggestion");
const ResumeVersion = require("../models/ResumeVersion");
const { analyzeResume } = require("../services/geminiAnalyzer");

let mongo;

beforeAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  jest.clearAllMocks();

  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

const registerUser = (overrides = {}) =>
  request(app)
    .post("/api/auth/register")
    .send({
      fullName: "Resume Tester",
      email: "resume@example.com",
      password: "password123",
      ...overrides,
    });

const createResumeWithVersion = async (userId, overrides = {}) => {
  const resume = await Resume.create({
    userId,
    fileName: "resume.pdf",
    fileUrl: "/api/resumes/test/file",
    pdfData: Buffer.from("%PDF-1.4 mock"),
    pdfMimeType: "application/pdf",
    pdfSize: 13,
    textExtracted: "Built a React and Node.js project that improved user onboarding by 25%.",
    parsed: {
      skills: [],
      experienceYears: 0,
      location: "",
      education: [],
    },
    status: "uploaded",
    ...overrides,
  });

  const version = await ResumeVersion.create({
    resumeId: resume._id,
    userId,
    versionNumber: 1,
    textExtracted: resume.textExtracted,
    changeSummary: "Initial upload.",
    improvementScore: 0,
    pdfData: resume.pdfData,
    pdfMimeType: resume.pdfMimeType,
  });

  return { resume, version };
};

const buildSuggestions = () => [
  {
    suggestionId: "sug-1",
    category: "format",
    message: "Tighten section spacing.",
    beforeText: "",
    suggestedText: "",
    score: 80,
  },
  {
    suggestionId: "sug-2",
    category: "grammar",
    message: "Normalize punctuation.",
    beforeText: "",
    suggestedText: "",
    score: 82,
  },
  {
    suggestionId: "sug-3",
    category: "impact",
    message: "Add quantified results to project bullets.",
    beforeText: "",
    suggestedText: "",
    score: 84,
  },
  {
    suggestionId: "sug-4",
    category: "skills",
    message: "Group skills by type.",
    beforeText: "",
    suggestedText: "",
    score: 81,
  },
  {
    suggestionId: "sug-5",
    category: "ats",
    message: "Use standard section headings.",
    beforeText: "",
    suggestedText: "",
    score: 83,
  },
];

describe("Resume suggestion routes", () => {
  it("does not persist a failed analysis as a zero-score record", async () => {
    const reg = await registerUser();
    const token = reg.body.token;
    const userId = reg.body.user.id;
    const { resume } = await createResumeWithVersion(userId);

    analyzeResume.mockRejectedValueOnce(
      Object.assign(new Error("AI returned invalid JSON"), { status: 502 })
    );

    const res = await request(app)
      .post(`/api/resumes/${resume._id}/analyze`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("AI returned invalid JSON");

    const savedSuggestions = await ResumeSuggestion.find({ resumeId: resume._id });
    expect(savedSuggestions).toHaveLength(0);

    const refreshedResume = await Resume.findById(resume._id);
    expect(refreshedResume.status).toBe("uploaded");
  });

  it("returns only completed analyses in suggestion history", async () => {
    const reg = await registerUser();
    const token = reg.body.token;
    const userId = reg.body.user.id;
    const { resume, version } = await createResumeWithVersion(userId);

    const completed = await ResumeSuggestion.create({
      resumeId: resume._id,
      userId,
      resumeVersionId: version._id,
      contentHash: "completed-hash",
      overallScore: 81,
      detectedField: "Software Engineering",
      roleMatches: ["Backend Software Engineer"],
      analysisStatus: "completed",
      suggestions: buildSuggestions(),
      modelUsed: "test-gemini-model",
    });

    await ResumeSuggestion.create({
      resumeId: resume._id,
      userId,
      resumeVersionId: version._id,
      contentHash: "failed-hash",
      overallScore: 0,
      analysisStatus: "failed",
      suggestions: [],
      modelUsed: "test-gemini-model",
    });

    const res = await request(app)
      .get(`/api/resumes/${resume._id}/suggestions`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]._id).toBe(String(completed._id));
    expect(res.body[0].overallScore).toBe(81);
  });

  it("creates a completed analysis record after a successful run", async () => {
    const reg = await registerUser();
    const token = reg.body.token;
    const userId = reg.body.user.id;
    const { resume, version } = await createResumeWithVersion(userId);

    analyzeResume.mockResolvedValueOnce({
      overallScore: 82,
      detectedField: "Software Engineering",
      roleMatches: [
        "Backend Software Engineer",
        "Full Stack Developer",
        "Software Engineer",
      ],
      suggestions: buildSuggestions(),
    });

    const res = await request(app)
      .post(`/api/resumes/${resume._id}/analyze`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.overallScore).toBe(82);
    expect(res.body.analysisStatus).toBe("completed");
    expect(res.body.resumeVersionId).toBe(String(version._id));
    expect(res.body.suggestions).toHaveLength(5);

    const savedSuggestion = await ResumeSuggestion.findOne({ resumeId: resume._id });
    expect(savedSuggestion.overallScore).toBe(82);
    expect(savedSuggestion.analysisStatus).toBe("completed");

    const refreshedResume = await Resume.findById(resume._id);
    expect(refreshedResume.status).toBe("analyzed");

    const refreshedVersion = await ResumeVersion.findById(version._id);
    expect(refreshedVersion.improvementScore).toBe(82);
  });
});
