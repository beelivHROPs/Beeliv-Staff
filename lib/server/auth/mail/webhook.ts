import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { record, uuid, type EventType, type MailEvent } from "./model";
const types: Record<string,EventType> = {"email.sent":"sent","email.delivered":"delivered","email.delivery_delayed":"delayed","email.failed":"failed","email.bounced":"bounced","email.complained":"complained","email.suppressed":"suppressed"};
/** Svix signs the unmodified bytes prefixed by message ID and timestamp. */
export function verifyWebhook(body: Buffer, headers: Headers, secret: string, nowSeconds = Math.floor(Date.now()/1000)): string {
  const id = headers.get("svix-id"); const timestamp = headers.get("svix-timestamp"); const signatures = headers.get("svix-signature");
  if (!id || !/^[A-Za-z0-9_-]{1,200}$/.test(id) || !timestamp || !/^\d{1,12}$/.test(timestamp) || !signatures || signatures.length > 4096 || !secret.startsWith("whsec_") || !/^[A-Za-z0-9+/]+={0,2}$/.test(secret.slice(6))) throw new Error("mail_signature_invalid");
  const seconds = Number(timestamp); const key = Buffer.from(secret.slice(6),"base64");
  if (!Number.isSafeInteger(seconds) || Math.abs(nowSeconds-seconds) > 300 || key.length < 16) throw new Error("mail_signature_invalid");
  const expected = createHmac("sha256",key).update(id+"."+timestamp+".").update(body).digest();
  const valid = signatures.split(" ").some(signature => {
    const match = /^v1,([A-Za-z0-9+/]{43}=)$/.exec(signature); if (!match) return false;
    const candidate = Buffer.from(match[1],"base64");
    return candidate.length === expected.length && timingSafeEqual(candidate,expected);
  });
  if (!valid) throw new Error("mail_signature_invalid");
  return id;
}
export function parseMailEvent(body: Buffer, eventId: string): MailEvent | null {
  const event = record(JSON.parse(body.toString("utf8"))); const data = record(event?.data);
  if (!event || typeof event.type !== "string") throw new Error("mail_event_invalid");
  if (!Object.hasOwn(types,event.type)) return null; // signed unrequested events have no auth effect
  if (!data || typeof data.email_id !== "string" || !uuid.test(data.email_id) || typeof event.created_at !== "string" || !/^\d{4}-\d\d-\d\dT/.test(event.created_at) || !Number.isFinite(Date.parse(event.created_at))) throw new Error("mail_event_invalid");
  return {eventId,providerId:data.email_id,type:types[event.type],occurredAt:new Date(event.created_at).toISOString()};
}
