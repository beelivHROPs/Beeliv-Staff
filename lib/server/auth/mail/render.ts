import "server-only";
import { isEmail, uuid, type Message, type Template } from "./model";
import type { AuthApp } from "../policy";
export type MailSettings = { senderName: string; senderAddress: string; replyTo: string; supportEmail: string; logoWhiteUrl: string; origins: Record<AuthApp,string> };
function httpsOrigin(value: string) {
  const u = new URL(value); if (u.protocol !== "https:" || u.origin !== value || u.username || u.password) throw new Error("mail_configuration_invalid");
  return u.origin;
}
function escape(value: string) { return value.replace(/[&<>"']/g,c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!)); }
export function validateSettings(settings: MailSettings) {
  if (!settings.senderName || settings.senderName.length > 80 || /[\u0000-\u001f<>"]/.test(settings.senderName) || ![settings.senderAddress,settings.replyTo,settings.supportEmail].every(isEmail)) throw new Error("mail_configuration_invalid");
  for (const app of ["talent","client","admin"] as const) httpsOrigin(settings.origins[app]);
  const logo = new URL(settings.logoWhiteUrl);
  if (logo.protocol !== "https:" || logo.username || logo.password) throw new Error("mail_configuration_invalid");
}
export function invitationUrl(app: AuthApp, token: string, settings: MailSettings) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("mail_payload_invalid");
  const path = app === "talent" ? "/invite/" : "/" + app + "/invite/";
  return httpsOrigin(settings.origins[app]) + path + token;
}
/** Template is from the server-owned immutable approved registry, never a browser payload. */
export function renderInvitation(template: Template, input: {app: AuthApp; kind: "client"|"staff"|"internal"; recipient: string; token: string; firstName: string}, settings: MailSettings): Message {
  validateSettings(settings);
  if (!uuid.test(template.id) || !template.revision || template.revision.length > 80 || (template.kind !== input.kind && template.kind !== "resend") || !isEmail(input.recipient) || input.firstName.length > 100 || /[\r\n\u0000-\u001f]/.test(input.firstName) || /[\r\n\u0000-\u001f]/.test(template.subject) || !template.subject || template.subject.length > 200 || !template.html || !template.text || template.html.length > 250000 || template.text.length > 100000) throw new Error("mail_payload_invalid");
  if ((input.kind === "staff" ? "talent" : input.kind === "internal" ? "admin" : "client") !== input.app) throw new Error("mail_payload_invalid");
  const values: Record<string,string> = {firstName:input.firstName || "there",buttonUrl:invitationUrl(input.app,input.token,settings),expiryDays:"7",linkLifetime:"7 days",supportEmail:settings.supportEmail,senderName:settings.senderName,senderAddress:settings.senderAddress,replyTo:settings.replyTo,logoWhiteUrl:settings.logoWhiteUrl};
  const fill = (source: string, html: boolean) => {
    const result = source.replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/g,(_,name: string) => {
      if (!Object.hasOwn(values,name)) throw new Error("mail_template_invalid");
      return html ? escape(values[name]) : values[name];
    });
    if (result.includes("{{") || result.includes("}}")) throw new Error("mail_template_invalid");
    return result;
  };
  // Strip Claude's draft text-file metadata; it is not sent to recipients.
  const marker = template.text.indexOf("[body]");
  const text = marker >= 0 ? template.text.slice(marker+6).trimStart() : template.text;
  return {from:settings.senderName+" <"+settings.senderAddress+">",to:input.recipient,reply_to:settings.replyTo,subject:fill(template.subject,false),html:fill(template.html.replace(/<!--(?!\[if\b)[\s\S]*?-->/gi,""),true),text:fill(text,false)};
}
