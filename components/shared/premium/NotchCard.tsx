import Link from "next/link";
import type { CSSProperties, ElementType, ReactNode } from "react";

/**
 * NotchCard: a large rounded card with a real circular notch cut out of one corner.
 * The cut is a CSS radial-gradient mask on the background layer, so the page behind
 * (any colour, light or dark) shows through. A round outlined badge sits in the notch.
 *
 * - Pass `href` to make the whole card ONE link. Without `href` the card is an
 *   `article` (use this when the body holds its own button/link; never nest links).
 * - `badge` is the notch content (a duration, a count, a PremiumRing, an icon).
 *   `badgeLabel` is the accessible name for the badge (visually hidden text).
 * - The focus ring is a drop-shadow on the masked layer, so it follows the notch.
 * - Body text wraps around the notch through a floated spacer; no overlap.
 */
export type NotchTone = "lavender" | "sage" | "plum" | "plain";
export type NotchCorner = "top-right" | "top-left" | "bottom-right" | "bottom-left";

const TONES: Record<NotchTone, { bg: string; ink: string; badgeBg: string }> = {
  lavender: {
    bg: "color-mix(in srgb, var(--ap-lilac,#efe6f7) 85%, var(--ap-tint-soft,#fff))",
    ink: "var(--ap-ink,#11111b)",
    badgeBg: "var(--ap-surface,#fff)",
  },
  sage: {
    bg: "color-mix(in srgb, var(--ap-ok-bg,#dcfce7) 90%, var(--ap-surface,#fff))",
    ink: "var(--ap-ink,#11111b)",
    badgeBg: "var(--ap-surface,#fff)",
  },
  plum: {
    bg: "var(--pk-plum,var(--ap-plum,#2a0b47))",
    ink: "#fff",
    badgeBg: "var(--pk-plum,var(--ap-plum,#2a0b47))",
  },
  plain: {
    bg: "var(--ap-surface,#fff)",
    ink: "var(--ap-ink,#11111b)",
    badgeBg: "var(--ap-surface,#fff)",
  },
};

export function NotchCard({
  tone = "lavender",
  badge,
  badgeLabel,
  notchSize = 76,
  corner = "top-right",
  as,
  href,
  children,
  className = "",
  onClick,
  wrap = true,
  bodyClassName = "p-4",
  outlined = true,
}: {
  /** Draw the standard 1px card hairline (--nc-line, default --ap-line) round the card AND the notch curve (default true). */
  outlined?: boolean;
  bodyClassName?: string;
  /** Float a spacer so body text wraps round the notch. Set false when the body is a grid/flex layout that reserves its own space. */
  wrap?: boolean;
  tone?: NotchTone;
  badge?: ReactNode;
  /** Accessible name of the badge; rendered as visually hidden text. */
  badgeLabel?: string;
  /** Diameter of the cut in px. The badge is notchSize - 16. */
  notchSize?: number;
  corner?: NotchCorner;
  as?: "article" | "div" | "section" | "li" | "button";
  href?: string;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const t = TONES[tone];
  const badgeSize = notchSize - 16;
  const r = notchSize / 2;
  const centre = r - 4; // the cut bites 4px past the card edge, like the reference
  const top = corner.startsWith("top");
  const right = corner.endsWith("right");
  // The shape layer is inset 1px when outlined, so its mask centre is 1px closer to the corner than the badge's.
  const mc = outlined ? centre - 1 : centre;
  const cx = right ? `calc(100% - ${mc}px)` : `${mc}px`;
  const cy = top ? `${mc}px` : `calc(100% - ${mc}px)`;
  // ONE line token: --nc-line, defaulting to the app's standard card border (--ap-line). Badge ring = same line, one step stronger.
  const line = tone === "plum" ? "rgba(255,255,255,.28)" : "var(--nc-line,var(--ap-line,#eae2f1))";
  const ring = tone === "plum" ? "rgba(255,255,255,.6)" : `color-mix(in srgb, ${line} 60%, ${t.ink})`;
  const mask = `radial-gradient(circle at ${cx} ${cy}, transparent ${r}px, #000 ${r + 0.75}px)`;

  const Tag: ElementType = href ? Link : (as ?? "article");
  const tagProps = href ? { href } : as === "button" ? { type: "button", onClick } : {};

  const badgePos: CSSProperties = {
    width: badgeSize,
    height: badgeSize,
    [top ? "top" : "bottom"]: centre - badgeSize / 2,
    [right ? "right" : "left"]: centre - badgeSize / 2,
    borderColor: ring,
    background: t.badgeBg,
    color: t.ink,
  };

  return (
    <Tag
      {...tagProps}
      style={{ color: t.ink }}
      className={`group relative block rounded-[24px] text-left transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none ${className}`}
    >
      {/* Shape layer: lift and focus ring are drop-shadows so they follow the notch. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-[filter] duration-200 [filter:drop-shadow(0_1px_1px_rgba(41,32,82,.05))_drop-shadow(0_3px_4px_rgba(41,32,82,.05))] group-focus-visible:[filter:drop-shadow(3px_0_0_var(--ap-violet,#5b087b))_drop-shadow(-3px_0_0_var(--ap-violet,#5b087b))_drop-shadow(0_3px_0_var(--ap-violet,#5b087b))_drop-shadow(0_-3px_0_var(--ap-violet,#5b087b))]"
      >
        {/* Outline layer: four hard 1px drop-shadows of the masked shape, so the hairline follows the corners AND the notch curve.
            The shape is inset by 1px so the line stays inside the card box (a scroll-snap parent with overflow-x-auto would clip it on top). */}
        <span className="absolute block" style={{ inset: outlined ? 1 : 0, filter: outlined ? ["1px 0", "-1px 0", "0 1px", "0 -1px"].map((o) => `drop-shadow(${o} 0 ${line})`).join(" ") : undefined }}>
          <span
            className="block size-full rounded-[23px]"
            style={{ background: t.bg, WebkitMaskImage: badge !== undefined ? mask : undefined, maskImage: badge !== undefined ? mask : undefined }}
          />
        </span>
      </span>

      {badge !== undefined ? (
        <span className="absolute z-[1] inline-flex items-center justify-center rounded-full border-[1.5px] text-center text-[13px] leading-tight font-bold" style={badgePos}>
          {badgeLabel ? <span className="sr-only">{badgeLabel}</span> : null}
          <span aria-hidden={badgeLabel ? "true" : undefined} className="flex items-center justify-center">{badge}</span>
        </span>
      ) : null}

      <div className={`relative z-[1] ${bodyClassName}`}>
        {/* Floated spacer so first lines of text wrap around the notch. */}
        {badge !== undefined && wrap ? (
          <span
            aria-hidden="true"
            style={{ float: right ? "right" : "left", width: notchSize - 8, height: top ? notchSize - 8 : 0, marginTop: top ? -4 : 0, marginRight: right ? -4 : 0, marginLeft: right ? 0 : -4 }}
          />
        ) : null}
        {children}
      </div>
    </Tag>
  );
}
