import { asRecord, authFailure, type AuthWireFailure } from "./wire";
export type InvitationScope = { clientId: string; outletId: string | null };
export type InvitationDraftInput = { kind: "client"|"staff"|"internal"; email: string; role: "client"|"talent"|"hr_officer"|"hr_manager"; personId: string|null; scopes: InvitationScope[]; allClients: boolean; jobTitle?: string };
export type InvitationActions = {edit:boolean;review:boolean;send:boolean;resend:boolean;revoke:boolean;replace:boolean;status:boolean;copyLink:boolean};
export type ManagedInvitation = { id: string; revision: number; kind: InvitationDraftInput["kind"]; email: string; role: InvitationDraftInput["role"]; status: "draft"|"pending"|"accepted"|"expired"|"revoked"; deliveryStatus: "not_sent"|"queued"|"sent"|"delivered"|"delayed"|"failed"|"bounced"|"complained"|"unknown"|"suppressed"|"copied"; expiresAt: string; reviewed: boolean; jobTitle: string; scopes: InvitationScope[]; allClients: boolean; actions:InvitationActions; retryAt:string|null; deliveryPaused?:boolean };
export type ManagementResult = { ok:true; invitation:ManagedInvitation; replayed:boolean; checkedWithProvider?:boolean; reconciliationRequired?:boolean } | AuthWireFailure;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function parseManagedInvitation(value:unknown): ManagementResult {
 const v=asRecord(value);if(v?.ok===false)return authFailure(v);
 const i=asRecord(v?.invitation);
 if(v?.ok!==true || !i || typeof i.id!=="string" || !uuid.test(i.id) || !Number.isSafeInteger(i.revision) || Number(i.revision)<1 || !["client","staff","internal"].includes(String(i.kind)) || typeof i.email!=="string" || i.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email) || !["client","talent","hr_officer","hr_manager"].includes(String(i.role)) || !["draft","pending","accepted","expired","revoked"].includes(String(i.status)) || !["not_sent","queued","sent","delivered","delayed","failed","bounced","complained","unknown","suppressed","copied"].includes(String(i.deliveryStatus)) || typeof i.expiresAt!=="string" || !Number.isFinite(Date.parse(i.expiresAt)) || typeof i.reviewed!=="boolean" || typeof i.jobTitle!=="string" || i.jobTitle.length>60 || typeof i.allClients!=="boolean" || !Array.isArray(i.scopes) || i.scopes.length>100) return authFailure();
 if(i.kind==="client"?i.role!=="client"||i.allClients:i.kind==="staff"?i.role!=="talent"||i.allClients:!["hr_officer","hr_manager"].includes(String(i.role))||i.allClients&&i.role!=="hr_manager")return authFailure();
 const actions:InvitationActions={edit:false,review:false,send:false,resend:false,revoke:false,replace:false,status:true,copyLink:false};
 if(i.actions!==undefined){const a=asRecord(i.actions);
  // copyLink is optional so servers that predate copy-link delivery still parse; missing means not allowed.
  if(!a||!Object.keys(actions).every(k=>k==="copyLink"?(a[k]===undefined||typeof a[k]==="boolean"):typeof a[k]==="boolean"))return authFailure();for(const k of Object.keys(actions) as (keyof InvitationActions)[])actions[k]=Boolean(a[k]);}
 if(i.retryAt!==undefined&&i.retryAt!==null&&(typeof i.retryAt!=="string"||!Number.isFinite(Date.parse(i.retryAt))))return authFailure();
 if(i.deliveryPaused!==undefined&&typeof i.deliveryPaused!=="boolean")return authFailure();
 const scopes:InvitationScope[]=[];
 for(const raw of i.scopes){const s=asRecord(raw);if(!s || typeof s.clientId!=="string" || !uuid.test(s.clientId) || !(s.outletId===null || typeof s.outletId==="string"&&uuid.test(s.outletId)))return authFailure();scopes.push({clientId:s.clientId,outletId:s.outletId as string|null});}
 if(new Set(scopes.map(s=>s.clientId+":"+s.outletId)).size!==scopes.length)return authFailure();
 return {ok:true,invitation:{id:i.id,revision:Number(i.revision),kind:i.kind as ManagedInvitation["kind"],email:i.email,role:i.role as ManagedInvitation["role"],status:i.status as ManagedInvitation["status"],deliveryStatus:i.deliveryStatus as ManagedInvitation["deliveryStatus"],expiresAt:i.expiresAt,reviewed:i.reviewed,jobTitle:i.jobTitle,scopes,allClients:i.allClients,actions,retryAt:typeof i.retryAt==="string"?i.retryAt:null,deliveryPaused:i.deliveryPaused===true},replayed:v.replayed===true,...(typeof v.checkedWithProvider==="boolean"?{checkedWithProvider:v.checkedWithProvider}:{}),...(typeof v.reconciliationRequired==="boolean"?{reconciliationRequired:v.reconciliationRequired}:{})};
}

/**
 * Copy-link delivery. The raw link exists ONLY in the one response that created it
 * (`accessLink`); every list/get/status response and every replay has `accessLink: null`.
 * Never log, cache, store, put in analytics or in any URL other than the invite link itself.
 */
export type AccessLink = { url: string; expiresAt: string };
export type AccessLinkResult = { ok: true; invitation: ManagedInvitation; replayed: boolean; accessLink: AccessLink | null } | AuthWireFailure;
const linkShape = /^https?:\/\/[^\s/?#@]+(?:\/(?:client|admin)\/invite|\/invite)\/[A-Za-z0-9_-]{43}$/;
export function parseAccessLinkResult(value: unknown): AccessLinkResult {
 const base = parseManagedInvitation(value);
 if (!base.ok) return base;
 const link = asRecord(asRecord(value)?.accessLink);
 if (!link) return { ok: true, invitation: base.invitation, replayed: base.replayed, accessLink: null };
 if (base.replayed || typeof link.url !== "string" || !linkShape.test(link.url) || typeof link.expiresAt !== "string" || !Number.isFinite(Date.parse(link.expiresAt)) || link.expiresAt !== base.invitation.expiresAt) return authFailure();
 return { ok: true, invitation: base.invitation, replayed: false, accessLink: { url: link.url, expiresAt: link.expiresAt } };
}

/**
 * Admin "Team and Access" list (invite-list). Read-only. The item shape is closed: any key that is not listed below is
 * refused, and so is any key that looks like a token, hash, link, secret or cipher text, at any depth. A server answer that
 * carries such a field is treated as a failure, never shown.
 */
export const INVITATION_LIST_STATUSES = ["draft", "pending", "accepted", "expired", "revoked"] as const;
export type InvitationListStatus = typeof INVITATION_LIST_STATUSES[number];
export type InvitationListInput = { limit: number; status: InvitationListStatus | null; after: InvitationListCursor | null };
export type InvitationListCursor = { createdAt: string; id: string };
export type InvitationListItem = {
 id: string; displayName: string; reference: string | null; kind: ManagedInvitation["kind"]; role: ManagedInvitation["role"] | "head_of_operations";
 scopeSummary: string; status: InvitationListStatus; deliveryStatus: ManagedInvitation["deliveryStatus"]; revision: number;
 inviter: string; invitedAt: string; expiresAt: string; resendCount: number;
};
export type InvitationListResult = { ok: true; items: InvitationListItem[]; next: InvitationListCursor | null } | AuthWireFailure;
const LIST_KEYS = ["id", "displayName", "reference", "kind", "role", "scopeSummary", "status", "deliveryStatus", "revision", "inviter", "invitedAt", "expiresAt", "resendCount"];
const FORBIDDEN_KEY = /token|hash|secret|link|url|proof|cipher|payload|password|key/i;
const DELIVERY = ["not_sent", "queued", "sent", "delivered", "delayed", "failed", "bounced", "complained", "unknown", "suppressed", "copied"];
/** Postgres timestamptz as JSON: kept verbatim (microseconds matter for the keyset cursor). */
export const LIST_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}(:?\d{2})?)$/;
const timestamp = (v: unknown): v is string => typeof v === "string" && LIST_TIMESTAMP.test(v) && Number.isFinite(Date.parse(v));
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max && !/[\u0000-\u001f]/.test(v);
function hasForbiddenKey(value: unknown, depth = 0): boolean {
 if (depth > 4 || value === null || typeof value !== "object") return false;
 if (Array.isArray(value)) return value.some(v => hasForbiddenKey(v, depth + 1));
 return Object.entries(value as Record<string, unknown>).some(([k, v]) => FORBIDDEN_KEY.test(k) || hasForbiddenKey(v, depth + 1));
}
export function parseInvitationList(value: unknown): InvitationListResult {
 const v = asRecord(value); if (v?.ok === false) return authFailure(v);
 if (v?.ok !== true || !Array.isArray(v.items) || v.items.length > 100 || hasForbiddenKey(v)) return authFailure();
 if (Object.keys(v).some(k => !["ok", "items", "next"].includes(k))) return authFailure();
 const items: InvitationListItem[] = [];
 for (const raw of v.items) {
  const i = asRecord(raw);
  if (!i || Object.keys(i).some(k => !LIST_KEYS.includes(k)) || LIST_KEYS.some(k => !Object.hasOwn(i, k))) return authFailure();
  if (typeof i.id !== "string" || !uuid.test(i.id) || !text(i.displayName, 254) || !(i.reference === null || text(i.reference, 64)) || !["client", "staff", "internal"].includes(String(i.kind))
   || !["client", "talent", "hr_officer", "hr_manager", "head_of_operations"].includes(String(i.role)) || !text(i.scopeSummary, 600)
   || !(INVITATION_LIST_STATUSES as readonly string[]).includes(String(i.status)) || !DELIVERY.includes(String(i.deliveryStatus))
   || !Number.isSafeInteger(i.revision) || Number(i.revision) < 1 || !text(i.inviter, 254) || !timestamp(i.invitedAt) || !timestamp(i.expiresAt)
   || !Number.isSafeInteger(i.resendCount) || Number(i.resendCount) < 0 || Number(i.resendCount) > 100000) return authFailure();
  if (i.kind === "client" ? i.role !== "client" : i.kind === "staff" ? i.role !== "talent" : !["hr_officer", "hr_manager", "head_of_operations"].includes(String(i.role))) return authFailure();
  items.push({ id: i.id, displayName: i.displayName, reference: i.reference as string | null, kind: i.kind as InvitationListItem["kind"], role: i.role as InvitationListItem["role"], scopeSummary: i.scopeSummary, status: i.status as InvitationListStatus, deliveryStatus: i.deliveryStatus as InvitationListItem["deliveryStatus"], revision: Number(i.revision), inviter: i.inviter, invitedAt: i.invitedAt, expiresAt: i.expiresAt, resendCount: Number(i.resendCount) });
 }
 if (new Set(items.map(i => i.id)).size !== items.length) return authFailure();
 let next: InvitationListCursor | null = null;
 if (v.next !== null && v.next !== undefined) {
  const n = asRecord(v.next);
  if (!n || Object.keys(n).some(k => !["createdAt", "id"].includes(k)) || !timestamp(n.createdAt) || typeof n.id !== "string" || !uuid.test(n.id)) return authFailure();
  next = { createdAt: n.createdAt, id: n.id };
 }
 return { ok: true, items, next };
}
