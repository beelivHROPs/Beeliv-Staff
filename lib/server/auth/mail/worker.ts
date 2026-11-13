import "server-only";
import { createHash } from "node:crypto";
import { openPayload } from "./crypto";
import { renderInvitation, type MailSettings } from "./render";
import { record, type MailGateway, type Message, type SendOutcome } from "./model";
type Sender = (message: Message,id: string) => Promise<SendOutcome>;
export async function deliverOne(gateway: MailGateway, keys: Record<string,string>, settings: MailSettings, send: Sender, now = Date.now()): Promise<"idle"|"sent"|"retry"|"failed"|"unknown"|"cancelled"|"paused"> {
  const job = await gateway.claim(); if (!job) return "idle";
  let message: Message;
  try {
    if (Date.parse(job.expiresAt) <= now || !Number.isFinite(Date.parse(job.expiresAt))) throw new Error();
    const payload = record(openPayload(job.encryptedPayload,job,keys));
    if (!payload || typeof payload.token !== "string" || typeof payload.firstName !== "string" || createHash("sha256").update(payload.token).digest("hex") !== job.tokenHash) throw new Error();
    message = renderInvitation(job.template,{app:job.app,kind:job.kind,recipient:job.recipient,token:payload.token,firstName:payload.firstName},settings);
    const snapshot = record(payload.message);
    if (!snapshot || Object.keys(snapshot).length !== Object.keys(message).length || !Object.entries(message).every(([k,v]) => snapshot[k] === v)) throw new Error(); // immutable body/headers across retries
  } catch {
    await gateway.finish(job,{status:"failed",code:"payload_invalid"});
    return "failed";
  }
  const begin = await gateway.begin(job); // lease/current invitation and agreement rechecked before network
  if (begin !== "ready") return begin;
  let result: SendOutcome;
  try { result = await send(message,job.id); } catch { result = {status:"unknown",code:"provider_uncertain"}; }
  await gateway.finish(job,result); // if persistence fails, lease recovery marks uncertain; never resend here
  return result.status;
}
