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
  gold: "bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] text-[color:var(--gold)]",
  // Semantic override, not part of the purple/gold pair — for tiles whose
  // subject is genuinely alarming (e.g. "Recent Warnings Issued"), where
  // gold read as too decorative/celebratory to communicate a warning.
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
  icon?: ComponentType<{ className?: string }>;
  /** Gives the card a subtle accent-tinted surface (used sparingly, e.g. one tip card). */
  accent?: boolean;
  /** Icon treatment — "plain" (default, every dashboard except below) or a
   *  small purple/gold chip (HR/Ops only, see ICON_TONE_CLASSES). */
  iconTone?: "plain" | "purple" | "gold" | "destructive";
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
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <span className={`flex size-8 items-center justify-center rounded-lg ${ICON_TONE_CLASSES[iconTone]}`}>
                  <Icon className="h-4.5 w-4.5" />
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
