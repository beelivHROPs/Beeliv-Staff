"use client";

/**
 * Leave on desktop (1000px and up): balance cards across the top (a ring with the days left, then
 * what is waiting and what is approved), the "Request leave" pill, and the request history as a
 * table. The balance only comes from the backend's leave summary: nothing is calculated or assumed,
 * and only one summary exists today, so there is one ring (more types need the backend to send them).
 * The form and a request's detail open in the sheet owned by LeaveBody.
 */
import { ChevronRight, CircleAlert, Plus, Sun } from "@/components/applicant/icons";
import { useStaffHome } from "@/lib/staff/hooks";
import { dayMonth } from "@/lib/staff/format";
import type { LeaveRequest } from "@/lib/staff/types";
import { ActionPill, Disc, PANEL, PASTEL, Ring, Sk, StateCard } from "../kit";
import { LeaveStatusChip, rangeLabel } from "./leave-meta";

function Tile({ tone, label, value, sub }: { tone: "sand" | "sage"; label: string; value: number; sub: string }) {
  return (
    <section aria-label={label} className={`rounded-[22px] p-5 ${PASTEL[tone]}`}>
      <p className="text-[14px] font-semibold text-(--ap-ink-2)">{label}</p>
      <b className="mt-1 block text-[40px] leading-none text-(--ap-ink) tabular-nums">{value}</b>
      <p className="mt-1.5 text-[14px] text-(--ap-ink-2)">{sub}</p>
    </section>
  );
}

export function LeaveDesktop({ requests, status, retry, onOpen, onRequest }: { requests: LeaveRequest[]; status: string; retry: () => void; onOpen: (id: string) => void; onRequest: () => void }) {
  const { data, status: homeStatus } = useStaffHome();
  const s = data?.leaveSummary ?? null;
  const total = s ? s.remaining + s.used : 0;
  const waiting = requests.filter((r) => r.status === "pending").length;
  const approved = requests.filter((r) => r.status === "approved").length;

  if (status === "error") {
    return (
      <div className="mx-auto w-full max-w-[760px] pt-2">
        <h1 className="sr-only">Leave</h1>
        <StateCard
          icon={CircleAlert}
          title="We couldn't load your leave"
          text="Check your connection and try again. Nothing on your account has changed."
          action={
            <ActionPill variant="purple" compact className="w-full" onClick={retry}>
              Try again
            </ActionPill>
          }
        />
      </div>
    );
  }
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 pb-2">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[32px] leading-tight font-bold text-(--ap-ink)">Leave</h1>
        <ActionPill icon={Plus} variant="dark" fit onClick={onRequest}>
          Request leave
        </ActionPill>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {homeStatus === "loading" ? (
          <Sk className="h-[150px]" />
        ) : (
          <section aria-label="Leave balance" className={`flex items-center gap-5 rounded-[22px] p-5 ${PASTEL.lavender}`}>
            {s ? (
              <>
                <Ring value={total > 0 ? s.remaining / total : 0} size={96} stroke={9} track="rgba(255,255,255,.8)" label={`${s.remaining} of ${total} ${s.unit} left`}>
                  <b className="text-[30px] leading-none text-(--ap-ink) tabular-nums">{s.remaining}</b>
                </Ring>
                <p className="leading-snug">
                  <b className="block text-[18px] text-(--ap-ink)">{s.unit} left</b>
                  <span className="text-[14px] text-(--ap-ink-2) tabular-nums">
                    {s.used} taken · {total} in total
                  </span>
                </p>
              </>
            ) : (
              <>
                <Disc icon={Sun} size={56} />
                <p className="text-[15px] leading-snug text-(--ap-ink-2)">Your balance appears here once Beeliv confirms your leave arrangements.</p>
              </>
            )}
          </section>
        )}
        <Tile tone="sand" label="Waiting for an answer" value={waiting} sub={waiting === 1 ? "request" : "requests"} />
        <Tile tone="sage" label="Approved" value={approved} sub={approved === 1 ? "request" : "requests"} />
      </div>

      <section aria-labelledby="leave-history" className={`${PANEL} overflow-hidden`}>
        <h2 id="leave-history" className="px-5 pt-5 pb-3 text-[18px] font-bold text-(--ap-ink)">
          Your requests
        </h2>
        {requests.length === 0 ? (
          <div className="px-5 pb-5">
            <StateCard icon={Sun} title="No requests yet" text="When you ask for leave, it shows up here with its answer." />
          </div>
        ) : (
          <table className="w-full text-left text-[15px]">
            <thead className="border-y border-(--ap-line-2) text-[13px] font-semibold text-(--ap-muted)">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-semibold">Type</th>
                <th scope="col" className="py-2.5 font-semibold">Dates</th>
                <th scope="col" className="py-2.5 font-semibold">Asked on</th>
                <th scope="col" className="py-2.5 font-semibold">Status</th>
                <th scope="col" className="py-2.5 font-semibold">Note</th>
                <th scope="col" className="w-12 px-5 py-2.5"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-(--ap-line-2) last:border-b-0 hover:bg-(--ap-tint-soft)">
                  <td className="px-5 py-3 font-bold text-(--ap-ink)">{r.type}</td>
                  <td className="py-3 text-(--ap-ink-2)">{rangeLabel(r)}</td>
                  <td className="py-3 text-(--ap-ink-2)">{dayMonth(r.submittedAt.slice(0, 10))}</td>
                  <td className="py-3">
                    <LeaveStatusChip status={r.status} />
                  </td>
                  <td className="max-w-[220px] truncate py-3 text-[14px] text-(--ap-muted)">{r.decisionNote ?? ""}</td>
                  <td className="px-5 py-1">
                    <button type="button" onClick={() => onOpen(r.id)} aria-label={`Open ${r.type}, ${rangeLabel(r)}`} className="flex size-11 items-center justify-center rounded-full text-(--ap-violet) hover:bg-(--ap-tint) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none">
                      <ChevronRight className="size-5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
