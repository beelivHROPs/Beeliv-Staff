/**
 * List footer shared by every Admin list, same pattern as the Client app
 * (components/client/workforce/WorkforceBody.tsx): "Showing 10 of 24" and a
 * "Show more" button that adds another batch. Replaces the per-screen
 * Previous / Next pagers.
 */
export const SHOW_MORE_STEP = 10;

export function ShowMore({ shown, total, onMore, onClear, className = "" }: { shown: number; total: number; onMore: () => void; onClear?: (() => void) | null; className?: string }) {
  if (total === 0) return null;
  return (
    <div className={`mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-(--ap-muted) ${className}`}>
      <span>
        Showing {Math.min(shown, total)} of {total}
      </span>
      <span className="flex items-center gap-2">
        {onClear ? (
          <button type="button" onClick={onClear} className="ap-hit font-bold text-(--ap-violet) hover:text-(--ap-violet-2)">
            Clear filters
          </button>
        ) : null}
        {total > shown ? (
          <button type="button" onClick={onMore} className="ap-btn ap-btn-s ap-btn-sm">
            Show more
          </button>
        ) : null}
      </span>
    </div>
  );
}
