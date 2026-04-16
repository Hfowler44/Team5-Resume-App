const appDb = db.getSiblingDB("resume_ai_app");

function ensureCollection(name, jsonSchema) {
  const names = appDb.getCollectionNames();

  if (!names.includes(name)){
    appDb.createCollection(name, {
      validator: { $jsonSchema: jsonSchema },
      validationLevel: "moderate",
      validationAction: "error"
    });
    print("Created collection:",name);
    return;
  }

  const result =appDb.runCommand({
    collMod: name,
    validator: { $jsonSchema: jsonSchema },
    validationLevel: "moderate",
    validationAction: "error"
  });

  if (result.ok=== 1) {
    print("Updated validator:", name);
  } else 
    {
    print("Warning: could not update validator for", name, "-", tojson(result));
  }
}

function ensureIndex(collectionName, keys, options){
  try {
    const indexName = appDb[collectionName].createIndex(keys, options || {});
    print("Index ready on", collectionName + ":", indexName);
  } catch (err) {
    print("Index warning on", collectionName + ":", err.message);
  }
}

function now() {
  return new Date();
}

//users
ensureCollection("users", {
  bsonType: "object",
  required: ["fullName", "email","passwordHash", "role", "accountStatus", "createdAt", "updatedAt"],
  properties: {
    fullName: { bsonType: "string" },
    email: { bsonType: "string"},
    passwordHash: { bsonType: "string" },
    passwordResetTokenHash: { bsonType: ["string", "null"] },
    passwordResetExpiresAt: { bsonType: ["date", "null"] },
    emailVerified: { bsonType: "bool" },
    emailVerifiedAt: { bsonType: ["date", "null"] },
    emailVerificationTokenHash: { bsonType: ["string", "null"] },
    emailVerificationExpiresAt: { bsonType: ["date", "null"] },
    role: { enum: ["user", "admin"] },
    accountStatus: { enum: ["active", "disabled"] },
    createdAt: { bsonType:"date" },
    updatedAt: { bsonType: "date" }
  }
});

ensureIndex("users", { email: 1 }, { unique: true, name: "uniq_users_email" });
ensureIndex("users", { accountStatus: 1, updatedAt: -1 }, { name:"users_status_updatedAt" });
ensureIndex("users", { emailVerificationTokenHash: 1 }, { sparse: true, name: "users_email_verification_token" });

//resumes
ensureCollection("resumes", {
  bsonType: "object",
  required: ["userId","fileName", "fileUrl", "textExtracted", "parsed", "status", "createdAt", "updatedAt"],
  properties: {
    userId: { bsonType: "objectId" },
    fileName: { bsonType: "string" },
    fileUrl: { bsonType:"string" },
    textExtracted: { bsonType: "string" },
    parsed: {
      bsonType: "object",
      required: ["skills","experienceYears"],
      properties: {
        skills: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["name"],
            properties: {
              name: { bsonType: "string" },
              years: { bsonType: ["int", "double"] },
              level: { enum: ["beginner", "intermediate", "advanced"] }
            }
          }
        },
        experienceYears: { bsonType: ["int", "double"] },
        location: { bsonType: "string" },
        education: { bsonType: "array", items: { bsonType: "string" } }
    }
    },
    status: { enum: ["uploaded", "parsed", "analyzed", "revised", "archived"] },
    createdAt: { bsonType: "date" },
    updatedAt: { bsonType: "date" }
  }
});

ensureIndex("resumes", { userId: 1, updatedAt: -1 }, { name: "resumes_user_updatedAt" });
ensureIndex("resumes", { userId: 1, fileName: 1 }, { unique: true, name: "uniq_resumes_user_file" });
ensureIndex("resumes", { status: 1, updatedAt: -1 }, { name: "resumes_status_updatedAt" });

//resume_versions
ensureCollection("resume_versions", {
  bsonType: "object",
  required: ["resumeId", "userId", "versionNumber", "textExtracted", "changeSummary", "improvementScore", "createdAt"],
  properties: {
    resumeId: { bsonType: "objectId" },
    userId: { bsonType:"objectId" },
    versionNumber: { bsonType: "int", minimum: 1 },
    textExtracted: { bsonType: "string" },
    changeSummary: { bsonType: "string" },
    improvementScore: { bsonType: "int", minimum: 0, maximum:100 },
    createdAt: { bsonType: "date" }
  }
});

ensureIndex("resume_versions", { resumeId: 1, versionNumber: 1 }, { unique: true, name: "uniq_resume_versions" });
ensureIndex("resume_versions", { userId: 1, createdAt: -1 }, { name: "resume_versions_user_createdAt" });

//resume_suggestions
ensureCollection("resume_suggestions", {
  bsonType: "object",
  required: ["resumeId", "userId", "overallScore", "analysisStatus", "suggestions", "modelUsed", "createdAt", "updatedAt"],
  properties: {
    resumeId: { bsonType: "objectId" },
    userId: { bsonType:"objectId" },
    resumeVersionId: { bsonType: "objectId" },
    overallScore: { bsonType: "int", minimum: 0, maximum: 100 },
    analysisStatus: { enum: ["queued", "running", "completed", "failed"] },
    suggestions: {
      bsonType: "array",
      items: {
        bsonType: "object",
        required: ["suggestionId", "category", "message", "score"],
        properties: {
          suggestionId: { bsonType: "string" },
          category: { enum: ["format", "grammar", "impact", "skills", "ats"] },
          message: { bsonType: "string" },
          beforeText: { bsonType: "string" },
          suggestedText: { bsonType: "string" },
          score: { bsonType: "int", minimum: 0, maximum:100 },
          isApplied: { bsonType: "bool" },
          userRating: { bsonType: "int", minimum: 0, maximum: 100 }
        }
      }
    },
    modelUsed: { bsonType: "string" },
    createdAt: { bsonType: "date" },
    updatedAt: { bsonType: "date" }
  }
});

ensureIndex("resume_suggestions", { resumeId: 1, createdAt: -1 }, { name: "resume_suggestions_resume_createdAt" });
ensureIndex("resume_suggestions", { userId: 1, createdAt:-1 }, { name: "resume_suggestions_user_createdAt" });
ensureIndex("resume_suggestions", { analysisStatus: 1, updatedAt: -1 }, { name: "resume_suggestions_status_updatedAt" });

//jobs
ensureCollection("jobs", {
  bsonType: "object",
  required: [
    "title",
    "company",
    "location",
    "description",
    "requiredSkills",
    "minExperienceYears",
    "jobUrl",
    "source",
    "isActive",
    "createdAt",
    "updatedAt"
  ],
  properties: {
    title: { bsonType:"string" },
    company: { bsonType: "string" },
    location: { bsonType: "string" },
    description: { bsonType: "string" },
    requiredSkills: {
      bsonType: "array",
      items: {
        bsonType: "object",
        required: ["name", "weight"],
        properties: {
          name: { bsonType: "string" },
          weight: { bsonType: ["int", "double"], minimum: 0, maximum: 1 }
        }
      }
    },
    minExperienceYears: { bsonType: ["int", "double"], minimum: 0 },
    jobUrl: { bsonType: "string" },
    source: { bsonType: "string" },
    externalJobId: { bsonType: "string" },
    isActive: { bsonType: "bool" },
    createdAt: { bsonType: "date" },
    updatedAt: { bsonType:"date" }
  }
});

ensureIndex("jobs", { title: "text", description: "text", company: "text" }, { name: "jobs_text_search" });
ensureIndex("jobs", { "requiredSkills.name": 1 }, { name: "jobs_requiredSkills_name" });
ensureIndex("jobs", { isActive: 1, updatedAt: -1 }, { name: "jobs_active_updatedAt" });
ensureIndex("jobs", { source: 1, externalJobId: 1 }, { unique: true, sparse: true, name: "uniq_jobs_source_externalId" });

//job_matches
ensureCollection("job_matches", {
  bsonType: "object",
  required: [
    "userId",
    "resumeId",
    "jobId",
    "matchScore",
    "skillScore",
    "experienceScore",
    "reasoning",
    "missingSkills",
    "recommendationStatus",
    "createdAt",
    "updatedAt"
  ],
  properties: {
    userId: { bsonType: "objectId" },
    resumeId: { bsonType: "objectId" },
    jobId: { bsonType: "objectId" },
    matchScore: { bsonType: "int", minimum: 0, maximum:100 },
    skillScore: { bsonType: "int", minimum: 0, maximum: 100 },
    experienceScore: { bsonType: "int", minimum: 0, maximum: 100 },
    educationScore: { bsonType: "int", minimum: 0, maximum: 100 },
    userRating: { bsonType: "int", minimum: 0, maximum: 100 },
    reasoning: { bsonType: "string" },
    missingSkills: {
      bsonType: "array",
      items: { bsonType: "string" }
},
    recommendationStatus: { enum: ["suggested", "saved", "applied", "dismissed"] },
    createdAt: { bsonType: "date" },
    updatedAt: { bsonType: "date" }
  }
});

ensureIndex("job_matches", { userId: 1, matchScore: -1, updatedAt: -1 }, { name: "job_matches_user_score_updatedAt" });
ensureIndex("job_matches", { resumeId: 1 }, { name: "job_matches_resume" });
ensureIndex("job_matches", { jobId: 1 }, { name: "job_matches_job" });
ensureIndex("job_matches", { userId: 1, resumeId: 1, jobId: 1 }, { unique: true, name: "uniq_job_matches_user_resume_job" });

//applications
ensureCollection("applications", {
  bsonType: "object",
  required: ["userId", "resumeId", "jobId", "applicationStatus", "appliedAt", "createdAt", "updatedAt"],
  properties: {
    userId: { bsonType: "objectId" },
    resumeId: { bsonType: "objectId" },
    jobId: { bsonType: "objectId" },
    applicationStatus: { enum: ["submitted", "interview", "offer", "rejected", "withdrawn"] },
    notes: { bsonType: "string" },
    appliedAt: { bsonType: "date" },
    createdAt: { bsonType: "date" },
    updatedAt: { bsonType:"date" }
  }
});

ensureIndex("applications", { userId: 1, appliedAt: -1 }, { name: "applications_user_appliedAt" });
ensureIndex("applications", { userId: 1, jobId: 1, resumeId: 1 }, { unique: true, name: "uniq_applications_user_job_resume" });


const seedTimestamp= now();

const seedEmail = "alice@test.com";
appDb.users.updateOne(
  { email: seedEmail },
  {
    $setOnInsert: {
      fullName: "Alice Resume Tester",
      email: seedEmail,
      passwordHash: "test_hash_1",
      role: "user",
      accountStatus: "active",
      createdAt: seedTimestamp
    },
    $set: {
      updatedAt:seedTimestamp
    }
  },
  { upsert: true }
);

const testUser = appDb.users.findOne({ email: seedEmail });

appDb.resumes.updateOne(
  { userId: testUser._id, fileName: "alice_resume.pdf" },
  {
    $setOnInsert: {
      userId: testUser._id,
      fileName: "alice_resume.pdf",
      fileUrl: "https://example.com/alice_resume.pdf",
      textExtracted: "Software engineer with JavaScript, Python, MongoDB, and SQL experience.",
      parsed: {
        skills: [
          { name: "JavaScript", years: 2, level: "intermediate" },
          { name: "Python", years: 2, level: "intermediate" },
          { name: "MongoDB", years: 1, level: "beginner" }
        ],
        experienceYears: 2,
        location: "Toronto",
        education: ["BSc Computer Science"]
    },
      createdAt: seedTimestamp
    },
    $set: {
      status: "analyzed",
      updatedAt: seedTimestamp
    }
  },
  { upsert: true }
);

const seedResume = appDb.resumes.findOne({ userId: testUser._id, fileName:"alice_resume.pdf" });

appDb.resume_versions.updateOne(
  { resumeId: seedResume._id, versionNumber: 1 },
  {
    $setOnInsert: {
      resumeId: seedResume._id,
      userId: testUser._id,
      versionNumber: 1,
      textExtracted: seedResume.textExtracted,
      changeSummary: "Initial imported resume.",
      improvementScore:70,
      createdAt: seedTimestamp
    }
  },
  { upsert: true }
);

const seedVersion =appDb.resume_versions.findOne({ resumeId: seedResume._id, versionNumber: 1 });

appDb.resume_suggestions.updateOne(
  { resumeId: seedResume._id, userId: testUser._id, modelUsed: "gpt-resume-analyzer-v2" },
  {
    $setOnInsert: {
      resumeId: seedResume._id,
      userId: testUser._id,
      resumeVersionId: seedVersion._id,
      overallScore:78,
      analysisStatus: "completed",
      suggestions: [
        {
          suggestionId: "sug-1",
          category: "impact",
          message: "Quantify achievements with measurable outcomes.",
          beforeText: "Improved API performance.",
          suggestedText: "Improved API response time by 35% by optimizing MongoDB queries.",
          score: 82,
          isApplied:false,
          userRating: 0
        },
        {
          suggestionId: "sug-2",
          category: "ats",
          message: "Add role-specific keywords for better ATS matching.",
          score: 74,
          isApplied: false,
          userRating:0
        }
      ],
      modelUsed: "gpt-resume-analyzer-v2",
      createdAt: seedTimestamp
    },
    $set: {
      updatedAt: seedTimestamp
    }
  },
  { upsert: true }
);

const jobsToSeed = [
  {
    title: "Junior Backend Developer",
    company: "Northwind Tech",
    location: "Toronto",
    description: "Build REST APIs and data pipelines using Node.js and MongoDB.",
    requiredSkills: [
      { name: "JavaScript",weight: 0.4 },
      { name: "Node.js", weight: 0.3 },
      { name: "MongoDB", weight: 0.3 }
    ],
    minExperienceYears: 1,
    jobUrl: "https://jobs.example.com/northwind-backend",
    source: "example-source",
    externalJobId: "northwind-backend-001",
    isActive: true,
    createdAt: seedTimestamp,
    updatedAt:seedTimestamp
  },
  {
    title: "Software Developer",
    company: "Contoso Apps",
    location: "Remote",
    description: "Develop full-stack features with JavaScript, Python, and SQL.",
    requiredSkills: [
      { name: "JavaScript", weight:0.35 },
      { name: "Python", weight: 0.35 },
      { name: "SQL", weight: 0.3 }
    ],
    minExperienceYears: 2,
    jobUrl: "https://jobs.example.com/contoso-dev",
    source: "example-source",
    externalJobId: "contoso-dev-001",
    isActive:true,
    createdAt: seedTimestamp,
    updatedAt: seedTimestamp
  }
];

jobsToSeed.forEach((job) => {
  appDb.jobs.updateOne(
    { source: job.source,externalJobId: job.externalJobId },
    {
      $setOnInsert: {
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        requiredSkills: job.requiredSkills,
        minExperienceYears:job.minExperienceYears,
        jobUrl: job.jobUrl,
        source: job.source,
        externalJobId: job.externalJobId,
        isActive: job.isActive,
        createdAt: job.createdAt
      },
      $set: {
        updatedAt: seedTimestamp
      }
    },
    { upsert: true }
  );
});

const seedJob = appDb.jobs.findOne({ source:"example-source", externalJobId: "northwind-backend-001" });

appDb.job_matches.updateOne(
  { userId: testUser._id, resumeId: seedResume._id, jobId: seedJob._id },
  {
    $setOnInsert: {
      userId: testUser._id,
      resumeId: seedResume._id,
      jobId: seedJob._id,
      matchScore:84,
      skillScore: 86,
      experienceScore: 80,
      educationScore: 75,
      userRating: 0,
      reasoning: "Strong overlap on JavaScript and MongoDB; build deeper Node.js projects.",
      missingSkills: ["Node.js"],
      recommendationStatus: "suggested",
      createdAt: seedTimestamp
    },
    $set: {
      updatedAt: seedTimestamp
    }
  },
  { upsert: true }
);

appDb.applications.updateOne(
  { userId: testUser._id, resumeId: seedResume._id, jobId: seedJob._id },
  {
    $setOnInsert: {
      userId: testUser._id,
      resumeId: seedResume._id,
      jobId: seedJob._id,
      applicationStatus: "submitted",
      notes: "Applied through company career page.",
      appliedAt: seedTimestamp,
      createdAt: seedTimestamp
    },
    $set: {
      updatedAt: seedTimestamp
}
  },
  { upsert: true }
);

print("\nSetup complete for database:", appDb.getName());
print("Collections:", appDb.getCollectionNames().join(", "));
print("Users:", appDb.users.countDocuments());
print("Resumes:", appDb.resumes.countDocuments());
print("Resume Versions:",appDb.resume_versions.countDocuments());
print("Resume Suggestions:", appDb.resume_suggestions.countDocuments());
print("Jobs:", appDb.jobs.countDocuments());
print("Job Matches:", appDb.job_matches.countDocuments());
print("Applications:", appDb.applications.countDocuments());

print("\nTop job suggestions for seed user:");
appDb.job_matches.aggregate([
  { $match: { userId: testUser._id } },
  { $sort: { matchScore: -1, updatedAt: -1 } },
  { $limit: 10 },
  {
    $lookup: {
      from: "jobs",
      localField: "jobId",
      foreignField: "_id",
      as: "job"
    }
  },
  { $unwind: "$job" },
  {
    $project: {
      _id: 0,
      matchScore: 1,
      skillScore: 1,
      experienceScore: 1,
      educationScore: 1,
      userRating: 1,
      missingSkills: 1,
      recommendationStatus:1,
      title: "$job.title",
      company: "$job.company",
      location: "$job.location",
      jobUrl: "$job.jobUrl"
    }
  }
]).forEach(printjson);
