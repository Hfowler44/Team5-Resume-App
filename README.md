# COP 4331 Large Project Resume App

Team 5

| Team Members  | Role | Github |
| ------------- |:-------------:| :-------------:|
| Hayden Fowler      | PM / Mobile     | @Hfowler44 |
| Stephen Olenchak      | Front End     | @stephenolenchak |
| Sharath Kukeswaran      | Database     | @sharathkukeswaran-spec |
| Lincoln Spencer      | API Developer     | @sl2005 |
| Dylan McIntee      | API Developer     | @dylanmc1ntee |

## Docker deployment

This repo now includes a `docker-compose.yml` for the React frontend, API, and MongoDB.

1. Copy the compose environment template:
   ```bash
   cp .env.example .env
   ```
2. Update `JWT_SECRET` and, if you want AI analysis enabled, set `GEMINI_API_KEY`.
   The default Flash model is `gemini-2.5-flash`, and you can override it with `GEMINI_MODEL`.
   To enable password reset and email verification, also fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS`.
   `SMTP_FROM` is optional if your SMTP user is already a valid sender address.
3. Build and start the stack:
   ```bash
   docker compose up --build -d
   ```
4. Open the app at:
   ```bash
   http://localhost:3000
   ```
5. Check the API health endpoint if needed:
   ```bash
   curl http://localhost:5000/api/health
   ```

By default:
- The React frontend is exposed on port `3000`
- The API is exposed on port `5000`
- MongoDB is available to the API on the internal Docker network
- Mongo data is stored in the named Docker volume `mongo_data`

To stop the stack:

```bash
docker compose down
```

To stop it and remove the database volume:

```bash
docker compose down -v
```
