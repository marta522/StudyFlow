CREATE TABLE "notifications" (
    "id_notifications" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "read_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id_users") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "notifications_user_id_read_at_created_at_idx"
    ON "notifications"("user_id", "read_at", "created_at");
