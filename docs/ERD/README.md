# Backend ERD

This ERD documents the backend data model defined in the Mongoose models under `backend/api/models` and the MongoDB schema bootstrap in `backend/db/resume_app_full_schema.mongodb.js`.

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        ObjectId _id PK
        string fullName
        string email UK
        string passwordHash
        string role
        string accountStatus
        boolean emailVerified
        date createdAt
        date updatedAt
    }

    RESUMES {
        ObjectId _id PK
        ObjectId userId FK
        string fileName
        string fileUrl
        bytes pdfData
        string pdfMimeType
        number pdfSize
        string textExtracted
        string status
        object parsed
        date createdAt
        date updatedAt
    }

    RESUME_VERSIONS {
        ObjectId _id PK
        ObjectId resumeId FK
        ObjectId userId FK
        number versionNumber
        string textExtracted
        string changeSummary
        number improvementScore
        bytes pdfData
        string pdfMimeType
        date createdAt
    }

    RESUME_SUGGESTIONS {
        ObjectId _id PK
        ObjectId resumeId FK
        ObjectId userId FK
        ObjectId resumeVersionId FK
        number overallScore
        string detectedField
        string analysisStatus
        array roleMatches
        array suggestions
        string modelUsed
        string contentHash
        date createdAt
        date updatedAt
    }

    JOBS {
        ObjectId _id PK
        string title
        string company
        string location
        string description
        array requiredSkills
        number minExperienceYears
        string jobUrl
        string source
        string externalJobId
        boolean isActive
        date createdAt
        date updatedAt
    }

    JOB_MATCHES {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId resumeId FK
        ObjectId jobId FK
        number matchScore
        number skillScore
        number experienceScore
        number educationScore
        string reasoning
        array missingSkills
        string recommendationStatus
        date createdAt
        date updatedAt
    }

    APPLICATIONS {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId resumeId FK
        ObjectId jobId FK
        string applicationStatus
        string notes
        date appliedAt
        date createdAt
        date updatedAt
    }

    USERS ||--o{ RESUMES : owns
    USERS ||--o{ RESUME_VERSIONS : creates
    USERS ||--o{ RESUME_SUGGESTIONS : receives
    USERS ||--o{ JOB_MATCHES : reviews
    USERS ||--o{ APPLICATIONS : submits

    RESUMES ||--o{ RESUME_VERSIONS : snapshots
    RESUMES ||--o{ RESUME_SUGGESTIONS : analyzed_by
    RESUMES ||--o{ JOB_MATCHES : matched_against
    RESUMES ||--o{ APPLICATIONS : used_for

    RESUME_VERSIONS o|--o{ RESUME_SUGGESTIONS : optional_source

    JOBS ||--o{ JOB_MATCHES : compared_in
    JOBS ||--o{ APPLICATIONS : target
```

## Notes

- The backend uses MongoDB with Mongoose, so several structures are embedded documents rather than standalone collections.
- `resumes.parsed.skills`, `resume_suggestions.suggestions`, and `jobs.requiredSkills` are nested arrays stored inside their parent documents.
- `resumeVersionId` on `resume_suggestions` is optional, so not every suggestion record is tied to a saved resume version.
- `applications` is defined in the MongoDB schema bootstrap file, but there is no matching Mongoose model or API route in `backend/api` yet.

## Key Constraints

- `users.email` is unique.
- `resumes` is unique on `(userId, fileName)`.
- `resume_versions` is unique on `(resumeId, versionNumber)`.
- `jobs` is unique on `(source, externalJobId)` when `externalJobId` is present.
- `job_matches` is unique on `(userId, resumeId, jobId)`.
- `applications` is unique on `(userId, jobId, resumeId)`.
- `resume_suggestions` includes a deduplication index on `(userId, contentHash, analysisStatus)`.
