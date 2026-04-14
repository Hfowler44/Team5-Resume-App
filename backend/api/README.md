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
- SMTP settings from the repo root `.env` for password reset email delivery

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
| `SMTP_HOST` | SMTP server hostname for password reset email |
| `SMTP_PORT` | SMTP server port (typically `587` or `465`) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password or app password |
| `SMTP_FROM` | Optional sender address; defaults to `SMTP_USER` |
| `SMTP_SECURE` | Optional `true` for implicit TLS, usually `false` for port `587` |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | Optional reset-link lifetime in minutes (default `60`) |
| `PASSWORD_RESET_URL` | Optional frontend URL override for reset links; otherwise the API uses the request origin |

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/auth/register` | — | Register user |
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/forgot-password` | — | Send password reset email |
| POST | `/api/auth/reset-password` | — | Reset password with emailed token |
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
