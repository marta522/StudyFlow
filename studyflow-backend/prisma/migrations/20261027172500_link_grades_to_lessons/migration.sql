-- Link new grades to the lesson they assess, while preserving historical grades.
ALTER TABLE "monthly_grades" ADD COLUMN "lesson_id" INTEGER
    REFERENCES "lessons"("id_lessons") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "monthly_grades_lesson_id_key"
    ON "monthly_grades"("lesson_id");
