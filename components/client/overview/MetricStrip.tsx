import Link from "next/link";
import { Reveal } from "@/components/applicant/motion";
import { formatPercent, share } from "@/lib/client/format";
import { attendanceHref, workforceHref } from "@/lib/client/links";
import type { ClientOverview } from "@/lib/client/types";
import { usePilotHidden } from "@/lib/pilot/context";

type Cell = { key: string; label: string; value: number; sub: string; href: string; tone?: "ok" | "bad" };

/**
 * The five headline numbers (brief section 9) as ONE divided strip: no icons,
 * no coloured circles. Colour only where it means something (a small olive dot
 * for present, a red dot for absent when someone is). Every figure comes from
 * ClientOverview.metrics and links into the underlying records. On phones the
 * strip scrolls sideways in a single row.
 */
export function MetricStrip({ ov }: { ov: ClientOverview }) {
  const m = ov.metrics;
  const hidden = usePilotHidden();
  const of = (n: number) => (m.scheduled ? `${formatPercent(share(n, m.scheduled))} of scheduled` : "No one scheduled");
  const cells: Cell[] = [
    { key: "active", label: "Active staff", value: m.activeStaff, sub: ov.scope === "all" ? "All outlets" : "This outlet", href: workforceHref() },
    { key: "present", label: "Present", value: m.present, sub: m.scheduled ? `${formatPercent(m.attendanceRate)} attendance` : "No one scheduled", href: attendanceHref({ status: "present", date: "today" }), tone: "ok" },
    { key: "late", label: "Late", value: m.late, sub: of(m.late), href: attendanceHref({ status: "late", date: "today" }) },
    { key: "absent", label: "Absent", value: m.absent, sub: of(m.absent), href: attendanceHref({ status: "absent", date: "today" }), tone: m.absent > 0 ? "bad" : undefined },
    { key: "leave", label: "On leave", value: m.onLeave, sub: of(m.onLeave), href: attendanceHref({ status: "on-leave", date: "today" }) },
  ];
  // Pilot menu: tiles that open a later-stage screen (Attendance) are left out; the strip keeps the rest.
  const shown = cells.filter((c) => !hidden(c.href));
  const cols = ["", "min-[768px]:grid-cols-1", "min-[768px]:grid-cols-2", "min-[768px]:grid-cols-3", "min-[768px]:grid-cols-4", "min-[768px]:grid-cols-5"][shown.length];
  return (
    <Reveal as="section" aria-label="Today at a glance" className={`flex overflow-x-auto max-[767px]:border-y max-[767px]:border-(--ap-line) min-[768px]:grid ${cols} min-[768px]:overflow-visible min-[768px]:rounded-[10px] min-[768px]:border min-[768px]:border-(--ap-line) min-[768px]:bg-(--ap-surface) [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
      {shown.map((c, i) => (
        <Link key={c.key} href={c.href} className={`flex min-w-[116px] shrink-0 flex-col gap-0.5 px-3.5 py-3 min-[768px]:min-w-0 min-[768px]:px-4 min-[768px]:hover:bg-(--ap-tint-soft) ${i > 0 ? "border-l border-(--ap-line-2)" : "max-[767px]:pl-0"}`}>
          <span className="flex items-center gap-1.5 text-[12px] text-(--ap-muted)">
            {c.tone ? <span aria-hidden="true" className={`size-1.5 rounded-full ${c.tone === "ok" ? "bg-(--calm-olive)" : "bg-(--ap-rose)"}`} /> : null}
            {c.label}
          </span>
          <b className="text-[22px] leading-tight font-semibold text-(--ap-ink) tabular-nums">{c.value}</b>
          <span className="truncate text-[11.5px] text-(--ap-muted)">{c.sub}</span>
        </Link>
      ))}
    </Reveal>
  );
}
