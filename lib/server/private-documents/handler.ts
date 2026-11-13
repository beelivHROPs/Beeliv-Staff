/** HTTP boundary shared by separately authorized document services. File bytes use private Storage. */
export type DocumentAction = 'request' | 'complete' | 'status';
type FailureCode = 'unavailable' | 'unauthenticated' | 'no_access' | 'invalid_request' | 'rate_limited' | 'conflict' | 'expired' | 'limit_reached' | 'outcome_unknown';
type Result = { ok: true; [key: string]: unknown } | { ok: false; code: FailureCode; requestId?: string; fields?: Record<string, string> };
export type DocumentActions = Record<DocumentAction, (input: unknown) => Promise<Result>>;
const HEADERS = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const MAX_BYTES = 4096;
const STATUS: Record<FailureCode, number> = { unavailable: 503, unauthenticated: 401, no_access: 403, invalid_request: 400, rate_limited: 429, conflict: 409, expired: 410, limit_reached: 422, outcome_unknown: 503 };
const MESSAGE: Record<FailureCode, string> = {
  unavailable: 'Documents are temporarily unavailable.', unauthenticated: 'Sign in to continue.', no_access: 'This document is not available.',
  invalid_request: 'Check the file details and try again.', rate_limited: 'Please wait before trying again.', conflict: 'Check the current document before trying again.',
  expired: 'This upload has expired.', limit_reached: 'The upload limit has been reached.', outcome_unknown: 'Check the document status before trying again.',
};
function failure(code: FailureCode, requestId?: string): Response {
  const safeId = typeof requestId === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId) ? requestId : undefined;
  return Response.json({ ok: false, code, message: MESSAGE[code], ...(safeId ? { requestId: safeId } : {}) }, { status: STATUS[code], headers: HEADERS });
}
async function body(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new Error();
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES)) throw new Error();
  const reader = request.body?.getReader();
  if (!reader) throw new Error();
  const parts: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error(); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
export async function handlePrivateDocument(request: Request, action: string, config: { enabled: boolean; origin: string; actions: DocumentActions }): Promise<Response> {
  if (!config.enabled) return failure('unavailable');
  if (request.method !== 'POST') return Response.json({ ok: false }, { status: 405, headers: { ...HEADERS, Allow: 'POST' } });
  if (!['request', 'complete', 'status'].includes(action)) return Response.json({ ok: false }, { status: 404, headers: HEADERS });
  let target: URL;
  try { target = new URL(request.url); } catch { return failure('no_access'); }
  if (!config.origin || target.origin !== config.origin || request.headers.get('origin') !== config.origin || request.headers.get('sec-fetch-site') === 'cross-site') return failure('no_access');
  let input: unknown;
  try { input = await body(request); } catch { return failure('invalid_request'); }
  const requestId = input && typeof input === 'object' && 'requestId' in input && typeof input.requestId === 'string' ? input.requestId : undefined;
  const uncertain = () => failure(action === 'status' ? 'unavailable' : 'outcome_unknown', requestId);
  try {
    // Callbacks are server-owned typed services that select their own response DTOs, never raw RPCs.
    const result = await config.actions[action as DocumentAction](input);
    if (!result || typeof result !== 'object') return uncertain();
    if (result.ok === false) return failure(Object.hasOwn(STATUS, result.code) ? result.code : 'unavailable', result.requestId);
    if (result.ok !== true) return uncertain();
    const statuses = action === 'request' ? ['awaiting-bytes'] : action === 'complete' ? ['checking'] : ['awaiting-bytes', 'checking', 'available', 'rejected', 'expired'];
    if (typeof result.uploadId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(result.uploadId) || typeof result.status !== 'string' || !statuses.includes(result.status)) return uncertain();
    const allowed = action === 'request' ? ['ok', 'uploadId', 'status', 'uploadUrl', 'uploadUrlExpiresAt', 'completeBefore', 'replayed']
      : action === 'complete' ? ['ok', 'uploadId', 'status', 'replayed'] : ['ok', 'uploadId', 'status'];
    const selected: Record<string, unknown> = {};
    for (const key of allowed) if (Object.hasOwn(result, key)) selected[key] = result[key];
    return Response.json(selected, { headers: HEADERS });
  } catch {
    return uncertain();
  }
}
