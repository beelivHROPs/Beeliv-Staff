"use client";

/**
 * Big number tiles for Business at a glance. Reused: Disc (icon circle), the
 * ap-card / ap-card-hover look of the Home MetricStrip. Arrow colour is never the
 * only signal: the words ("2 more than last month") always say it.
 */
import Link from "next/link";
import { Disc, type DiscTone } from "@/components/admin/overview/Disc";
import { Briefcase, Clock3, FileText, ShieldCheck, Users } from "@/components/applicant/icons";
import type { LucideIcon } from "@/components/applicant/icons";
import { Building } from "@/components/client/icons";
import type { GlanceDelta, GlanceIcon, GlanceTile } from "@/lib/admin/glance/types";

const ICON: Record<GlanceIcon, { icon: LucideIcon; tone: DiscTone }> = {
  placements: { icon: ShieldCheck, tone: "ok" },
  days: { icon: Clock3, tone: "info" },
  jobs: { icon: Briefcase, tone: "brand" },
  requests: { icon: FileText, tone: "pending" },
  waiting: { icon: Building, tone: "urgent" },
  staff: { icon: Users, tone: "brand" },
};

export function DeltaLine({ d }: { d: GlanceDelta }) {
  const color = d.good === null ? "text-(--ap-muted)" : d.good ? "text-(--ap-ok)" : "text-(--ap-rose)";
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-semibold ${color}`}>
      {d.dir !== "same" ? (
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {d.dir === "up" ? <path d="M12 19V5M6 11l6-6 6 6" /> : <path d="M12 5v14M6 13l6 6 6-6" />}
        </svg>
      ) : null}
      {d.text}
    </span>
  );
}

export function GlanceTileCard({ t, compact = false }: { t: GlanceTile; compact?: boolean }) {
  const i = ICON[t.icon];
  return (
    <Link href={t.href} className="ap-card ap-card-hover flex min-w-0 flex-col gap-2.5 rounded-2xl p-3.5 min-[768px]:p-4">
      <Disc icon={i.icon} tone={i.tone} />
      <span className="min-w-0 leading-tight">
        <b className="ap-serif block text-[36px] font-bold tracking-tight text-(--ap-ink) tabular-nums">{t.value}</b>
        <span className="block text-[14px] font-semibold text-(--ap-ink-2)">{t.label}</span>
        {t.sub ? <span className={`mt-1 block text-[12px] ${t.subTone === "bad" ? "font-semibold text-(--ap-rose)" : "text-(--ap-muted)"}`}>{t.sub}</span> : null}
        {t.delta && !compact ? (
          <span className="mt-1 block">
            <DeltaLine d={t.delta} />
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function GlanceTiles({ tiles }: { tiles: GlanceTile[] }) {
  return (
    <section aria-label="Key numbers" className="grid grid-cols-2 gap-2.5 min-[768px]:grid-cols-3 min-[768px]:gap-3.5 min-[1241px]:grid-cols-6">
      {tiles.map((t) => (
        <GlanceTileCard key={t.key} t={t} />
      ))}
    </section>
  );
}
