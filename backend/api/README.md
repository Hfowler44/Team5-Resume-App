# Resume App API

Express + Mongoose API for the AI Resume App.

## Setup

```bash
cd backend/api
cp .env.example .env   # then fill in your real values
npm install
npm start              # or: npm run dev (auto-reload)
```

## Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `GEMINI_API_KEY` | Google Gemini API key |

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
| DELETE | `/api/resumes/:id` | JWT | Delete resume |
| GET | `/api/resumes/:id/versions` | JWT | List versions |
| GET | `/api/resumes/:id/versions/:num` | JWT | Get version |
| POST | `/api/resumes/:id/analyze` | JWT | AI analysis |
| GET | `/api/resumes/:id/suggestions` | JWT | List suggestions |
| PATCH | `/api/suggestions/:id/items/:sid` | JWT | Apply/rate suggestion |