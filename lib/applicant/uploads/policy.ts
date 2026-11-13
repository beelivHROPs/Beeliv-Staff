/**
 * Browser-side preflight for the three application slots. This only helps the person early:
 * the server (lib/server/private-documents/validation.ts, then byte checks and a scan) decides.
 * Limits are the project lead's UPLOADS-001 approval: 5,000,000 bytes per file, one current file
 * per slot. The picker hint for each slot is different, so it is data, not a shared constant.
 */
import type { RejectReason, UploadSlot } from "./types";

export const UPLOAD_MAX_BYTES = 5_000_000;

const MIME_BY_EXT: Readonly<Record<string, string>> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export interface SlotPolicy {
  slot: UploadSlot;
  extensions: readonly string[];
  /** Value for <input accept>. */
  accept: string;
  /** One line shown under the control, in plain words. */
  hint: string;
  /** The file kinds, spoken in a sentence ("a PDF or Word file"). */
  kinds: string;
}

export const SLOT_POLICY: Readonly<Record<UploadSlot, SlotPolicy>> = {
  cv: {
    slot: "cv",
    extensions: [".pdf", ".docx"],
    accept: ".pdf,.docx",
    hint: "PDF or Word (.docx), up to 5 MB",
    kinds: "a PDF or Word (.docx) file",
  },
  "passport-photo": {
    slot: "passport-photo",
    extensions: [".jpg", ".jpeg", ".png"],
    accept: ".jpg,.jpeg,.png",
    hint: "JPG or PNG, up to 5 MB",
    kinds: "a JPG or PNG photo",
  },
  "valid-id": {
    slot: "valid-id",
    extensions: [".pdf", ".jpg", ".jpeg", ".png"],
    accept: ".pdf,.jpg,.jpeg,.png",
    hint: "PDF, JPG or PNG, up to 5 MB",
    kinds: "a PDF, JPG or PNG file",
  },
};

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot).toLowerCase() : "";
}

export type FileMeta = { name: string; size: number; type?: string };

export type MetaCheck =
  | { ok: true; fileName: string; contentType: string }
  | { ok: false; reason: Extract<RejectReason, "empty" | "size" | "type" | "name"> };

/** Same shape rules as the server's file name check, so a name it would refuse is caught here. */
function nameLooksValid(name: string): boolean {
  if (!name || name.length > 255) return false;
  if (/[\u0000-\u001f\u007f-\u009f/\\:]/u.test(name)) return false;
  if (name.includes("..") || name.startsWith(".") || name.endsWith(".")) return false;
  return new TextEncoder().encode(name).byteLength <= 255;
}

/** Checks name, type, size. Never reads the bytes (see signatureMatches for that). */
export function checkFileMeta(slot: UploadSlot, file: FileMeta): MetaCheck {
  const fileName = file.name.normalize("NFC").trim();
  if (!Number.isFinite(file.size) || file.size < 1) return { ok: false, reason: "empty" };
  const ext = extensionOf(fileName);
  if (!SLOT_POLICY[slot].extensions.includes(ext)) return { ok: false, reason: "type" };
  if (!nameLooksValid(fileName)) return { ok: false, reason: "name" };
  const expected = MIME_BY_EXT[ext];
  const declared = (file.type ?? "").trim().toLowerCase();
  // Some browsers leave the type empty. The extension decides then. A different declared type is refused.
  if (declared && declared !== expected) return { ok: false, reason: "type" };
  if (file.size > UPLOAD_MAX_BYTES) return { ok: false, reason: "size" };
  return { ok: true, fileName, contentType: expected };
}

/** First bytes of the formats we accept. A hint for the person; the server re-checks stored bytes. */
export function signatureMatches(ext: string, head: Uint8Array): boolean {
  const starts = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  switch (ext) {
    case ".pdf":
      return starts(0x25, 0x50, 0x44, 0x46); // %PDF
    case ".png":
      return starts(0x89, 0x50, 0x4e, 0x47);
    case ".jpg":
    case ".jpeg":
      return starts(0xff, 0xd8, 0xff);
    case ".docx":
      return starts(0x50, 0x4b, 0x03, 0x04); // zip container
    default:
      return false;
  }
}

/** Plain-words reason for a refused file. No technical detail, no blame. */
export function rejectText(slot: UploadSlot, reason: RejectReason): string {
  const p = SLOT_POLICY[slot];
  switch (reason) {
    case "empty":
      return "That file looks empty. Choose another one.";
    case "size":
      return "That file is over 5 MB. Choose a smaller one.";
    case "type":
      return `That file type isn't accepted here. Use ${p.kinds}.`;
    case "name":
      return "That file name can't be used. Rename it with letters and numbers, then try again.";
    case "signature":
      return `That file doesn't look like ${p.kinds}. Choose the original file.`;
    case "different-file":
      return "That's a different file from the one we were sending. Choose the same file, or start again.";
    case "denied":
      return "We can't take uploads on this account right now.";
    case "limit":
      return "You've reached the limit of files for this section.";
    case "conflict":
      return "We couldn't match this to your earlier upload. Choose the file again to start fresh.";
    case "scan-failed":
      return "We couldn't accept that file. Choose another one.";
    case "server-invalid":
    default:
      return "We couldn't accept that file. Choose another one.";
  }
}
