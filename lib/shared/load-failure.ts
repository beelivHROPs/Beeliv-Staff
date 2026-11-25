/**
 * The reason behind the most recent failed page load, for the shared "We couldn't load ..." panel.
 *
 * The data hooks (lib/admin/hooks.ts, lib/staff/hooks.ts, lib/client/hooks.ts) call `noteLoadFailure(error)` when a
 * load fails; ErrorPanel reads `lastLoadFailure()` when it appears and puts the reason in its description. Only a
 * SPECIFIC reason is kept (session ended, no access, not switched on yet, no connection, too many attempts — see
 * `loadFailureReason`); otherwise the panel keeps its approved text. A reason older than a few seconds is ignored.
 * Browser-only state; never sent anywhere.
 */
import { loadFailureReason } from "./error-messages";

let last: { reason: string; at: number } | null = null;
const FRESH_MS = 10_000;

/** Records the failure. Always returns true so a loader can chain it: `!cancelled && noteLoadFailure(e) && setResult(...)`. */
export function noteLoadFailure(error: unknown): true {
  const reason = loadFailureReason(error);
  last = reason ? { reason, at: Date.now() } : null;
  return true;
}

/** The reason for the latest failure, if it happened in the last few seconds. */
export function lastLoadFailure(): string | null {
  return last && Date.now() - last.at < FRESH_MS ? last.reason : null;
}
