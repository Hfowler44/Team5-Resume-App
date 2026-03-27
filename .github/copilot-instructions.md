# Copilot Instructions for Team5-Resume-App

## Build, test, and lint commands

### Backend API (`backend/api/`)

```bash
cd backend/api
npm install          # install dependencies
npm start            # start the server (node server.js)
npm run dev          # start with auto-reload (node --watch server.js)
npm test             # run smoke tests (jest with in-memory MongoDB)
```

No test framework or linter is configured yet.

### Frontend and Mobile

No build, test, or lint commands are configured for `frontend/` or `mobile/` yet. Inspect for a manifest before assuming a framework.

## High-level architecture

This is an AI-powered resume review app with a MERN-style backend:

- `backend/api/` — Express API with JWT auth, PDF upload, and Google Gemini integration
  - `server.js` — entry point, mounts all routes
  - `config/db.js` — Mongoose connection
  - `middleware/` — JWT auth verification, multer PDF upload config
  - `models/` — Mongoose schemas for User, Resume, ResumeVersion, ResumeSuggestion
  - `routes/` — auth, users, resumes, resumeVersions, resumeSuggestions
  - `services/pdfParser.js` — extracts text from PDF buffers
  - `services/geminiAnalyzer.js` — calls Gemini with a scoring rubric, returns structured review
  - `utils/errorHandler.js` — centralized Express error middleware
- `backend/db/` — MongoDB schema setup script (`resume_app_full_schema.mongodb.js`) with validators, indexes, and seed data for 7 collections
- `frontend/` — reserved for the web client (not yet implemented)
- `mobile/` — reserved for the mobile client (not yet implemented)

## Key conventions

- Keep work scoped to the correct surface:
  - API/server changes belong under `backend/api/`
  - Database schema, seed, or persistence work belongs under `backend/db/`
  - Web UI work belongs under `frontend/`
  - Mobile work belongs under `mobile/`
- Environment variables are loaded from `backend/api/.env` via dotenv; see `.env.example` for required keys
- All authenticated routes require a `Bearer <JWT>` header; the `auth` middleware attaches `req.userId`
- Mongoose models mirror the JSON schema validators defined in `backend/db/resume_app_full_schema.mongodb.js`
- The Gemini analyzer uses structured JSON output with `temperature: 0.3` and server-side validation to control AI non-determinism
