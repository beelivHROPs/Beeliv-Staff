/**
 * DEMO ONLY: replaced by the server signed-link flow (getDocumentAccess) at go-live;
 * remove with the other demo fixtures (lib/dev-demo.ts, lib/dev-demo-flag.ts, the
 * layout `data-bv-demo` attributes, lib/demo-files/*, components/shared/documents/*).
 *
 * A browser-only file store so the project lead can pick a REAL file and see how it is
 * previewed and downloaded before real storage exists. The bytes go into IndexedDB on
 * this device only (same origin, so a file added in the Applicant app can be opened in
 * the Admin app in the same browser). Nothing is uploaded anywhere.
 *
 * Only active when the app's SERVER-DECIDED demo mode is on (the layouts render
 * `data-bv-demo="on"` from lib/dev-demo-flag.ts, which reads lib/auth/mode.ts). In
 * live backend mode every function here refuses, so a real person's file can never
 * land in this store.
 *
 * What the server replaces: a short-lived signed link, issued after a permission check
 * and written to the audit log; the type/size/signature checks below run server-side.
 */

import { SAMPLE_NAME, loadSampleBlob, sampleKindFor, sampleLabelFor } from "./sample";

export const DEMO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB per file (existing decision)
export type DemoKind = "pdf" | "jpg" | "png";
export type DemoProblem = "off" | "empty" | "type" | "signature" | "size" | "failed";

export interface DemoFileMeta {
  id: string;
  name: string;
  size: number;
  kind: DemoKind;
  mime: string;
  /** Whose document and which one, for the download name: "<Person>, <document>.pdf". */
  ownerName: string;
  label: string;
  savedAt: string;
  /** True for the bundled "Sample preview" fallback (never a real uploaded file). */
  sample?: boolean;
}

type Record_ = DemoFileMeta & { blob: Blob };

const MIME: Record<DemoKind, string> = { pdf: "application/pdf", jpg: "image/jpeg", png: "image/png" };
const DB = "beeliv-demo-files";
const STORE = "files";
const CHANNEL = "beeliv-demo-files-v1";

/** Is the server-decided demo mode on for this page? (Same check as lib/dev-demo.ts.) */
export function demoFilesEnabled(): boolean {
  return typeof document !== "undefined" && !!document.querySelector('[data-bv-demo="on"]');
}

/* ---------------- validation ---------------- */

function kindFromName(name: string): DemoKind | null {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  const ext = m?.[1].toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "jpg" || ext === "jpeg") return "jpg";
  if (ext === "png") return "png";
  return null;
}

async function kindFromBytes(file: Blob): Promise<DemoKind | null> {
  const b = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const at = (...xs: number[]) => xs.every((x, i) => b[i] === x);
  if (at(0x25, 0x50, 0x44, 0x46, 0x2d)) return "pdf"; // %PDF-
  if (at(0xff, 0xd8, 0xff)) return "jpg"; // FFD8FF
  if (at(0x89, 0x50, 0x4e, 0x47)) return "png"; // 89504E47
  return null;
}

/** Extension AND file signature must agree; 5 MB maximum. */
export async function validateDemoFile(file: File): Promise<{ ok: true; kind: DemoKind } | { ok: false; problem: DemoProblem }> {
  if (file.size === 0) return { ok: false, problem: "empty" };
  const byName = kindFromName(file.name);
  if (!byName) return { ok: false, problem: "type" };
  if (file.size > DEMO_MAX_BYTES) return { ok: false, problem: "size" };
  try {
    const byBytes = await kindFromBytes(file);
    if (byBytes !== byName) return { ok: false, problem: "signature" };
    return { ok: true, kind: byName };
  } catch {
    return { ok: false, problem: "failed" };
  }
}

/** Plain-language text for a problem (never technical). */
export function demoProblemText(p: DemoProblem): string {
  switch (p) {
    case "size":
      return "That file is over 5 MB. Choose a smaller one.";
    case "type":
      return "Use a PDF, JPG or PNG file.";
    case "signature":
      return "That file does not look like a real PDF, JPG or PNG. Try another.";
    case "empty":
      return "We could not read that file. Try another.";
    default:
      return "We could not save that file. Try again.";
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export const KIND_LABEL: Record<DemoKind, string> = { pdf: "PDF", jpg: "JPG", png: "PNG" };

/** "<Person>, <document>.pdf" with characters Windows file names cannot hold removed. */
export function downloadName(m: Pick<DemoFileMeta, "ownerName" | "label" | "kind" | "name">): string {
  const base = [m.ownerName, m.label].filter(Boolean).join(", ") || m.name.replace(/\.[^.]+$/, "");
  return `${base.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim()}.${m.kind === "jpg" ? "jpg" : m.kind}`;
}

/* ---------------- storage (IndexedDB, with an in-memory fallback) ---------------- */

const memory = new Map<string, Record_>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function idbRun<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const db = await openDb();
  if (!db) return undefined;
  try {
    return await new Promise<T | undefined>((resolve) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
      tx.onabort = () => resolve(undefined);
    });
  } catch {
    return undefined;
  }
}

async function readRecord(id: string): Promise<Record_ | null> {
  const fromDb = (await idbRun("readonly", (s) => s.get(id))) as Record_ | undefined;
  return fromDb ?? memory.get(id) ?? (await sampleRecord(id));
}

/**
 * DEMO ONLY: the bundled sample, used only when NOTHING is stored for this key (a real
 * uploaded file always wins) and only while demo mode is on. Not persisted anywhere.
 */
async function sampleRecord(id: string): Promise<Record_ | null> {
  if (!demoFilesEnabled()) return null;
  const kind = sampleKindFor(id);
  const blob = await loadSampleBlob(kind);
  if (!blob) return null;
  return { id, name: SAMPLE_NAME, size: blob.size, kind, mime: MIME[kind], ownerName: SAMPLE_NAME, label: sampleLabelFor(id), savedAt: "2000-01-01T00:00:00.000Z", sample: true, blob };
}

/* ---------------- change notifications ---------------- */

const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
function notify() {
  listeners.forEach((l) => l());
  try {
    channel?.postMessage("change");
  } catch {
    // Other tabs simply will not refresh until reload.
  }
}
export function subscribeDemoFiles(cb: () => void): () => void {
  if (!channel && typeof BroadcastChannel !== "undefined") {
    try {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = () => listeners.forEach((l) => l());
    } catch {
      channel = null;
    }
  }
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/* ---------------- public API ---------------- */

/** Validates and stores a picked file under `id`; returns its metadata (the document id is `id`). */
export async function saveDemoFile(
  id: string,
  file: File,
  info: { ownerName: string; label: string },
): Promise<{ ok: true; meta: DemoFileMeta } | { ok: false; problem: DemoProblem }> {
  if (!demoFilesEnabled()) return { ok: false, problem: "off" };
  const v = await validateDemoFile(file);
  if (!v.ok) return v;
  try {
    // Re-wrap with the type from the signature, never the browser's declared type.
    const blob = new Blob([await file.arrayBuffer()], { type: MIME[v.kind] });
    const rec: Record_ = { id, name: file.name, size: file.size, kind: v.kind, mime: MIME[v.kind], ownerName: info.ownerName, label: info.label, savedAt: new Date().toISOString(), blob };
    memory.set(id, rec);
    await idbRun("readwrite", (s) => s.put(rec));
    notify();
    const { blob: _b, ...meta } = rec;
    void _b;
    return { ok: true, meta };
  } catch {
    return { ok: false, problem: "failed" };
  }
}

export async function getDemoFileMeta(id: string): Promise<DemoFileMeta | null> {
  if (!demoFilesEnabled()) return null;
  const rec = await readRecord(id);
  if (!rec) return null;
  const { blob: _b, ...meta } = rec;
  void _b;
  return meta;
}

/** A blob URL on demand. The caller must `revokeDemoUrl` it when the preview closes. */
export async function getObjectUrl(id: string): Promise<string | null> {
  if (!demoFilesEnabled()) return null;
  const rec = await readRecord(id);
  if (!rec) return null;
  try {
    return URL.createObjectURL(rec.blob);
  } catch {
    return null;
  }
}

export function revokeDemoUrl(url: string | null | undefined) {
  if (url) URL.revokeObjectURL(url);
}

export async function removeDemoFile(id: string): Promise<void> {
  memory.delete(id);
  await idbRun("readwrite", (s) => s.delete(id));
  notify();
}

/** Saves the stored file to this device as "<Person>, <document>.pdf". Returns false when it could not. */
export async function downloadDemoFile(id: string): Promise<boolean> {
  const meta = await getDemoFileMeta(id);
  const url = await getObjectUrl(id);
  if (!meta || !url) return false;
  const a = document.createElement("a");
  a.href = url;
  a.download = downloadName(meta);
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => revokeDemoUrl(url), 10_000);
  return true;
}
