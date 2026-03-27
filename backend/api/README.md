# Resume App API

Express + Mongoose API for the AI Resume App.

## Setup

```bash
cp .env.example .env   # from the repository root
cd backend/api
npm install
npm start              # or: npm run dev (auto-reload)
```

## Docker

From the repository root:

```bash
cp .env.example .env
docker compose up --build -d
```

The compose stack injects these API settings:

- `PORT=5000`
- `MONGODB_URI=mongodb://mongo:27017/<MONGO_DB>`
- `JWT_SECRET` from the repo root `.env`
- `GEMINI_API_KEY` from the repo root `.env`
- `GEMINI_MODEL` from the repo root `.env` (defaults to `gemini-2.5-flash`)

The API will be available at `http://localhost:5000`.
The Dockerized React frontend proxies API requests from `http://localhost:3000`.

## Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Gemini model name for resume analysis (default `gemini-2.5-flash`) |

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Register user |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/users/me` | JWT | Get profile |
| PUT | `/api/users/me` | JWT | Update name |
| POST | `/api/resumes` | JWT | Upload PDF |
| GET | `/api/resumes` | JWT | List resumes |
| GET | `/api/resumes/:id` | JWT | Get resume |
| GET | `/api/resumes/:id/file` | JWT | Stream stored PDF |
| DELETE | `/api/resumes/:id` | JWT | Delete resume |
| GET | `/api/resumes/:id/versions` | JWT | List versions |
| GET | `/api/resumes/:id/versions/:num` | JWT | Get version |
| POST | `/api/resumes/:id/analyze` | JWT | AI analysis |
| GET | `/api/resumes/:id/suggestions` | JWT | List suggestions |
| PATCH | `/api/suggestions/:id/items/:sid` | JWT | Apply/rate suggestion |
