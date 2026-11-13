import "server-only";
import { validateSettings, type MailSettings } from "./render";
import type { AuthApp } from "../policy";
export function mailGate() {
  if (["AUTH_BACKEND_ENABLED","AUTH_SCHEMA_READY","AUTH_MAIL_ENABLED","AUTH_MAIL_SCHEMA_READY"].some(name => process.env[name] !== "true")) throw new Error("mail_unconfigured");
}
function required(name: string) { const value=process.env[name]; if (!value) throw new Error("mail_unconfigured"); return value; }
export function webhookConfig() {
  mailGate(); const secret=required("RESEND_WEBHOOK_SECRET");
  if (!/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret) || Buffer.from(secret.slice(6),"base64").length<16) throw new Error("mail_unconfigured");
  return secret;
}
export function workerConfig() {
  mailGate();
  const apiKey=required("RESEND_API_KEY"); const workerSecret=required("AUTH_MAIL_WORKER_SECRET");
  if (!/^re_[A-Za-z0-9_-]{16,200}$/.test(apiKey) || !/^[A-Za-z0-9_-]{43,128}$/.test(workerSecret)) throw new Error("mail_unconfigured");
  const origins=Object.fromEntries((["talent","client","admin"] as AuthApp[]).map(app=>[app,required("AUTH_ORIGIN_"+app.toUpperCase())])) as Record<AuthApp,string>;
  const settings: MailSettings={senderName:required("AUTH_MAIL_SENDER_NAME"),senderAddress:required("AUTH_MAIL_SENDER_ADDRESS"),replyTo:required("AUTH_MAIL_REPLY_TO"),supportEmail:required("AUTH_MAIL_SUPPORT_EMAIL"),logoWhiteUrl:required("AUTH_MAIL_LOGO_WHITE_URL"),origins};
  validateSettings(settings);
  const raw: unknown=JSON.parse(required("AUTH_MAIL_ENCRYPTION_KEYS"));
  if (!raw || typeof raw!=="object" || Array.isArray(raw) || Object.entries(raw).length===0 || Object.entries(raw).some(([name,key])=> !/^[A-Za-z0-9_-]{1,40}$/.test(name) || typeof key!=="string" || !/^[A-Za-z0-9+/]{43}=$/.test(key) || Buffer.from(key,"base64").length!==32 || Buffer.from(key,"base64").toString("base64")!==key)) throw new Error("mail_unconfigured");
  return {apiKey,workerSecret,settings,keys:raw as Record<string,string>};
}
