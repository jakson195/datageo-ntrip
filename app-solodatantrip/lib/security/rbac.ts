import "server-only";

import type { UserRole } from "@prisma/client";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  USER: 0,
  RESELLER: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export type Permission =
  | "billing:read"
  | "billing:write"
  | "rtk:provision"
  | "rtk:suspend"
  | "admin:dashboard"
  | "admin:users"
  | "reseller:manage";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  USER: ["billing:read"],
  RESELLER: ["billing:read", "billing:write", "rtk:provision", "reseller:manage"],
  ADMIN: [
    "billing:read",
    "billing:write",
    "rtk:provision",
    "rtk:suspend",
    "admin:dashboard",
    "admin:users",
  ],
  SUPER_ADMIN: [
    "billing:read",
    "billing:write",
    "rtk:provision",
    "rtk:suspend",
    "admin:dashboard",
    "admin:users",
    "reseller:manage",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasMinRole(role: UserRole, minimum: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum];
}

export function checkIpAllowed(userIps: string[], requestIp: string): boolean {
  if (userIps.length === 0) return true;
  return userIps.includes(requestIp);
}
