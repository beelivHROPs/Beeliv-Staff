/** Private Staff Storage capabilities. Never authorizes ownership; the caller's SQL actor does that. */
import type { StaffDocStoragePort } from '../staff-documentation/types';
type Reply = { data: unknown; error: unknown };
type Ports = {
  upload(bucket: string, key: string, options: { upsert: false }): PromiseLike<Reply>;
  read(bucket: string, key: string, seconds: number): PromiseLike<Reply>;
};
const KEY = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\/source\.(pdf|jpg|jpeg|png)$/;
function fail(): never { throw new Error('unavailable'); }
function record(v: unknown): v is Record<string, unknown> { return !!v && typeof v === 'object' && !Array.isArray(v); }
function expiry(token: string): number {
  if (token.length > 8192 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return fail();
  const payload: unknown = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  if (!record(payload) || !Number.isSafeInteger(payload.exp)) return fail();
  const when = Number(payload.exp) * 1000;
  if (!Number.isFinite(new Date(when).getTime())) return fail();
  return when;
}
export function staffDocumentStorage(ports: Ports, origin: string, now: () => number = Date.now): StaffDocStoragePort {
  const base = new URL(origin);
  if (base.origin !== origin || base.protocol !== 'https:' || !/^[a-z0-9]+\.supabase\.co$/.test(base.hostname)) return fail();
  async function capability(kind: 'upload' | 'sign', key: string, seconds?: number): Promise<{ url: string; expiresAt: string }> {
    try {
      if (!KEY.test(key)) return fail();
      if (kind === 'sign' && (!Number.isSafeInteger(seconds) || Number(seconds) < 1 || Number(seconds) > 120)) return fail();
      const bucket = kind === 'upload' ? 'staff-document-quarantine' : 'staff-document-clean';
      const reply = kind === 'upload' ? await ports.upload(bucket, key, { upsert: false }) : await ports.read(bucket, key, seconds!);
      if (!reply || reply.error || !record(reply.data) || typeof reply.data.signedUrl !== 'string') return fail();
      const url = new URL(reply.data.signedUrl), token = url.searchParams.get('token');
      const expected = kind === 'upload' ? `/storage/v1/object/upload/sign/${bucket}/${key}` : `/storage/v1/object/sign/${bucket}/${key}`;
      if (url.origin !== origin || url.username || url.password || url.hash || url.pathname !== expected || !token || [...url.searchParams.keys()].length !== 1) return fail();
      if (kind === 'upload' && (reply.data.path !== key || reply.data.token !== token)) return fail();
      const end = expiry(token), stamp = now(), max = kind === 'upload' ? 7260000 : seconds! * 1000 + 5000;
      if (!Number.isFinite(stamp) || end <= stamp || end > stamp + max) return fail();
      return { url: url.toString(), expiresAt: new Date(end).toISOString() };
    } catch { return fail(); }
  }
  return {
    signUpload: input => input.bucket === 'staff-document-quarantine' && input.upsert === false ? capability('upload', input.objectKey) : Promise.reject(new Error('unavailable')),
    signRead: input => input.bucket === 'staff-document-clean' ? capability('sign', input.objectKey, input.expiresInSeconds) : Promise.reject(new Error('unavailable')),
  };
}
