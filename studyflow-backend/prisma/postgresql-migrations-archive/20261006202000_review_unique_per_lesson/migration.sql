-- Prevent a student from reviewing the same completed lesson more than once.
CREATE UNIQUE INDEX "reviews_student_id_lesson_id_key"
ON "reviews"("student_id", "lesson_id");
