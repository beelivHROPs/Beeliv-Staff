/** Business state validation only. Database identity/capability/scope checks remain mandatory. */
export type StoredVacancyStatus = 'draft' | 'pending-approval' | 'published' | 'paused' | 'closed' | 'filled' | 'cancelled';
export type VacancyCommand = 'submit-for-approval' | 'publish' | 'resume' | 'pause' | 'close' | 'mark-filled' | 'cancel';
export type TransitionResult = { ok: true; status: StoredVacancyStatus; postedAt: string | null; endedAt: string | null; reason: string | null } | { ok: false; reason: 'invalid_transition' | 'reason_required' | 'invalid_deadline' | 'publication_not_ready' | 'invalid_clock' };
const transitions: Record<VacancyCommand, Partial<Record<StoredVacancyStatus, StoredVacancyStatus>>> = {
 'submit-for-approval': { draft: 'pending-approval' },
 publish: { draft: 'published', 'pending-approval': 'published' },
 resume: { paused: 'published' },
 pause: { published: 'paused' },
 close: { published: 'closed', paused: 'closed' },
 'mark-filled': { published: 'filled', paused: 'filled' },
 cancel: { draft: 'cancelled', 'pending-approval': 'cancelled', published: 'cancelled', paused: 'cancelled' },
};
export function planVacancyTransition(input: {
 status: StoredVacancyStatus; command: VacancyCommand; closesOn: string;
 postedAt: string | null; reason?: string; publicationReady: boolean;
}, now = new Date()): TransitionResult {
 if (!Number.isFinite(now.getTime())) return { ok: false, reason: 'invalid_clock' };
 const options = Object.hasOwn(transitions, input.command) ? transitions[input.command] : undefined;
 const status = options && Object.hasOwn(options, input.status) ? options[input.status] : undefined;
 if (!status) return { ok: false, reason: 'invalid_transition' };
 const reason = input.reason?.trim() || null;
 if (['pause','close','mark-filled','cancel'].includes(input.command) && (!reason || reason.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(reason))) return { ok: false, reason: 'reason_required' };
 if (status === 'published') {
  if (!input.publicationReady) return { ok: false, reason: 'publication_not_ready' };
  const parsed = new Date(input.closesOn);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  const day = `${part('year')}-${part('month')}-${part('day')}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.closesOn) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== input.closesOn || input.closesOn < day) return { ok: false, reason: 'invalid_deadline' };
 }
 if (input.postedAt !== null && (!Number.isFinite(Date.parse(input.postedAt)) || Date.parse(input.postedAt) > now.getTime())) return { ok: false, reason: 'invalid_clock' };
 if (['resume','pause','close','mark-filled'].includes(input.command) && input.postedAt === null) return { ok: false, reason: 'invalid_transition' };
 return { ok: true, status, postedAt: status === 'published' ? input.postedAt ?? now.toISOString() : input.postedAt, endedAt: ['closed','filled','cancelled'].includes(status) ? now.toISOString() : null, reason };
}
