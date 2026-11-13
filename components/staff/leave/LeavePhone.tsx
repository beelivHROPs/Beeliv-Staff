"use client";

/**
 * Leave on phones (below 768px). A balance card with a ring (left versus taken), the one
 * "Request leave" action, and the request history as quiet rows with a status dot and word.
 * The balance only comes from the backend's leave summary: nothing is calculated or assumed.
 * The request form and a request's detail open in the sheet owned by LeaveBody.
 */
import { ChevronRight, CircleAlert, Plus, Sun } from "@/components/applicant/icons";
import { useStaffHome } from "@/lib/staff/hooks";
import type { LeaveRequest, LeaveStatus } from "@/lib/staff/types";
import { ActionPill, Disc, LIFT, PASTEL, Ring, Sk, StateCard } from "../kit";
import { rangeLabel } from "./leave-meta";

const WORD: Record<LeaveStatus, { word: string; dot: string }> = {
  pending: { word: "Waiting", dot: "bg-(--ap-warn)" },
  approved: { word: "Approved", dot: "bg-(--ap-ok)" },
  rejected: { word: "Not approved", dot: "bg-(--ap-rose)" },
  cancelled: { word: "Cancelled", dot: "bg-(--ap-faint)" },
};

export function LeavePhoneSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 min-[1000px]:grid min-[1000px]:grid-cols-[420px_minmax(0,1fr)] min-[1000px]:items-start min-[1000px]:gap-x-8" aria-busy="true" aria-label="Loading your leave">
      <h1 className="sr-only">Leave</h1>
      <Sk className="h-[250px] rounded-[26px]" />
      <div className="flex flex-col gap-5">
        <Sk className="h-6 w-40" />
        <Sk className="h-[170px]" />
      </div>
    </div>
  );
}

function Balance({ onRequest }: { onRequest: () => void }) {
  const { data, status } = useStaffHome();
  if (status === "loading") return <Sk className="h-[250px] rounded-[26px]" />;
  const s = data?.leaveSummary ?? null;
  const total = s ? s.remaining + s.used : 0;
  return (
    <section aria-label="Leave balance" className={`relative isolate overflow-hidden rounded-[26px] p-5 ${PASTEL.lavender} ${LIFT}`}>
      <span className="pointer-events-none absolute -top-12 -right-10 -z-10 size-40 rounded-full bg-white/45" aria-hidden="true" />
      {s ? (
        <div className="flex items-center gap-5">
          <Ring value={total > 0 ? s.remaining / total : 0} size={104} stroke={9} track="rgba(255,255,255,.8)" label={`${s.remaining} of ${total} ${s.unit} left`}>
            <span className="text-center leading-none text-(--ap-ink) tabular-nums">
              <b className="block text-[34px]">{s.remaining}</b>
              <span className="text-[14px] font-semibold text-(--ap-ink-2)">left</span>
            </span>
          </Ring>
          <div className="min-w-0 leading-snug">
            <h2 className="text-[18px] font-bold text-(--ap-ink)">Your leave</h2>
            <p className="text-[15px] text-(--ap-ink-2) tabular-nums">
              {s.used} {s.unit} taken
            </p>
            <p className="text-[15px] text-(--ap-ink-2) tabular-nums">
              {total} {s.unit} in total
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <Disc icon={Sun} size={56} />
          <div className="leading-snug">
            <h2 className="text-[18px] font-bold text-(--ap-ink)">Your leave</h2>
            <p className="text-[15px] text-(--ap-ink-2)">Your balance appears here once Beeliv confirms your leave arrangements.</p>
          </div>
        </div>
      )}
      <ActionPill icon={Plus} variant="purple" onClick={onRequest} className="mt-5">
        Request leave
      </ActionPill>
    </section>
  );
}

export function LeavePhone({ requests, status, retry, onOpen, onRequest }: { requests: LeaveRequest[]; status: string; retry: () => void; onOpen: (id: string) => void; onRequest: () => void }) {
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
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 pb-2 min-[1000px]:grid min-[1000px]:grid-cols-[420px_minmax(0,1fr)] min-[1000px]:items-start min-[1000px]:gap-x-8">
      <h1 className="text-[32px] leading-tight font-bold text-(--ap-ink) max-[767px]:sr-only min-[1000px]:col-span-2">Leave</h1>
      <Balance onRequest={onRequest} />
      <section aria-labelledby="leave-history">
        <h2 id="leave-history" className="mb-3 text-[18px] font-bold text-(--ap-ink)">
          Your requests
        </h2>
        {requests.length === 0 ? (
          <StateCard icon={Sun} title="No requests yet" text="When you ask for leave, it shows up here with its answer." />
        ) : (
          <ul className={`overflow-hidden rounded-[22px] bg-(--ap-surface,#fff) ${LIFT}`}>
            {requests.map((r) => {
              const w = WORD[r.status];
              return (
                <li key={r.id} className="border-t border-(--ap-line-2) first:border-t-0">
                  <button type="button" onClick={() => onOpen(r.id)} className="flex min-h-[76px] w-full items-center gap-3.5 px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none focus-visible:ring-inset">
                    <Disc icon={Sun} size={46} className="bg-(--ap-tint) shadow-none text-(--ap-violet)" />
                    <span className="min-w-0 flex-1 leading-snug">
                      <b className="block text-[16px] text-(--ap-ink)">{r.type}</b>
                      <span className="block text-[14px] text-(--ap-ink-2)">{rangeLabel(r)}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[14px] font-semibold text-(--ap-ink-2)">
                        <span className={`size-2 rounded-full ${w.dot}`} aria-hidden="true" />
                        {w.word}
                      </span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-(--ap-muted)" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
