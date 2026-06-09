import "server-only";

export {
  createRTKLicense,
  provisionRtkAccount,
  rtkProviderService,
  RTKProviderService,
  isRtkApiConfigured,
  isRtkProvisionEnabled,
  getRtkConfig,
} from "./rtk-license-service";

export type {
  CreateRtkLicenseResult,
  RtkApiMode,
  RtkCredentials,
  RtkErrorCode,
  RtkLicenseRecord,
  RtkLicenseStatus,
  RtkPublicCredentials,
} from "./types";

export type { RtkConfig, RtkEnvironment } from "./config";
export { maskRtkPassword } from "./crypto";
export { resolveLicenseStatus, STATUS_LABELS, STATUS_BADGE_CLASSES } from "./license-status";
