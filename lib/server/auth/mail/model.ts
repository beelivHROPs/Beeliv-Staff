import "server-only";
import type { AuthApp } from "../policy";
export const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const email = /^[^\s@<>,"\\]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
export type MailIdentity = { id: string; invitationId: string; tokenRevision: number; templateId: string; keyVersion: string };
export type Message = { from: string; to: string; reply_to: string; subject: string; html: string; text: string };
export type Payload = { token: string; firstName: string; message: Message };
export type Template = { id: string; kind: "client" | "staff" | "internal" | "resend"; revision: string; subject: string; html: string; text: string };
export type Job = MailIdentity & { leaseId: string; app: AuthApp; kind: "client" | "staff" | "internal"; recipient: string; tokenHash: string; expiresAt: string; attemptCount: number; encryptedPayload: string; template: Template };
export type SendOutcome = { status: "sent"; providerId: string } | { status: "retry"; delaySeconds: number } | { status: "failed"; code: "provider_rejected" | "payload_invalid" } | { status: "unknown"; code: "provider_uncertain" };
export type EventType = "sent" | "delivered" | "delayed" | "failed" | "bounced" | "complained" | "suppressed";
export type MailEvent = { eventId: string; providerId: string; type: EventType; occurredAt: string; source?: "webhook"|"poll" };
export type MailBeginResult = "ready" | "paused" | "cancelled";
export interface MailGateway {
  claim(): Promise<Job | null>;
  begin(job: Job): Promise<MailBeginResult>;
  finish(job: Job, result: SendOutcome): Promise<void>;
  recordEvent(event: MailEvent): Promise<void>;
}
export function record(value: unknown): Record<string, unknown> | null { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string,unknown> : null; }
export function isEmail(value: unknown): value is string { return typeof value === "string" && value.length <= 254 && email.test(value) && !/[\r\n\u0000-\u0020]/.test(value); }
export function validIdentity(i: MailIdentity) { return [i.id,i.invitationId,i.templateId].every(v => typeof v === "string" && uuid.test(v)) && Number.isSafeInteger(i.tokenRevision) && i.tokenRevision >= 1 && /^[a-zA-Z0-9_-]{1,40}$/.test(i.keyVersion); }
