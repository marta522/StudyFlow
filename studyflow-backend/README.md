# StudyFlow API

Backend API for StudyFlow, built with NestJS, Prisma, and SQLite. API routes
use the `/api` prefix and protected routes require a bearer access token.
Use Node.js 24.15 or newer.

## Run locally

1. Copy `.env.example` to `.env` and set a unique `JWT_SECRET` and
   `CORS_ORIGINS`. The SQLite database file is created at `prisma/dev.db`; no
   database server is needed. In PowerShell, run `Copy-Item .env.example .env`;
   on macOS/Linux, run `cp .env.example .env`.
2. Install dependencies with `npm install`.
3. Generate the Prisma client and apply migrations:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. Optionally seed demo data. Seeding deletes all existing local database
   records, so only do this on a new database or when intentionally resetting it.
   In PowerShell:

   ```powershell
   $env:SEED_DEMO_RESET = "true"
   npx prisma db seed
   Remove-Item Env:SEED_DEMO_RESET
   ```

   On macOS/Linux:

   ```bash
   SEED_DEMO_RESET=true npx prisma db seed
   ```

5. Start the API with `npm run start:dev`. The API listens at
   `http://localhost:3000/api`.

All `POST /api/auth/*` routes are limited to 100 requests per IP per 15 minutes.
Registration is additionally limited to 5 requests per IP per hour, login to 10
failed requests per IP per 15 minutes, and password-reset requests to 3 per IP
per 15 minutes. Successful logins do not count toward the login limit.
Configure `TRUST_PROXY` to the number of trusted proxy hops or the trusted proxy
address range; it defaults to `loopback`. Limits use in-memory storage and are
intended for a single API instance. Lesson dates and start times use
`APP_TIMEZONE` (default `Europe/Warsaw`).
`GET /api/health` is a liveness check. Set `CORS_ORIGINS` to the exact
comma-separated frontend origins in deployment; the default allows only
`http://localhost:5173`.
Access tokens expire after one hour; users need to sign in again after expiry.

Lessons are stored as a calendar date plus local `HH:mm` times, so checks such
as "the lesson has already started" and "the lesson has ended" (booking,
attendance, grades, and the list of free tutor slots) are evaluated in the
school time zone, set with `APP_TIMEZONE`, rather than in the server's own time
zone.

The application does not automatically seed or delete database records. The
Prisma seed script is destructive and must only be run when intentionally
resetting demo data.

SQLite is the supported local database. PostgreSQL migration files are kept in
`prisma/postgresql-migrations-archive`; their data is not automatically
transferred to SQLite.

## API routes

| Method | Route | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Creates a student or tutor account. |
| `POST` | `/api/auth/login` | Public | Authenticates and returns an access token. |
| `POST` | `/api/auth/request-password-reset` | Public | Sends a time-limited password reset link when the email belongs to an active account. |
| `POST` | `/api/auth/reset-password` | Public | Changes the password using a valid, single-use reset token. |
| `POST` | `/api/auth/logout` | Authenticated | Invalidates all of the user's active tokens. |
| `POST` | `/api/auth/change-password` | Authenticated | Changes the password and invalidates existing tokens. |
| `GET` | `/api/health` | Public | Returns the API liveness status. |
| `GET` | `/api/tutors/search` | Public | Searches active tutors by subject, price, rating, and free lesson date/time range. |
| `GET` | `/api/tutors/:tutorId/availability` | Public | Lists a tutor's upcoming free lesson slots. |
| `GET` | `/api/students?q=` | Tutor, administrator | Lists students; tutors only see students with a non-cancelled booking for one of their lessons. Optional `q` searches first name, last name, and email. |
| `POST` | `/api/bookings/lessons` | Tutor | Creates an available lesson within the tutor's active subject offer and availability. |
| `PATCH` | `/api/bookings/lessons/:id` | Tutor | Edits an unbooked scheduled lesson. |
| `DELETE` | `/api/bookings/lessons/:id` | Tutor | Deletes an unbooked scheduled lesson. |
| `POST` | `/api/bookings/admin/lessons` | Administrator | Creates a lesson for an active tutor and subject, optionally assigning a student. |
| `PATCH` | `/api/bookings/admin/lessons/:id` | Administrator | Edits an unbooked scheduled lesson. |
| `DELETE` | `/api/bookings/admin/lessons/:id` | Administrator | Cancels a lesson and its active bookings. |
| `GET` | `/api/subjects` | Public | Lists active subjects. |
| `DELETE` | `/api/subjects/:id` | Administrator | Deactivates a subject while preserving its lesson and grade history. |
| `GET` | `/api/reviews/tutor/:tutorId` | Public | Lists a tutor's reviews, newest first. |
| `POST` | `/api/reviews` | Student | Adds a review after a completed lesson. |
| `GET` | `/api/users/reports/financial` | Administrator | Lists generated financial reports. |
| `GET` | `/api/users/reports/financial/:id` | Administrator | Returns a saved report and its lesson details. |
| `POST` | `/api/users/reports/financial` | Administrator | Generates and persists a report for a month and year. |
| `POST` | `/api/lesson-issues` | Student, tutor | Reports a problem with a lesson the user participates in. |
| `GET` | `/api/lesson-issues/mine` | Student, tutor | Lists the current user's reports. |
| `GET` | `/api/lesson-issues/admin` | Administrator | Lists and filters lesson issue reports. |
| `PATCH` | `/api/lesson-issues/admin/:id` | Administrator | Updates a report status and sends the reporter a notification. |

Deleting a tutor with lesson, review, grade, request, or reported-issue history
archives the account by blocking it and revoking existing sessions. The
historical records remain intact. Tutors without linked history can be deleted.

Password recovery requires SMTP configuration. Add these values to `.env`:

```env
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="studyflow@example.com"
SMTP_PASSWORD="your-smtp-password"
SMTP_FROM="StudyFlow <studyflow@example.com>"
FRONTEND_URL="http://localhost:5173"
```

Password reset links expire after 30 minutes and can be used once. Keep SMTP
credentials out of source control.

New passwords must be at least 8 characters and contain a lowercase letter, an
uppercase letter, and a digit.

## Database backups

Use the SQLite backup API to create a consistent backup while the API is
running:

```powershell
npm run db:backup
npm run db:backup -- "D:\backups\studyflow.sqlite"
```

Validate a backup before restoring it. Restore requires the API to be stopped;
the command also creates a timestamped backup of the current database before
replacing it:

```powershell
npm run db:restore -- "D:\backups\studyflow.sqlite" --confirm
```

Restore validates SQLite integrity and required application tables, preserves
the current database under `prisma/backups`, and rolls back the file swap if
replacement fails. Restart the API and run `npx prisma migrate deploy` after
restoring a backup from an older application version.

The monthly-grade uniqueness migration archives duplicate historical rows in
`monthly_grades_dedup_archive` before enforcing one grade per student,
subject, and month.

## Add demo records without resetting the database

The expanded demo dataset adds subjects, tutor and student accounts, past and
upcoming lessons, bookings, attendance, grades, reviews, availability,
financial reports, and example administrator requests/issues. It is
development-only and idempotent; it does not delete existing data.

Run it from `studyflow-backend`. In PowerShell:

```powershell
$env:SEED_DEMO_APPEND = "true"
npm run db:populate-demo
Remove-Item Env:SEED_DEMO_APPEND
```

On macOS/Linux:

```bash
SEED_DEMO_APPEND=true npm run db:populate-demo
```

The generated local accounts use the demo password `Haslo123`. Do not use
these accounts or password in production. The script refuses production and
non-SQLite databases and records a marker so repeated runs do not duplicate
the dataset. The base reset seed also creates `admin@studyflow.pl`,
`tutor@studyflow.pl`, `dariusz@studyflow.pl`, `student@studyflow.pl`, and
`anna@studyflow.pl` with the same local-only password.

## Validation

```bash
npm run build
npm run lint
npm test
```

## Migrations

Create a migration during development with:

```bash
npx prisma migrate dev --skip-seed --name <migration-name>
```

Apply committed migrations to an existing database with `npx prisma migrate
deploy`.
