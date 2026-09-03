# assessment-backend

Express + MongoDB (Mongoose) API for the Weekly Report Generator & Team Dashboard.

## Stack

- Node.js + Express 5
- MongoDB Atlas + Mongoose
- JWT-based auth, bcrypt password hashing
- Jest + Supertest + mongodb-memory-server for tests

## Setup

```bash
npm install
cp .env.example .env   # fill in MONGO_URI and JWT_SECRET
npm run dev            # starts on http://localhost:5000
```

Health check: `GET /api/health` → `{"status":"ok"}`

### Environment variables

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas (or local) connection string |
| `JWT_SECRET` | Secret used to sign auth tokens |
| `PORT` | Port to listen on (default 5000) |
| `CLIENT_ORIGIN` | Comma-separated list of allowed frontend origins for CORS |

### Seed data

```bash
npm run seed
```

Wipes and repopulates Users/Projects/Reports with a demo dataset: 1 manager, 4 team members, 3 projects, 12 reports spread across 3 weeks with a mixed status distribution (draft/submitted/needs_correction/approved). All seeded users share the password `password123` (e.g. `manager@example.com`, `alice@example.com`).

### Tests

```bash
npm test
```

Runs the role-based access control suite (`tests/rbac.test.js`) against an in-memory MongoDB instance — never touches the real database.

## Project structure

```
config/db.js          MongoDB connection (with a DNS fallback, see below)
models/                Mongoose schemas: User, Project, Report, reportContentSchema
controllers/            Route handler logic
routes/                 Express routers
middleware/auth.js      protect (JWT verification) + authorize(...roles)
middleware/errorHandler.js
utils/generateToken.js  JWT signing
utils/weekRange.js      Monday-start week boundary (UTC)
scripts/seed.js         Demo data seeding
tests/rbac.test.js      RBAC test suite
app.js                  Express app (exported for testing)
server.js               Entry point: connects DB, starts listening
```

## API summary

**Auth**
- `POST /api/auth/register` — `{ name, email, password, role? }`
- `POST /api/auth/login` — `{ email, password }`
- `GET /api/auth/me` (auth)

**Projects**
- `GET /api/projects` (auth)
- `POST /api/projects` (manager)
- `PUT /api/projects/:id` (manager)
- `DELETE /api/projects/:id` (manager)

**Reports**
- `POST /api/reports` (auth) — create draft
- `GET /api/reports/mine` (auth) — own reports, paginated, filterable by `weekStartDate`
- `GET /api/reports/team` (manager) — all reports, paginated, filterable by `member`/`project`/`status`/`dateFrom`/`dateTo`
- `GET /api/reports/:id` (auth) — owner or manager
- `PUT /api/reports/:id` (auth, owner) — edit while `draft`/`needs_correction`
- `POST /api/reports/:id/submit` (auth, owner) — `draft`/`needs_correction` → `submitted`
- `POST /api/reports/:id/review` (manager) — `{ action: 'approved' | 'requested_changes', comment? }`

**Users**
- `GET /api/users` (manager) — team member list, for dashboard filter dropdowns

**Dashboard**
- `GET /api/dashboard/summary` (manager) — this week's submission count, compliance rate, needs-correction count, open blockers count
- `GET /api/dashboard/charts` (manager) — status breakdown, reports by project, reports by member, 6-week submission trend

## Design decisions worth knowing

**Report versioning.** `Report.content` always holds the live/current version. Every `submit` call (first submission or a resubmission after correction) pushes a snapshot of the current content into `previousVersions` — tagged with its version number and timestamp — before bumping `currentVersionNumber`. This means the full submission history is preserved automatically with no special-casing between first and later submissions, and a report that's currently `needs_correction` already has its prior submitted version safely on record before the member's edits touch the live content.

**`reportContentSchema`.** Factored into its own file and reused both for `Report.content` and for each entry in `previousVersions`. One schema, one source of truth for what a "report" actually contains.

**Ownership vs. role checks.** `PUT /reports/:id`, `POST /reports/:id/submit` check *ownership* in the controller (`report.owner.toString() === req.user._id.toString()`) because any authenticated user can own a report — the restriction is about *whose* resource it is. Manager-only routes (`POST /projects`, `POST /reports/:id/review`, `GET /reports/team`, `GET /users`, `/dashboard/*`) use the `authorize('manager')` middleware instead, because the restriction there is about *role*, not resource ownership.

**Why MongoDB over SQL here.** Reports have a naturally nested, variable-history shape (live content + an append-only array of prior versions + an append-only array of review actions). Modeling that in SQL means extra join tables for `previousVersions` and `reviewHistory`; in Mongoose it's just embedded subdocuments on the same document, matching how the data is actually read (always fetched together, per report, never queried independently of their parent).

**DNS fallback in `config/db.js`.** `mongodb+srv://` URIs need an SRV DNS lookup. Some networks' default resolver refuses that lookup — `connectDB()` tries the normal connection first, and only if it fails specifically on `ECONNREFUSED` + `querySrv` does it retry once against public DNS (8.8.8.8 / 1.1.1.1). On networks where the default resolver handles SRV fine (most cloud hosts), this fallback code never runs.

## Deployment

- Backend → Render/Railway: set `MONGO_URI`, `JWT_SECRET`, `PORT` (usually auto-provided), `CLIENT_ORIGIN` (the deployed frontend URL)
- Frontend → Vercel: set `NEXT_PUBLIC_API_URL` to the deployed backend URL
- Database → MongoDB Atlas, Network Access set to `0.0.0.0/0` (required since most hosting platforms use dynamic egress IPs on free tiers)
