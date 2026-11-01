# StudyFlow API

Backend API for StudyFlow, built with NestJS, Prisma, and SQLite. API routes
use the `/api` prefix and protected routes require a bearer access token.
Use Node.js 24 or newer for the database backup and restore commands.

## Run locally

1. Set `DATABASE_URL="file:./dev.db"` and `JWT_SECRET` in `.env`. The SQLite
   database file is created at `prisma/dev.db`; no database server is needed.
2. Install dependencies with `npm install`.
3. Generate the Prisma client and apply migrations:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

4. Optionally seed demo data in PowerShell. Seeding deletes all existing local
   database records, so only do this on a new database or when intentionally
   resetting it:

   ```powershell
   $env:SEED_DEMO_RESET = "true"
   npx prisma db seed
   Remove-Item Env:SEED_DEMO_RESET
   ```

5. Start the API with `npm run start:dev`.

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

Run it from `studyflow-backend` in PowerShell:

```powershell
$env:SEED_DEMO_APPEND = "true"
npm run db:populate-demo
Remove-Item Env:SEED_DEMO_APPEND
```

The generated local accounts use the demo password `haslo123`. Do not use
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
