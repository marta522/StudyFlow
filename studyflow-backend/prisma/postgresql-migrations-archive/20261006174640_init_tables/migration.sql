-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'PENDING');

-- CreateEnum
CREATE TYPE "SubjectStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'PENDING');

-- CreateTable
CREATE TABLE "roles" (
    "id_roles" SERIAL NOT NULL,
    "name" VARCHAR(45) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id_roles")
);

-- CreateTable
CREATE TABLE "users" (
    "id_users" SERIAL NOT NULL,
    "first_name" VARCHAR(45) NOT NULL,
    "last_name" VARCHAR(45) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(45),
    "role_id" INTEGER NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "experience" VARCHAR(45),
    "about_me" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id_users")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id_subjects" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" "SubjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id_subjects")
);

-- CreateTable
CREATE TABLE "tutor_subjects" (
    "id_tutor_subjects" SERIAL NOT NULL,
    "tutor_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "price_per_hour" DECIMAL(10,2) NOT NULL,
    "experience_years" INTEGER,
    "description" TEXT,

    CONSTRAINT "tutor_subjects_pkey" PRIMARY KEY ("id_tutor_subjects")
);

-- CreateTable
CREATE TABLE "availability" (
    "id_availability" SERIAL NOT NULL,
    "tutor_id" INTEGER NOT NULL,
    "day_of_week" VARCHAR(20) NOT NULL,
    "start_time" VARCHAR(10) NOT NULL,
    "end_time" VARCHAR(10) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "availability_pkey" PRIMARY KEY ("id_availability")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id_lessons" SERIAL NOT NULL,
    "tutor_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "lesson_date" DATE NOT NULL,
    "start_time" VARCHAR(10) NOT NULL,
    "end_time" VARCHAR(10) NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_by" INTEGER NOT NULL,
    "homework" VARCHAR(255),
    "attention" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id_lessons")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id_bookings" SERIAL NOT NULL,
    "lesson_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "booking_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "note" TEXT,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id_bookings")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id_attendance" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "marked_by" INTEGER NOT NULL,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id_attendance")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id_reviews" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "tutor_id" INTEGER NOT NULL,
    "lesson_id" INTEGER,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id_reviews")
);

-- CreateTable
CREATE TABLE "monthly_grades" (
    "id_monthly_grades" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "tutor_id" INTEGER NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "grade" DECIMAL(4,2) NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_grades_pkey" PRIMARY KEY ("id_monthly_grades")
);

-- CreateTable
CREATE TABLE "subject_requests" (
    "id_subject_requests" SERIAL NOT NULL,
    "tutor_id" INTEGER NOT NULL,
    "subject_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "subject_id" INTEGER,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_requests_pkey" PRIMARY KEY ("id_subject_requests")
);

-- CreateTable
CREATE TABLE "financial_reports" (
    "id_financial_reports" SERIAL NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "generated_by_user_id" INTEGER NOT NULL,
    "total_student_cost" DECIMAL(12,2) NOT NULL,
    "total_tutor_salary" DECIMAL(12,2) NOT NULL,
    "file_path" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_reports_pkey" PRIMARY KEY ("id_financial_reports")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_booking_id_key" ON "attendance"("booking_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id_roles") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_subjects" ADD CONSTRAINT "tutor_subjects_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id_users") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tutor_subjects" ADD CONSTRAINT "tutor_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id_subjects") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability" ADD CONSTRAINT "availability_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id_users") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id_users") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id_subjects") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id_lessons") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id_users") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id_bookings") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id_users") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id_users") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id_lessons") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_grades" ADD CONSTRAINT "monthly_grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id_users") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_grades" ADD CONSTRAINT "monthly_grades_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id_users") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_grades" ADD CONSTRAINT "monthly_grades_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id_subjects") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_requests" ADD CONSTRAINT "subject_requests_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id_users") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_requests" ADD CONSTRAINT "subject_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id_users") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_requests" ADD CONSTRAINT "subject_requests_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id_subjects") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_reports" ADD CONSTRAINT "financial_reports_generated_by_user_id_fkey" FOREIGN KEY ("generated_by_user_id") REFERENCES "users"("id_users") ON DELETE RESTRICT ON UPDATE CASCADE;
