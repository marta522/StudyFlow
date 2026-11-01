CREATE TABLE "password_reset_tokens" (
    "id_password_reset_tokens" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "used_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id_users") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key"
ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_expires_at_idx"
ON "password_reset_tokens"("user_id", "expires_at");

CREATE TABLE "lesson_issues" (
    "id_lesson_issues" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "lesson_id" INTEGER NOT NULL,
    "reporter_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "admin_note" TEXT,
    "resolved_by" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "lesson_issues_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons" ("id_lessons") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lesson_issues_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users" ("id_users") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "lesson_issues_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users" ("id_users") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "lesson_issues_status_created_at_idx"
ON "lesson_issues"("status", "created_at");
CREATE INDEX "lesson_issues_reporter_id_lesson_id_idx"
ON "lesson_issues"("reporter_id", "lesson_id");
