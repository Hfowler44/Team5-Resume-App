process.env.JWT_SECRET = "test-secret";

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({
  sendMail: mockSendMail,
}));

jest.mock("nodemailer", () => ({
  createTransport: mockCreateTransport,
}));

jest.mock("axios", () => ({
  get: jest.fn(),
}));

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const axios = require("axios");
const app = require("../app");
const Job = require("../models/Job");
const Resume = require("../models/Resume");

let mongo;

jest.setTimeout(30000);

beforeAll(async () => {
  // Disconnect from any existing connection (e.g., from dotenv loading MONGODB_URI)
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

beforeEach(() => {
  mockSendMail.mockReset();
  mockSendMail.mockResolvedValue({ messageId: "test-message-id" });
  mockCreateTransport.mockClear();
  axios.get.mockReset();
  process.env.SMTP_HOST = "smtp.example.test";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_USER = "noreply@example.test";
  process.env.SMTP_PASS = "test-password";
  delete process.env.SMTP_FROM;
  delete process.env.PASSWORD_RESET_URL;
  delete process.env.EMAIL_VERIFICATION_URL;
  delete process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// ---------- helpers ----------

const registerUser = (overrides = {}) =>
  request(app)
    .post("/api/auth/register")
    .send({
      fullName: "Test User",
      email: "test@example.com",
      password: "password123",
      ...overrides,
    });

const loginUser = (overrides = {}) =>
  request(app)
    .post("/api/auth/login")
    .send({
      email: "test@example.com",
      password: "password123",
      ...overrides,
    });

const getLastEmailToken = (paramName) => {
  const mail = mockSendMail.mock.calls[mockSendMail.mock.calls.length - 1][0];
  const link = mail.text.match(/https?:\/\/\S+/)?.[0];
  return new URL(link).searchParams.get(paramName);
};

const verifyLastRegisteredUser = () =>
  request(app)
    .post("/api/auth/verify-email")
    .send({ token: getLastEmailToken("verify") });

const registerVerifiedUser = async (overrides = {}) => {
  const registerRes = await registerUser(overrides);
  expect(registerRes.status).toBe(201);

  const verifyRes = await verifyLastRegisteredUser();
  expect(verifyRes.status).toBe(200);

  return registerRes;
};

const loginVerifiedUser = async (overrides = {}) => {
  await registerVerifiedUser(overrides);
  const loginRes = await loginUser(overrides);
  expect(loginRes.status).toBe(200);
  return loginRes;
};

// ---------- health ----------

describe("GET /", () => {
  it("returns API root info", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Resume API is running");
    expect(res.body.health).toBe("/api/health");
  });
});

describe("GET /api/health", () => {
  it("returns status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

// ---------- auth ----------

describe("Auth routes", () => {
  it("registers a new user and sends a verification email", async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.token).toBeUndefined();
    expect(res.body.message).toContain("verify your account");
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.user.emailVerified).toBe(false);
    expect(mockCreateTransport).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const mail = mockSendMail.mock.calls[0][0];
    const token = getLastEmailToken("verify");
    expect(mail.to).toBe("test@example.com");
    expect(token).toBeTruthy();
  });

  it("rejects duplicate email", async () => {
    await registerUser();
    const res = await registerUser();
    expect(res.status).toBe(409);
  });

  it("rejects registration with missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "x@y.com" });
    expect(res.status).toBe(400);
  });

  it("fails registration when SMTP is not configured", async () => {
    delete process.env.SMTP_HOST;

    const res = await registerUser();
    expect(res.status).toBe(503);
    expect(res.body.error).toContain("SMTP is not configured");
    expect(mockSendMail).not.toHaveBeenCalled();

    const loginRes = await loginUser();
    expect(loginRes.status).toBe(401);
  });

  it("logs in with valid credentials", async () => {
    await registerVerifiedUser();
    const res = await loginUser();
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.emailVerified).toBe(true);
  });

  it("blocks login until the email address is verified", async () => {
    await registerUser();
    const res = await loginUser();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("rejects login with wrong password", async () => {
    await registerVerifiedUser();
    const res = await loginUser({ password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("verifies email with the registration link", async () => {
    await registerUser();

    const verifyRes = await verifyLastRegisteredUser();
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.message).toContain("Email verified");

    const loginRes = await loginUser();
    expect(loginRes.status).toBe(200);
  });

  it("resends verification email for unverified accounts", async () => {
    await registerUser();
    mockSendMail.mockClear();
    mockCreateTransport.mockClear();

    const res = await request(app)
      .post("/api/auth/resend-verification")
      .set("Origin", "http://localhost:3000")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("verification email");
    expect(mockCreateTransport).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(getLastEmailToken("verify")).toBeTruthy();
  });

  it("returns the same resend verification response for unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/resend-verification")
      .send({ email: "missing@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("verification email");
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("sends a password reset email and accepts the new password", async () => {
    await registerVerifiedUser();
    mockSendMail.mockClear();
    mockCreateTransport.mockClear();

    const forgotRes = await request(app)
      .post("/api/auth/forgot-password")
      .set("Origin", "http://localhost:3000")
      .send({ email: "test@example.com" });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.message).toContain("password reset link");
    expect(mockCreateTransport).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const mail = mockSendMail.mock.calls[0][0];
    const token = getLastEmailToken("reset");

    expect(mail.to).toBe("test@example.com");
    expect(token).toBeTruthy();

    const resetRes = await request(app).post("/api/auth/reset-password").send({
      token,
      password: "freshpass123",
    });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toContain("Password reset successful");

    const loginRes = await loginUser({ password: "freshpass123" });
    expect(loginRes.status).toBe(200);
  });

  it("returns the same password reset response for unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "missing@example.com" });

    expect(res.status).toBe(200);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it("fails password reset requests when SMTP is not configured", async () => {
    await registerVerifiedUser();
    mockSendMail.mockClear();
    mockCreateTransport.mockClear();
    delete process.env.SMTP_HOST;

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(503);
    expect(res.body.error).toContain("SMTP is not configured");
    expect(mockSendMail).not.toHaveBeenCalled();
  });
});

// ---------- users ----------

describe("User routes", () => {
  it("GET /api/users/me returns profile", async () => {
    const login = await loginVerifiedUser();
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe("Test User");
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.emailVerificationTokenHash).toBeUndefined();
  });

  it("PUT /api/users/me updates name", async () => {
    const login = await loginVerifiedUser();
    const res = await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({ fullName: "New Name" });
    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe("New Name");
  });

  it("rejects unauthenticated access", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
  });
});

// ---------- resumes ----------

describe("Resume routes", () => {
  let token;

  beforeEach(async () => {
    const login = await loginVerifiedUser();
    token = login.body.token;
  });

  it("GET /api/resumes returns empty array initially", async () => {
    const res = await request(app)
      .get("/api/resumes")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("GET /api/resumes/:id/file streams a stored PDF", async () => {
    const owner = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`);

    const resume = await Resume.create({
      userId: owner.body._id,
      fileName: "stored.pdf",
      fileUrl: "/api/resumes/test/file",
      pdfData: Buffer.from("%PDF-1.4 mock"),
      pdfMimeType: "application/pdf",
      pdfSize: 13,
      textExtracted: "Resume preview body text for file route testing.",
      parsed: {
        skills: [],
        experienceYears: 0,
        location: "",
        education: [],
      },
      status: "uploaded",
    });

    const res = await request(app)
      .get(`/api/resumes/${resume._id}/file`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.body).toBeInstanceOf(Buffer);
  });

  it("POST /api/resumes rejects non-PDF", async () => {
    const res = await request(app)
      .post("/api/resumes")
      .set("Authorization", `Bearer ${token}`)
      .attach("resume", Buffer.from("not a pdf"), {
        filename: "test.txt",
        contentType: "text/plain",
      });
    expect(res.status).toBe(500); // multer error
  });

  it("rejects request with no file", async () => {
    const res = await request(app)
      .post("/api/resumes")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

// ---------- jobs ----------

describe("Job sync routes", () => {
  let token;

  beforeEach(async () => {
    const login = await loginVerifiedUser({ email: "jobs@example.com" });
    token = login.body.token;
  });

  it("POST /api/jobs/sync imports jobs from the upstream feed", async () => {
    axios.get.mockResolvedValue({
      data: [
        {
          id: "role-1",
          title: "Software Engineer Intern",
          company_name: "Example Corp",
          locations: ["Remote", "Orlando, FL"],
          description: "Build internal tools with JavaScript and React.",
          url: "https://jobs.example.test/role-1",
          active: true,
        },
        {
          id: "role-2",
          title: "Backend Intern",
          company: "Data Co",
          location: "New York, NY",
          category: "Python APIs",
          url: "https://jobs.example.test/role-2",
          active: false,
        },
      ],
    });

    const res = await request(app)
      .post("/api/jobs/sync")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Jobs synced");
    expect(res.body.totalProcessed).toBe(2);
    expect(axios.get).toHaveBeenCalledTimes(1);

    const jobs = await Job.find().sort({ externalJobId: 1 }).lean();
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({
      company: "Example Corp",
      externalJobId: "role-1",
      isActive: true,
      jobUrl: "https://jobs.example.test/role-1",
      location: "Remote, Orlando, FL",
      source: "simplifyjobs",
      title: "Software Engineer Intern",
    });
    expect(jobs[1]).toMatchObject({
      company: "Data Co",
      externalJobId: "role-2",
      isActive: false,
      jobUrl: "https://jobs.example.test/role-2",
      location: "New York, NY",
      source: "simplifyjobs",
      title: "Backend Intern",
    });
  });

  it("POST /api/jobs/sync skips a full import when jobs were synced recently", async () => {
    const now = new Date();

    await Job.create({
      title: "Existing Role",
      company: "Example Corp",
      location: "Remote",
      description: "Existing listing",
      requiredSkills: [],
      minExperienceYears: 0,
      jobUrl: "https://jobs.example.test/existing",
      source: "simplifyjobs",
      externalJobId: "existing-role",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const res = await request(app)
      .post("/api/jobs/sync")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: "Jobs already synced recently",
      totalProcessed: 0,
      skipped: true,
    });
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("POST /api/jobs/sync?force=true bypasses the recent-sync shortcut", async () => {
    const now = new Date();

    await Job.create({
      title: "Existing Role",
      company: "Example Corp",
      location: "Remote",
      description: "Existing listing",
      requiredSkills: [],
      minExperienceYears: 0,
      jobUrl: "https://jobs.example.test/existing",
      source: "simplifyjobs",
      externalJobId: "existing-role",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    axios.get.mockResolvedValue({
      data: [
        {
          id: "role-3",
          title: "Platform Intern",
          company_name: "Refresh Corp",
          location: "Atlanta, GA",
          description: "Work with Node.js and MongoDB.",
          url: "https://jobs.example.test/role-3",
          active: true,
        },
      ],
    });

    const res = await request(app)
      .post("/api/jobs/sync?force=true")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: "Jobs synced",
      totalProcessed: 1,
      skipped: false,
    });
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});
