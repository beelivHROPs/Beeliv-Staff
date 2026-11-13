/**
 * Application-level protection of sensitive values (design section 2). AES-256-GCM with a per-value random 96-bit nonce.
 * The associated data binds the ciphertext to one person and one section, so a copied row cannot be opened elsewhere.
 * Keys are supplied by the runtime from server-only configuration; this file holds none and reads no environment.
 * `open` exists for the future Admin reveal and the key-rotation job; the Staff routes never call it.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import type { BlindDigest, Sealed, Sealer, SensitiveSection } from "./types";

export const ENC_VERSION = 1;
const KEY_ID = /^[a-z0-9][a-z0-9_-]{0,30}$/;

export type KeyRing = {
  /** Key used for every NEW value. */
  activeKeyId: string;
  /** Every key id still needed to open stored values (the active one and older ones awaiting re-encryption). */
  keys: ReadonlyMap<string, Buffer>;
  /** Separate secret for the blind index. Never the same bytes as an encryption key. */
  indexKeyId: string;
  indexKey: Buffer;
};

const aad = (section: SensitiveSection, personId: string) => Buffer.from(`beeliv:staff-sensitive:v${ENC_VERSION}:${personId}:${section}`, "utf8");

export function assertKeyRing(ring: KeyRing): void {
  if (!KEY_ID.test(ring.activeKeyId) || !KEY_ID.test(ring.indexKeyId)) throw new Error("keyring_invalid");
  for (const [id, key] of ring.keys) if (!KEY_ID.test(id) || key.length !== 32) throw new Error("keyring_invalid");
  if (!ring.keys.has(ring.activeKeyId) || ring.indexKey.length < 32) throw new Error("keyring_invalid");
  for (const key of ring.keys.values()) if (key.equals(ring.indexKey)) throw new Error("keyring_invalid");
}

export function createSealer(ring: KeyRing): Sealer & { open(section: SensitiveSection, personId: string, sealed: Sealed): Record<string, unknown> } {
  assertKeyRing(ring);
  return {
    seal(section, personId, payload): Sealed {
      const key = ring.keys.get(ring.activeKeyId)!;
      const nonce = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, nonce);
      cipher.setAAD(aad(section, personId));
      const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final(), cipher.getAuthTag()]);
      return { keyId: ring.activeKeyId, nonceHex: nonce.toString("hex"), ciphertextHex: body.toString("hex") };
    },
    open(section, personId, sealed) {
      const key = ring.keys.get(sealed.keyId);
      if (!key) throw new Error("key_unavailable");
      const raw = Buffer.from(sealed.ciphertextHex, "hex");
      if (raw.length < 17) throw new Error("ciphertext_invalid");
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(sealed.nonceHex, "hex"));
      decipher.setAAD(aad(section, personId));
      decipher.setAuthTag(raw.subarray(raw.length - 16));
      const plain = Buffer.concat([decipher.update(raw.subarray(0, raw.length - 16)), decipher.final()]).toString("utf8");
      return JSON.parse(plain) as Record<string, unknown>;
    },
    digest(section, normalised): BlindDigest {
      const hex = createHmac("sha256", ring.indexKey).update(`beeliv:staff-sensitive-index:v${ENC_VERSION}:${section}:`).update(normalised).digest("hex");
      return { hex, keyId: ring.indexKeyId };
    },
  };
}
