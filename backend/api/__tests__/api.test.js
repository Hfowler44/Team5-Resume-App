const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const app = require("../app");
const Resume = require("../models/Resume");

let mongo;

beforeAll(async () => {
  // Disconnect from any existing connection (e.g., from dotenv loading MONGODB_URI)
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

// ---------- health ----------

describe("GET /api/health", () => {
  it("returns status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

// ---------- auth ----------

describe("Auth routes", () => {
  it("registers a new user and returns a JWT", async () => {
    const res = await registerUser();
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("test@example.com");
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

  it("logs in with valid credentials", async () => {
    await registerUser();
    const res = await loginUser();
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("rejects login with wrong password", async () => {
    await registerUser();
    const res = await loginUser({ password: "wrong" });
    expect(res.status).toBe(401);
  });
});

// ---------- users ----------

describe("User routes", () => {
  it("GET /api/users/me returns profile", async () => {
    const reg = await registerUser();
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.fullName).toBe("Test User");
    expect(res.body.passwordHash).toBeUndefined();
  });

  it("PUT /api/users/me updates name", async () => {
    const reg = await registerUser();
    const res = await request(app)
      .put("/api/users/me")
      .set("Authorization", `Bearer ${reg.body.token}`)
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
    const reg = await registerUser();
    token = reg.body.token;
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
