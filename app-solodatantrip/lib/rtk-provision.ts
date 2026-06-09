/**
 * @deprecated Import from `@/lib/rtk` instead.
 * Mantido para compatibilidade com imports existentes.
 */
export {
  createRTKLicense,
  provisionRtkAccount,
  isRtkProvisionEnabled,
  isRtkApiConfigured,
  getRtkConfig,
} from "./rtk";

export type {
  RtkLicenseRecord as RtkProvisionResult,
  RtkCredentials as RtkProvisionCredentials,
} from "./rtk";
