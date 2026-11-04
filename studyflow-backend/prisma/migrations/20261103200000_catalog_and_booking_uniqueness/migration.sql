-- Keep the lowest ID for existing duplicate tutor/subject offers.
DELETE FROM "tutor_subjects"
WHERE "id_tutor_subjects" NOT IN (
    SELECT MIN("id_tutor_subjects")
    FROM "tutor_subjects"
    GROUP BY "tutor_id", "subject_id"
);

-- Consolidate exact duplicate subject names into the lowest subject ID.
-- Grades that would violate their existing per-student/month uniqueness keep
-- the lowest grade ID, matching the catalog deduplication policy.
WITH normalized_grades AS (
    SELECT
        grade."id_monthly_grades" AS "id",
        grade."student_id" AS "student_id",
        grade."month" AS "month",
        grade."year" AS "year",
        (
            SELECT MIN(canonical."id_subjects")
            FROM "subjects" AS canonical
            WHERE canonical."name" = subject."name"
        ) AS "canonical_subject_id"
    FROM "monthly_grades" AS grade
    JOIN "subjects" AS subject
      ON subject."id_subjects" = grade."subject_id"
),
ranked_grades AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "student_id", "canonical_subject_id", "month", "year"
            ORDER BY "id"
        ) AS "rank"
    FROM normalized_grades
)
DELETE FROM "monthly_grades"
WHERE "id_monthly_grades" IN (
    SELECT "id" FROM ranked_grades WHERE "rank" > 1
);

WITH normalized_offers AS (
    SELECT
        offer."id_tutor_subjects" AS "id",
        offer."tutor_id" AS "tutor_id",
        (
            SELECT MIN(canonical."id_subjects")
            FROM "subjects" AS canonical
            JOIN "subjects" AS duplicate
              ON duplicate."name" = canonical."name"
            WHERE duplicate."id_subjects" = offer."subject_id"
        ) AS "canonical_subject_id"
    FROM "tutor_subjects" AS offer
),
ranked_offers AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "tutor_id", "canonical_subject_id"
            ORDER BY "id"
        ) AS "rank"
    FROM normalized_offers
)
DELETE FROM "tutor_subjects"
WHERE "id_tutor_subjects" IN (
    SELECT "id" FROM ranked_offers WHERE "rank" > 1
);

UPDATE "tutor_subjects"
SET "subject_id" = (
    SELECT MIN(canonical."id_subjects")
    FROM "subjects" AS duplicate
    JOIN "subjects" AS canonical ON canonical."name" = duplicate."name"
    WHERE duplicate."id_subjects" = "tutor_subjects"."subject_id"
)
WHERE "subject_id" NOT IN (
    SELECT MIN("id_subjects") FROM "subjects" GROUP BY "name"
);

UPDATE "lessons"
SET "subject_id" = (
    SELECT MIN(canonical."id_subjects")
    FROM "subjects" AS duplicate
    JOIN "subjects" AS canonical ON canonical."name" = duplicate."name"
    WHERE duplicate."id_subjects" = "lessons"."subject_id"
)
WHERE "subject_id" NOT IN (
    SELECT MIN("id_subjects") FROM "subjects" GROUP BY "name"
);

UPDATE "monthly_grades"
SET "subject_id" = (
    SELECT MIN(canonical."id_subjects")
    FROM "subjects" AS duplicate
    JOIN "subjects" AS canonical ON canonical."name" = duplicate."name"
    WHERE duplicate."id_subjects" = "monthly_grades"."subject_id"
)
WHERE "subject_id" NOT IN (
    SELECT MIN("id_subjects") FROM "subjects" GROUP BY "name"
);

UPDATE "subject_requests"
SET "subject_id" = (
    SELECT MIN(canonical."id_subjects")
    FROM "subjects" AS duplicate
    JOIN "subjects" AS canonical ON canonical."name" = duplicate."name"
    WHERE duplicate."id_subjects" = "subject_requests"."subject_id"
)
WHERE "subject_id" IS NOT NULL
  AND "subject_id" NOT IN (
      SELECT MIN("id_subjects") FROM "subjects" GROUP BY "name"
  );

DELETE FROM "subjects"
WHERE "id_subjects" NOT IN (
    SELECT MIN("id_subjects")
    FROM "subjects"
    GROUP BY "name"
);

-- Retain the earliest booking for a lesson and cancel any duplicate active
-- reservations before enforcing one active reservation per lesson.
WITH ranked_bookings AS (
    SELECT
        "id_bookings",
        ROW_NUMBER() OVER (
            PARTITION BY "lesson_id"
            ORDER BY "id_bookings"
        ) AS "rank"
    FROM "bookings"
    WHERE "status" != 'CANCELLED'
)
UPDATE "bookings"
SET "status" = 'CANCELLED'
WHERE "id_bookings" IN (
    SELECT "id_bookings" FROM ranked_bookings WHERE "rank" > 1
);

CREATE UNIQUE INDEX "subjects_name_key" ON "subjects"("name");
CREATE UNIQUE INDEX "tutor_subjects_tutor_id_subject_id_key"
ON "tutor_subjects"("tutor_id", "subject_id");
CREATE UNIQUE INDEX "bookings_one_active_per_lesson_key"
ON "bookings"("lesson_id")
WHERE "status" != 'CANCELLED';
