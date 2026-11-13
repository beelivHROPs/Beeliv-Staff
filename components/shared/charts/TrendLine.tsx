"use client";

/**
 * TrendLine: the ONE subtle chart for phones. Smooth line in the app's violet token, soft fill
 * fading out, no gridlines, no legend, no y-axis, 3 to 5 light x labels, a dot on the latest point,
 * a small tooltip on tap, ~120px tall. Reads colours from the nearest app theme (works in dark mode).
 * Use one per screen and only where a real trend exists. Recharts is already a dependency.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PillToggle } from "@/components/shared/premium";

export interface TrendPoint {
  label: string;
  value: number;
}
export interface TrendRange {
  key: string;
  label: string;
  points: TrendPoint[];
}

function useThemeColors() {
  const ref = useRef<HTMLDivElement>(null);
  const [c, setC] = useState({ line: "#8b2252", muted: "#7a7285", surface: "#fff", ink: "#111", edge: "#eee" });
  useEffect(() => {
    const read = () => {
      const el = ref.current;
      if (!el) return;
      const cs = getComputedStyle(el);
      const g = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
      setC({ line: g("--ap-violet", "#8b2252"), muted: g("--ap-muted", "#7a7285"), surface: g("--ap-surface", "#fff"), ink: g("--ap-ink", "#111"), edge: g("--ap-line", "#eee") });
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true });
    return () => mo.disconnect();
  }, []);
  return { ref, c };
}

export function TrendLine({ points, ranges, summary, unit = "", height = 120, className = "", range: controlledRange }: { points?: TrendPoint[]; ranges?: TrendRange[]; summary: string; unit?: string; height?: number; className?: string; /** When the screen owns the range control (its own segmented pills), pass the chosen key; the built-in pills are then hidden. */ range?: string }) {
  const id = useId().replace(/:/g, "");
  const { ref, c } = useThemeColors();
  const [ownRange, setRange] = useState(ranges?.[0]?.key ?? "");
  const range = controlledRange ?? ownRange;
  // Client-only component (loaded with ssr:false), so reading matchMedia in the initialiser is safe.
  const [reduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const data = ranges ? (ranges.find((r) => r.key === range) ?? ranges[0]).points : (points ?? []);
  if (data.length < 2) return null;
  const last = data.length - 1;
  // 3 to 5 light labels: first, last and up to three evenly spaced between.
  const step = Math.max(1, Math.ceil(last / 4));
  const ticks = data.filter((_, i) => i === last || (i % step === 0 && last - i >= step / 2)).map((d) => d.label);
  return (
    <div ref={ref} className={className}>
      {ranges && ranges.length > 1 && controlledRange === undefined ? <PillToggle label="Time range" options={ranges.map((r) => ({ value: r.key, label: r.label }))} value={range} onChange={setRange} className="mb-3 max-w-[240px]" /> : null}
      <div role="img" aria-label={summary} style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height }}>
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
            <defs>
              <linearGradient id={`tl-${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.line} stopOpacity={0.16} />
                <stop offset="100%" stopColor={c.line} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" ticks={ticks} axisLine={false} tickLine={false} tick={{ fill: c.muted, fontSize: 12 }} interval={0} padding={{ left: 6, right: 6 }} />
            <YAxis hide domain={["dataMin - 6", "dataMax + 6"]} />
            <Tooltip
              cursor={{ stroke: c.edge }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div style={{ background: c.surface, color: c.ink, borderColor: c.edge }} className="rounded-xl border px-2.5 py-1.5 text-[12px] shadow-md">
                    {payload[0].payload.label}: <b>{payload[0].value}{unit}</b>
                  </div>
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={c.line}
              strokeWidth={1.5}
              strokeLinecap="round"
              fill={`url(#tl-${id})`}
              isAnimationActive={!reduced}
              dot={(p: { cx?: number; cy?: number; index?: number }) =>
                p.index === last && p.cx != null && p.cy != null ? <circle key="last" cx={p.cx} cy={p.cy} r={4} fill={c.line} stroke={c.surface} strokeWidth={2} /> : <g key={`d${p.index}`} />
              }
              activeDot={{ r: 4, fill: c.line, stroke: c.surface, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">{summary}</p>
    </div>
  );
}
