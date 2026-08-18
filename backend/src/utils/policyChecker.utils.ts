import type { Permission, ShareRole } from "../types";

const ROLE_PERMS: Record<ShareRole, Permission[]> = {
  owner: ["read", "write", "modify", "download"],
  editor: ["read", "write", "modify", "download"],
  collaborator: ["read", "write", "download"],
  viewer: ["read", "download"],
};

export function permissionsFor(role: ShareRole): Permission[] {
  return ROLE_PERMS[role];
}

export function can(role: ShareRole, permission: Permission): boolean {
  return ROLE_PERMS[role].includes(permission);
}
