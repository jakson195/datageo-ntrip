import { loadProjectEnvFiles } from "../lib/db/database-env";
import {
  syncDatabaseEnvFromVercelPostgres,
  validateDatabaseEnv,
} from "../lib/db/database-env";

loadProjectEnvFiles();

syncDatabaseEnvFromVercelPostgres();
const status = validateDatabaseEnv();

if (!status.configured) {
  console.error(status.friendlyError);
  process.exit(1);
}

for (const warning of status.warnings) {
  console.warn(warning);
}

console.log("DATABASE_URL e DIRECT_URL OK.");
