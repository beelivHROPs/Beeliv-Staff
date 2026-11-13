export type AuthApp = "talent" | "client" | "admin";
export type AuthPortal = AuthApp | "staff";
export function appForPortal(value: unknown): AuthApp | null {
  return value === "staff" ? "talent" : value === "talent" || value === "client" || value === "admin" ? value : null;
}
export type ScopeGrant = { clientId: string; outletId: string | null };
export type AccessContext = { personId: string; app: AuthApp; status: string; role: string; entitlements: string[]; permissions: Record<string, boolean>; clientIds: string[]; outletIds: string[]; scopes?: ScopeGrant[]; allClients?: boolean };
export function readAccess(value: unknown, app: AuthApp): AccessContext | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.app !== app || typeof v.personId !== "string" || typeof v.status !== "string" || typeof v.role !== "string") return null;
  if (!Array.isArray(v.entitlements) || !v.entitlements.every(x => typeof x === "string") || !Array.isArray(v.clientIds) || !v.clientIds.every(x => typeof x === "string") || !Array.isArray(v.outletIds) || !v.outletIds.every(x => typeof x === "string")) return null;
  if (!v.permissions || typeof v.permissions !== "object" || Array.isArray(v.permissions) || !Object.values(v.permissions).every(x => typeof x === "boolean")) return null;
  if (v.allClients !== undefined && typeof v.allClients !== "boolean") return null;
  if (v.allClients === true && app !== "admin") return null;
  if (v.scopes !== undefined && (!Array.isArray(v.scopes) || !v.scopes.every(x => x && typeof x === "object" && typeof x.clientId === "string" && x.clientId.length > 0 && (x.outletId === null || typeof x.outletId === "string" && x.outletId.length > 0)))) return null;
  if (app === "talent" && !(v.entitlements as string[]).every(x => x === "applicant" || x === "staff")) return null;
  return { personId: v.personId, app, status: v.status, role: v.role, entitlements: [...v.entitlements] as string[], permissions: { ...v.permissions } as Record<string,boolean>, clientIds: [...v.clientIds] as string[], outletIds: [...v.outletIds] as string[], scopes: Array.isArray(v.scopes) ? v.scopes.map(x => ({ clientId: x.clientId, outletId: x.outletId })) : [], allClients: v.allClients === true };
}
export function hasAccess(access: AccessContext | null): boolean {
  if (!access || access.status !== "active") return false;
  if (access.app === "talent") return access.role === "talent" && access.entitlements.some(x => x === "applicant" || x === "staff");
  if (access.app === "client") return access.role === "client";
  return ["hr_officer", "hr_manager", "head_of_operations"].includes(access.role);
}
export function destinationFor(access: AccessContext, next?: unknown): string {
  const fallback = access.app === "client" ? "/client" : access.app === "admin" ? access.role === "head_of_operations" ? "/admin/ops" : "/admin" : access.entitlements.includes("applicant") ? "/applicant" : "/staff";
  if (!hasAccess(access) || typeof next !== "string" || next.length > 2000 || !next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u0020]/.test(next)) return fallback;
  if (/%(?:2f|5c|00|0a|0d)/i.test(next)) return fallback;
  let parsed: URL;
  try { parsed = new URL(next, "https://local.invalid"); } catch { return fallback; }
  if (parsed.origin !== "https://local.invalid") return fallback;
  const path = parsed.pathname;
  const within = (prefix: string) => path === prefix || path.startsWith(prefix + "/");
  const allowed = access.app === "client" ? within("/client") : access.app === "admin" ? within("/admin") : access.entitlements.includes("applicant") && within("/applicant") || access.entitlements.includes("staff") && within("/staff");
  if (!allowed || /\/(login|invite|forgot-password|reset-password|access-denied|account-suspended)(\/|$)/.test(path)) return fallback;
  return parsed.pathname + parsed.search + parsed.hash;
}
export function validInviteToken(value: unknown): value is string { return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value); }
export function maskEmail(value: string): string {
  const parts = value.split("@"); return parts.length === 2 ? `${parts[0].slice(0,1)}***@${parts[1]}` : "";
}


export function canVisit(access: AccessContext | null, path: string): boolean {
  if (!hasAccess(access) || !access) return false;
  const within = (prefix: string) => path === prefix || path.startsWith(prefix + "/");
  if (access.app === "talent") return within("/applicant") ? access.entitlements.includes("applicant") : within("/staff") && access.entitlements.includes("staff");
  if (access.app === "client") return within("/client");
  return within("/admin") && (!within("/admin/ops") || access.role === "head_of_operations");
}

/** Use on authoritative context and DB record scope, never browser-supplied grant JSON. */
export function hasScope(access: AccessContext | null, target: ScopeGrant): boolean {
  if (!hasAccess(access) || !access || access.app === "talent" || !target.clientId || (target.outletId !== null && !target.outletId)) return false;
  if (access.app === "admin" && ["hr_manager", "head_of_operations"].includes(access.role) && access.allClients === true && access.permissions.all_clients === true) return true;
  return (access.scopes ?? []).some(grant => grant.clientId === target.clientId && (grant.outletId === null || grant.outletId === target.outletId));
}
export function canPerform(access: AccessContext | null, permission: string, target: ScopeGrant): boolean {
  return !!access && Object.hasOwn(access.permissions, permission) && access.permissions[permission] === true && hasScope(access, target);
}

export function canGrantInvitation(access: AccessContext | null, target: { kind: "staff" | "client" | "internal"; role: string; scopes: ScopeGrant[]; allClients: boolean }): boolean {
  if (!hasAccess(access) || !access || access.app !== "admin") return false;
  const kindValid = target.kind === "staff" ? target.role === "talent" : target.kind === "client" ? target.role === "client" : ["hr_officer", "hr_manager", "head_of_operations"].includes(target.role);
  const grant = target.kind === "staff" ? "staff" : target.role;
  if (!kindValid || target.role === "head_of_operations" || access.permissions[`invite_${target.kind}`] !== true || access.permissions[`grant_${grant}`] !== true) return false;
  if (target.allClients && (target.kind !== "internal" || target.role !== "hr_manager" || access.allClients !== true || access.permissions.all_clients !== true || !["hr_manager", "head_of_operations"].includes(access.role))) return false;
  if (target.kind !== "internal" && target.scopes.length === 0) return false;
  return target.scopes.every(scope => hasScope(access, scope));
}
