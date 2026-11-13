# Groundwork

A private mastery platform for two learners: **Aditya Sharma** (AI-Native Frontend Developer) and **Harsh Suthar** (AI-Native Product Designer). It turns the two syllabus files in `syllabus/` into trackable learning units, an honest plan up to **December 31, 2026**, weekend projects, mastery assessments backed by proof of work, and analytics computed from real activity.

## Quick start

```bash
npm install
cp .env.example .env.local      # set SEED_PASSWORD_ADITYA and SEED_PASSWORD_HARSH
npm run db:seed                 # loads both syllabuses + creates the two accounts (hashed passwords)
npm run dev                     # http://localhost:3000
```

Production:

```bash
npm run build
npm start                       # serves on port 3000
```

After seeding, the passwords exist only as scrypt hashes in the database. You can delete `.env.local` (keep a copy somewhere safe if you want to re-run `db:seed -- --reset-passwords`).

## How it works

| Area | Where |
|---|---|
| Syllabus parser (Markdown → domains, parent topics, topics, subtopics, concepts, prerequisites, resources, capstones) | `src/lib/syllabus/parse.ts` |
| Seeding (deterministic IDs, so re-seeding after editing a syllabus keeps progress) | `scripts/seed.ts` |
| Planner (scope selection, daily packing, revision, assessments, weekend projects, daily automatic replan) | `src/server/planner.ts` |
| Weekend project building blocks per domain | `src/lib/syllabus/project-templates.ts` |
| Auth (scrypt hashes, hashed session tokens in httpOnly cookies, login rate limiting) | `src/server/auth.ts` |
| Authorization helpers (every action re-checks ownership server-side) | `src/server/guards.ts` |
| Server actions | `src/server/actions/*` |
| Database schema (SQLite via Drizzle; migrations in `drizzle/`) | `src/db/schema.ts` |

**Planning rules.** Essential topics come first. If they don't all fit your hours, every domain gets a share of the time (weighted towards foundations and AI-native skills) and takes a contiguous slice of its topics in syllabus order; the rest is marked *continued learning* instead of pretending it will be finished. Weekdays carry learning plus daily review of the previous day's topics and a Friday mastery check; weekends carry the weekly project generated from that week's topics, increasing in difficulty each week. Completing a topic schedules spaced revision at +2 and +7 days. Once a day the plan rebuilds: unfinished tasks are marked as moved forward and the remaining time is redistributed.

**Mastery.** Completion and mastery are separate. Mastery requires every rubric criterion rated "independently" or higher, a written explanation, and at least one linked proof-of-work entry. A failed assessment flags the topic for revision and schedules a revision task.

**Streaks** count only meaningful events: a learning session of 10+ minutes, a submitted project, a proof-of-work submission, or a mastery assessment.

**Prerequisites.** A domain unlocks when each of its prerequisite domains has at least half of its planned topics completed.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_PATH` | `./data/groundwork.db` | SQLite database file |
| `UPLOAD_DIR` | `./data/uploads` | Proof-of-work uploads (served only to their owner via `/api/files/[id]`) |
| `SYLLABUS_DIR` | `./syllabus` | Folder containing the two syllabus Markdown files |
| `INSECURE_COOKIES` | unset | Set to `1` only if you must serve production over plain HTTP (not recommended) |

## Deployment

Groundwork needs a Node.js 22+ host with a **persistent disk** for the SQLite file and uploads, e.g. a small VPS, Railway, Render or Fly.io with a mounted volume. Point `DATABASE_PATH` and `UPLOAD_DIR` at the volume, run `npm run db:seed` once, and serve over HTTPS. Serverless platforms without a persistent filesystem would need the database moved to hosted SQLite/Postgres and uploads to object storage.

## Tests

```bash
# Throwaway test database (never touches data/groundwork.db)
DATABASE_PATH=./data/test.db npm run db:seed
DATABASE_PATH=./data/test.db UPLOAD_DIR=./data/test-uploads npx next dev --port 3100
npm run test:reset -- data/test.db
npm run test:e2e -- ./data/e2e-shots        # Playwright: auth, isolation, every page, topic→proof→mastery, uploads, mobile, dark mode
DATABASE_PATH=./data/test.db npm run test:planner   # planner invariants across simulated days
npm run syllabus:inspect                    # structural summary of both syllabus files
```
