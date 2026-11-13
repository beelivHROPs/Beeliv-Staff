import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";

/**
 * The one button language for the Applicant app and the public site (project lead, 2026-10-19).
 * Mirrors the Staff ActionPill (components/staff/kit.tsx): same pill shape, colours, 48px height,
 * focus ring and pressed state. API: variant dark | purple | outline | ghost, size default | compact,
 * optional round icon disc on the left, optional circular arrow on the right, loading, disabled,
 * renders a link when `href` is given and a button otherwise.
 *
 * HERO / MAIN actions: pass `icon` and `arrow` (or the shorthand `hero`). Everything else (small,
 * secondary, quiet): leave both off for the plain pill. Colours come from the --ap-* tokens of the
 * Applicant theme and fall back to the public site's --beeliv-purple, so it works in both themes.
 */

type Icon = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
type Variant = "dark" | "purple" | "outline" | "ghost";

/* Literal class names only (Tailwind cannot see interpolated ones). Violet = --ap-violet, else public --beeliv-purple. */
const TONE: Record<Variant, { box: string; lead: string; tail: string }> = {
  dark: {
    box: "bg-[#1b1340] text-white hover:bg-[#2a1d5e]",
    lead: "bg-[#c1ac75] text-[#1b1340]",
    tail: "bg-white/12",
  },
  purple: {
    box: "bg-[var(--ap-violet,var(--beeliv-purple,#5b087b))] text-white hover:bg-[var(--ap-plum,var(--deep-plum,#250044))]",
    lead: "bg-white/22 text-white",
    tail: "bg-white/16",
  },
  outline: {
    box: "bg-white text-[var(--ap-ink,#11111b)] shadow-[inset_0_0_0_1.5px_var(--ap-line,#eae2f1)] hover:bg-[var(--ap-tint,#f6effa)]",
    lead: "bg-[var(--ap-tint-2,#ecdff4)] text-[var(--ap-violet,var(--beeliv-purple,#5b087b))]",
    tail: "bg-[var(--ap-tint-2,#ecdff4)] text-[var(--ap-violet,var(--beeliv-purple,#5b087b))]",
  },
  ghost: {
    box: "bg-transparent text-[var(--ap-violet,var(--beeliv-purple,#5b087b))] hover:bg-[var(--ap-tint,#f6effa)]",
    lead: "bg-[var(--ap-tint-2,#ecdff4)] text-[var(--ap-violet,var(--beeliv-purple,#5b087b))]",
    tail: "",
  },
};

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 animate-spin motion-reduce:animate-none" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ActionButton({
  icon: I,
  children,
  href,
  onClick,
  variant = "purple",
  compact = false,
  hero = false,
  arrow,
  disabled = false,
  loading = false,
  type = "button",
  className = "",
  ariaLabel,
  form,
}: {
  icon?: Icon;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  /** Card-level size (inline width, 48px). Default is the full-width main size (52px). */
  compact?: boolean;
  /** Shorthand for a main action: arrow on the right (pass `icon` for the left disc). */
  hero?: boolean;
  /** Circular arrow on the right. Defaults to `hero`. */
  arrow?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  className?: string;
  ariaLabel?: string;
  form?: string;
}) {
  const t = TONE[variant];
  const off = disabled || loading;
  const showArrow = (arrow ?? hero) && variant !== "ghost";
  const showLead = Boolean(I) || loading;
  const disc = compact ? "size-9" : "size-10 md:size-8";
  const size = compact
    ? "min-h-12 gap-2.5 text-[15px]"
    : hero || showArrow || showLead
      ? "min-h-[52px] gap-3 text-base md:min-h-12 md:gap-3.5 md:text-[15px]"
      : "min-h-12 gap-2.5 text-[15px]";
  const pad = showLead ? "pl-1.5" : "pl-6";
  const padR = showArrow ? "pr-1.5" : "pr-6";
  const cls = `relative inline-flex items-center justify-center rounded-full font-bold whitespace-nowrap transition-[transform,background-color] duration-150 active:scale-[.985] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ap-violet,var(--beeliv-purple,#5b087b))] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ap-bg,#faf9f7)] ${size} ${pad} ${padR} ${showArrow || showLead ? "justify-between text-left" : ""} ${t.box} ${off ? "pointer-events-none opacity-60" : ""} ${className}`;
  const inner = (
    <>
      {showLead ? (
        <span className={`flex ${disc} shrink-0 items-center justify-center rounded-full ${t.lead}`}>
          {loading ? <Spinner /> : I ? <I className="size-5" aria-hidden="true" /> : null}
        </span>
      ) : null}
      <span className={showArrow || showLead ? "flex-1" : ""}>{children}</span>
      {showArrow ? (
        <span className={`flex ${disc} shrink-0 items-center justify-center rounded-full ${t.tail}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      ) : null}
    </>
  );
  if (href && !off) {
    return (
      <Link href={href} onClick={onClick} aria-label={ariaLabel} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} form={form} onClick={onClick} disabled={off} aria-busy={loading || undefined} aria-label={ariaLabel} className={cls}>
      {inner}
    </button>
  );
}
