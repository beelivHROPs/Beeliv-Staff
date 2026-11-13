import { asRecord, authFailure, type AuthWireFailure } from "./wire";
import type { Portal } from "./types";
export type SetupState = "pending-setup" | "pending-approval" | "active" | "suspended";
export type SetupAgreement = { id: string; code: string; version: string; title: string; body: string; bodyHash: string; required: boolean; response: boolean | null };
export type SetupSummary = {
  id: string; revision: number; app: "talent" | "client" | "admin";
  kind: "staff" | "client" | "internal"; origin: "legacy" | "recruited" | "account";
  state: SetupState; verifiedEmail: string; fullName: string; phone: string; contentReady: boolean;
  mfaRequired: boolean; mfaVerified: boolean; agreements: SetupAgreement[];
  reacceptRequired?: boolean;
};
export type SetupResult = { ok: true; setup: SetupSummary } | AuthWireFailure;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function parseSetup(value: unknown, portal: Portal): SetupResult {
  const body = asRecord(value); if (body?.ok === false) return authFailure(body);
  const s = asRecord(body?.setup);
  const app = portal === "staff" ? "talent" : portal;
  const kind = app === "admin" ? "internal" : app === "client" ? "client" : "staff";
  if (!s || body?.ok !== true || s.app !== app || s.kind !== kind || typeof s.id !== "string" || !uuid.test(s.id) || !Number.isSafeInteger(s.revision) || Number(s.revision) < 1 || !["pending-setup","pending-approval","active","suspended"].includes(String(s.state)) || !["legacy","recruited","account"].includes(String(s.origin)) || typeof s.verifiedEmail !== "string" || s.verifiedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.verifiedEmail) || typeof s.fullName !== "string" || s.fullName.length > 200 || typeof s.phone !== "string" || s.phone.length > 40 || typeof s.contentReady !== "boolean" || typeof s.mfaRequired !== "boolean" || typeof s.mfaVerified !== "boolean" || s.mfaRequired !== (app === "admin") || !Array.isArray(s.agreements) || s.agreements.length > 30) return authFailure();
  if ((kind === "staff" ? !["legacy","recruited"].includes(String(s.origin)) : s.origin !== "account") || (s.state === "active" && s.mfaRequired && !s.mfaVerified)) return authFailure();
  if (s.reacceptRequired !== undefined && typeof s.reacceptRequired !== "boolean" || s.reacceptRequired === true && s.state !== "pending-setup") return authFailure();
  const agreements: SetupAgreement[] = [];
  for (const raw of s.agreements) {
    const a = asRecord(raw);
    if (!a || typeof a.id !== "string" || !uuid.test(a.id) || !["code","version","title","body","bodyHash"].every(k => typeof a[k] === "string") || String(a.code).length < 1 || String(a.code).length > 80 || String(a.version).length < 1 || String(a.version).length > 80 || String(a.title).length < 1 || String(a.title).length > 200 || String(a.body).length < 1 || String(a.body).length > 32768 || !/^[a-f0-9]{64}$/.test(String(a.bodyHash)) || typeof a.required !== "boolean" || !(a.response === null || typeof a.response === "boolean")) return authFailure();
    agreements.push({ id: a.id, code: String(a.code), version: String(a.version), title: String(a.title), body: String(a.body), bodyHash: String(a.bodyHash), required: a.required, response: a.response });
  }
  if (new Set(agreements.map(a => a.id)).size !== agreements.length) return authFailure();
  return { ok: true, setup: { id: s.id, revision: Number(s.revision), app, kind, origin: s.origin as SetupSummary["origin"], state: s.state as SetupState, verifiedEmail: s.verifiedEmail, fullName: s.fullName, phone: s.phone, contentReady: s.contentReady, mfaRequired: s.mfaRequired, mfaVerified: s.mfaVerified, agreements, reacceptRequired: s.reacceptRequired === true } };
}
