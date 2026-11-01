CREATE TABLE "monthly_grades_dedup_archive" AS
SELECT *, CURRENT_TIMESTAMP AS "archived_at"
FROM "monthly_grades"
WHERE "id_monthly_grades" NOT IN (
    SELECT MAX("id_monthly_grades")
    FROM "monthly_grades"
    GROUP BY "student_id", "subject_id", "month", "year"
);

DELETE FROM "monthly_grades"
WHERE "id_monthly_grades" NOT IN (
    SELECT MAX("id_monthly_grades")
    FROM "monthly_grades"
    GROUP BY "student_id", "subject_id", "month", "year"
);

CREATE UNIQUE INDEX "monthly_grades_student_id_subject_id_month_year_key"
ON "monthly_grades"("student_id", "subject_id", "month", "year");
