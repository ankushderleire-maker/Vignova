# GitHub Deploy Readiness Report — UPDATED
_Vignova — resume-saas-v4 (Next.js) + Full_Backend (FastAPI) + Postgres + Ollama_

**Status:** All three previous blockers have been addressed in-code. There is a short **manual checklist** (rotating leaked keys, deleting scratch files, removing `.git/index.lock`) that must run on your laptop before the first `git push`. After that, this tree is clean enough for `main` → merge to `Deploy`.

---

## What changed in this pass (fixes committed in the tree)

| # | Issue | Fix |
|---|---|---|
| 1 | Secrets committed in plain-text `.env` files | Added `.env.example` templates at the repo root, `resume-saas-v4/`, and `Backend/Full_Backend/`. `.gitignore` updated to ignore `.env*` but keep `.env.example` tracked. |
| 2 | `DATABASE_URL` pointed at `localhost` inside Docker | `docker-compose.yml` now exports `DATABASE_URL=postgresql://…@db:5432/…` via the `environment:` block of both `dashboard` and `backend`, overriding anything in the shared `.env`. |
| 3 | `nginx.conf` defined vhosts but no nginx service existed | Added `nginx` service to `docker-compose.yml` with `80:443` published and healthcheck. Rewrote `nginx.conf` with TLS server blocks, HTTP→HTTPS redirect, `/.well-known/acme-challenge`, `/healthz`, and shared proxy defaults. Added `nginx.http-only.conf` as a cert-bootstrap fallback. |
| 4 | Backend CORS defaulted to `http://localhost:3000` | `docker-compose.yml` now passes `ALLOWED_ORIGINS=https://app.vignova.io,https://vignova.io,https://www.vignova.io` (override via root `.env`). |
| 5 | No Ollama healthcheck; backend raced the model pull | Added `healthcheck: ollama list \| grep -q deepseek`. `backend.depends_on.ollama.condition = service_healthy`. |
| 6 | App containers exposed host ports (`3000`, `3001`, `8000`) directly | Replaced `ports:` with `expose:` for `landing`, `dashboard`, `backend`, and `db` so only nginx is public. Postgres is internal-only. |
| 7 | Backend memory cap (2G) tight for 2 workers × SentenceTransformer | Raised backend `deploy.resources.limits.memory` to `3G`. |
| 8 | Raw SQL migrations never ran on Windows local dev | New cross-platform runner `resume-saas-v4/scripts/apply-raw-migrations.mjs`. `package.json` gained `db:push`, `db:migrate:raw`, `db:migrate`. |
| 9 | `.dockerignore` was 5 lines, letting logs/envs/caches into the build context | Expanded with exhaustive ignore patterns for secrets, build artefacts, OS/IDE files, scratch artefacts. |
| 10 | Scratch dev artefacts in `resume-saas-v4/` would be committed | Extended `resume-saas-v4/.gitignore` (`check_db.*`, `db_output.json`, `lint_*.txt`, `output.html`, `test-*.js`, `test-*.txt`, `*.tsbuildinfo`, etc). |
| 11 | Backend routes `jobs.py` + `scan.py` had ~55 KB of null bytes | Scrubbed. `python_services/job_worker.py` also had 10 KB of nulls — scrubbed. All `.py` files now parse cleanly. |
| 12 | No backend-side `.gitignore` | Added `Backend/Full_Backend/.gitignore`. |

---

## Manual checklist (run on your laptop before `git push`)

```bash
cd "FULL DEPLOYING CODE"
```

### 1. Delete the stale index lock
If you see `fatal: Unable to create '.git/index.lock'`:
```bash
# Windows (PowerShell)
Remove-Item .git\index.lock
# macOS / Linux
rm -f .git/index.lock
```

### 2. Stop tracking the real `.env` files
They contain real secrets. They are already in `.gitignore`, but history may still contain them.
```bash
git rm --cached .env resume-saas-v4/.env Backend/Full_Backend/.env 2>/dev/null || true
```

### 3. Untrack committed `__pycache__` / `.pyc` artefacts
```bash
git rm -r --cached Backend/Full_Backend/app/__pycache__ \
                   Backend/Full_Backend/app/models/__pycache__ \
                   Backend/Full_Backend/app/services/__pycache__ \
                   Backend/Full_Backend/app/utils/__pycache__ \
                   Backend/Full_Backend/python_services/__pycache__ 2>/dev/null || true
```

### 4. Delete the scratch dev artefacts
```bash
# Windows
del resume-saas-v4\check_db.out resume-saas-v4\check_db.ts resume-saas-v4\db_output.json ^
    resume-saas-v4\lint_check.bat resume-saas-v4\lint_output.txt resume-saas-v4\lint_results.txt ^
    resume-saas-v4\output.html resume-saas-v4\test-output.txt resume-saas-v4\test-pdf.js ^
    resume-saas-v4\test-simple.js resume-saas-v4\tsconfig.tsbuildinfo

# macOS / Linux
rm -f resume-saas-v4/{check_db.out,check_db.ts,db_output.json,lint_check.bat,lint_output.txt,\
lint_results.txt,output.html,test-output.txt,test-pdf.js,test-simple.js,tsconfig.tsbuildinfo}
```

### 5. Rotate every credential that was in the old `.env` files
Anything that was ever committed should be assumed public.
- Gemini API key  (console.cloud.google.com → APIs → Credentials)
- Sarvam API key
- Adzuna App ID + Key  (developer.adzuna.com)
- Google OAuth client + secret
- LinkedIn OAuth client + secret
- SMTP password
- `NEXTAUTH_SECRET` — regenerate with `openssl rand -base64 32`
- `INTERNAL_API_KEY` / `INGEST_API_KEY` — regenerate with `openssl rand -hex 32`

Put the new values back in your **local** `.env`, `resume-saas-v4/.env`, and `Backend/Full_Backend/.env`. The template lives in `.env.example` files — never commit the real ones.

### 6. (Only if the repo has ever been pushed publicly) scrub history
```bash
pipx install git-filter-repo
git filter-repo --invert-paths --path .env \
  --path resume-saas-v4/.env --path Backend/Full_Backend/.env
```

### 7. Apply raw SQL migrations to your local Postgres
This is what fixes the "Failed to load scan settings" error on Windows dev (the one showing `relation "admin_scan_settings" does not exist`):
```bash
cd resume-saas-v4
npm run db:migrate
```

### 8. Ship
```bash
git status
git add .
git commit -m "chore: deploy hardening — secrets scrub, nginx/TLS, docker fixes"
git push origin main
```

---

## On-the-server steps (first production boot)

The TLS-enabled `nginx.conf` refuses to start until Let's Encrypt certs exist. Bootstrap in two swaps:

```bash
# 0. Put your real values into each .env on the server:
cp .env.example .env                                     && $EDITOR .env
cp resume-saas-v4/.env.example resume-saas-v4/.env       && $EDITOR resume-saas-v4/.env
cp Backend/Full_Backend/.env.example Backend/Full_Backend/.env && $EDITOR Backend/Full_Backend/.env

# 1. Boot everything EXCEPT nginx-TLS. Temporarily swap in the HTTP-only config:
cp nginx.conf nginx.tls.conf
cp nginx.http-only.conf nginx.conf
mkdir -p letsencrypt certbot-webroot
docker compose up -d --build

# 2. Issue certs (container-agnostic webroot method):
sudo apt install certbot
sudo certbot certonly --webroot -w ./certbot-webroot \
  -d vignova.io -d www.vignova.io -d app.vignova.io -d api.vignova.io \
  --email admin@vignova.io --agree-tos --non-interactive

# 3. Swap the TLS config back in and reload:
cp nginx.tls.conf nginx.conf
docker compose exec nginx nginx -s reload
```

OAuth provider console updates (Google and LinkedIn) — add the production callbacks:
- `https://app.vignova.io/api/auth/callback/google`
- `https://app.vignova.io/api/auth/callback/linkedin`

### Sanity checks (all four should return 200)
```bash
curl -I https://vignova.io
curl -I https://app.vignova.io
curl -sS https://api.vignova.io/api/ats/ingest/health
# Admin panel → Scan Controls → "Run ATS ingestion now" → sources+fetched counts
```

---

## What was shipped earlier this session (still applies)

- **Adzuna / Indeed fix** — country is now derived from user-requested locations (`_LOCATION_COUNTRY_MAP`), so an Ireland search actually hits `api.adzuna.com/v1/api/jobs/ie/...`. Startup log line includes `adzuna_configured=True/False`.
- **Admin ATS manual trigger** — `POST /api/ats/ingest` (X-API-Key gated) + health probe at `GET /api/ats/ingest/health` + Next.js admin proxy at `/api/admin/ats-ingest` + UI button and cron-URL copy on `/admin/scan-controls`.
- **Sidebar** now shows a "Job Scrapper" entry in the Job Tracking group.

---

## What the status codes mean after ingestion

- **INSERTED** — job hash (title | company | location MD5) was new → added.
- **UPDATED** — hash already existed → `date_posted`, `description`, `apply_url` refreshed.

Seeing `UPDATED: 297, INSERTED: 0` means all 297 feed jobs were already in your DB. That is correct idempotent behaviour; it will only grow when the ATS feeds publish something new, or you add new companies to `Backend/Full_Backend/data/companies.txt`.
