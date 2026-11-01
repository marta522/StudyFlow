import { existsSync } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import {
  backupsDirectory,
  createSqliteBackup,
  loadDatabaseEnvironment,
  uniquePath,
  validateDatabase,
} from "./sqlite-database.mjs";

try {
  const argumentsList = process.argv.slice(2);
  const sourceArgument = argumentsList[0];
  const sourcePath = resolve(process.cwd(), sourceArgument ?? "");
  const databasePath = loadDatabaseEnvironment();
  if (
    argumentsList.length !== 2 ||
    argumentsList[1] !== "--confirm" ||
    !sourceArgument ||
    sourceArgument.startsWith("--")
  ) {
    throw new Error(
      "Użycie: npm run db:restore -- <plik-kopii.sqlite> --confirm",
    );
  }
  if (sourcePath === databasePath) {
    throw new Error("Plik kopii nie może być aktywną bazą danych.");
  }

  validateDatabase(sourcePath);
  await mkdir(backupsDirectory, { recursive: true });
  const safetyBackup = uniquePath(backupsDirectory, "pre-restore");
  await createSqliteBackup(databasePath, safetyBackup);

  const replacementPath = uniquePath(dirname(databasePath), "restore");
  await createSqliteBackup(sourcePath, replacementPath);
  const displacedPath = resolve(
    dirname(databasePath),
    `.${basename(databasePath)}-${Date.now()}.previous`,
  );
  const movedSidecars = [];
  let movedCurrentDatabase = false;
  let installedReplacement = false;
  try {
    for (const suffix of ["-wal", "-shm"]) {
      const sidecar = `${databasePath}${suffix}`;
      if (existsSync(sidecar)) {
        const preservedSidecar = `${safetyBackup}${suffix}`;
        await rename(sidecar, preservedSidecar);
        movedSidecars.push([sidecar, preservedSidecar]);
      }
    }
    await rename(databasePath, displacedPath);
    movedCurrentDatabase = true;
    await rename(replacementPath, databasePath);
    installedReplacement = true;
    validateDatabase(databasePath);
    await rm(displacedPath);
    movedCurrentDatabase = false;
  } catch (error) {
    if (installedReplacement && existsSync(databasePath)) {
      await rm(databasePath);
    }
    if (movedCurrentDatabase && existsSync(displacedPath)) {
      await rename(displacedPath, databasePath);
      movedCurrentDatabase = false;
    }
    for (const [sidecar, preservedSidecar] of movedSidecars.reverse()) {
      if (existsSync(preservedSidecar)) {
        await rename(preservedSidecar, sidecar);
      }
    }
    throw error;
  } finally {
    await rm(replacementPath, { force: true });
  }

  console.log(`Baza została odtworzona z: ${sourcePath}`);
  console.log(`Kopia bezpieczeństwa poprzedniej bazy: ${safetyBackup}`);
  console.log("Uruchom npx prisma migrate deploy, jeśli kopia jest starsza.");
} catch (error) {
  console.error(
    `Nie udało się odtworzyć bazy: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
}
