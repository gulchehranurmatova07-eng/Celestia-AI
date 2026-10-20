// Role-based permissions for the admin control center. Enforced on the server;
// the UI uses the same table only to hide controls a role can't use.

export const ROLES = ["owner", "admin", "support", "analyst"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Administrator",
  support: "Support",
  analyst: "Read-only Analyst",
};

export type Permission =
  | "dashboard.view"
  | "requests.view"
  | "errors.manage"
  | "alerts.manage"
  | "health.run"
  | "export.data"
  | "settings.manage"
  | "team.view"
  | "team.manage"
  | "audit.view"
  | "data.purge";

const MATRIX: Record<Role, readonly Permission[]> = {
  owner: [
    "dashboard.view", "requests.view", "errors.manage", "alerts.manage", "health.run", "export.data",
    "settings.manage", "team.view", "team.manage", "audit.view", "data.purge",
  ],
  admin: [
    "dashboard.view", "requests.view", "errors.manage", "alerts.manage", "health.run", "export.data",
    "settings.manage", "team.view", "team.manage", "audit.view",
  ],
  support: ["dashboard.view", "requests.view", "errors.manage", "alerts.manage", "health.run", "team.view"],
  analyst: ["dashboard.view", "requests.view", "export.data"],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

/**
 * Whether `actor` may assign `targetRole` to someone (or modify someone who
 * currently has `currentRole`). Only owners can create or change owners.
 */
export function canAssignRole(actor: Role, targetRole: Role, currentRole?: Role): boolean {
  if (!can(actor, "team.manage")) return false;
  if (actor === "owner") return true;
  return targetRole !== "owner" && currentRole !== "owner";
}
