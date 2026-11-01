CREATE TABLE "admin_audit_logs" (
    "id_admin_audit_logs" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actor_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER,
    "details" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users" ("id_users") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "admin_audit_logs_created_at_action_entity_type_idx"
    ON "admin_audit_logs"("created_at", "action", "entity_type");
