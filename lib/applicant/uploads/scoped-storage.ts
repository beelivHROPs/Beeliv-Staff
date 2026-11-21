import { browserSessionStore, type KeyValueStore } from "./storage";
import type { UploadSlot } from "./types";

const SCOPE = /^[a-f0-9]{64}$/;
const KEY = /^bv-upload-slot-v1:(cv|passport-photo|valid-id)$/;

/** Only the server's opaque current-session scope can name live resume entries. */
export function scopedUploadStore(scope: string, backing: KeyValueStore | null = browserSessionStore()): KeyValueStore | null {
  if (!SCOPE.test(scope) || !backing) return null;
  const scopedKey = (key: string): string => {
    const slot = KEY.exec(key)?.[1] as UploadSlot | undefined;
    if (!slot) throw new Error("invalid_upload_storage_key");
    return `bv-upload-slot-v2:${scope}:${slot}`;
  };
  return {
    getItem(key) { return backing.getItem(scopedKey(key)); },
    setItem(key, value) { backing.setItem(scopedKey(key), value); },
    removeItem(key) { backing.removeItem(scopedKey(key)); },
  };
}
