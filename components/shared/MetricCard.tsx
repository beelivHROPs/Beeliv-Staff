import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";

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
}) {
  return (
    <Card
      size="sm"
      className={accent ? "bg-accent/60 ring-primary/15" : "border-border/80"}
    >
      <CardContent>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {Icon ? (
              iconTone === "plain" ? (
                <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={2.25} />
              ) : (
                <span className={`flex size-9 items-center justify-center rounded-lg ${ICON_TONE_CLASSES[iconTone]}`}>
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </span>
              )
            ) : null}
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
          {trailing}
        </div>
        <div className="font-heading mt-1.5 text-xl font-semibold text-foreground">
          {value}
        </div>
        {caption ? <div className="mt-1 text-xs text-muted-foreground">{caption}</div> : null}
      </CardContent>
    </Card>
  );
}
