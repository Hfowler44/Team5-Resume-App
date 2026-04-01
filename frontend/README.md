# Knight My Resume Frontend

React frontend for the Resume App.

## Local development

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api` to the backend on `http://localhost:5000`.

## Docker

This frontend is included in the repository root `docker-compose.yml`.

Once the full stack is running:

```bash
docker compose up --build -d
```

Open `http://localhost:3000`.
