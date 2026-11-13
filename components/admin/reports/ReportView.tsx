"use client";

/**
 * One recruitment report: filters (period, client, vacancy; in the URL), KPI
 * tiles, charts, and a drill-down table with ShowMore. Export is a logged
 * action that is not available in the demo, so the button is disabled with a
 * note. Layout reflows by container width (table / stacked cards).
 *
 * Reused: client charts (HorizontalBarChart, DonutChart, StackedBarChart,
 * TrendChart, ChartLegend, ChartStates via AnalyticsPanel), SearchField-free
 * FilterSelect, DatePicker, listKit, ShowMore, EmptyState, ErrorPanel.
 */
import Link from "next/link";
import { useId, useState } from "react";
import { useUrlParams } from "@/components/admin/applicants/url";
import { FilterField, FilterSection, FiltersButton } from "@/components/admin/standard";
import { ActiveChips, type ActiveChip, type FilterDef, BODY_ROW, CARD_ITEM, CARD_LIST, EMPTY_CARD, FILTER_GRID, HEAD_ROW, TABLE_CARD, TH, useBatch } from "@/components/admin/listKit";
import { Restricted } from "@/components/admin/offers/parts";
import { ShowMore } from "@/components/admin/ShowMore";
import { ChevronLeft, Download, Search, X } from "@/components/applicant/icons";
import { DatePicker } from "@/components/applicant/form-fields";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { FilterSelect } from "@/components/client/records-filters";
import { BarChart3 } from "@/components/client/icons";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useReport, useReportFacets } from "@/lib/admin/reports/hooks";
import type { ReportData, ReportId, ReportQuery } from "@/lib/admin/reports/types";
import { daysAgoIso, PERIODS, REPORTS_HREF, isoDay } from "./meta";
import { ReportChartPanel } from "./ReportCharts";
import dynamic from "next/dynamic";

const TrendLine = dynamic(() => import("@/components/shared/charts/TrendLine").then((m) => m.TrendLine), { ssr: false, loading: () => <div className="h-[120px]" /> });

const ANY = "__any";
const TITLES: Record<ReportId, string> = { vacancy: "Vacancy report", pipeline: "Applicant pipeline", interview: "Interview report", placement: "Placement report", history: "Recruitment history" };

export function ReportView({ report }: { report: ReportId }) {
  const url = useUrlParams();
  const uid = useId();
  const facets = useReportFacets().data;
  const period = url.get("period") || "90";
  const preset = PERIODS.find((p) => p.value === period) ?? PERIODS[1];
  const today = isoDay(new Date());
  const from = preset.value === "custom" ? url.get("from") || daysAgoIso(90) : daysAgoIso(preset.days);
  const to = preset.value === "custom" ? url.get("to") || today : today;
  const badRange = from > to;
  const query: ReportQuery = { report, from: badRange ? to : from, to, clientId: url.get("client"), vacancyId: url.get("vacancy") };
  const live = useReport(query);
  const [last, setLast] = useState<ReportData | null>(null);
  if (live.data && live.data !== last) setLast(live.data);
  const data = live.data ?? last;
  const { limit, more } = useBatch(JSON.stringify(query));
  const set = (k: string, v: string) => url.set({ [k]: v === ANY || v === "" ? undefined : v });
  const narrowed = !!(query.clientId || query.vacancyId) || preset.value !== "90";
  const clear = () => url.set({ client: undefined, vacancy: undefined, period: undefined, from: undefined, to: undefined });
  const vacOptions = (facets?.vacancies ?? []).filter((v) => !query.clientId || v.clientId === query.clientId);

  const defs: FilterDef[] = [
    { key: "period", label: "Period", value: preset.value, control: "chips", onChange: (v) => url.set({ period: v === "90" ? undefined : v, from: undefined, to: undefined }), options: PERIODS.map((p) => ({ value: p.value, label: p.label })) },
    { key: "client", label: "Client", value: query.clientId || ANY, control: "select", onChange: (v) => url.set({ client: v === ANY ? undefined : v, vacancy: undefined }), options: [{ value: ANY, label: "All clients" }, ...(facets?.clients ?? []).map((c) => ({ value: c.id, label: c.name }))] },
    { key: "vacancy", label: "Vacancy", value: query.vacancyId || ANY, control: "select", onChange: (v) => set("vacancy", v), options: [{ value: ANY, label: "All vacancies" }, ...vacOptions.map((v) => ({ value: v.id, label: v.name }))] },
  ];
  const chips: ActiveChip[] = [
    ...(preset.value !== "90" ? [{ key: "period", label: "Period", text: preset.label, onRemove: () => url.set({ period: undefined, from: undefined, to: undefined }) }] : []),
    ...(query.clientId ? [{ key: "client", label: "Client", text: (facets?.clients ?? []).find((c) => c.id === query.clientId)?.name ?? "Client", onRemove: () => url.set({ client: undefined, vacancy: undefined }) }] : []),
    ...(query.vacancyId ? [{ key: "vacancy", label: "Vacancy", text: vacOptions.find((v) => v.id === query.vacancyId)?.name ?? "Vacancy", onRemove: () => set("vacancy", "") }] : []),
  ];

  const back = (
    <Link href={REPORTS_HREF} className="ap-hit mb-1 inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum)">
      <ChevronLeft className="size-4" aria-hidden="true" /> Reports
    </Link>
  );
  const heading = <PageHeading title={TITLES[report]} />;

  if (live.status === "error")
    return (
      <>
        {back}
        {heading}
        <ErrorPanel title="We could not load this report" retry={live.retry} />
      </>
    );
  if (live.status === "restricted")
    return (
      <>
        {back}
        {heading}
        <Restricted what="This report" />
      </>
    );
  if (live.status === "empty" && !data?.rows.length && live.data?.workspaceEmpty)
    return (
      <>
        {back}
        {heading}
        <div className={EMPTY_CARD}>
          <EmptyState icon={BarChart3} title="No data to report yet" description="This report fills in as recruitment records are created." />
        </div>
      </>
    );

  const shown = data?.rows.slice(0, limit) ?? [];
  // The ONE phone chart: the first trend chart, else the first stacked chart summed per point.
  const tc = data?.charts.find((c) => c.spec.kind === "trend") ?? data?.charts.find((c) => c.spec.kind === "stacked");
  const phoneTrend =
    tc && (tc.spec.kind === "trend" || tc.spec.kind === "stacked")
      ? { title: tc.title, summary: tc.summary, points: tc.spec.kind === "trend" ? tc.spec.points.map((p) => ({ label: p.label, value: p.value })) : tc.spec.points.map((p) => ({ label: p.label, value: p.segments.reduce((n, x) => n + x.value, 0) })) }
      : null;
  const refreshing = live.status === "loading" && !!data;
  const gridCols = data ? { gridTemplateColumns: data.columns.map((c, i) => (i === 0 ? "minmax(150px,1.3fr)" : c.align === "right" ? "minmax(80px,.6fr)" : "minmax(100px,1fr)")).join(" ") } : undefined;

  return (
    <div>
      {back}
      <PageHeading
        title={TITLES[report]}
        right={
          <>
            <button type="button" disabled aria-label="Export unavailable" title="Export is currently unavailable." className="ap-btn ap-btn-s size-11 p-0 min-[768px]:hidden">
              <Download className="size-5" aria-hidden="true" />
            </button>
            <div className="flex flex-col items-start gap-1 max-[767px]:hidden min-[768px]:items-end">
              <button type="button" disabled aria-describedby={`${uid}-exp`} className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
                <Download className="size-4" aria-hidden="true" /> Export
              </button>
              <span id={`${uid}-exp`} className="text-[12px] text-(--ap-muted)">Export is currently unavailable.</span>
            </div>
          </>
        }
      />

      <div className="mb-4">
        {/* Phones: one funnel button (opens ONE filter sheet) and a row of removable pills for what is active. */}
        <div className="flex items-center gap-2 min-[768px]:hidden">
          <FiltersButton active={chips.length} resultCount={data?.total} onClear={clear}>
            {({ sheet }) => (
              <>
                {defs.map((f) => (
                  <FilterSection key={f.key} title={f.label}>
                    <FilterField f={f} sheet={sheet} />
                  </FilterSection>
                ))}
              </>
            )}
          </FiltersButton>
          <ActiveChips chips={chips} onClearAll={clear} className="min-w-0 flex-1" />
        </div>
        <div className={`${FILTER_GRID} max-[767px]:hidden`}>
          <FilterSelect label="Period" value={preset.value} onChange={(v) => url.set({ period: v === "90" ? undefined : v, from: undefined, to: undefined })} options={PERIODS.map((p) => ({ value: p.value, label: p.label }))} />
          <FilterSelect label="Client" value={query.clientId || ANY} onChange={(v) => url.set({ client: v === ANY ? undefined : v, vacancy: undefined })} options={[{ value: ANY, label: "All clients" }, ...(facets?.clients ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
          <FilterSelect label="Vacancy" value={query.vacancyId || ANY} onChange={(v) => set("vacancy", v)} options={[{ value: ANY, label: "All vacancies" }, ...vacOptions.map((v) => ({ value: v.id, label: v.name }))]} />
        </div>
        {preset.value === "custom" ? (
          <div className="mt-3 grid grid-cols-1 gap-3 min-[560px]:grid-cols-2 min-[560px]:max-w-[520px]">
            <div>
              <label htmlFor={`${uid}-f`} className="mb-1 block text-[13px] font-bold text-(--ap-ink-2)">From</label>
              <DatePicker id={`${uid}-f`} title="From date" value={from} onChange={(v) => url.set({ from: v })} max={to} />
            </div>
            <div>
              <label htmlFor={`${uid}-t`} className="mb-1 block text-[13px] font-bold text-(--ap-ink-2)">To</label>
              <DatePicker id={`${uid}-t`} title="To date" value={to} onChange={(v) => url.set({ to: v })} min={from} max={today} />
            </div>
          </div>
        ) : null}
        {badRange ? <p role="alert" className="mt-2 text-[13px] font-semibold text-(--ap-rose)">The start date must be on or before the end date.</p> : null}
      </div>

      {!data ? (
        <div role="status" aria-busy="true" aria-label="Loading report">
          <div className="mb-4 grid grid-cols-2 gap-3 min-[768px]:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="ap-shimmer h-[92px] rounded-2xl" />
            ))}
          </div>
          <div className="mb-4 grid grid-cols-1 gap-4 min-[1100px]:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="ap-shimmer h-[260px] rounded-2xl" />
            ))}
          </div>
          <div className="ap-shimmer h-[260px] rounded-2xl" />
        </div>
      ) : (
        <div className={`flex flex-col gap-4 transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
          {/* Phones: ONE trend line, then two key figures, then a short counted list. Desktop keeps every chart and KPI. */}
          {phoneTrend ? (
            <section aria-label={phoneTrend.title} className="rounded-[22px] border border-(--ap-line) bg-(--ap-surface) p-4 shadow-[0_1px_2px_rgba(41,32,82,.05),0_14px_28px_-14px_rgba(41,32,82,.22)] min-[768px]:hidden">
              <h2 className="mb-2 text-[17px] font-bold text-(--ap-ink)">{phoneTrend.title}</h2>
              <TrendLine points={phoneTrend.points} summary={phoneTrend.summary} />
            </section>
          ) : null}
          <section aria-label="Key figures" className={`grid grid-cols-2 gap-3 ${data.kpis.length >= 4 ? "min-[768px]:grid-cols-4" : "min-[768px]:grid-cols-3"}`}>
            {data.kpis.map((k, ki) => (
              <div key={k.key} className={`ap-card min-w-0 rounded-2xl p-4 ${ki >= 2 ? "max-[767px]:hidden" : ""}`}>
                <b className="block text-[28px] leading-none font-bold tracking-tight text-(--ap-ink) tabular-nums">{k.value}</b>
                <span className="mt-1.5 block text-[14px] leading-tight font-semibold text-(--ap-ink-2)">{k.label}</span>
                {k.sub ? <span className="mt-0.5 block text-[12px] text-(--ap-muted)">{k.sub}</span> : null}
              </div>
            ))}
          </section>

          <div className={`max-[767px]:hidden grid grid-cols-1 items-start gap-4 ${data.charts.length > 1 ? "min-[1100px]:grid-cols-2" : ""}`}>
            {data.charts.map((c, i) => (
              <div key={c.id} className={data.charts.length === 3 && i === 2 ? "min-[1100px]:col-span-2" : ""}>
                <ReportChartPanel chart={c} />
              </div>
            ))}
          </div>

          <section aria-label="Records" className="@container ap-card rounded-[20px] p-4.5 min-[768px]:p-5">
            <h2 className="mb-4 text-[17px] leading-tight font-bold text-(--ap-ink)">Records <span className="min-[768px]:hidden">({data.total})</span></h2>
            {data.total === 0 ? (
              <div className="py-6">
                <EmptyState
                  icon={Search}
                  title={narrowed ? "No records match these filters" : "No records in this period"}
                  description="Try a longer period or clear the client and vacancy filters."
                  action={
                    narrowed ? (
                      <button type="button" onClick={clear} className="ap-btn ap-btn-s ap-btn-sm">
                        <X className="size-4" aria-hidden="true" /> Clear filters
                      </button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <>
                <div role="table" aria-label={`${data.title} records`} className={`${TABLE_CARD} hidden @min-[820px]:block`}>
                  <div role="row" style={gridCols} className={`grid items-end gap-x-4 ${HEAD_ROW}`}>
                    {data.columns.map((c) => (
                      <span key={c.key} role="columnheader" className={`${TH} ${c.align === "right" ? "text-right" : ""}`}>
                        {c.label}
                      </span>
                    ))}
                  </div>
                  {shown.map((r) => (
                    <div key={r.id} role="row" style={gridCols} className={`grid items-center gap-x-4 ${BODY_ROW} min-h-[60px]`}>
                      {data.columns.map((c, i) => (
                        <span key={c.key} role="cell" className={`min-w-0 truncate text-[14px] text-(--ap-ink-2) tabular-nums ${c.align === "right" ? "text-right" : ""}`} title={String(r.cells[c.key] ?? "")}>
                          {i === 0 && r.href ? (
                            <Link href={r.href} className="font-bold text-(--ap-ink) hover:text-(--ap-violet)">
                              {r.cells[c.key]}
                            </Link>
                          ) : (
                            r.cells[c.key]
                          )}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
                <ul className={`${CARD_LIST} @min-[820px]:hidden`}>
                  {shown.map((r) => (
                    <li key={r.id} className={CARD_ITEM}>
                      {r.href ? (
                        <Link href={r.href} className="block truncate text-[15px] font-bold text-(--ap-ink) hover:text-(--ap-violet)">
                          {r.cells[data.columns[0].key]}
                        </Link>
                      ) : (
                        <b className="block truncate text-[15px]">{r.cells[data.columns[0].key]}</b>
                      )}
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {data.columns.slice(1).map((c, ci) => (
                          <div key={c.key} className={`min-w-0 ${ci >= 2 ? "max-[767px]:hidden" : ""}`}>
                            <dt className="text-[13px] font-bold text-(--ap-muted)">{c.label}</dt>
                            <dd className="truncate text-[14px] text-(--ap-ink-2) tabular-nums">{r.cells[c.key]}</dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <ShowMore shown={limit} total={data.total} onMore={more} onClear={narrowed ? clear : null} />
          </section>
        </div>
      )}
    </div>
  );
}
