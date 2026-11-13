"use client";

/**
 * Phone "At a glance" block for Reports (2x2 numbers in one container). The Admin Home itself is
 * RoleHome.tsx (one layout, per-role recipes in home-recipes.ts).
 */
import Link from "next/link";
import { ChevronRight } from "@/components/applicant/icons";
import { useGlance } from "@/lib/admin/glance/hooks";

const BOX = "overflow-hidden rounded-[24px] bg-(--ap-surface) shadow-[0_1px_2px_rgba(41,32,82,.04),0_14px_30px_-16px_rgba(41,32,82,.2)]";

export function PhoneGlance() {
  const { data, status } = useGlance("hr");
  if (status !== "ready" || !data) return null;
  const tiles = ["placements", "jobs", "requests", "waiting"].map((k) => data.tiles.find((t) => t.key === k)).filter((t) => !!t);
  if (tiles.length === 0) return null;
  return (
    <section aria-label="At a glance" className="min-[768px]:hidden">
      <div className={BOX}>
        <div className="grid grid-cols-2">
          {tiles.map((t, i) => (
            <Link key={t.key} href={t.href} className={`flex min-h-[84px] flex-col justify-between gap-1 px-4 py-3 active:bg-(--ap-tint-soft) ${i % 2 === 1 ? "border-l border-(--ap-line-2)" : ""} ${i > 1 ? "border-t border-(--ap-line-2)" : ""}`}>
              <span className="text-[12.5px] leading-tight text-(--ap-muted)">{t.label}</span>
              <b className="text-[22px] leading-none font-semibold text-(--ap-ink) tabular-nums">{t.value}</b>
            </Link>
          ))}
        </div>
        <Link href="/admin/reports/glance" className="flex min-h-11 items-center justify-between border-t border-(--ap-line-2) px-4 text-[13px] font-semibold text-(--ap-violet)">
          All numbers
          <ChevronRight className="size-4 text-(--ap-faint)" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
