"use client";

/** Renders an adapter ChartSpec with the shared Client chart components (colours are tokens, never literals). */
import { useState } from "react";
import { AnalyticsPanel, ChartEmptyState, ChartLegend, DonutChart, HorizontalBarChart, StackedBarChart, TrendChart } from "@/components/client/charts";
import { niceMax } from "@/components/client/charts/ChartPlot";
import { BarChart3 } from "@/components/client/icons";
import type { ReportChart } from "@/lib/admin/reports/types";
import { TONE_COLOR } from "./meta";

export function ReportChartPanel({ chart }: { chart: ReportChart }) {
  const [active, setActive] = useState<string | null>(null);
  const s = chart.spec;
  let body: React.ReactNode;
  if (s.kind === "bars") {
    body = s.rows.every((r) => r.value === 0) ? <Empty /> : <HorizontalBarChart rows={s.rows} ariaLabel={chart.summary} />;
  } else if (s.kind === "donut") {
    const total = s.segments.reduce((n, x) => n + x.value, 0);
    body =
      total === 0 ? (
        <Empty />
      ) : (
        <div className="flex flex-col items-center gap-4 min-[480px]:flex-row min-[480px]:items-center">
          <DonutChart segments={s.segments.map((x) => ({ key: x.key, label: x.label, value: x.value, color: TONE_COLOR[x.tone] }))} centerValue={s.centerValue} centerLabel={s.centerLabel} ariaLabel={chart.summary} activeKey={active} onActiveChange={setActive} />
          <ChartLegend className="w-full min-w-0 flex-1" ariaLabel={`${chart.title} legend`} activeKey={active} onHover={setActive} items={s.segments.map((x) => ({ key: x.key, label: x.label, value: x.value, color: TONE_COLOR[x.tone], percent: `${Math.round((x.value / total) * 100)}%` }))} />
        </div>
      );
  } else if (s.kind === "stacked") {
    const legend = s.points[0]?.segments ?? [];
    body =
      s.points.length === 0 ? (
        <Empty />
      ) : (
        <>
          <StackedBarChart points={s.points.map((p) => ({ id: p.id, label: p.label, sub: p.sub, title: p.title, segments: p.segments.map((x) => ({ key: x.key, label: x.label, value: x.value, color: TONE_COLOR[x.tone] })) }))} summary={chart.summary} hint="Use the left and right arrow keys to inspect each week." />
          <ChartLegend layout="inline" className="mt-3" ariaLabel={`${chart.title} legend`} items={legend.map((x) => ({ key: x.key, label: x.label, color: TONE_COLOR[x.tone] }))} />
        </>
      );
  } else {
    const { max, ticks } = niceMax(Math.max(0, ...s.points.map((p) => p.value)));
    body =
      s.points.length === 0 ? (
        <Empty />
      ) : (
        <TrendChart
          points={s.points.map((p) => ({ id: p.id, label: p.label, sub: p.sub, title: p.title, value: p.value, rows: [{ label: s.unit, value: p.value }] }))}
          max={max}
          ticks={ticks}
          format={(n) => String(n)}
          summary={chart.summary}
          hint="Use the left and right arrow keys to inspect each week."
        />
      );
  }
  return (
    <AnalyticsPanel title={chart.title} subtitle={chart.subtitle}>
      {body}
    </AnalyticsPanel>
  );
}

function Empty() {
  return <ChartEmptyState icon={BarChart3} height={160} title="Nothing in this period" description="No records match the dates and filters you chose." />;
}
