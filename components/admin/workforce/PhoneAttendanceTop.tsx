"use client";

/**
 * Admin Attendance, PHONE top block only (<768px), the approved mid-ground look:
 * ONE hero (on-time rate, small caps label, range control, thin trend line), three pastel count cards
 * (On time, Late, Absent for today) and ONE row of status pills that filter the records.
 * Numbers come from the existing `page.today` counts and the HR overview series; nothing new. Desktop keeps SummaryLine.
 */
import dynamic from "next/dynamic";
import { useState } from "react";
import { CountCards, HeroRange, PhoneHero } from "@/components/admin/PhoneHero";
import { ListTabs } from "@/components/admin/listKit";
import { useHrOverview } from "@/lib/admin/hooks";

const TrendLine = dynamic(() => import("@/components/shared/charts/TrendLine").then((m) => m.TrendLine), { ssr: false, loading: () => <div className="h-[110px]" /> });

type Today = { date: string; scheduled: number; checkedIn: number; late: number; absent: number; onLeave: number };
type Tab = "all" | "present" | "late" | "absent" | "on-leave";

export function PhoneAttendanceTop({ today, tab, onPick }: { today: Today; dateText?: string; tab: string; onPick: (t: Tab) => void }) {
  const present = Math.max(0, today.checkedIn - today.late);
  const { data: ov } = useHrOverview();
  const ranges = (ov?.attendance ?? []).map((p) => ({
    key: p.id,
    label: p.label,
    points: p.days.map((d) => ({ label: d.label, value: d.present + d.late + d.absent ? Math.round((d.present / (d.present + d.late + d.absent)) * 100) : 0 })),
  }));
  const [pickedRange, setRange] = useState("");
  const range = ranges.find((r) => r.key === pickedRange) ?? ranges[0];
  const avg = range && range.points.length ? Math.round(range.points.reduce((a, p) => a + p.value, 0) / range.points.length) : null;
  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all", label: "All", count: today.scheduled },
    { key: "present", label: "On time", count: present },
    { key: "late", label: "Late", count: today.late },
    { key: "absent", label: "Absent", count: today.absent },
  ];
  return (
    <div className="mt-3.5 min-[768px]:hidden">
      {avg !== null && range ? (
        <PhoneHero hero="On-time rate" figure={`${avg}%`} line={range.label} action={ranges.length > 1 ? <HeroRange label="Time range" options={ranges.map((r) => ({ value: r.key, label: r.label }))} value={range.key} onChange={setRange} /> : undefined}>
          <TrendLine ranges={ranges} range={range.key} unit="%" height={110} className="mt-2" summary={`On-time rate by day. ${ranges.map((r) => `${r.label}: ${r.points.map((p) => `${p.label} ${p.value}%`).join(", ")}`).join(". ")}`} />
        </PhoneHero>
      ) : null}
      <CountCards
        onPick={(k) => onPick(k as Tab)}
        items={[
          { key: "present", label: "On time", value: present, tone: "mint" },
          { key: "late", label: "Late", value: today.late, tone: "sand" },
          { key: "absent", label: "Absent", value: today.absent, tone: "rose" },
        ]}
      />
      <ListTabs label="Filter by status" tabs={tabs.map((t) => ({ key: t.key, label: t.label }))} value={tab as Tab} onChange={onPick} />
    </div>
  );
}
