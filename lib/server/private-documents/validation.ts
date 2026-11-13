/** Metadata preflight only. Stored bytes and content signatures require a separate check. */
export type UploadPurpose = "cv" | "passport-photo" | "valid-id";
export type UploadType = Readonly<{ extension: string; mime: string }>;
export type UploadPolicy = Readonly<{
  approved: boolean;
  maxBytes: number;
  typesByPurpose: Readonly<Record<UploadPurpose, readonly UploadType[]>>;
}>;
export type UploadRequest = {
  requestId: string;
  purpose: UploadPurpose;
  fileName: string;
  size: number;
  contentType: string;
};
export type UploadValidation =
  | { ok: true; value: UploadRequest }
  | { ok: false; fields: Record<string, string> };

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const PURPOSES: UploadPurpose[] = ["cv", "passport-photo", "valid-id"];
const REQUEST_KEYS = ["requestId", "purpose", "fileName", "size", "contentType"];
const MIME = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/;

const frozenType = (extension: string, mime: string): UploadType => Object.freeze({ extension, mime });
/** Project-lead-approved application upload preflight, 5,000,000 bytes per file. */
export const APPROVED_APPLICATION_UPLOAD_POLICY: UploadPolicy = Object.freeze({
  approved: true,
  maxBytes: 5_000_000,
  typesByPurpose: Object.freeze({
    cv: Object.freeze([frozenType(".pdf", "application/pdf"), frozenType(".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")]),
    "passport-photo": Object.freeze([frozenType(".jpg", "image/jpeg"), frozenType(".jpeg", "image/jpeg"), frozenType(".png", "image/png")]),
    "valid-id": Object.freeze([frozenType(".pdf", "application/pdf"), frozenType(".jpg", "image/jpeg"), frozenType(".jpeg", "image/jpeg"), frozenType(".png", "image/png")]),
  }),
});

function plainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function approvedPolicy(value: unknown): value is UploadPolicy {
  if (!plainRecord(value) || value.approved !== true ||
      !Number.isSafeInteger(value.maxBytes) || (value.maxBytes as number) < 1 ||
      !plainRecord(value.typesByPurpose)) return false;
  const types = value.typesByPurpose;
  if (Object.keys(types).length !== PURPOSES.length ||
      Object.keys(types).some(key => !PURPOSES.includes(key as UploadPurpose))) return false;
  return PURPOSES.every(purpose => {
    const entries = types[purpose];
    return Array.isArray(entries) && entries.length > 0 && entries.length <= 20 &&
      Object.getPrototypeOf(entries) === Array.prototype &&
      Object.keys(entries).length === entries.length &&
      entries.every(entry => plainRecord(entry) && Object.keys(entry).length === 2 &&
        typeof entry.extension === "string" && /^\.[a-z0-9]{1,12}$/.test(entry.extension) &&
        typeof entry.mime === "string" && MIME.test(entry.mime));
  });
}

/** Rejects caller authority/path fields; a later service owns storage paths and content verification. */
export function validateUploadRequest(raw: unknown, policy: unknown): UploadValidation {
  if (!approvedPolicy(policy)) return { ok: false, fields: { policy: "Uploads are unavailable." } };
  if (!plainRecord(raw)) return { ok: false, fields: { request: "Invalid upload request." } };

  const fields: Record<string, string> = Object.create(null);
  const invalid = (key: string) => { fields[key] = "Check this upload value."; };
  for (const key of Object.keys(raw)) if (!REQUEST_KEYS.includes(key)) invalid(key);
  for (const key of REQUEST_KEYS) if (!Object.hasOwn(raw, key)) invalid(key);

  const requestId = typeof raw.requestId === "string" ? raw.requestId.toLowerCase() : "";
  if (!UUID.test(requestId)) invalid("requestId");
  const purpose = raw.purpose;
  if (typeof purpose !== "string" || !PURPOSES.includes(purpose as UploadPurpose)) invalid("purpose");

  const rawFileName = typeof raw.fileName === "string" ? raw.fileName : "";
  // Check raw input before trim/normalization, and bound work on hostile long strings.
  if (rawFileName.length > 1024 || /[\u0000-\u001f\u007f-\u009f\p{Cf}]/u.test(rawFileName)) invalid("fileName");
  const fileName = rawFileName.length <= 1024 ? rawFileName.normalize("NFC").trim() : "";
  const fileBytes = new TextEncoder().encode(fileName).byteLength;
  if (!fileName || fileBytes > 255 || /[/\\:]/u.test(fileName) ||
      fileName.includes("..") || fileName.startsWith(".") || fileName.endsWith(".")) invalid("fileName");
  const dot = fileName.lastIndexOf(".");
  const stem = dot > 0 ? fileName.slice(0, dot).trim() : "";
  const extension = dot > 0 ? fileName.slice(dot).toLowerCase() : "";
  if (!stem || !/^\.[a-z0-9]{1,12}$/.test(extension)) invalid("fileName");

  const size = raw.size;
  if (!Number.isSafeInteger(size) || (size as number) < 1 || (size as number) > policy.maxBytes) invalid("size");
  const rawContentType = typeof raw.contentType === "string" ? raw.contentType : "";
  if (rawContentType.length > 255 || /[\u0000-\u001f\u007f-\u009f]/u.test(rawContentType)) invalid("contentType");
  const contentType = rawContentType.length <= 255 ? rawContentType.trim().toLowerCase() : "";
  if (!MIME.test(contentType)) invalid("contentType");
  if (typeof purpose === "string" && PURPOSES.includes(purpose as UploadPurpose) &&
      !policy.typesByPurpose[purpose as UploadPurpose].some(type => type.extension === extension && type.mime === contentType)) {
    invalid("fileName");
    invalid("contentType");
  }

  if (Object.keys(fields).length) return { ok: false, fields };
  return { ok: true, value: { requestId, purpose: purpose as UploadPurpose, fileName, size: size as number, contentType } };
}


