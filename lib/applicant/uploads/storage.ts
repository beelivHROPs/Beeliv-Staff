/**
 * Remembers ONLY what is needed to resume after a refresh: the command ids and the file facts the
 * person picked (name, size, type). Never a signed upload URL, token, path, hash, owner or the
 * file bytes. sessionStorage (this tab only) rather than localStorage. Anything read back is
 * validated, and anything odd is dropped.
 */
import type { UploadAttempt, UploadSlot } from "./types";
import { UPLOAD_SLOTS } from "./types";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type PersistedStage = "request" | "bytes" | "complete" | "checking" | "in-review";
export interface Persisted {
  attempt: UploadAttempt;
  stage: PersistedStage;
}

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const STAGES: readonly string[] = ["request", "bytes", "complete", "checking", "in-review"];
const keyOf = (slot: UploadSlot) => `bv-upload-slot-v1:${slot}`;

export function browserSessionStore(): KeyValueStore | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null; // storage blocked: uploads still work, they just cannot resume after a refresh
  }
}

export function savePersisted(kv: KeyValueStore | null, p: Persisted): void {
  if (!kv) return;
  const { slot, requestId, uploadId, fileName, size, contentType } = p.attempt;
  try {
    kv.setItem(keyOf(slot), JSON.stringify({ v: 1, stage: p.stage, slot, requestId, uploadId, fileName, size, contentType }));
  } catch {
    /* quota or blocked: resume is a convenience only */
  }
}

export function clearPersisted(kv: KeyValueStore | null, slot: UploadSlot): void {
  try {
    kv?.removeItem(keyOf(slot));
  } catch {
    /* ignore */
  }
}

export function loadPersisted(kv: KeyValueStore | null, slot: UploadSlot): Persisted | null {
  if (!kv) return null;
  try {
    const raw = kv.getItem(keyOf(slot));
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    const ok =
      o && o.v === 1 && o.slot === slot && UPLOAD_SLOTS.includes(o.slot as UploadSlot) &&
      typeof o.stage === "string" && STAGES.includes(o.stage) &&
      typeof o.requestId === "string" && UUID.test(o.requestId) &&
      (o.uploadId === undefined || o.uploadId === null || (typeof o.uploadId === "string" && UUID.test(o.uploadId))) &&
      typeof o.fileName === "string" && o.fileName.length > 0 && o.fileName.length <= 255 &&
      typeof o.size === "number" && Number.isSafeInteger(o.size) && o.size > 0 &&
      typeof o.contentType === "string" && o.contentType.length <= 255;
    if (!ok) {
      clearPersisted(kv, slot);
      return null;
    }
    const attempt: UploadAttempt = {
      slot,
      requestId: o.requestId as string,
      fileName: o.fileName as string,
      size: o.size as number,
      contentType: o.contentType as string,
      ...(typeof o.uploadId === "string" ? { uploadId: o.uploadId } : {}),
    };
    return { attempt, stage: o.stage as PersistedStage };
  } catch {
    clearPersisted(kv, slot);
    return null;
  }
}
