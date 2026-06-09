export { prisma } from "@/lib/db/prisma";
export * from "@/lib/db/dtos";
export {
  userRepository,
  UserRepository,
} from "@/lib/db/repositories/user.repository";
export type { UserDto as StoredUser } from "@/lib/db/dtos";
export {
  rtkLicenseRepository,
  RTKLicenseRepository,
} from "@/lib/db/repositories/rtk-license.repository";
export {
  auditRepository,
  AuditRepository,
} from "@/lib/db/repositories/audit.repository";
export {
  trialRegistryRepository,
  TrialRegistryRepository,
} from "@/lib/db/repositories/trial-registry.repository";
