"use client";

/**
 * One company report: title, date range (when it applies) + one Filters button,
 * three key figures, ONE thin chart, a short table. Range and filters live in
 * the URL. Export exists only as "Export CSV (mock)" behind More and says it
 * did nothing. States: loading, no data, nothing matches, error, restricted.
 *
 * Reused: DateRangeSelector (own range control), RowMenu (More), the ops Sheet
 * and kit containers, ErrorPanel / EmptyState.
 */
import Link from "next/link";
import { useId, useState } from "react";
import { useUrlParams } from "@/components/admin/applicants/url";
import { ADMIN_ROLE_CLASS } from "@/components/admin/nav";
import { BackHeader, BackLink, Banner, GROUP, GROUP_HEAD, MAIN_BTN, QUIET_BTN, ROW_LINE, Sheet } from "@/components/admin/ops/assign/kit";
import { OpsOnly } from "@/components/admin/ops/parts";
import { RowMenu } from "@/components/admin/overview/RowMenu";
import { Restricted } from "@/components/admin/vacancies/parts";
import { ShowMore, SHOW_MORE_STEP } from "@/components/admin/ShowMore";
import { ChevronRight, Funnel, Search } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { BarChart3 } from "@/components/client/icons";
import { DateRangeSelector, type RangeValue } from "@/components/client/charts";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useOpsReport, useOpsReportFacets } from "@/lib/admin/ops/opsreports-hooks";
import type { OpsReportData, OpsReportId, OpsReportQuery } from "@/lib/admin/ops/opsreports-types";
import { addDays, todayISO } from "@/lib/client/format";
import { OpsChartView } from "./charts";
import { AS_OF_NOW, DEFAULT_RANGE_KEY, GROUP_OPTIONS, isGroup, OPS_REPORTS_HREF, RANGE_PRESETS } from "./meta";

const TITLES: Record<OpsReportId, string> = { placements: "Placements", funnel: "Recruitment funnel", "time-to-place": "Time to place", "hr-workload": "HR workload", "client-activity": "Client activity" };

export function OpsReportView({ report }: { report: OpsReportId }) {
  return (
    <OpsOnly what="Company reports" fallback={<div className="ap-shimmer h-[320px] rounded-2xl" />}>
      <Inner report={report} />
    </OpsOnly>
  );
}

function Inner({ report }: { report: OpsReportId }) {
  const url = useUrlParams();
  const asOfNow = AS_OF_NOW.includes(report);
  const rangeKey = url.get("range");
  const preset = RANGE_PRESETS.find((p) => p.key === rangeKey) ?? (rangeKey === "custom" ? null : RANGE_PRESETS.find((p) => p.key === DEFAULT_RANGE_KEY)!);
  const today = todayISO();
  const rawFrom = url.get("from");
  const rawTo = url.get("to");
  const range: RangeValue = preset ? { preset: preset.key, from: addDays(today, -(preset.days - 1)), to: today } : { preset: "custom", from: rawFrom || addDays(today, -89), to: rawTo || today };
  const groupRaw = url.get("group");
  const group = report === "placements" && isGroup(groupRaw) ? groupRaw : "time";
  const query: OpsReportQuery = { report, from: range.from, to: range.to, clientId: url.get("client"), hrId: url.get("hr"), group };

  const live = useOpsReport(query);
  const [last, setLast] = useState<OpsReportData | null>(null);
  if (live.data && live.data !== last) setLast(live.data);
  const data = live.data && live.data.report === report ? live.data : last && last.report === report ? last : null;

  const [filters, setFilters] = useState(false);
  const [mockNote, setMockNote] = useState(false);
  const { limit, more } = useLimit(JSON.stringify(query));
  const narrowed = !!(query.clientId || query.hrId);
  const clear = () => url.set({ client: undefined, hr: undefined });

  const title = TITLES[report];
  const top = (
    <>
      <BackHeader href={OPS_REPORTS_HREF} label="Reports" title={title} />
      <BackLink href={OPS_REPORTS_HREF} label="Reports" />
    </>
  );
  const moreMenu = <RowMenu label="More" items={[{ label: "Export CSV", onSelect: () => setMockNote(true) }]} />;
  const heading = (
    <div className="max-[767px]:hidden">
      <PageHeading title={title} right={moreMenu} />
    </div>
  );

  if (live.status === "error")
    return (
      <>
        {top}
        {heading}
        <ErrorPanel title="We could not load this report" retry={live.retry} />
      </>
    );
  if (live.status === "restricted")
    return (
      <>
        {top}
        {heading}
        <Restricted what="This report" />
      </>
    );
  if (live.status === "empty" && live.data?.workspaceEmpty)
    return (
      <>
        {top}
        {heading}
        <div className={`${GROUP} p-6`}>
          <EmptyState icon={BarChart3} title="No data to report yet" description="This report fills in as recruitment records are created." />
        </div>
      </>
    );

  const refreshing = live.status === "loading" && !!data;
  return (
    <div>
      {top}
      {heading}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        {asOfNow ? (
          <p className="mr-auto text-[13px] text-(--ap-muted)">A live snapshot as of now. The date range does not apply.</p>
        ) : (
          <DateRangeSelector
            value={range}
            onChange={(v) => {
              if (v.preset === "custom") url.set({ range: "custom", from: v.from, to: v.to });
              else url.set({ range: v.preset === DEFAULT_RANGE_KEY ? undefined : v.preset, from: undefined, to: undefined });
            }}
            presets={RANGE_PRESETS.map((p) => ({ key: p.key, label: p.label }))}
            customShowsDates={false}
            themeClass={`admin-theme ${ADMIN_ROLE_CLASS}`}
            ariaLabel="Report period"
          />
        )}
        <button type="button" aria-label="Filters" title="Filters" onClick={() => setFilters(true)} className={`ap-hit inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold ${narrowed ? "border-(--ap-violet) text-(--ap-violet)" : "border-(--ap-line) text-(--ap-ink-2) hover:bg-(--ap-line-2)"}`}>
          <Funnel className="size-[18px]" strokeWidth={1.7} aria-hidden="true" />
          {narrowed ? <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-(--ap-violet) px-1.5 text-[11px] leading-5 font-bold text-white">{[query.clientId, query.hrId].filter(Boolean).length}</span> : null}
        </button>
        <span className="min-[768px]:hidden ml-auto">{moreMenu}</span>
      </div>

      {mockNote ? (
        <Banner tone="warn" onDismiss={() => setMockNote(false)}>
          Export is currently unavailable. No file was created.
        </Banner>
      ) : null}

      {!data ? (
        <div role="status" aria-busy="true" aria-label="Loading report" className="flex flex-col gap-4">
          <div className="ap-shimmer h-20 rounded-[14px]" />
          <div className="ap-shimmer h-60 rounded-[14px]" />
          <div className="ap-shimmer h-48 rounded-[14px]" />
        </div>
      ) : (
        <div className={`flex max-w-[980px] flex-col gap-6 transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
          {report === "placements" ? (
            <div role="group" aria-label="Group placements" className="flex w-fit gap-0.5 rounded-xl border border-(--ap-line) bg-(--ap-surface) p-0.5">
              {GROUP_OPTIONS.map((o) => (
                <button key={o.value} type="button" aria-pressed={group === o.value} onClick={() => url.set({ group: o.value === "time" ? undefined : o.value })} className={`h-9 rounded-lg px-3 text-[13px] font-bold whitespace-nowrap ${group === o.value ? "bg-(--ap-tint) text-(--ap-violet)" : "text-(--ap-muted) hover:bg-(--ap-line-2)"}`}>
                  {o.label}
                </button>
              ))}
            </div>
          ) : null}

          <section aria-label="Key figures" className={`${GROUP} grid grid-cols-3`}>
            {data.kpis.map((k, i) => (
              <div key={k.key} className={`min-w-0 px-4 py-3.5 ${i > 0 ? "border-l border-(--ap-line-2)" : ""}`}>
                <b className="block text-[26px] leading-none font-semibold tabular-nums text-(--ap-ink)">{k.value}</b>
                <span className="mt-1.5 block text-[13px] leading-tight text-(--ap-ink-2)">{k.label}</span>
                {k.sub ? <span className="block text-[12px] text-(--ap-muted)">{k.sub}</span> : null}
              </div>
            ))}
          </section>

          <section aria-label={data.chartTitle}>
            <h2 className={GROUP_HEAD}>{data.chartTitle}</h2>
            <div className={`${GROUP} p-4 min-[768px]:p-5`}>
              {chartEmpty(data) ? (
                <EmptyState icon={BarChart3} title="Nothing in this period" description="No records match the dates and filters you chose." />
              ) : (
                <OpsChartView chart={data.chart} summary={data.summary} />
              )}
            </div>
          </section>

          <section aria-label="Details">
            <h2 className={GROUP_HEAD}>Details</h2>
            {data.total === 0 ? (
              <div className={`${GROUP} py-6`}>
                <EmptyState
                  icon={Search}
                  title="No rows match"
                  description="Try a longer period or clear the filters."
                  action={
                    narrowed ? (
                      <button type="button" onClick={clear} className="ap-btn ap-btn-s ap-btn-sm">
                        Clear filters
                      </button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <>
                <Table data={data} limit={limit} />
                <ShowMore shown={limit} total={data.total} onMore={more} onClear={narrowed ? clear : null} />
              </>
            )}
          </section>
          <p className="text-[12px] text-(--ap-muted)">Updated {new Date(data.generatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Counts only. What each figure includes needs Beeliv confirmation.</p>
        </div>
      )}

      {filters ? <FiltersSheet report={report} query={query} onClose={() => setFilters(false)} onChange={(p) => url.set(p)} /> : null}
    </div>
  );
}

function chartEmpty(d: OpsReportData) {
  const c = d.chart;
  return c.kind === "bars" ? c.rows.length === 0 || c.rows.every((r) => r.value === 0) : c.points.every((p) => !p.value);
}

function useLimit(key: string) {
  const [state, setState] = useState({ key, limit: SHOW_MORE_STEP });
  const limit = state.key === key ? state.limit : SHOW_MORE_STEP;
  return { limit, more: () => setState({ key, limit: limit + SHOW_MORE_STEP }) };
}

function Table({ data, limit }: { data: OpsReportData; limit: number }) {
  const rows = data.rows.slice(0, limit);
  const cols = { gridTemplateColumns: data.columns.map((c, i) => (i === 0 ? "minmax(0,1.4fr)" : c.align === "right" ? "minmax(70px,.6fr)" : "minmax(0,1fr)")).join(" ") };
  return (
    <>
      <div role="table" aria-label={`${data.title} details`} className={`${GROUP} hidden min-[768px]:block`}>
        <div role="row" style={cols} className="grid gap-x-4 border-b border-(--ap-line-2) px-4 py-2.5">
          {data.columns.map((c) => (
            <span key={c.key} role="columnheader" className={`text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase ${c.align === "right" ? "text-right" : ""}`}>
              {c.label}
            </span>
          ))}
        </div>
        {rows.map((r) => (
          <div key={r.id} role="row" style={cols} className={`grid min-h-[52px] items-center gap-x-4 px-4 ${ROW_LINE}`}>
            {data.columns.map((c, i) => (
              <span key={c.key} role="cell" className={`min-w-0 text-[14px] text-(--ap-ink-2) tabular-nums ${c.align === "right" ? "text-right" : ""}`}>
                {i === 0 && r.href ? (
                  <Link href={r.href} className="font-semibold text-(--ap-ink) hover:text-(--ap-violet)">
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
      <ul className={`${GROUP} m-0 list-none p-0 min-[768px]:hidden`}>
        {rows.map((r) => {
          const inner = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] leading-tight font-semibold text-(--ap-ink)">{r.cells[data.columns[0].key]}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-(--ap-muted)">
                  {data.columns
                    .slice(1)
                    .map((c) => `${r.cells[c.key]} ${c.label.toLowerCase()}`)
                    .join(" · ")}
                </span>
              </span>
              {r.href ? <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" /> : null}
            </>
          );
          return (
            <li key={r.id} className={ROW_LINE}>
              {r.href ? (
                <Link href={r.href} className="flex min-h-14 items-center gap-3 px-3.5 py-2.5">
                  {inner}
                </Link>
              ) : (
                <div className="flex min-h-14 items-center gap-3 px-3.5 py-2.5">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function FiltersSheet({ report, query, onClose, onChange }: { report: OpsReportId; query: OpsReportQuery; onClose: () => void; onChange: (p: Record<string, string | undefined>) => void }) {
  const facets = useOpsReportFacets().data;
  const uid = useId();
  const pills = (label: string, key: string, value: string, options: { id: string; name: string }[]) => (
    <fieldset className="m-0 mb-5 border-0 p-0">
      <legend className="mb-2 text-[13px] font-semibold text-(--ap-ink-2)">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {[{ id: "", name: `All` }, ...options].map((o) => (
          <button key={o.id || "all"} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange({ [key]: o.id || undefined })} className={`ap-hit min-h-10 rounded-full border px-3.5 text-[13.5px] font-semibold ${value === o.id ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-line) text-(--ap-ink-2) hover:bg-(--ap-line-2)"}`}>
            {o.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
  return (
    <Sheet
      title="Filters"
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
          <button type="button" onClick={() => onChange({ client: undefined, hr: undefined })} className={QUIET_BTN}>
            Reset
          </button>
          <button type="button" onClick={onClose} className={MAIN_BTN}>
            Show results
          </button>
        </div>
      }
    >
      <div id={uid}>
        {!facets ? (
          <div role="status" aria-busy="true" className="ap-shimmer h-24 rounded-[14px]" />
        ) : (
          <>
            {pills("Client", "client", query.clientId, facets.clients)}
            {pills("HR officer", "hr", query.hrId, facets.hr)}
            <p className="text-[12px] text-(--ap-muted)">{report === "hr-workload" ? "Filters narrow the clients and officers counted." : "Placements are counted for the HR officer who holds the client today."}</p>
          </>
        )}
      </div>
    </Sheet>
  );
}
