# StudyFlow API

Backend API for StudyFlow, built with NestJS, Prisma, and SQLite. API routes
use the `/api` prefix and protected routes require a bearer access token.

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
| `POST` | `/api/auth/logout` | Authenticated | Invalidates all of the user's active tokens. |
| `POST` | `/api/auth/change-password` | Authenticated | Changes the password and invalidates existing tokens. |
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

Password reset is intentionally not exposed until a verified email-delivery
flow is configured.

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
