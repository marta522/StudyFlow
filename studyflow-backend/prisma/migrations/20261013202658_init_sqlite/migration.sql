-- CreateTable
CREATE TABLE "roles" (
    "id_roles" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id_users" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "phone" TEXT,
    "role_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "experience" TEXT,
    "about_me" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id_roles") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subjects" (
    "id_subjects" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "tutor_subjects" (
    "id_tutor_subjects" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tutor_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "price_per_hour" REAL NOT NULL,
    "experience_years" INTEGER,
    "description" TEXT,
    CONSTRAINT "tutor_subjects_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users" ("id_users") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tutor_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects" ("id_subjects") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "availability" (
    "id_availability" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tutor_id" INTEGER NOT NULL,
    "day_of_week" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "availability_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users" ("id_users") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "lessons" (
    "id_lessons" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tutor_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "lesson_date" DATETIME NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "created_by" INTEGER NOT NULL,
    "homework" TEXT,
    "attention" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "lessons_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users" ("id_users") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "lessons_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects" ("id_subjects") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bookings" (
    "id_bookings" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lesson_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "booking_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "note" TEXT,
    CONSTRAINT "bookings_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons" ("id_lessons") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bookings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users" ("id_users") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attendance" (
    "id_attendance" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "booking_id" INTEGER NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "marked_by" INTEGER NOT NULL,
    "marked_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings" ("id_bookings") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reviews" (
    "id_reviews" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "student_id" INTEGER NOT NULL,
    "tutor_id" INTEGER NOT NULL,
    "lesson_id" INTEGER,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users" ("id_users") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reviews_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users" ("id_users") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "reviews_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons" ("id_lessons") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "monthly_grades" (
    "id_monthly_grades" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "student_id" INTEGER NOT NULL,
    "tutor_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "grade" REAL NOT NULL,
    "comment" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "monthly_grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users" ("id_users") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "monthly_grades_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users" ("id_users") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "monthly_grades_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects" ("id_subjects") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subject_requests" (
    "id_subject_requests" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tutor_id" INTEGER NOT NULL,
    "subject_name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "subject_id" INTEGER,
    "reviewed_by" INTEGER,
    "reviewed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subject_requests_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users" ("id_users") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "subject_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users" ("id_users") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "subject_requests_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects" ("id_subjects") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "financial_reports" (
    "id_financial_reports" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "generated_by_user_id" INTEGER NOT NULL,
    "total_student_cost" REAL NOT NULL,
    "total_tutor_salary" REAL NOT NULL,
    "file_path" TEXT,
    "details" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "financial_reports_generated_by_user_id_fkey" FOREIGN KEY ("generated_by_user_id") REFERENCES "users" ("id_users") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_booking_id_key" ON "attendance"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_student_id_lesson_id_key" ON "reviews"("student_id", "lesson_id");
