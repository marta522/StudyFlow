ALTER TABLE "users"
ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "financial_reports"
ADD COLUMN "details" JSONB NOT NULL DEFAULT '[]';
