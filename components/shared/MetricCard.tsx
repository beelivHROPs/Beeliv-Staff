import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Small dashboard stat tile — reusable across role dashboards, built on the
 * real shadcn Card. Deliberately plain (value + label, optional trailing
 * element) per the implementation brief: "Do not make these generic
 * business metrics" — every value shown here must map to a real,
 * applicant-relevant fact, not an invented KPI.
 *
 * Hairline border + monochromatic-by-default icon (color reserved as a
 * signal, not decoration) per the "premium SaaS" pass — deliberately does
 * NOT hover-lift: docs/architecture/design-system.md §7 says static
 * dashboard summary cards don't lift since they're not clickable.
 */
const ICON_TONE_CLASSES = {
  // Default — plain, matches every dashboard except HR/Ops (see iconTone doc).
  plain: "text-muted-foreground",
  // Small purple/gold icon chips — HR/Ops's "high-end data design" pass
  // (project-lead direction). Kept to the icon only, not a card-wide
  // gradient/wash, so it stays inside design-system.md's "one gradient
  // moment per screen" restraint (the welcome header already spends that
  // budget) while still giving these two dashboards a visibly richer feel.
  purple: "bg-primary/10 text-primary",
  // Uses --tone-gold (lib/dashboard-accent.ts's DASHBOARD_TONE_BASE.gold —
  // HR's actual hero/nav/ring color), NOT the literal brand --gold token
  // (#C1AC75). Those are two different tokens that happen to share a name;
  // this previously pointed at --gold, so HR's icon chips rendered a warm
  // tan while the rest of HR's dashboard rendered purple (--tone-gold is
  // currently aliased to --primary) — project-lead: "hr icon color should
  // match the dashboard color instead of using gold." This stays in sync
  // automatically if --tone-gold's value ever changes.
  gold: "bg-[color-mix(in_srgb,var(--tone-gold)_18%,transparent)] text-[color:var(--tone-gold)]",
  // Client's own dashboard color (--tone-client, the logo hand's exact
  // sampled purple) — same "match the dashboard color" fix as gold above,
  // applied to Client (project-lead: "i think same thing fr the client as
  // well"). Client's tiles previously used the "plain" default (no chip at
  // all), not a wrong color, but the same principle applies: the icon
  // should read as belonging to this dashboard.
  slate: "bg-[color-mix(in_srgb,var(--tone-client)_18%,transparent)] text-[color:var(--tone-client)]",
  // Semantic override, not part of the purple/gold/slate set — for tiles
  // whose subject is genuinely alarming (e.g. "Recent Warnings Issued"),
  // where a dashboard tone read as too decorative to communicate a warning.
  destructive: "bg-destructive/10 text-destructive",
} as const;

export function MetricCard({
  label,
  value,
  caption,
  trailing,
  icon: Icon,
  accent = false,
  iconTone = "plain",
  chipShape = "square",
  surface = "default",
  solidColorVar,
  className,
}: {
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  trailing?: React.ReactNode;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Gives the card a subtle accent-tinted surface (used sparingly, e.g. one tip card). */
  accent?: boolean;
  /** Icon treatment — "plain" (default) or a small dashboard-tone chip
   *  (purple/gold/slate — one per dashboard's own color, see ICON_TONE_CLASSES). */
  iconTone?: "plain" | "purple" | "gold" | "slate" | "destructive";
  /** Icon chip shape — "square" (default, rounded-lg) everywhere except
   *  where a page opts into "circle" (rounded-full), matching a specific
   *  reference's circular icon chips. Scoped per call site rather than
   *  changed globally so other dashboards' existing chips don't shift. */
  chipShape?: "square" | "circle";
  /** "default" (white card, tinted icon chip) or "solid" — the whole tile
   *  fills with one brand color and the icon sits in a translucent white
   *  circle, matching the vivid colorful stat-card row in the "Jobie"
   *  reference (project-lead: "i love to use this for the ops"). Opt-in
   *  per call site — other dashboards' tiles are untouched. */
  surface?: "default" | "solid";
  /** Raw CSS color for surface="solid" (e.g. "var(--primary)",
   *  "var(--chart-2)") — lets each tile in a row use a different brand
   *  shade, like the reference's own row of differently-colored cards,
   *  without inventing a new named tone per shade. */
  solidColorVar?: string;
  className?: string;
}) {
  // Minimal on mobile (no shadow/ring, softer radius), the fuller "card"
  // treatment from sm: up — project-lead: the stack of bordered/shadowed
  // tiles read as separate floating "modals" on a phone screen. Desktop
  // keeps the premium rounded-2xl/shadow-sm look from the HR/Ops/Client
  // passes; ring stays off at every size (see those dashboards' own
  // ring-0 notes) rather than just at mobile width.
  const RESPONSIVE_CHROME = "rounded-xl shadow-none ring-0 sm:rounded-2xl sm:shadow-sm";

  // Subtle neumorphism (project-lead: "a subtle touch on a few elements",
  // not a full soft-UI rework of every card) — a soft dual light/dark
  // shadow on just the icon chip, so it reads as gently raised off its own
  // surface instead of the flat tinted circle it was before. Two variants:
  // a lighter dual-shadow for chips sitting on a white/light card, a
  // darker-leaning one for the translucent chip on a solid-color tile
  // (surface="solid"), since a bright highlight would wash out there.
  const NEUMORPHIC_CHIP_LIGHT = "shadow-[3px_3px_6px_rgba(0,0,0,0.08),-3px_-3px_6px_rgba(255,255,255,0.85)]";
  const NEUMORPHIC_CHIP_ON_COLOR = "shadow-[2px_2px_5px_rgba(0,0,0,0.2),-1px_-1px_4px_rgba(255,255,255,0.15)]";

  if (surface === "solid") {
    return (
      <Card
        size="sm"
        className={cn(RESPONSIVE_CHROME, "border-none text-white", className)}
        style={{ backgroundColor: solidColorVar ?? "var(--primary)" }}
      >
        <CardContent>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {Icon ? (
                <span
                  className={`flex size-10 shrink-0 items-center justify-center bg-white/20 ${NEUMORPHIC_CHIP_ON_COLOR} ${chipShape === "circle" ? "rounded-full" : "rounded-lg"}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </span>
              ) : null}
              <p className="text-sm text-white/70">{label}</p>
            </div>
            {trailing}
          </div>
          <div className="font-heading mt-2 text-2xl font-semibold">{value}</div>
          {caption ? <div className="mt-1 text-sm text-white/70">{caption}</div> : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      size="sm"
      className={cn(RESPONSIVE_CHROME, accent ? "bg-accent/60 ring-primary/15" : "border-border/80", className)}
    >
      <CardContent>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {Icon ? (
              iconTone === "plain" ? (
                <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" strokeWidth={2.25} />
              ) : (
                <span
                  className={`flex size-10 shrink-0 items-center justify-center ${NEUMORPHIC_CHIP_LIGHT} ${chipShape === "circle" ? "rounded-full" : "rounded-lg"} ${ICON_TONE_CLASSES[iconTone]}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </span>
              )
            ) : null}
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
          {trailing}
        </div>
        <div className="font-heading mt-2 text-2xl font-semibold text-foreground">
          {value}
        </div>
        {caption ? <div className="mt-1 text-sm text-muted-foreground">{caption}</div> : null}
      </CardContent>
    </Card>
  );
}
