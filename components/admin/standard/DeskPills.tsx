/**
 * Desktop and tablet (>= 768px) pill row: "All" first, the count inside each pill, active = plum filled,
 * inactive = white with a thin border. Phones render nothing (they keep their own tab row).
 * Same look as the Jobs status pills; see docs/design-references/admin-desktop-premium-standard-2026-10-27.md.
 */
export interface DeskPill {
  key: string;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}

export function DeskPills({ label, pills, className = "" }: { label: string; pills: DeskPill[]; className?: string }) {
  return (
    <div role="group" aria-label={label} className={`ap-scrollbar-none mt-4 mb-6 flex flex-wrap gap-2 py-0.5 max-[767px]:hidden ${className}`}>
      {pills.map((p) => (
        <button
          key={p.key}
          type="button"
          aria-pressed={p.active}
          onClick={p.onClick}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[13px] font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none ${p.active ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-line) bg-(--ap-surface) text-(--ap-ink-2) hover:border-(--ap-violet)"}`}
        >
          {p.label}
          {p.count !== undefined ? <span className={`tabular-nums ${p.active ? "text-white/80" : "text-(--ap-muted)"}`}>{p.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
