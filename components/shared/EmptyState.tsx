// Illustration upgrade per docs/architecture/design-system.md §11 (project lead,
// 2026-09-02): custom inline SVG only — no illustration library, no stock imagery.
// Each variant is 2-3 simple geometric shapes, single-color or purple/gold duotone.
// Purely decorative + static markup, so this stays a server component (no "use client").

type EmptyStateVariant = "tray" | "briefcase" | "default";

/** Inbox-tray + document motif — reused for both "no documents" and "no notifications"
 *  contexts (design-system.md §11 names this one shared motif for that pairing). */
function TrayIllustration() {
  return (
    <svg
      viewBox="0 0 120 120"
      width="104"
      height="104"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M22 68 L98 68 L84 96 L36 96 Z"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="40"
        y="20"
        width="44"
        height="56"
        rx="4"
        transform="rotate(-6 40 20)"
        stroke="var(--primary)"
        strokeWidth="3"
      />
      <circle cx="82" cy="30" r="6" fill="var(--gold)" />
    </svg>
  );
}

/** Briefcase motif for "no open positions" — jobs/roles context. */
function BriefcaseIllustration() {
  return (
    <svg
      viewBox="0 0 120 120"
      width="104"
      height="104"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="22"
        y="48"
        width="76"
        height="52"
        rx="6"
        stroke="var(--primary)"
        strokeWidth="3"
      />
      <rect
        x="46"
        y="30"
        width="28"
        height="20"
        rx="4"
        stroke="var(--primary)"
        strokeWidth="3"
      />
      <circle cx="60" cy="74" r="5" fill="var(--gold)" />
    </svg>
  );
}

/** Generic fallback for any empty state without a more specific motif. */
function DefaultIllustration() {
  return (
    <svg
      viewBox="0 0 120 120"
      width="104"
      height="104"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="26"
        y="24"
        width="68"
        height="72"
        rx="8"
        stroke="var(--primary)"
        strokeWidth="3"
      />
      <line
        x1="40"
        y1="56"
        x2="80"
        y2="56"
        stroke="var(--primary)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="80" cy="38" r="5" fill="var(--gold)" />
    </svg>
  );
}

const ILLUSTRATIONS: Record<EmptyStateVariant, () => React.ReactElement> = {
  tray: TrayIllustration,
  briefcase: BriefcaseIllustration,
  default: DefaultIllustration,
};

export function EmptyState({
  title,
  description,
  action,
  variant = "default",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Which custom SVG illustration to show above the title. Defaults to the
   *  generic fallback when the empty state has no more specific motif. */
  variant?: EmptyStateVariant;
}) {
  const Illustration = ILLUSTRATIONS[variant];

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
      <Illustration />
      <p className="mt-4 text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
