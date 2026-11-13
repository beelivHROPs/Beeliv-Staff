"use client";

import { BriefcaseBusiness, LifeBuoy, Mail, MapPin, Phone } from "@/components/applicant/icons";
import { PageHeading } from "@/components/applicant/primitives";
import { useAssignmentHistory, useCurrentAssignment } from "@/lib/staff/hooks";
import type { AssignmentStatus, Contact, StaffAssignment } from "@/lib/staff/types";
import { History } from "../icons";
import { ErrorPanel } from "../ErrorPanel";
import { ActionPill, Dot, Facts, HERO_SURFACE, HeroDeco, Panel, Sk, StateCard } from "../kit";
import { fullDate } from "../schedule/parts";

/**
 * My Assignment (brief section 6). Assignment is NOT permanent profile data:
 * this page shows the current assignment plus history, so a move between
 * clients/outlets never rewrites who the person is.
 *
 * Layout: one rich hero (where, what role, since when, one action), the people to
 * call, the plain facts in one list, and the history as a small timeline.
 * Only fields the backend sends are shown: no pay period, shift pattern rules or
 * assignment documents exist in the data yet (flagged in the review doc).
 */

const STATUS: Record<AssignmentStatus, { label: string; tone: "ok" | "info" | "warn" | "mute" }> = {
  active: { label: "Active", tone: "ok" },
  upcoming: { label: "Starts soon", tone: "info" },
  paused: { label: "Paused", tone: "warn" },
  ended: { label: "Ended", tone: "mute" },
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.slice(0, 1).toUpperCase())
    .join("");

export function AssignmentBody() {
  const current = useCurrentAssignment();
  const history = useAssignmentHistory();

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 pb-2">
      <div className="max-[767px]:hidden">
        <PageHeading title="My Assignment" subtitle="Where you're assigned, and who to contact." />
      </div>
      <h1 className="sr-only min-[768px]:hidden">My Assignment</h1>

      {current.status === "loading" ? (
        <AssignmentSkeleton />
      ) : current.status === "error" ? (
        <ErrorPanel title="We couldn't load your assignment" retry={current.retry} />
      ) : current.status === "empty" || !current.data ? (
        <StateCard glass="jobs" icon={BriefcaseBusiness} title="No assignment yet" text="When Beeliv confirms where you'll work, your outlet, role and start date appear here." />
      ) : (
        <div className="flex flex-col gap-5 min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,1fr)_380px] min-[1000px]:items-start">
          <div className="flex min-w-0 flex-col gap-5">
            <Hero a={current.data} />
            <Details a={current.data} />
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <Contacts a={current.data} />
            <HistoryPanel history={history} currentId={current.data.id} />
          </div>
        </div>
      )}
      {current.status !== "ready" ? <HistoryPanel history={history} currentId={null} /> : null}
    </div>
  );
}

/** Outlet names often start with the client ("Kalina Restaurant & Lounge"): the hero shows the client once and the place once. */
function Hero({ a }: { a: StaffAssignment }) {
  const st = STATUS[a.status];
  return (
    <section aria-label="Current assignment" className={`${HERO_SURFACE} p-5 min-[768px]:p-7`}>
      <HeroDeco />
      <div className="flex flex-wrap items-center gap-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/16 px-3 py-1 text-[14px] font-semibold">
          <span className={`size-2 rounded-full ${a.status === "active" ? "bg-[#86efac]" : "bg-[#fcd34d]"}`} aria-hidden="true" />
          {st.label}
        </p>
        <span className="text-[14px] text-white/72">{a.outlet.publicId}</span>
      </div>
      <h2 className="mt-4 text-[28px] leading-[1.1] font-bold min-[768px]:text-[34px]">{a.outlet.name}</h2>
      <p className="mt-2 flex items-center gap-1.5 text-[16px] text-white/85">
        <MapPin className="size-4 shrink-0" aria-hidden="true" />
        {a.client.name} · {a.outlet.location}
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-white/18 pt-5 min-[560px]:grid-cols-3">
        <div className="min-w-0">
          <dt className="text-[14px] text-white/72">Your role</dt>
          <dd className="text-[18px] leading-snug font-bold">{a.role}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[14px] text-white/72">Department</dt>
          <dd className="text-[18px] leading-snug font-bold">{a.department}</dd>
        </div>
        <div className="col-span-2 min-w-0 min-[560px]:col-span-1">
          <dt className="text-[14px] text-white/72">Started</dt>
          <dd className="text-[18px] leading-snug font-bold tabular-nums">{fullDate(a.startDate)}</dd>
        </div>
      </dl>
      <ActionPill icon={LifeBuoy} href="/staff/help" fit className="mt-6 max-[767px]:w-full">
        Ask Beeliv a question
      </ActionPill>
    </section>
  );
}

function Details({ a }: { a: StaffAssignment }) {
  const st = STATUS[a.status];
  return (
    <Panel title="Assignment details">
      <Facts
        rows={[
          ["Client", a.client.name],
          ["Outlet", a.outlet.name],
          ["Location", a.outlet.location],
          ["Status", <Dot key="s" tone={st.tone}>{st.label}</Dot>],
          ["Ends", a.endDate ? fullDate(a.endDate) : "Ongoing"],
        ]}
      />
      {/* Working pattern: shown from Beeliv-authored tags only - no schedule rules are inferred. */}
      {a.tags.length ? (
        <div className="mt-5 border-t border-(--ap-line-2) pt-4">
          <p className="mb-2 text-[14px] text-(--ap-muted)">Working pattern</p>
          <ul className="flex flex-wrap gap-2">
            {a.tags.map((t) => (
              <li key={t} className="rounded-full bg-(--ap-tint) px-3 py-1.5 text-[14px] font-semibold text-(--ap-violet)">
                {t}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {a.context ? (
        <div className="mt-5 border-t border-(--ap-line-2) pt-4">
          <p className="mb-1.5 text-[14px] text-(--ap-muted)">About your work</p>
          <p className="text-[16px] leading-relaxed text-(--ap-ink-2)">{a.context}</p>
        </div>
      ) : null}
    </Panel>
  );
}

function ContactRow({ label, c }: { label: string; c: Contact | null }) {
  const round = "flex size-11 shrink-0 items-center justify-center rounded-full bg-(--ap-tint) text-(--ap-violet) transition-colors hover:bg-(--ap-tint-2) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:ring-offset-2 focus-visible:outline-none";
  return (
    <li className="flex items-center gap-3.5 py-4 first:pt-0 last:pb-0">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-(--ap-tint) text-[16px] font-bold text-(--ap-violet)" aria-hidden="true">
        {c ? initials(c.name) : "?"}
      </span>
      <div className="min-w-0 flex-1 leading-snug">
        <p className="text-[14px] text-(--ap-muted)">{label}</p>
        {c ? (
          <>
            <p className="truncate text-[16px] font-bold text-(--ap-ink)">{c.name}</p>
            <p className="truncate text-[14px] text-(--ap-ink-2)">{c.title}</p>
            {!c.email && !c.phone ? <p className="text-[14px] text-(--ap-muted)">Contact details to be confirmed</p> : null}
          </>
        ) : (
          <p className="text-[16px] font-semibold text-(--ap-muted)">To be confirmed</p>
        )}
      </div>
      {c?.phone ? (
        <a href={`tel:${c.phone}`} aria-label={`Call ${c.name}`} className={round}>
          <Phone className="size-5" aria-hidden="true" />
        </a>
      ) : null}
      {c?.email ? (
        <a href={`mailto:${c.email}`} aria-label={`Email ${c.name}`} className={round}>
          <Mail className="size-5" aria-hidden="true" />
        </a>
      ) : null}
    </li>
  );
}

function Contacts({ a }: { a: StaffAssignment }) {
  return (
    <Panel title="Who to contact">
      <ul className="divide-y divide-(--ap-line-2)">
        <ContactRow label="Your supervisor" c={a.supervisor} />
        <ContactRow label="Beeliv contact" c={a.beelivContact} />
      </ul>
    </Panel>
  );
}

function HistoryPanel({ history, currentId }: { history: ReturnType<typeof useAssignmentHistory>; currentId: string | null }) {
  return (
    <Panel title="Assignment history">
      {history.status === "loading" ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading your history">
          <Sk className="h-14" />
          <Sk className="h-14" />
        </div>
      ) : history.status === "error" ? (
        <ErrorPanel title="We couldn't load your history" retry={history.retry} />
      ) : history.status === "empty" || !history.data ? (
        <StateCard icon={History} title="No history yet" text="Past and upcoming assignments are listed here once Beeliv records them." />
      ) : (
        <Timeline items={history.data} currentId={currentId} />
      )}
    </Panel>
  );
}

/** Newest first, one container, a thin line joining the dots. The current assignment has the filled dot. */
function Timeline({ items, currentId }: { items: StaffAssignment[]; currentId: string | null }) {
  const sorted = [...items].sort((x, y) => y.startDate.localeCompare(x.startDate));
  return (
    <ol>
      {sorted.map((a, i) => {
        const st = STATUS[a.status];
        const isCurrent = a.id === currentId || (currentId === null && a.status === "active");
        return (
          <li key={a.id} className="relative flex gap-4 pb-5 last:pb-0">
            {i < sorted.length - 1 ? <span className="absolute top-6 bottom-0 left-[9px] w-px bg-(--ap-line)" aria-hidden="true" /> : null}
            <span className={`relative z-[1] mt-1.5 size-[19px] shrink-0 rounded-full border-[3px] ${isCurrent ? "border-(--ap-violet) bg-(--ap-violet)" : "border-(--ap-tint-2) bg-(--ap-surface,#fff)"}`} aria-hidden="true" />
            <div className="min-w-0 flex-1 leading-snug">
              <p className="text-[16px] font-bold text-(--ap-ink)">{a.outlet.name}</p>
              <p className="text-[14px] text-(--ap-ink-2)">
                {a.role} · {a.department}
              </p>
              <p className="mt-0.5 text-[14px] text-(--ap-muted) tabular-nums">
                {fullDate(a.startDate)} to {a.endDate ? fullDate(a.endDate) : "present"}
              </p>
              <p className="mt-1">
                <Dot tone={isCurrent ? "ok" : st.tone}>{isCurrent ? "Current" : st.label}</Dot>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function AssignmentSkeleton() {
  return (
    <div className="flex flex-col gap-5 min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,1fr)_380px]" aria-busy="true" aria-label="Loading your assignment">
      <div className="flex flex-col gap-5">
        <Sk className="h-[300px] rounded-[26px]" />
        <Sk className="h-[260px]" />
      </div>
      <div className="flex flex-col gap-5">
        <Sk className="h-[220px]" />
        <Sk className="h-[200px]" />
      </div>
    </div>
  );
}

/** Route-level loading UI (heading + skeleton). */
export function AssignmentLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 pb-2">
      <h1 className="sr-only">My Assignment</h1>
      <div className="max-[767px]:hidden">
        <PageHeading title="My Assignment" subtitle="Where you're assigned, and who to contact." />
      </div>
      <AssignmentSkeleton />
    </div>
  );
}
