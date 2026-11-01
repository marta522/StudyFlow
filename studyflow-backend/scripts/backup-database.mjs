import { resolve } from "node:path";
import {
  backupsDirectory,
  createSqliteBackup,
  loadDatabaseEnvironment,
  uniquePath,
} from "./sqlite-database.mjs";

try {
  const databasePath = loadDatabaseEnvironment();
  const requestedPath = process.argv[2];
  const destinationPath = requestedPath
    ? resolve(process.cwd(), requestedPath)
    : uniquePath(backupsDirectory, "studyflow");
  await createSqliteBackup(databasePath, destinationPath);
  console.log(`Kopia bazy została utworzona: ${destinationPath}`);
} catch (error) {
  console.error(
    `Nie udało się utworzyć kopii bazy: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
}
