/**
 * Camada de serviço RTK — delegada ao RTKProviderService.
 * Todas as chamadas externas ocorrem apenas no backend (server-only).
 */
import "server-only";

export {
  createRTKLicense,
  provisionRtkAccount,
  rtkProviderService,
  RTKProviderService,
} from "./providers/rtk-provider-service";

export type { RtkLicenseRecord, RtkCredentials } from "./types";
export { isRtkApiConfigured, isRtkProvisionEnabled, getRtkConfig } from "./config";
