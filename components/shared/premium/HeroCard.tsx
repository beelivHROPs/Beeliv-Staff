import type { ReactNode } from "react";

/** Quiet concentric rings and a dot grid. Decorative only. */
function HeroDeco({ id }: { id: string }) {
  return (
    <svg className="pointer-events-none absolute inset-0 -z-10 size-full" viewBox="0 0 360 240" preserveAspectRatio="xMaxYMin slice" aria-hidden="true">
      <defs>
        <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="#fff" fillOpacity=".16" />
        </pattern>
      </defs>
      <rect x="0" y="120" width="190" height="120" fill={`url(#${id})`} />
      <circle cx="310" cy="40" r="120" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="1.5" />
      <circle cx="310" cy="40" r="84" fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="1.5" />
      <circle cx="310" cy="40" r="48" fill="#fff" fillOpacity=".06" />
      <circle cx="40" cy="250" r="90" fill="var(--ap-gold,#c1ac75)" fillOpacity=".14" />
    </svg>
  );
}

/**
 * The ONE strong colour block on a screen: gradient (from --pk-hero, else --ap-gradient),
 * dot pattern and rings. Max once per page. Content is white on the gradient.
 * Put at most one action inside (the shared hero button).
 */
export function HeroCard({ eyebrow, title, children, aside, className = "", as: Tag = "section", ariaLabel }: {
  eyebrow?: string;
  title?: ReactNode;
  children?: ReactNode;
  /** Optional right-hand slot (a ring or an icon disc). */
  aside?: ReactNode;
  className?: string;
  as?: "section" | "div";
  ariaLabel?: string;
}) {
  return (
    <Tag aria-label={ariaLabel} style={{ background: "var(--pk-hero, var(--ap-gradient, linear-gradient(150deg,#2f2166,#4f3aa8 46%,#8f7de6)))" }} className={`relative isolate overflow-hidden rounded-[26px] p-5 text-white shadow-[0_18px_36px_-16px_rgba(20,10,40,.55)] sm:p-6 ${className}`}>
      <HeroDeco id="pk-hero-dots" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className="text-[13px] font-semibold tracking-wide text-white/80 uppercase">{eyebrow}</p> : null}
          {title ? <h2 className="mt-1 text-[24px] leading-tight font-bold text-balance">{title}</h2> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children ? <div className="mt-3 text-[15px] leading-snug text-white/90">{children}</div> : null}
    </Tag>
  );
}
