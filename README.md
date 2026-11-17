# Ledger

**A personal-finance API and dashboard: import bank statements, auto-categorise and de-duplicate transactions, set budgets and get spending insights.**

| | |
|---|---|
| **Live demo** | `https://YOUR-DEPLOYMENT-URL` *(add after deploying; see [Deploying the demo](#deploying-the-demo))* |
| **Screenshot / GIF** | `docs/screenshot.png` *(add a screenshot or GIF of the dashboard here)* |

> **About the live demo:** the hosted demo runs the React frontend **only**, on in-memory sample data (all fictional).
> No backend is contacted, nothing is saved, and reloading the page resets it. The real Flask API in
> [`backend/`](backend) is meant to be run locally (instructions below); it is covered by an automated test suite.

## Features

- **JWT authentication**: register/login with short-lived access tokens and refresh tokens; per-user data isolation on every query.
- **Statement import**: upload CSV/XLSX bank exports; columns (date, description, amount *or* debit/credit) are auto-detected, and re-uploading the same file never creates duplicates (SHA-256 fingerprinting).
- **Auto-categorisation** with user-defined keyword rules, plus manual, bulk and split-transaction editing.
- **Analytics**: income/expense summary, spend by category and monthly trend, with date-range filters.
- **Budgets** per category and month, compared with actual spend.
- **Rule-based insights**: over-budget alerts, trending categories, unusual transactions, possible duplicate payments.
- **Reports**: CSV/XLSX transaction export and a one-page monthly PDF.
- **"Ask Ledger"**: optional Gemini-powered Q&A that is sent only aggregated totals, never raw transactions.
- **Demo Mode** for the frontend: a full in-browser mock of the API so the UI can be hosted for free.

## Tech stack

**Backend**: Python 3.13, Flask 3, Flask-RESTful, SQLAlchemy 2 / Flask-SQLAlchemy, Alembic (Flask-Migrate), Flask-JWT-Extended, pandas + openpyxl (statement parsing and XLSX export), PostgreSQL in production / SQLite for local development and tests, gunicorn, pytest + pytest-cov, pip-audit.

**Frontend**: React 19, Vite, React Router, Recharts, axios, Vitest, oxlint, Prettier.

**Tooling**: GitHub Actions CI (tests, lint, dependency audits, both frontend builds).

## Architecture

```mermaid
flowchart LR
    subgraph Browser
      UI[React SPA]
      API{{api/client.js}}
      REAL[real.js<br/>axios + JWT]
      MOCK[mock/<br/>in-memory data]
      UI --> API
      API -- "VITE_DEMO_MODE unset" --> REAL
      API -- "VITE_DEMO_MODE=true" --> MOCK
    end
    REAL -- "HTTPS /api + Bearer token" --> F
    subgraph Backend [Flask backend]
      F[Resources<br/>Flask-RESTful] --> V[validation.py<br/>ApiError]
      F --> S[Services<br/>parser · categorizer · insights · dedupe]
      F --> M[(SQLAlchemy models)]
    end
    M --> DB[(PostgreSQL / SQLite)]
```

```
backend/
  app/
    __init__.py        app factory, route registration
    config.py          environment-driven config (fails fast in production without secrets)
    errors.py          ApiError + uniform {"error": "..."} responses
    validation.py      request parsing/validation helpers
    models.py          User, Category, CategoryRule, Transaction, Budget
    resources/         HTTP layer, one module per area (auth, transactions, budgets, ...)
    services/          business logic with no Flask dependency (parser, categorizer, insights, pdf, ...)
    cli.py             `flask seed-demo`, `flask create-user`
  migrations/          Alembic migrations
  tests/               pytest suite
frontend/
  src/api/             client.js (switch), real.js, mock/
  src/pages, src/components
```

**Design notes**

- Every query is scoped by `user_id`, and tests assert that one user cannot read or modify another's data.
- All errors share one JSON shape and use meaningful status codes (400 validation, 401 auth, 404 missing, 409 conflict, 502/503 upstream).
- SQL is portable (no PostgreSQL-only functions), so the same code runs on SQLite for tests and PostgreSQL in production.
- Money is stored as floating point for simplicity; a production system should use `Numeric`/integer cents.

## API

Base path `/api`. Authenticated routes need `Authorization: Bearer <access_token>`.

| Method | Route | Description | Auth |
|---|---|---|---|
| GET | `/health` | Liveness check | No |
| POST | `/auth/register` | Create an account, returns access + refresh tokens | No |
| POST | `/auth/login` | Log in with username or email | No |
| POST | `/auth/refresh` | Exchange a refresh token for a new access token | Refresh token |
| POST | `/auth/demo` | Log in as the seeded demo user (only if `DEMO_LOGIN_ENABLED=true`) | No |
| GET | `/auth/me` | Current user | Yes |
| POST | `/upload` | Import a CSV/XLSX statement (multipart `file`) | Yes |
| GET | `/transactions` | List with filters (`start_date`, `end_date`, `category_id`, `search`), sorting and pagination | Yes |
| PATCH | `/transactions/<id>` | Change a transaction's category | Yes |
| DELETE | `/transactions/<id>` | Delete a transaction | Yes |
| PATCH | `/transactions/bulk` | Recategorise many transactions | Yes |
| DELETE | `/transactions/bulk` | Delete many transactions | Yes |
| POST | `/transactions/<id>/split` | Split one transaction across categories | Yes |
| GET | `/categories` | List categories | Yes |
| POST | `/categories` | Create a category | Yes |
| GET | `/categories/rules` | List keyword rules | Yes |
| POST | `/categories/rules` | Create a keyword rule | Yes |
| GET | `/analytics/summary` | Income, expenses, net, savings rate | Yes |
| GET | `/analytics/by-category` | Spend by category | Yes |
| GET | `/analytics/trend` | Income/expense per month | Yes |
| GET | `/budgets?month=YYYY-MM` | Budgets with actual spend | Yes |
| POST | `/budgets` | Create or update a budget | Yes |
| DELETE | `/budgets/<id>` | Delete a budget | Yes |
| GET | `/insights?month=YYYY-MM` | Rule-based spending insights | Yes |
| GET | `/reports/transactions?format=csv\|xlsx` | Export transactions | Yes |
| GET | `/reports/monthly-summary?month=YYYY-MM` | One-page PDF summary | Yes |
| POST | `/ai/ask` | Ask a question about your spending (needs `GEMINI_API_KEY`) | Yes |

## Local setup

Prerequisites: Python 3.13+, Node 20+.

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # then edit; see the table below
export FLASK_APP=run.py             # Windows PowerShell: $env:FLASK_APP="run.py"
flask db upgrade                    # creates the schema (SQLite file by default)
flask seed-demo                     # optional: demo user + 6 months of sample data
flask create-user alice alice@example.com   # optional: a real user (prompts for a password)
python run.py                       # http://127.0.0.1:5001
```

Environment variables (`backend/.env`):

| Variable | Purpose | Default |
|---|---|---|
| `APP_ENV` | `development` or `production` (production refuses to start without `JWT_SECRET_KEY`) | `development` |
| `JWT_SECRET_KEY` | Token signing key (`openssl rand -hex 32`) | random per process (dev only) |
| `DATABASE_URL` | e.g. `postgresql://user:pass@localhost:5432/ledger` | local SQLite file |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:5173,http://127.0.0.1:5173` |
| `DEMO_LOGIN_ENABLED` | Enables passwordless `/auth/demo` | `false` |
| `GEMINI_API_KEY` | Enables `/ai/ask` | unset |
| `JWT_ACCESS_MINUTES` / `JWT_REFRESH_DAYS` | Token lifetimes | `30` / `14` |

For production use PostgreSQL, run `flask db upgrade` on deploy and serve with `gunicorn run:app`.

### Frontend

```bash
cd frontend
npm install
npm run dev                         # http://localhost:5173, proxies /api to the Flask server
```

To run the frontend with sample data and **no backend**: `VITE_DEMO_MODE=true npm run dev`
(PowerShell: `$env:VITE_DEMO_MODE="true"; npm run dev`).

### Tests

```bash
cd backend && pytest                # 53 tests, ~95% line coverage (prints a coverage report)
cd frontend && npm test             # 13 tests for the mock API layer
cd frontend && npm run lint
```

## Demo mode

`frontend/src/api/client.js` picks an implementation at build time. With `VITE_DEMO_MODE=true` every call is served by
`src/api/mock/`, an in-memory implementation of the same functions as the real client (create/edit/delete included, so
the app feels live during a session). It shows a "Demo mode" banner and a **Try Demo** button on the login page.
Without the flag the app talks to the real backend, unchanged. Sample data is deterministic and entirely fictional.

## Deploying the demo

The frontend is configured for Vercel with demo mode on (`frontend/vercel.json`: SPA rewrite, `npm run build:demo`).

1. Push this repository to GitHub.
2. In Vercel: **Add New → Project → import the repo**.
3. Set **Root Directory** to `frontend`. Leave the detected settings (they come from `vercel.json`).
4. Click **Deploy**, then paste the resulting URL into the *Live demo* row at the top of this README.

Netlify works the same way: base directory `frontend`, build command `npm run build:demo`, publish directory `dist`,
plus a rewrite `/* → /index.html (200)`.

## Known limitations

- Logout is client-side (stateless JWTs); there is no token revocation list.
- No rate limiting on login.
- Amounts use floating point rather than decimals.
- Excel export is only available with the real backend (the demo offers CSV and PDF).

## Author

**Daniel Mungai**, backend developer (Python / Flask)

- GitHub: [github.com/mungaiDaniel](https://github.com/mungaiDaniel)
- LinkedIn: [linkedin.com/in/daniel-mungai-7a52451b8](https://linkedin.com/in/daniel-mungai-7a52451b8)
