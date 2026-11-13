import { asRecord, authFailure, type AuthWireFailure } from "./wire";
export type MfaFactor = { id: string; type: "totp"; status: "verified" | "unverified"; name: string };
export type MfaStatusResult = { ok: true; factors: MfaFactor[] } | AuthWireFailure;
export type MfaEnrollResult = { ok: true; enrollment: { factorId: string; qrCode: string; secret: string; uri: string } } | AuthWireFailure;
export type MfaVerifiedResult = { ok: true; verified: true } | AuthWireFailure;
export type MfaCancelledResult = { ok: true; cancelled: true } | AuthWireFailure;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function parseMfaStatus(value: unknown): MfaStatusResult {
  const body = asRecord(value); if (body?.ok === false) return authFailure(body);
  if (body?.ok !== true || !Array.isArray(body.factors) || body.factors.length > 30) return authFailure();
  const factors: MfaFactor[] = [];
  for (const raw of body.factors) {
    const f = asRecord(raw);
    if (!f || typeof f.id !== "string" || !uuid.test(f.id) || f.type !== "totp" || (f.status !== "verified" && f.status !== "unverified") || typeof f.name !== "string" || f.name.length > 200) return authFailure();
    factors.push({ id: f.id, type: "totp", status: f.status, name: f.name });
  }
  return { ok: true, factors };
}
export function parseMfaEnrollment(value: unknown): MfaEnrollResult {
  const body = asRecord(value); if (body?.ok === false) return authFailure(body, "outcome_unknown");
  const e = asRecord(body?.enrollment);
  if (body?.ok !== true || !e || typeof e.factorId !== "string" || !uuid.test(e.factorId) || typeof e.qrCode !== "string" || e.qrCode.length > 100000 || !(e.qrCode.startsWith("data:image/") || e.qrCode.startsWith("<svg")) || typeof e.secret !== "string" || !/^[A-Z2-7]{16,128}$/.test(e.secret) || typeof e.uri !== "string" || e.uri.length > 4000 || !e.uri.startsWith("otpauth://totp/")) return authFailure(undefined, "outcome_unknown");
  return { ok: true, enrollment: { factorId: e.factorId, qrCode: e.qrCode, secret: e.secret, uri: e.uri } };
}
export function parseMfaVerification(value: unknown): MfaVerifiedResult {
  const body = asRecord(value); if (body?.ok === false) return authFailure(body, "outcome_unknown");
  return body?.ok === true && body.verified === true ? { ok: true, verified: true } : authFailure(undefined, "outcome_unknown");
}
export function parseMfaCancellation(value: unknown): MfaCancelledResult {
  const body = asRecord(value); if (body?.ok === false) return authFailure(body, "outcome_unknown");
  return body?.ok === true && body.cancelled === true ? { ok: true, cancelled: true } : authFailure(undefined, "outcome_unknown");
}
