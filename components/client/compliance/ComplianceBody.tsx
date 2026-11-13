"use client";

import { useState } from "react";
import { FileText, LockKeyhole, ShieldCheck } from "@/components/applicant/icons";
import { FilterTabs } from "@/components/applicant/FilterTabs";
import { PageHeading } from "@/components/applicant/primitives";
import { useComplianceSummary, useDocuments } from "@/lib/client/hooks";
import { daysBetween, dayMonth, plural, todayISO } from "@/lib/client/format";
import { useOutletState } from "@/lib/client/outlet";
import type { ComplianceItem, ComplianceState } from "@/lib/client/types";
import { analyticsFamilyHref } from "@/lib/client/links";
import { AnalyticsLink } from "../AnalyticsLink";
import { Chip, ChipRow, MoreActions } from "../phone";
import { useIsPhone } from "@/components/applicant/motion";
import { PersonPhoto } from "../PersonPhoto";
import { StatusChip, type ChipTone } from "../StatusChip";
import { AnalyticsPanel, ChartEmptyState, ChartRestrictedState } from "../charts";
import { PageError, PageSkeleton } from "../recruitment/states";
import { ClientDocumentActions } from "./DocumentActions";
import { COMPLIANCE_FILTERS, type ComplianceFilter } from "./filters";

const STATE: { key: ComplianceState; label: string; color: string; tone: ChipTone }[] = [
  { key: "complete", label: "Complete", color: "var(--ap-ok)", tone: "ok" },
  { key: "outstanding", label: "Outstanding", color: "var(--ap-rose)", tone: "bad" },
  { key: "expiring", label: "Expiring soon", color: "var(--ap-warn)", tone: "warn" },
  { key: "update-required", label: "Update required", color: "var(--ap-info)", tone: "info" },
];

const FILTER_LABEL: Record<ComplianceFilter, string> = {
  attention: "Needs attention",
  outstanding: "Outstanding",
  "update-required": "Update required",
  expiring: "Expiring soon",
  complete: "Complete",
  all: "All",
};

const RANK: Record<ComplianceState, number> = { outstanding: 0, "update-required": 1, expiring: 2, complete: 3 };
const matches = (i: ComplianceItem, f: ComplianceFilter) => (f === "all" ? true : f === "attention" ? i.state !== "complete" : i.state === f);

/** Restricted domains: shown as rows so the Client knows they exist and who holds them - never any value. */
const RESTRICTED = ["Sensitive identity", "Banking"];

/**
 * Documents & Compliance (brief section 21). Operational compliance only:
 * approved operational documents (e.g. food-safety certificates) per staff
 * member. The figures use the same summary as the Overview, so the numbers
 * always agree. Identity and banking are listed as "Restricted" and never
 * carry a value.
 */
export function ComplianceBody({ initialFilter }: { initialFilter: ComplianceFilter }) {
  const summary = useComplianceSummary();
  const docs = useDocuments();
  const outlet = useOutletState();
  const [filter, setFilter] = useState<ComplianceFilter>(initialFilter);
  const [seeAll, setSeeAll] = useState(false);
  const phone = useIsPhone();
  const showOutlet = outlet.outlets.length > 1 && outlet.scope === "all";

  if (summary.status === "loading" || docs.status === "loading") return <PageSkeleton title="Documents & Compliance" label="Loading compliance" blocks={[240, 380, 130]} />;
  if (summary.status === "error" || docs.status === "error") {
    return (
      <PageError
        heading="Documents & Compliance"
        title="We couldn't load compliance"
        retry={() => {
          summary.retry();
          docs.retry();
        }}
      />
    );
  }

  const head = <PageHeading title="Documents & Compliance" subtitle="Operational documents for your staff, and who needs to act." right={<MoreActions actions={[{ label: "View compliance analytics", href: analyticsFamilyHref("compliance") }]} />} />;

  if (summary.status === "restricted" || docs.status === "restricted") {
    return (
      <div>
        {head}
        <AnalyticsPanel title="Compliance">
          <ChartRestrictedState what="Compliance information" />
        </AnalyticsPanel>
      </div>
    );
  }

  const data = summary.data;
  const list = docs.data ?? [];
  if (!data || data.total === 0 || list.length === 0) {
    return (
      <div>
        {head}
        <AnalyticsPanel title="Compliance">
          <ChartEmptyState icon={ShieldCheck} title="No compliance records yet" description="Once staff are assigned, their operational documents are tracked here." />
        </AnalyticsPanel>
      </div>
    );
  }

  const counts: Record<ComplianceState, number> = { complete: data.complete, outstanding: data.outstanding, expiring: data.expiringSoon, "update-required": data.updateRequired };
  const shown = list.filter((i) => matches(i, filter)).sort((a, b) => (a.state === b.state ? a.staffName.localeCompare(b.staffName) : RANK[a.state] - RANK[b.state]));
  const count = (f: ComplianceFilter) => list.filter((i) => matches(i, f)).length;
  const today = todayISO();
  const pick = (f: ComplianceFilter) => {
    setFilter(f);
    window.history.replaceState(null, "", f === "attention" ? "/client/compliance" : `/client/compliance?status=${f}`);
  };

  return (
    <div>
      {head}
      <div className="flex flex-col gap-4 min-[768px]:gap-5">
        <div className="max-[767px]:hidden">
          <AnalyticsLink href={analyticsFamilyHref("compliance")} label="View compliance analytics" />
        </div>
        <section aria-label="Compliance summary">
          <p className="mb-2 text-[13px] text-(--ap-muted) min-[768px]:hidden">
            <b className="text-(--ap-ok)">{data.percentComplete}%</b> compliant · {data.complete} of {data.total} documents
          </p>
          <div role="group" aria-label="Filter by status" className="grid grid-cols-2 gap-3 min-[768px]:hidden">
            {STATE.map((s) => (
              <button key={s.key} type="button" aria-pressed={filter === s.key} onClick={() => pick(filter === s.key ? "attention" : s.key)} className={`flex min-h-[88px] flex-col justify-between rounded-[20px] border bg-(--ap-surface) p-3.5 text-left ${filter === s.key ? "border-(--ap-violet)" : "border-(--ap-line)"}`}>
                <b className="block text-[30px] leading-none font-bold tabular-nums" style={{ color: s.color }}>{counts[s.key]}</b>
                <span className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-(--ap-ink-2)"><span aria-hidden="true" className="size-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
              </button>
            ))}
          </div>
          <div className="grid max-[767px]:hidden grid-cols-2 gap-2.5 min-[768px]:grid-cols-5 min-[768px]:gap-3.5">
            <div className="ap-card col-span-2 min-w-0 rounded-2xl p-3.5 min-[768px]:col-span-1 min-[768px]:p-4">
              <b className="block text-[26px] leading-none font-bold tracking-tight text-(--ap-ok) tabular-nums">{data.percentComplete}%</b>
              <span className="mt-1.5 block text-[14px] leading-tight font-semibold text-(--ap-ink-2)">Compliant</span>
              <span className="mt-0.5 block text-[12px] leading-tight text-(--ap-muted)">{data.complete} of {data.total} documents</span>
            </div>
            {STATE.map((s) => (
              <button key={s.key} type="button" aria-pressed={filter === s.key} onClick={() => pick(filter === s.key ? "attention" : s.key)} className={`ap-card ap-card-hover min-w-0 rounded-2xl p-3.5 text-left min-[768px]:p-4 ${filter === s.key ? "outline-2 outline-offset-0 outline-(--ap-violet)" : ""}`}>
                <b className="block text-[26px] leading-none font-bold tracking-tight tabular-nums" style={{ color: s.color }}>{counts[s.key]}</b>
                <span className="mt-1.5 block text-[14px] leading-tight font-semibold text-(--ap-ink-2)">{s.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 px-1 text-[13px] text-(--ap-muted) max-[767px]:hidden">
            {data.attention.length === 0 ? <b className="text-(--ap-ok)">All documents complete.</b> : <b className="text-(--ap-ink)">{plural(data.attention.length, "document")} need attention.</b>} Select a figure to list only those documents.
          </p>
        </section>

        <AnalyticsPanel anchor="records" title="Staff documents" subtitle="Approved operational documents only">
          <ChipRow label="Filter by status" className="mb-2 min-[768px]:hidden">
            {COMPLIANCE_FILTERS.map((f) => (
              <Chip key={f} on={filter === f} count={count(f)} onClick={() => pick(f)}>
                {FILTER_LABEL[f]}
              </Chip>
            ))}
          </ChipRow>
          <FilterTabs
            className="mb-4 max-[767px]:hidden"
            label="Filter by status"
            value={filter}
            onChange={pick}
            options={COMPLIANCE_FILTERS.map((f) => ({ key: f, label: FILTER_LABEL[f], count: count(f) }))}
          />
          {shown.length === 0 ? (
            <ChartEmptyState icon={ShieldCheck} title="No documents in this view" description="No documents match this status right now." height={150} />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-0 p-0 max-[767px]:gap-2.5">
              {(phone && !seeAll ? shown.slice(0, 6) : shown).map((i) => {
                const s = STATE.find((x) => x.key === i.state) ?? STATE[0];
                const days = i.expiresOn ? daysBetween(today, i.expiresOn) : null;
                return (
                  <li key={i.id} className="flex items-center gap-3 border-t border-(--ap-line-2) py-3.5 first:border-t-0 max-[767px]:min-h-14 max-[767px]:flex-wrap max-[767px]:rounded-[20px] max-[767px]:border max-[767px]:border-(--ap-line) max-[767px]:bg-(--ap-surface) max-[767px]:p-3.5">
                    <PersonPhoto name={i.staffName} size={phone ? 36 : 40} />
                    <span className="min-w-0 flex-1">
                      <b className="block text-[15px] text-(--ap-ink)">{i.staffName}</b>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-(--ap-muted)">
                        <FileText className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="min-w-0">
                          {i.document}
                          {showOutlet ? ` · ${outlet.outlets.find((o) => o.id === i.outletId)?.name ?? ""}` : ""}
                        </span>
                      </span>
                      {i.expiresOn && days !== null ? (
                        <span className="mt-0.5 block text-[13px] font-semibold text-(--ap-warn)">
                          Expires {dayMonth(i.expiresOn)} {days >= 0 ? `(in ${plural(days, "day")})` : "(expired)"}
                        </span>
                      ) : null}
                      {i.state !== "outstanding" ? <ClientDocumentActions ownerId={i.memberId} ownerName={i.staffName} documentType={i.document} className="mt-2" /> : null}
                    </span>
                    <span className="max-[767px]:ml-12 max-[767px]:w-full"><StatusChip tone={s.tone}>{s.label}</StatusChip></span>
                  </li>
                );
              })}
            </ul>
          )}
          {phone && !seeAll && shown.length > 6 ? (
            <button type="button" onClick={() => setSeeAll(true)} className="mt-1 inline-flex min-h-11 items-center text-[14px] font-bold text-(--ap-violet)">
              See all {shown.length}
            </button>
          ) : null}
        </AnalyticsPanel>

        <AnalyticsPanel title="Identity & banking" subtitle="Held by Beeliv - never shown to Clients">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {RESTRICTED.map((r) => (
              <li key={r} className="flex min-h-14 items-center gap-3 rounded-xl border border-(--ap-line) bg-(--ap-line-2) px-3.5 py-3">
                <LockKeyhole className="size-[18px] shrink-0 text-(--ap-muted)" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-[14.5px] font-semibold text-(--ap-ink)">{r}</span>
                <StatusChip tone="mute">Restricted</StatusChip>
              </li>
            ))}
          </ul>
        </AnalyticsPanel>
      </div>
    </div>
  );
}
