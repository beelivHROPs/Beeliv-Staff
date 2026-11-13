/**
 * Shared "premium kit" tones. Colours come only from the per-app CSS variables
 * (--ap-*), with neutral fallbacks, so Applicant, Client and Admin (light and dark)
 * theme the kit without any code change.
 *
 * Tints carry meaning, never decoration:
 *   sand     = you owe something (an action is waiting on you)
 *   sage     = good news / done
 *   lavender = waiting / information
 *   rose     = urgent only
 */
export const TONE = {
  sand: "bg-[color-mix(in_srgb,var(--ap-warn-bg,#fff0b3)_70%,transparent)] text-(--ap-warn,#8a5a00)",
  sage: "bg-[color-mix(in_srgb,var(--ap-ok-bg,#dcfce7)_80%,transparent)] text-(--ap-ok,#15803d)",
  lavender: "bg-[color-mix(in_srgb,var(--ap-lilac,#efe6f7)_85%,var(--ap-tint-soft,#fff))] text-(--ap-violet,#5b087b)",
  rose: "bg-[color-mix(in_srgb,var(--ap-rose-bg,#ffe4e6)_80%,transparent)] text-(--ap-rose,#be123c)",
  plain: "bg-(--ap-surface,#fff) text-(--ap-violet,#5b087b)",
} as const;
export type Tone = keyof typeof TONE;

/** Arc colour per tone (SVG stroke). */
export const TONE_ARC: Record<Tone, string> = {
  sand: "var(--ap-warn,#8a5a00)",
  sage: "var(--ap-ok,#15803d)",
  lavender: "var(--ap-violet,#5b087b)",
  rose: "var(--ap-rose,#be123c)",
  plain: "var(--ap-violet,#5b087b)",
};

/** Soft two-layer lift used by the kit's cards. */
export const LIFT = "shadow-[0_1px_2px_rgba(41,32,82,.05),0_14px_28px_-14px_rgba(41,32,82,.22)]";

/** Quiet card surface (white, hairline). */
export const SURFACE = "border border-(--ap-line,#eae2f1) bg-(--ap-surface,#fff)";
