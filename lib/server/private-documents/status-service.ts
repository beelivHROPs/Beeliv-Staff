/** Own-upload status only. "available" means scan-clean, never HR approval. */
import type { UploadIdentity } from './request-service';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const STATES = ['awaiting-bytes', 'checking', 'available', 'rejected', 'expired'] as const;
type State = typeof STATES[number];
type Code = 'unavailable' | 'unauthenticated' | 'no_access' | 'invalid_request' | 'rate_limited';
export type UploadStatusResult = { ok: true; uploadId: string; status: State } | { ok: false; code: Code };
export type UploadStatusDependencies = {
  enabled: boolean;
  /** Server-owned audience; never copied from request input. Staff needs its separately reviewed DB actor. */
  audience: 'applicant' | 'staff';
  verifyIdentity(): Promise<UploadIdentity | null>;
  consumeLimit(uid: string): Promise<void>;
  /** Must recheck current session, ownership and audience in the database. */
  status(args: { actorUid: string; sessionId: string; uploadId: string }): PromiseLike<{ data: unknown; error: unknown }>;
};
function record(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
}
export async function getPrivateUploadStatus(raw: unknown, deps: UploadStatusDependencies): Promise<UploadStatusResult> {
  if (!deps.enabled || !['applicant', 'staff'].includes(deps.audience)) return { ok: false, code: 'unavailable' };
  let identity: UploadIdentity | null;
  try { identity = await deps.verifyIdentity(); } catch { return { ok: false, code: 'unavailable' }; }
  if (!identity || !identity.emailVerified || ![identity.uid, identity.personId, identity.sessionId].every(v => typeof v === 'string' && UUID.test(v))) return { ok: false, code: 'unauthenticated' };
  if (identity.app !== 'talent' || identity.status !== 'active' || !Array.isArray(identity.entitlements) || !identity.entitlements.includes(deps.audience)) return { ok: false, code: 'no_access' };
  if (!record(raw) || Object.keys(raw).length !== 1 || !Object.hasOwn(raw, 'uploadId') || typeof raw.uploadId !== 'string' || !UUID.test(raw.uploadId)) return { ok: false, code: 'invalid_request' };
  const uploadId = raw.uploadId.toLowerCase();
  try { await deps.consumeLimit(identity.uid); } catch (error) { return { ok: false, code: record(error) && error.code === 'rate_limited' ? 'rate_limited' : 'unavailable' }; }
  try {
    const reply = await deps.status({ actorUid: identity.uid, sessionId: identity.sessionId, uploadId });
    if (!reply || reply.error || !record(reply.data)) return { ok: false, code: 'unavailable' };
    const data = reply.data;
    if (data.ok === false) return { ok: false, code: data.reason === 'no_access' || data.reason === 'rate_limited' ? data.reason : 'unavailable' };
    if (data.ok !== true || data.uploadId !== uploadId || typeof data.status !== 'string' || !STATES.includes(data.status as State)) return { ok: false, code: 'unavailable' };
    // Select only public facts: no path, signed URL, owner details, scan report or reviewer notes.
    return { ok: true, uploadId, status: data.status as State };
  } catch { return { ok: false, code: 'unavailable' }; }
}
