import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { record, validIdentity, type MailIdentity, type Payload } from "./model";
function key(value: string): Buffer {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error("mail_key_invalid");
  const bytes = Buffer.from(value,"base64");
  if (bytes.length !== 32 || bytes.toString("base64") !== value) throw new Error("mail_key_invalid");
  return bytes;
}
function aad(i: MailIdentity) {
  if (!validIdentity(i)) throw new Error("mail_identity_invalid");
  return Buffer.from(JSON.stringify([1,i.id,i.invitationId,i.tokenRevision,i.templateId,i.keyVersion]),"utf8");
}
export function sealPayload(payload: Payload, identity: MailIdentity, secret: string): string {
  const plain = Buffer.from(JSON.stringify(payload),"utf8");
  if (plain.length > 512000) throw new Error("mail_payload_invalid");
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm",key(secret),iv);
  cipher.setAAD(aad(identity));
  const ciphertext = Buffer.concat([cipher.update(plain),cipher.final()]);
  return Buffer.from(JSON.stringify({version:1,iv:iv.toString("base64"),tag:cipher.getAuthTag().toString("base64"),ciphertext:ciphertext.toString("base64")}),"utf8").toString("base64");
}
export function openPayload(encrypted: string, identity: MailIdentity, keys: Record<string,string>): unknown {
  try {
    if (typeof encrypted !== "string" || encrypted.length > 950000) throw new Error();
    const envelope = record(JSON.parse(Buffer.from(encrypted,"base64").toString("utf8")));
    if (!envelope || envelope.version !== 1 || !["iv","tag","ciphertext"].every(k => typeof envelope[k] === "string")) throw new Error();
    const iv = Buffer.from(String(envelope.iv),"base64"); const tag = Buffer.from(String(envelope.tag),"base64"); const ciphertext = Buffer.from(String(envelope.ciphertext),"base64");
    if (iv.length !== 12 || tag.length !== 16 || ciphertext.length > 512000 || !Object.hasOwn(keys,identity.keyVersion)) throw new Error();
    const cipher = createDecipheriv("aes-256-gcm",key(keys[identity.keyVersion]),iv);
    cipher.setAAD(aad(identity)); cipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([cipher.update(ciphertext),cipher.final()]).toString("utf8"));
  } catch { throw new Error("mail_payload_invalid"); } // no crypto/plaintext/key details
}
