/** Transport envelope: identifiers and concurrency controls never come from form content. */
import { validateVacancyInput } from './validation';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const actions = ['submit-for-approval','publish','resume','pause','close','mark-filled','cancel'];
export function parseVacancyCommand(raw: unknown) {
 if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.getPrototypeOf(raw) !== Object.prototype) throw new Error('invalid_request');
 const v = raw as Record<string, unknown>;
 if (!['create','update','action'].includes(String(v.kind)) || typeof v.requestId !== 'string' || !uuid.test(v.requestId)) throw new Error('invalid_request');
 const keys = ['kind','requestId', ...(v.kind === 'create' ? ['input','intent'] : v.kind === 'update' ? ['id','expectedRevision','input','intent'] : ['id','expectedRevision','action','reason'])];
 if (Object.keys(v).some(k => !keys.includes(k))) throw new Error('invalid_request');
 if (v.kind !== 'create' && (typeof v.id !== 'string' || !uuid.test(v.id) || !Number.isSafeInteger(v.expectedRevision) || Number(v.expectedRevision) < 1 || Number(v.expectedRevision) > 2147483646)) throw new Error('invalid_request');
 const common = { requestId: v.requestId.toLowerCase(), id: v.kind === 'create' ? null : String(v.id).toLowerCase(), expectedRevision: v.kind === 'create' ? null : Number(v.expectedRevision) };
 if (v.kind === 'action') {
  if (typeof v.action !== 'string' || !actions.includes(v.action) || !(v.reason === undefined || typeof v.reason === 'string' && v.reason.length <= 2000 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v.reason))) throw new Error('invalid_request');
  if (['pause','close','mark-filled','cancel'].includes(v.action) && (typeof v.reason !== 'string' || !v.reason.trim())) throw new Error('invalid_request');
  return { ...common, kind: 'action' as const, action: v.action, reason: typeof v.reason === 'string' ? v.reason.trim() : null };
 }
 if (!['save','submit-for-approval','publish'].includes(String(v.intent))) throw new Error('invalid_request');
 const result = validateVacancyInput(v.input);
 if (!result.ok) return { ...common, kind: 'invalid' as const, fields: result.fields };
 return { ...common, kind: v.kind as 'create' | 'update', intent: v.intent as 'save' | 'submit-for-approval' | 'publish', input: result.value };
}
