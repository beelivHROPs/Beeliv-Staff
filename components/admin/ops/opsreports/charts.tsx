"use client";

/**
 * Operations report charts: the APPROVED shared chart kit (the same TrendChart and HorizontalBarChart the
 * Client analytics and the HR Reports use). No bespoke chart styling here, so every report looks the same.
 * A null value in a series (nothing to average) is left out of the line, not drawn as zero.
 */
import { HorizontalBarChart, TrendChart } from "@/components/client/charts";
import { niceMax } from "@/components/client/charts/ChartPlot";
import type { OpsChart } from "@/lib/admin/ops/opsreports-types";

export function OpsChartView({ chart, summary }: { chart: OpsChart; summary: string }) {
  if (chart.kind === "bars") return <HorizontalBarChart rows={chart.rows.map((r) => ({ key: r.key, label: r.label, value: r.value }))} ariaLabel={summary} />;

  const pts = chart.points.filter((p): p is { key: string; label: string; value: number } => p.value !== null);
  const { max, ticks } = niceMax(Math.max(0, ...pts.map((p) => p.value)));
  return (
    <TrendChart
      points={pts.map((p) => ({
        id: p.key,
        label: p.label,
        sub: "",
        title: p.label,
        value: p.value,
        rows: [{ label: chart.unit, value: p.value }],
      }))}
      max={max}
      ticks={ticks}
      format={(n) => String(n)}
      summary={summary}
      hint="Use the left and right arrow keys to inspect each period."
    />
  );
}
