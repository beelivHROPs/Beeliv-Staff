/** Rev-2 invitation integration types. Legacy mock types remain frontend-owned. */
import type { Portal } from "./types";
import { asRecord, authFailure, type AuthWireFailure } from "./wire";
export type InvitationKind = "client" | "staff" | "internal";
export type InvitationPreview = { state: "unavailable" } | { state: "valid-new-account" | "valid-existing-account"; kind: InvitationKind; emailMasked: string };
export type InvitationPreviewResult = { ok: true; preview: InvitationPreview } | AuthWireFailure;
export type InvitationAcceptInput = { portal: Portal; token: string; password: string; email?: string; profile?: { fullName: string; phone: string } };
export type InvitationAcceptResult = { ok: true; status: "completed"; kind: InvitationKind; destination: string; accessState?: "pending-setup" | "pending-approval" | "active" } | AuthWireFailure;
function kindForPortal(portal: Portal): InvitationKind { return portal === "client" ? "client" : portal === "admin" ? "internal" : "staff"; }
export function portalDestination(value: unknown, portal: Portal): value is string {
  if (typeof value !== "string" || value.length > 2000 || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value) || /%(?:2f|5c|00|0a|0d)/i.test(value)) return false;
  const url = new URL(value, "https://local.invalid");
  const roots = portal === "client" ? ["/client"] : portal === "admin" ? ["/admin"] : ["/staff", "/applicant"];
  return url.origin === "https://local.invalid" && roots.some(root => url.pathname === root || url.pathname.startsWith(root + "/")) && !/\/(login|invite|forgot-password|reset-password|access-denied|account-suspended)(\/|$)/.test(url.pathname);
}
export function parseInvitationPreview(value: unknown, portal: Portal): InvitationPreviewResult {
  const body = asRecord(value);
  if (body?.ok === false) return authFailure(body);
  if (body?.state === "unavailable") return { ok: true, preview: { state: "unavailable" } };
  if ((body?.state === "valid-new-account" || body?.state === "valid-existing-account") && body.kind === kindForPortal(portal) && typeof body.emailMasked === "string" && /^[^@\s]\*{3}@[^@\s]+$/.test(body.emailMasked) && body.emailMasked.length <= 254) {
    return { ok: true, preview: { state: body.state, kind: kindForPortal(portal), emailMasked: body.emailMasked } };
  }
  return authFailure();
}
export function parseInvitationAcceptance(value: unknown, portal: Portal): InvitationAcceptResult {
  const body = asRecord(value);
  if (body?.ok === false) return authFailure(body, "outcome_unknown");
  if (body?.accessState !== undefined && !["pending-setup","pending-approval","active"].includes(String(body.accessState))) return authFailure(undefined, "outcome_unknown");
  if (body?.ok === true && body.status === "completed" && body.kind === kindForPortal(portal) && portalDestination(body.destination, portal)) return { ok: true, status: "completed", kind: kindForPortal(portal), destination: body.destination, ...(body.accessState === undefined ? {} : { accessState: body.accessState as "pending-setup" | "pending-approval" | "active" }) };
  return authFailure(undefined, "outcome_unknown");
}
