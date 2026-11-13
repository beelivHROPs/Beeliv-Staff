"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "@/components/applicant/icons";
import { useIsPhone } from "@/components/applicant/motion";
import { PageHeading } from "@/components/applicant/primitives";
import { ClipboardList as ClipIcon } from "../icons";
import { useWorkforceRequests } from "@/lib/client/hooks";
import { dayMonth, plural } from "@/lib/client/format";
import { DEPARTMENT_LABEL } from "@/lib/client/labels";
import { requestHref } from "@/lib/client/links";
import { useOutletState } from "@/lib/client/outlet";
import { StatusChip } from "../StatusChip";
import { AnalyticsPanel, ChartEmptyState } from "../charts";
import { PageError, PageSkeleton } from "../recruitment/states";
import { HeroCard } from "@/components/shared/premium";
import { RequestStatusChip, RequestStatusWord } from "./meta";
import { RequestForm } from "./RequestForm";

/**
 * Workforce Requests (brief section 16): the Client tells Beeliv what staff it
 * needs and follows each request's status. Requests go to Beeliv HR for
 * review; nothing here publishes a vacancy. `?new=1` (the Overview's "Request
 * staff" links) opens the form straight away.
 */
/** Phone shows the 5 most recent requests, then "See all". */
const PHONE_SHORT = 5;

export function RequestsBody({ initialOpen }: { initialOpen: boolean }) {
  const { data, status, retry } = useWorkforceRequests();
  const outlet = useOutletState();
  const [open, setOpen] = useState(initialOpen);
  const [justSent, setJustSent] = useState<string | null>(null);
  const [allShown, setAllShown] = useState(false);
  const phone = useIsPhone();
  const formRef = useRef<HTMLDivElement>(null);
  const showOutlet = outlet.outlets.length > 1 && outlet.scope === "all";
  const outletName = (id: string) => outlet.outlets.find((o) => o.id === id)?.name ?? "";

  useEffect(() => {
    if (open) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [open]);

  if (status === "loading" && !data) return <PageSkeleton title="Workforce Requests" label="Loading requests" blocks={[110, 380]} />;
  if (status === "error") return <PageError heading="Workforce Requests" title="We couldn't load your requests" retry={retry} />;

  const list = [...(data ?? [])].sort((a, b) => (a.submittedOn === b.submittedOn ? (Number(a.id.replace("req-", "")) < Number(b.id.replace("req-", "")) ? 1 : -1) : a.submittedOn < b.submittedOn ? 1 : -1));

  function toggle(v: boolean) {
    setOpen(v);
    if (!v && window.location.search.includes("new=1")) window.history.replaceState(null, "", "/client/requests");
  }

  const openCount = list.filter((r) => r.status !== "closed").length;
  const readyCount = list.filter((r) => r.status === "candidates-submitted").length;

  return (
    <div>
      {phone && list.length > 0 ? (
        <HeroCard eyebrow="Your requests" ariaLabel="Requests summary" className="mb-4">
          <div className="flex items-end gap-4">
            <p className="flex flex-col">
              <b className="text-[52px] leading-none font-bold tabular-nums">{openCount}</b>
              <span className="mt-1.5 text-[14px] whitespace-nowrap text-white/85">open {openCount === 1 ? "request" : "requests"}</span>
            </p>
            <dl className="m-0 ml-auto border-l border-white/25 pl-4">
              <dt className="text-[12px] text-white/75">Ready to review</dt>
              <dd className="m-0 text-[24px] leading-tight font-bold tabular-nums">{readyCount}</dd>
            </dl>
          </div>
        </HeroCard>
      ) : null}
      <PageHeading
        title="Workforce Requests"
        subtitle="Tell Beeliv what staff you need. Beeliv HR reviews every request."
        right={
          open ? null : (
            <button type="button" onClick={() => toggle(true)} className="ap-btn ap-btn-p h-11 text-white! max-[767px]:w-full">
              <Plus className="size-4" aria-hidden="true" /> Request staff
            </button>
          )
        }
      />

      <div className="flex flex-col gap-4 min-[768px]:gap-5">
        {open ? (
          <div ref={formRef} className="scroll-mt-[90px]">
            <AnalyticsPanel title="Request staff">
              <RequestForm
                onDone={(r) => {
                  setJustSent(r.id);
                  toggle(false);
                }}
                onCancel={() => toggle(false)}
              />
            </AnalyticsPanel>
          </div>
        ) : null}

        <AnalyticsPanel title={phone && list.length ? `Requests (${list.length})` : "Your requests"} subtitle={list.length && !phone ? plural(list.length, "request") : undefined}>
          {list.length === 0 ? (
            <ChartEmptyState
              icon={ClipIcon}
              title="No requests yet"
              description="Need more people? Send Beeliv a request and follow its progress here."
              action={
                open ? undefined : (
                  <button type="button" onClick={() => toggle(true)} className="ap-btn ap-btn-p ap-btn-sm mt-1 text-white!">
                    <Plus className="size-4" aria-hidden="true" /> Request staff
                  </button>
                )
              }
            />
          ) : (
            <>
              <ul className="m-0 flex list-none flex-col p-0 max-[767px]:gap-2.5">
                {(allShown || !phone ? list : list.slice(0, PHONE_SHORT)).map((r) => (
                  <li key={r.id}>
                    <Link href={requestHref(r.id)} className="flex min-h-14 items-center gap-3 border-t border-(--ap-line-2) py-2.5 first:border-t-0 min-[768px]:hover:bg-(--ap-tint-soft) max-[767px]:rounded-[20px] max-[767px]:border max-[767px]:border-(--ap-line) max-[767px]:bg-(--ap-surface) max-[767px]:p-3.5">
                      <span className="min-w-0 flex-1 max-[767px]:order-1">
                        <b className="block text-[15px] text-(--ap-ink)">
                          {r.hasUpdate ? <span className="mr-1.5 inline-block size-2 rounded-full bg-(--ap-violet) min-[768px]:hidden" role="img" aria-label="Updated" /> : null}
                          {r.role} <span className="font-semibold text-(--ap-muted)">x {r.count}</span>
                        </b>
                        <span className="mt-0.5 block text-[13px] text-(--ap-muted)">
                          <span className="max-[767px]:hidden">
                            {showOutlet ? `${outletName(r.outletId)} · ` : ""}
                            {DEPARTMENT_LABEL[r.departmentId]} ·{" "}
                          </span>
                          Start {dayMonth(r.resumptionDate)}
                          <span className="max-[767px]:hidden"> · {r.publicId}</span>
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1 min-[768px]:flex-row min-[768px]:items-center max-[767px]:order-2">
                        {r.id === justSent ? <StatusChip tone="ok">Just sent</StatusChip> : <span className="min-[768px]:hidden"><RequestStatusWord status={r.status} /></span>}
                        {r.hasUpdate ? <span className="max-[767px]:hidden"><StatusChip tone="plum">Updated</StatusChip></span> : null}
                        <span className="max-[767px]:hidden"><RequestStatusChip status={r.status} /></span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-(--ap-faint) max-[767px]:hidden" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              {phone && !allShown && list.length > PHONE_SHORT ? (
                <button type="button" onClick={() => setAllShown(true)} className="mt-1 inline-flex min-h-11 items-center text-[14px] font-bold text-(--ap-violet) min-[768px]:hidden">
                  See all {list.length}
                </button>
              ) : null}
            </>
          )}
        </AnalyticsPanel>
      </div>
    </div>
  );
}
