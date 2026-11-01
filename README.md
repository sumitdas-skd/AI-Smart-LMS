# AI Smart LMS Platform

A modern, AI-powered Learning Management System (LMS) built with FastAPI, SQLAlchemy 2.0, React 18, Vite, Tailwind v4, and Lucide Icons.

---

## What's New: "Job Query" Module

The **Job Query** module connects students to verified job and internship openings across top tech companies and campus placement drives.

### Permitted Sourcing Architecture (Compliance First)
To maintain strict compliance with terms of service:
* **No web scraping**: No scraping of LinkedIn, portals, or marketplaces. No headless browsers or logged-in scraping sessions.
* **Adzuna Official API**: Ingests fresh IT/software engineer and internship listings via credentials (`ADZUNA_APP_ID`, `ADZUNA_APP_KEY`) for country `"in"`.
* **Public ATS Job Board APIs**: Direct integrations with official APIs:
  * **Greenhouse**: `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs`
  * **Lever**: `https://api.lever.co/v0/postings/{slug}?mode=json`
  * **Ashby**: `https://api.ashbyhq.com/posting-api/job-board/{slug}`
* **Manual College Placement Drives**: Teachers and Admins can post verified on-campus and off-campus opportunities.
* **Safe External Search**: A "Search on LinkedIn" button generates an outbound search link (`https://www.linkedin.com/jobs/search/?keywords=...&location=...`) in a new tab without scraping or fetching data from LinkedIn.

---

## Security & Reliability Engineering

* **SSRF Prevention**: All outbound HTTP requests strictly validate the host against an internal allowlist (`boards-api.greenhouse.io`, `api.lever.co`, `api.ashbyhq.com`, `api.adzuna.com`). IP addresses and intranet hostnames are blocked.
* **HTTPS Validation**: Only valid `https://` URLs are accepted for apply links.
* **HTML Sanitization**: Job descriptions from third-party APIs are sanitized and stripped to clean plain text.
* **Failure Isolation**: Each source runs in an isolated try-except context. If a company slug or adapter fails, other sources continue processing normally.
* **State Preservation**: Inactive or removed postings are marked `is_active=False` rather than deleted, preserving audit history and student bookmarks.

---

## Environment Variables

Add these to your `backend/.env` file:

```env
# Database & Core Auth
DATABASE_URL=sqlite:///./lms.db
SECRET_KEY=yoursupersecuresecretkeyforjwt
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# AI Router (Optional OpenAI / Gemini key for "Why this fits me" AI match)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
DEFAULT_AI_PROVIDER=openai

# Job Query Module Configuration
ADZUNA_APP_ID=your_adzuna_app_id_here
ADZUNA_APP_KEY=your_adzuna_app_key_here
ADZUNA_COUNTRY=in
JOBS_SYNC_INTERVAL_HOURS=4

# Serverless Cron Secret (Optional, for external cron triggers)
CRON_SECRET=lms_jobs_cron_secret_key
```

---

## Background Sync vs Serverless Cron

1. **In-Process Background Scheduler (Default for long-running servers)**:
   When running with Uvicorn, an async background task starts automatically on application startup and runs every `JOBS_SYNC_INTERVAL_HOURS` (default: 4 hours).
2. **Serverless Cron (Vercel, AWS Lambda, Cloud Run Jobs)**:
   For serverless hosts where long-running processes terminate, trigger the secured cron endpoint periodically:
   ```bash
   curl -X POST https://your-domain.com/jobs/cron-sync \
        -H "X-Cron-Key: lms_jobs_cron_secret_key"
   ```

---

## How to Add & Manage Company ATS Slugs

Company slugs are managed by Administrators directly through the UI or the API:

### Method 1: Via Web UI
1. Log in as an **Admin** user.
2. Navigate to **Job Query** in the sidebar.
3. Click the **"Sources"** button in the top right.
4. Select the ATS type (`greenhouse`, `lever`, or `ashby`).
5. Enter the company slug (e.g., `stripe`, `linear`, or `vercel`) and Company Name.
6. Click **Add Source** or click **Sync Now** to immediately fetch open listings.

### Method 2: Via REST API
```bash
curl -X POST http://localhost:8000/jobs/sources \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"type": "greenhouse", "slug": "stripe", "company_name": "Stripe"}'
```

---

## Running Automated Tests

Run backend integration and unit tests:
```bash
cd backend
PYTHONPATH=. .venv/bin/pytest tests/test_jobs_sync.py tests/test_jobs_endpoints.py -v
```

Build and check frontend:
```bash
cd frontend
npm run build
```

---

## 2-Minute Demo Script

| Timestamp | Step | What to show / say |
|---|---|---|
| **0:00 - 0:25** | **Overview & Sidebar** | Log in as a student (`alice@college.edu` / `pass123` or demo account). Notice the **"Job Query"** item in the sidebar with the real-time **New** badge. Click into the module. |
| **0:25 - 0:50** | **Search, Filters & Tabs** | Demonstrate the fast search bar (type `"Python"` or `"Internship"`), filter chips (`Internship`, `Remote`, `Hybrid`), and the **New** / **Saved** tabs. Show how cards display company initial avatars, salary brackets, and relative time stamps. |
| **0:50 - 1:15** | **AI Match & Detail Drawer** | Click any job card to open the glassmorphism detail drawer. Click **"Analyse"** under **"Why this fits me"** to see instant 3-bullet fit explanation computed from student profile skills. |
| **1:15 - 1:35** | **Placement Drive & LinkedIn Link** | Point out college placement opportunities posted by the placement cell. Show the **"Search on LinkedIn"** button which opens LinkedIn's native search without illegal scraping. |
| **1:35 - 2:00** | **Admin Sources & Sync Console** | Log in as an admin (`admin@college.edu` / `pass123`). Open **Sources**, demonstrate adding a new company slug (e.g. `ashby` / `linear`), and click **"Sync Now"** to see instant real-time audit logs. |
