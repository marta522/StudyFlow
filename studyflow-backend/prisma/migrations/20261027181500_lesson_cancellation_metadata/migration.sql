ALTER TABLE "lessons" ADD COLUMN "cancelled_by" INTEGER
    REFERENCES "users"("id_users") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "lessons" ADD COLUMN "cancelled_at" DATETIME;
