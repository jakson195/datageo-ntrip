import "server-only";

export {
  applyRuntimeDatabaseUrl,
  getDatabaseConfigStatus,
  getDatabaseUrl,
  isDatabaseConfigured,
  syncDatabaseEnvFromVercelPostgres,
  validateDatabaseEnv,
} from "./database-env";
export type { DatabaseConfigStatus } from "./database-env";
