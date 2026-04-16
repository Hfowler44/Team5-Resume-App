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

Open `http://localhost`.

The Docker image also exposes HTTPS on port `443`. Without Certbot settings it
starts with a short-lived self-signed certificate so nginx can serve HTTPS
immediately.

For production Let's Encrypt certificates, set these values in the repository
root `.env` before running `docker compose up --build -d`:

```bash
FRONTEND_PORT=80
FRONTEND_HTTPS_PORT=443
FRONTEND_DOMAIN=resume.example.com
CERTBOT_EMAIL=admin@example.com
```

The domain must point to the Docker host, and public ports `80` and `443` must
be reachable.
