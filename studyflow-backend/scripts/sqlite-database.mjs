import { DatabaseSync, backup } from "node:sqlite";
import {
  access,
  mkdir,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

export const backendRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const backupsDirectory = resolve(backendRoot, "prisma", "backups");

export function loadDatabaseEnvironment() {
  const envFile = resolve(backendRoot, ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL musi wskazywać plik SQLite (file:...).",
    );
  }

  const encodedPath = databaseUrl.slice("file:".length).split("?")[0];
  if (!encodedPath || encodedPath === ":memory:") {
    throw new Error("Operacje backupu wymagają plikowej bazy SQLite.");
  }
  let databasePath = decodeURIComponent(encodedPath);
  if (process.platform === "win32" && /^\/[A-Za-z]:[\\/]/.test(databasePath)) {
    databasePath = databasePath.slice(1);
  }
  if (databasePath.startsWith("./") || databasePath.startsWith("../")) {
    databasePath = resolve(backendRoot, "prisma", databasePath);
  } else if (!isAbsolute(databasePath)) {
    databasePath = resolve(backendRoot, "prisma", databasePath);
  } else {
    databasePath = resolve(databasePath);
  }
  return databasePath;
}

export function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function uniquePath(directory, prefix, extension = ".sqlite") {
  return resolve(directory, `${prefix}-${timestamp()}-${randomUUID()}${extension}`);
}

export async function assertAbsent(path) {
  try {
    await access(path);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error(`Plik docelowy już istnieje: ${path}`);
}

export async function assertFile(path, label) {
  const info = await stat(path);
  if (!info.isFile() || info.size === 0) {
    throw new Error(`${label} nie jest niepustym plikiem.`);
  }
}

export function validateDatabase(path, { requireStudyFlowTables = true } = {}) {
  const database = new DatabaseSync(path, { readOnly: true });
  try {
    const integrity = database.prepare("PRAGMA integrity_check").all();
    if (
      integrity.length !== 1 ||
      integrity[0].integrity_check !== "ok"
    ) {
      throw new Error(`Nieprawidłowa integralność bazy: ${path}`);
    }

    if (requireStudyFlowTables) {
      const tables = new Set(
        database
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
          .all()
          .map((row) => row.name),
      );
      for (const table of ["users", "roles", "_prisma_migrations"]) {
        if (!tables.has(table)) {
          throw new Error(`Baza nie zawiera wymaganej tabeli ${table}.`);
        }
      }
    }
  } finally {
    database.close();
  }
}

export async function createSqliteBackup(sourcePath, destinationPath) {
  await assertFile(sourcePath, "Baza źródłowa");
  await assertAbsent(destinationPath);
  await mkdir(dirname(destinationPath), { recursive: true });
  const temporaryPath = resolve(
    dirname(destinationPath),
    `.${basename(destinationPath)}-${randomUUID()}.tmp`,
  );
  const source = new DatabaseSync(sourcePath, { readOnly: true });
  try {
    await backup(source, temporaryPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  } finally {
    source.close();
  }
  try {
    validateDatabase(temporaryPath);
    await assertAbsent(destinationPath);
    await rename(temporaryPath, destinationPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
