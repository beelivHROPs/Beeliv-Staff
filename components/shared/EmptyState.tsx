// Illustration upgrade per docs/architecture/design-system.md §11 (project lead,
// 2026-09-02): custom inline SVG only — no illustration library, no stock imagery.
// Each variant is 2-3 simple geometric shapes, single-color or purple/gold duotone.
// Purely decorative + static markup, so this stays a server component (no "use client").
//
// Second pass ("make them look more interesting" — the first version read as
// skeletal: a thin-stroked rectangle/line and one small gold dot). Same shape
// count and constraint, executed with more craft: a soft tinted-circle backdrop
// (the same "icon chip" language MetricCard already uses), bolder rounded
// strokes, and the gold accent as a deliberate small badge instead of a
// leftover dot.

type EmptyStateVariant = "tray" | "briefcase" | "default";

/** Shared backdrop wash behind every illustration's shapes — the actual
 *  "more interesting" fix: these read as flat line art with nothing behind
 *  them, unlike every other icon surface in this app (MetricCard's chips,
 *  HeroStatCard's decorative circle) which all sit on a soft tinted circle. */
function Backdrop() {
  return <circle cx="60" cy="60" r="54" fill="var(--primary)" opacity="0.06" />;
}

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
      <Backdrop />
      <rect
        x="38"
        y="18"
        width="46"
        height="58"
        rx="5"
        transform="rotate(-6 38 18)"
        stroke="var(--primary)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M20 70 L100 70 L86 98 L34 98 Z"
        stroke="var(--primary)"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="86" cy="28" r="9" fill="var(--gold)" />
      <path
        d="M82.5 28 L85 30.5 L90 25"
        stroke="var(--gold-foreground)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      <Backdrop />
      <rect
        x="20"
        y="46"
        width="80"
        height="54"
        rx="7"
        stroke="var(--primary)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M44 46 L44 34 Q44 28 50 28 L70 28 Q76 28 76 34 L76 46"
        stroke="var(--primary)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="20"
        y1="70"
        x2="100"
        y2="70"
        stroke="var(--primary)"
        strokeWidth="4"
        opacity="0.35"
      />
      <circle cx="60" cy="70" r="7" fill="var(--gold)" />
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
      <Backdrop />
      <rect
        x="24"
        y="22"
        width="72"
        height="76"
        rx="9"
        stroke="var(--primary)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <line
        x1="38"
        y1="50"
        x2="82"
        y2="50"
        stroke="var(--primary)"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.5"
      />
      <line
        x1="38"
        y1="66"
        x2="68"
        y2="66"
        stroke="var(--primary)"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.3"
      />
      <circle cx="84" cy="34" r="9" fill="var(--gold)" />
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
