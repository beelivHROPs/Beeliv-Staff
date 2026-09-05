"use client";

import { useId } from "react";
import { Area, AreaChart } from "recharts";

/**
 * Compact inline trend chart for a MetricCard's trailing slot — replaces
 * the earlier hand-rolled bar Sparkline with a real recharts area chart
 * (components/ui/chart.tsx's ChartContainer is skipped here on purpose:
 * this has no legend/tooltip/multi-series, so the fuller wrapper would be
 * unused ceremony for a single silent trend line).
 */
export function TrendChart({
  values,
  color = "var(--primary)",
}: {
  values: number[];
  color?: string;
}) {
  const gradientId = `trend-fill-${useId().replace(/:/g, "")}`;
  const data = values.map((value, index) => ({ index, value }));

  // Fixed pixel dimensions rather than ResponsiveContainer — at this small a
  // footprint, ResizeObserver-driven sizing just produces a 0x0 flash on
  // first paint for no benefit, since the size never needs to respond to
  // its container.
  return (
    <div aria-hidden>
      <AreaChart width={64} height={28} data={data} margin={{ top: 2, right: 1, bottom: 0, left: 1 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </div>
  );
}
