"use client";

/**
 * Compact "At a glance" strip for Admin Home: four of the key numbers, linking
 * to the full page. Renders nothing while loading or when there is nothing to
 * count, so it never adds an error or empty block to Home.
 */
import Link from "next/link";
import { GlanceTileCard } from "@/components/admin/glance/GlanceTiles";
import { useGlance } from "@/lib/admin/glance/hooks";

const SHOW = ["placements", "jobs", "requests", "waiting"];

export function GlanceStrip() {
  const { data, status } = useGlance("hr");
  if (status !== "ready" || !data) return null;
  const tiles = SHOW.map((k) => data.tiles.find((t) => t.key === k)).filter((t) => !!t);
  return (
    <section aria-label="At a glance" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-bold text-(--ap-ink)">At a glance</h2>
        <Link href="/admin/reports/glance" className="text-[13px] font-bold text-(--ap-violet)">
          See all numbers
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5 min-[768px]:grid-cols-4 min-[768px]:gap-3.5">
        {tiles.map((t) => (
          <GlanceTileCard key={t.key} t={t} compact />
        ))}
      </div>
    </section>
  );
}
