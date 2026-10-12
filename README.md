# Coldmail

I built Coldmail because I wanted (a job) a place to write and send emails, and then track if the email was even opened or not. The dashboard keeps the emails and their statuses together, so I can check what went through and whether it was opened without digging around in different places. The website talks to a Python API, which sends through Gmail and saves the records in MongoDB. A small Cloudflare Worker tracks opens using a tiny image in each email.

![Coldmail dashboard](docs/coldmail-dashboard.png)

## What you need

- Windows with PowerShell
- Node.js and npm
- Python 3.12 and [uv](https://docs.astral.sh/uv/)
- A MongoDB Atlas cluster and database user
- A Gmail account with an app password
- A Cloudflare account for the open-tracking Worker

## First-time setup

Run these commands from the project folder (`C:\Code\aston_cold`).

### 1. Add local environment files

```powershell
Copy-Item localstuff\.env.example localstuff\.env
Copy-Item frontend\.env.example frontend\.env.local
```

Fill in `localstuff\.env` with your own values:

| Variable | What to enter |
| --- | --- |
| `MONGODB_HOST` | Your Atlas cluster hostname, without `mongodb+srv://` |
| `MONGODB_USER` | The Atlas database username |
| `MONGODB_PASSWORD` | The Atlas database user's password |
| `GMAIL_USER` | The Gmail address that will send email |
| `GMAIL_PASSWORD` | That account's Gmail app password |
| `BEACON_URL` | The deployed tracker's base URL ending in `?id=` |
| `TRACKER_WORKER_URL` | Optional; the deployed tracker base URL, without a path. Defaults to the project's configured Worker URL. |

Keep real credentials in these ignored local files. Do not put them in the README, source files, or a commit. `frontend\.env.local` should point `NEXT_PUBLIC_API_BASE` at `http://127.0.0.1:8787` for local use; it does not need MongoDB or Gmail credentials.

MongoDB Atlas must allow connections from your network, and its database user must have permission to read and write. The app uses the `mailey` database and `mails` collection.

### 2. Install backend and website dependencies

```powershell
Push-Location localstuff
uv sync --locked
Pop-Location

Push-Location frontend
npm ci
Pop-Location
```

### 3. Set up the tracking Worker (first deploy, or when updating it)

The repo already has a KV namespace binding in `cloudflare_stuff\wrangler.jsonc`. Make sure that namespace exists in the Cloudflare account you log in to.

```powershell
Push-Location cloudflare_stuff
npm ci
npx wrangler login
.\doom_deploy.ps1
Pop-Location
```

If you deploy under a different Worker URL, update `BEACON_URL` and `TRACKER_WORKER_URL` in `localstuff\.env` to that Worker. `BEACON_URL` must end with `?id=` because the API adds each email's tracking ID to it.

## Run the app

From the project folder, run:

```powershell
.\doom_run.ps1
```

This starts the API and website in the background if their ports are free. Open:

- Website: <http://localhost:3000>
- Compose: <http://localhost:3000/compose>
- API: <http://localhost:8787>

The script expects the setup steps above to be complete. It does not deploy the Cloudflare Worker; that is a separate first-time setup step.

### Run the API and website in separate terminals

If you prefer to see their logs directly, open two PowerShell terminals in the project folder.

Terminal 1:

```powershell
Push-Location localstuff
uv run uvicorn api:app --host 127.0.0.1 --port 8787
```

Terminal 2:

```powershell
Push-Location frontend
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Use `Ctrl+C` in each terminal to stop its server.

## Using the app

Open the Compose page, enter a recipient, subject, and body, then send. The API sends through Gmail and records the email in MongoDB. The other pages read those records from the API. An email open is recorded when the recipient's email client loads its tracking image; some clients block images or proxy them, so open tracking may be delayed or unavailable.

The API routes are `GET /emails`, `GET /emails/{email_id}`, and `POST /emails` on port 8787.

## Troubleshooting

- **Port 3000 or 8787 is already in use:** stop the existing server using that port, then rerun `.\doom_run.ps1`.
- **MongoDB connection errors:** check the Atlas hostname, database username/password, and Atlas network access list.
- **Gmail authentication errors:** confirm `GMAIL_USER` and use the Gmail app password in `GMAIL_PASSWORD`.
- **Emails send but opens do not appear:** confirm the Worker is deployed, its `OPEN_EVENTS` KV binding is valid, and both tracker URLs in `localstuff\.env` point to that Worker.
- **Need the server output:** the launcher writes API logs to `localstuff\api.stdout.log` and `localstuff\api.stderr.log`, and website logs to `frontend\dev.stdout.log` and `frontend\dev.stderr.log`.

## Useful development commands

```powershell
Push-Location frontend
npm run typecheck
npm run lint
npm run build
Pop-Location
```

## To-Do
Maybe add a locally run or an api based bot that mass writes the emails for me.
(idk how ethical it is but we ball)

Also better UI/UX
(Mainly letting the user run the locally hosted website and js enter thier credentials there rather than then putting it in the .env files)
