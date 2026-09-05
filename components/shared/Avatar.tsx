import { useId } from "react";

/**
 * Beeliv avatar system.
 *
 * Primary: a hand-built vector "portrait bust" (gradient ground + silhouette
 * shape) — a stand-in that establishes the shape/tone-diversity/gradient
 * logic, ported from the approved Applicant Portal design artifact. This is
 * NOT the "editorial / semi-anime illustrated" artwork described in the
 * design brief — real character art needs a commissioned illustrator or an
 * image-generation pipeline, which is out of scope for this implementation
 * pass. Swap `illustrated` for real artwork later without touching callers.
 *
 * Fallback: initials, per "initials should be the fallback, not the primary
 * visual experience."
 *
 * `useId()`-based gradient id (was a fixed `beeliv-avatar-bg` id): with more
 * than one illustrated Avatar rendered on the same page (e.g.
 * components/shared/AvatarStack.tsx), a fixed SVG gradient id collides
 * across instances — the DOM has multiple elements with the same id, which
 * is invalid, and every instance's `url(#beeliv-avatar-bg)` reference
 * resolves to whichever definition the browser finds first, so every
 * avatar silently rendered with the SAME gradient regardless of the `tone`
 * prop. Same class of bug already fixed twice this session
 * (components/shared/TrendChart.tsx, components/shared/ProgressRing.tsx).
 */

const SIZE_CLASSES = {
  sm: "h-[30px] w-[30px]",
  md: "h-10 w-10",
  lg: "h-[60px] w-[60px]",
  xl: "h-[84px] w-[84px]",
} as const;

export type AvatarSize = keyof typeof SIZE_CLASSES;

// Background-gradient tone presets — brand-derived (design-system.md §1's
// primary/gold ramps), not arbitrary colors. `default` is unchanged from
// the original single hardcoded gradient, so every existing call site
// (header, sidebar identity, dashboard cards) looks exactly as before.
const TONE_GRADIENTS = {
  default: ["#FBF3E4", "#D9BFE0"],
  purple: ["#F5F1F8", "#B48FC9"],
  plum: ["#F0E4F5", "#8F5FAE"],
  gold: ["#FBF9F3", "#DAC89E"],
  amber: ["#FDF6EC", "#CDBA88"],
} as const;

export type AvatarTone = keyof typeof TONE_GRADIENTS;

export function Avatar({
  name,
  size = "md",
  ring = false,
  illustrated = true,
  tone = "default",
}: {
  /** Full name — used for the accessible label and the initials fallback. */
  name: string;
  size?: AvatarSize;
  /** Adds the gold "this is you" ring used in the header/sidebar identity slots. */
  ring?: boolean;
  /** Set false to force the initials fallback (e.g. for generic/sample users). */
  illustrated?: boolean;
  /** Background-gradient variant — for contexts needing visual variety across
   *  several avatars at once (e.g. AvatarStack). Every other call site
   *  leaves this at "default", unchanged from before this prop existed. */
  tone?: AvatarTone;
}) {
  const gradientId = `beeliv-avatar-bg-${useId().replace(/:/g, "")}`;
  const [from, to] = TONE_GRADIENTS[tone];
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const ringClass = ring
    ? "shadow-[0_0_0_2px_var(--card),0_0_0_3.5px_var(--gold),0_2px_6px_rgb(193_172_117_/_0.35)]"
    : "shadow-[0_1px_3px_rgb(26_22_33_/_0.12)]";

  return (
    <span
      role="img"
      aria-label={name}
      className={`inline-block shrink-0 overflow-hidden rounded-full ${SIZE_CLASSES[size]} ${ringClass}`}
    >
      {illustrated ? (
        <svg viewBox="0 0 64 64" className="h-full w-full">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={from} />
              <stop offset="100%" stopColor={to} />
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="32" fill={`url(#${gradientId})`} />
          <path d="M9 66 Q9 42 32 42 Q55 42 55 66 Z" fill="#8B5E3C" />
          <path
            d="M32 42 Q46 42 52 52 L55 66 L38 66 Q36 54 32 42Z"
            fill="#9C6B45"
            opacity={0.55}
          />
          <ellipse cx="32" cy="27" rx="12.5" ry="13.5" fill="#8B5E3C" />
          <path
            d="M20.5 27 Q19.5 20 32 20 Q44.5 20 43.5 27"
            fill="#9C6B45"
            opacity={0.4}
          />
          <path
            d="M18 24 Q17 9 32 9 Q47 9 46 24 Q46 15 39 14 Q33 21 20 19 Q19 21 18 24Z"
            fill="#2D2836"
          />
          <path
            d="M12 18 A22 22 0 0 1 38 7"
            stroke="rgba(255,255,255,.55)"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-accent text-xs font-semibold text-accent-foreground">
          {initials}
        </span>
      )}
    </span>
  );
}
