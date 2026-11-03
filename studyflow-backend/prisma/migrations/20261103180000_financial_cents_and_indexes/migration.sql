ALTER TABLE "tutor_subjects"
ADD COLUMN "price_per_hour_cents" INTEGER NOT NULL DEFAULT 0;

UPDATE "tutor_subjects"
SET "price_per_hour_cents" = CAST(ROUND("price_per_hour" * 100) AS INTEGER);

ALTER TABLE "tutor_subjects" DROP COLUMN "price_per_hour";

ALTER TABLE "financial_reports"
ADD COLUMN "total_student_cost_cents" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "financial_reports"
ADD COLUMN "total_tutor_salary_cents" INTEGER NOT NULL DEFAULT 0;

UPDATE "financial_reports"
SET "total_student_cost_cents" = CAST(ROUND("total_student_cost" * 100) AS INTEGER),
    "total_tutor_salary_cents" = CAST(ROUND("total_tutor_salary" * 100) AS INTEGER);

ALTER TABLE "financial_reports" DROP COLUMN "total_student_cost";
ALTER TABLE "financial_reports" DROP COLUMN "total_tutor_salary";

CREATE INDEX "lessons_tutor_id_lesson_date_idx"
ON "lessons"("tutor_id", "lesson_date");

CREATE INDEX "bookings_student_id_idx" ON "bookings"("student_id");
CREATE INDEX "bookings_lesson_id_idx" ON "bookings"("lesson_id");
