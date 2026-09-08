// Solid-button color per dashboard, matching each role's nav color
// (components/layout/AppShell.tsx's NAV_TONE_STYLES) — project-lead
// direction: primary actions should read as belonging to that dashboard,
// not always default purple. Keys match AppShell's `navTone` prop values.
//
// Fully explicit, ready-to-use classNames (base button layout + size="default"
// utilities from components/ui/button.tsx, copied verbatim, plus our own
// color) — NOT buttonVariants({variant, className}). Two earlier attempts
// through buttonVariants both failed silently: overriding the "default"
// variant's baked-in `bg-primary` with a `bg-[color-mix(...)]` className
// didn't actually replace it (tailwind-merge doesn't reliably dedupe a
// complex arbitrary-value class against it — same root cause as the
// invisible-text bug on app/not-found.tsx's button), and swapping to
// `variant: "ghost"` just traded that bug for a hover-state one (ghost's
// own `hover:bg-muted` competing with ours). Building the full string
// ourselves, with no variant() call at all, means there is nothing else in
// the class list for these colors to conflict with.
// active:scale-[0.99] kept in sync with button.tsx's own buttonVariants
// base — see that file's comment for why this exists.
const BASE =
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none h-10 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px active:not-aria-[haspopup]:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

export const DASHBOARD_ACCENT_BG: Record<"purple" | "gold" | "lavender" | "slate", string> = {
  purple: `${BASE} bg-primary text-primary-foreground hover:bg-primary/90`,
  gold: `${BASE} bg-[color:var(--tone-gold)] text-white hover:brightness-110`,
  lavender: `${BASE} bg-[color:var(--chart-2)] text-white hover:brightness-110`,
  slate: `${BASE} bg-[color:var(--tone-client)] text-white hover:brightness-125`, // Client has no buttons (read-only) — kept in sync anyway.
};

// Same per-dashboard base color, as a raw CSS value instead of a Tailwind
// class — shared by components/shared/HeroStatCard.tsx and ProgressRing.tsx
// so a dashboard's hero card, its ring charts, and its nav/buttons all
// resolve to the exact same anchor token instead of three separate copies
// drifting apart.
export const DASHBOARD_TONE_BASE: Record<"purple" | "gold" | "lavender" | "slate", string> = {
  purple: "var(--primary)",
  gold: "var(--tone-gold)",
  lavender: "var(--chart-2)",
  // --tone-client (globals.css) — the logo hand's exact sampled color, not
  // a diluted mix with --foreground. "it's close to black" / "it's deep
  // purple": a 78/22 blend toward plain --foreground read as too washed
  // toward black; the real hand color, used at full strength, is already
  // a genuine deep purple on its own.
  slate: "var(--tone-client)",
};
