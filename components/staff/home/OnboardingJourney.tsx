"use client";

/**
 * New staff on Home: a welcome hero, ONE "Getting started" card (progress ring + ordered
 * checklist), "Your first day" and "Meet your team" (docs/ONBOARDING-FLOW-MERGED-2026-11-12.md).
 * Presentation only. Ticks come only from the server's home snapshot (done flags). Agreements are
 * accepted in account setup, never here, and the card is hidden once every item is done.
 */
import type { ReactNode } from "react";
import { Calendar, Check, CircleAlert, Clock3, FileText, LifeBuoy, MapPin, Upload, UserRound } from "@/components/applicant/icons";
import { addDays, dueLabel, displayName, formatClock, longDate, parseDate, todayISO } from "@/lib/staff/format";
import type { OnboardingItem, StaffAssignment, StaffHome } from "@/lib/staff/types";
import { GettingStartedCard, type GettingStartedItem } from "@/components/shared/setup/GettingStarted";
import { ActionPill, Disc, Facts, HERO_SURFACE, HeroDeco, LIFT, PASTEL, Panel, Sk } from "../kit";

const KIND_ICON = { agreement: FileText, profile: UserRound, document: Upload } as const;
const KIND_ACTION = { agreement: "Review", profile: "Add details", document: "Upload" } as const;
const KIND_LINE = { agreement: "Read it, then accept to confirm.", profile: "Beeliv needs this on your record.", document: "Beeliv needs this from you." } as const;

/** Whole days from today to a date (negative when it has passed). */
function daysTo(d: string): number {
  return Math.round((parseDate(d).getTime() - parseDate(todayISO()).getTime()) / 86_400_000);
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/* ---------- Skeleton ---------- */

export function OnboardingSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,460px)_minmax(0,1fr)] min-[1000px]:items-start min-[1000px]:gap-x-8" aria-busy="true" aria-label="Loading your onboarding">
      <h1 className="sr-only">Home</h1>
      <div className="flex min-w-0 flex-col gap-5">
        <Sk className="h-[300px] rounded-[26px]" />
        <Sk className="h-[220px]" />
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <Sk className="h-[420px]" />
        <Sk className="h-[160px]" />
      </div>
    </div>
  );
}

/* ---------- Pieces ---------- */

function Hero({ home, assignment, next }: { home: StaffHome; assignment: StaffAssignment | null; next: OnboardingItem | undefined }) {
  const name = displayName(home.profile);
  const days = assignment ? daysTo(assignment.startDate) : null;
  const time = assignment?.firstDay?.time;
  return (
    <section aria-label="Welcome" className={`${HERO_SURFACE} p-5 min-[768px]:p-6`}>
      <HeroDeco />
      <div className="flex items-start justify-between gap-3">
        <p className="inline-flex items-center rounded-full bg-white/16 px-3 py-1 text-[14px] font-semibold">Welcome aboard</p>
        {days !== null && days >= 0 ? (
          <span role="img" aria-label={days === 0 ? "Your first day is today" : `${plural(days, "day", "days")} until your first day`} className="flex size-[76px] shrink-0 flex-col items-center justify-center rounded-full bg-white/16 leading-none tabular-nums shadow-[inset_0_0_0_1.5px_rgba(255,255,255,.28)]">
            {days === 0 ? (
              <b className="text-[17px]">Today</b>
            ) : (
              <>
                <b className="text-[28px]">{days}</b>
                <span className="mt-1 text-[13px] text-white/80">{days === 1 ? "day" : "days"} to go</span>
              </>
            )}
          </span>
        ) : null}
      </div>
      <h1 className="-mt-1 text-[28px] leading-[1.12] font-bold max-[380px]:text-[26px]">
        Welcome to {assignment ? assignment.client.name : "Beeliv"}, {name}
      </h1>
      {assignment ? (
        <>
          <p className="mt-2 text-[16px] text-white/88 tabular-nums">
            Your first day is {longDate(assignment.startDate)}
            {time ? ` at ${formatClock(time)}` : ""}.
          </p>
          <p className="mt-4 flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/92 text-[15px] font-bold text-(--ap-plum,#292052)" aria-hidden="true">
              {assignment.client.name.slice(0, 1)}
            </span>
            <span className="min-w-0 leading-tight">
              <b className="block truncate text-[16px]">{assignment.role}</b>
              <span className="flex items-center gap-1 text-[14px] text-white/78">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{assignment.outlet.name}, {assignment.outlet.location}</span>
              </span>
            </span>
          </p>
        </>
      ) : (
        <p className="mt-2 text-[16px] text-white/88">Beeliv will share your start date and outlet as soon as they are confirmed.</p>
      )}
      {next ? (
        <ActionPill icon={Check} href={next.href ?? "/staff"} className="mt-5">
          Continue onboarding
        </ActionPill>
      ) : null}
    </section>
  );
}

/** Sand card: only for the single most urgent item that is due soon and is not already the highlighted next step. */
function NeedsYou({ item }: { item: OnboardingItem }) {
  const Icon = KIND_ICON[item.kind];
  return (
    <section aria-label="Needs your attention" className={`rounded-[22px] p-4 ${PASTEL.sand} ${LIFT}`}>
      <div className="flex items-center gap-3.5">
        <Disc icon={item.kind === "document" ? Upload : CircleAlert} size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-(--ap-warn)">Needs you soon</p>
          <p className="text-[16px] leading-snug font-bold text-(--ap-ink)">{item.label}</p>
          {item.dueDate ? <p className="text-[14px] text-(--ap-ink-2) tabular-nums">{dueLabel(item.dueDate)}</p> : null}
        </div>
      </div>
      <ActionPill href={item.href ?? "/staff"} icon={Icon} variant="purple" compact className="mt-3.5 w-full" ariaLabel={`${KIND_ACTION[item.kind]}: ${item.label}`}>
        {KIND_ACTION[item.kind]}
      </ActionPill>
    </section>
  );
}

type Row = OnboardingItem & { isDone: boolean; isNext: boolean };

/** The single "Getting started" card: the shared step card (same one the setup page uses), Staff action pills. It hides itself when every item is done. */
function Checklist({ rows }: { rows: Row[] }) {
  const items: GettingStartedItem[] = rows.map((r) => ({ id: r.id, title: r.label, why: `${r.detail ?? KIND_LINE[r.kind]}${!r.isDone && r.dueDate ? ` ${dueLabel(r.dueDate)}.` : ""}`, done: r.isDone, href: r.href ?? "/staff", actionLabel: KIND_ACTION[r.kind] }));
  return (
    <GettingStartedCard
      items={items}
      renderAction={(i, primary) => (
        <ActionPill variant={primary && !i.done ? "purple" : "outline"} compact arrow={false} href={i.href} ariaLabel={`${i.done ? "Review" : i.actionLabel}: ${i.title}`}>
          {i.done ? "Review" : i.actionLabel}
        </ActionPill>
      )}
    />
  );
}

function FirstDay({ a }: { a: StaffAssignment | null }) {
  if (!a) {
    return (
      <Panel title="Your first day">
        <p className="flex items-start gap-3 text-[16px] text-(--ap-ink-2)">
          <Calendar className="mt-0.5 size-5 shrink-0 text-(--ap-violet)" aria-hidden="true" />
          Beeliv will share the date, time and place as soon as your placement is confirmed.
        </p>
      </Panel>
    );
  }
  const rows: [string, ReactNode][] = [
    ["Date", longDate(a.startDate)],
    ...(a.firstDay?.time ? ([["Time", formatClock(a.firstDay.time)]] as [string, ReactNode][]) : []),
    ["Place", `${a.outlet.name}, ${a.outlet.location}`],
    ...(a.supervisor ? ([["Ask for", a.supervisor.name]] as [string, ReactNode][]) : []),
    ...(a.firstDay?.bring?.length ? ([["Bring", a.firstDay.bring.join(", ")]] as [string, ReactNode][]) : []),
  ];
  return (
    <Panel title="Your first day" aside={<Clock3 className="size-5 text-(--ap-violet)" aria-hidden="true" />}>
      <Facts rows={rows} />
    </Panel>
  );
}

function initials(name: string) {
  return name.replace(/^(mr|mrs|ms|dr)\.?\s+/i, "").split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function Team({ a }: { a: StaffAssignment | null }) {
  const people = [a?.supervisor ? { ...a.supervisor, key: "sup", help: false } : null, a?.beelivContact ? { ...a.beelivContact, key: "beeliv", help: true } : null].filter((p): p is NonNullable<typeof p> => !!p);
  if (people.length === 0) return null;
  return (
    <Panel title="Meet your team">
      <ul className="divide-y divide-(--ap-line-2)">
        {people.map((p) => (
          <li key={p.key} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${p.help ? PASTEL.gold : PASTEL.lavender}`} aria-hidden="true">
              {p.help ? <LifeBuoy className="size-5" /> : initials(p.name)}
            </span>
            <div className="min-w-0 flex-1 leading-snug">
              <b className="block truncate text-[16px] text-(--ap-ink)">{p.name}</b>
              <span className="block truncate text-[14px] text-(--ap-muted)">{p.title ?? (p.help ? "Beeliv" : "")}</span>
            </div>
            {p.help ? (
              <ActionPill href="/staff/help" variant="outline" compact arrow={false} ariaLabel={`Get help from ${p.name}`}>
                Get help
              </ActionPill>
            ) : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ---------- The journey ---------- */

export function OnboardingJourney({ home }: { home: StaffHome }) {
  // Agreements belong to account setup, so they never appear on this card. Each profile item ticks only when the server says
  // that section holds data (next of kin is its own record, not the application's emergency contact).
  const items = (home.onboarding ?? []).filter((i) => i.kind !== "agreement");
  const done = items.filter((i) => i.done).length;
  const everythingDone = items.length === 0 || done === items.length;
  const firstOpen = items.find((i) => !i.done);
  const rows: Row[] = items.map((i) => ({ ...i, isDone: i.done, isNext: !!firstOpen && i.id === firstOpen.id }));
  const soon = addDays(todayISO(), 3);
  const urgent = items
    .filter((i) => !i.done && i.dueDate && i.dueDate <= soon && i.id !== firstOpen?.id)
    .sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string))[0];
  const assignment = home.assignment;

  const nextStep = rows.find((r) => r.isNext);
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 pb-2 min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,460px)_minmax(0,1fr)] min-[1000px]:items-start min-[1000px]:gap-x-8">
      {/* Phone order: hero, needs you, checklist, first day, team. From 1000px: hero + needs you + first day on the left, checklist + team on the right. */}
      <div className="contents min-[1000px]:flex min-[1000px]:min-w-0 min-[1000px]:flex-col min-[1000px]:gap-5">
        <div className="order-1 min-[1000px]:order-none">
          <Hero home={home} assignment={assignment} next={nextStep} />
        </div>
        {urgent ? (
          <div className="order-2 min-[1000px]:order-none">
            <NeedsYou item={urgent} />
          </div>
        ) : null}
        <div className="order-4 min-[1000px]:order-none">
          <FirstDay a={assignment} />
        </div>
      </div>
      <div className="contents min-[1000px]:flex min-[1000px]:min-w-0 min-[1000px]:flex-col min-[1000px]:gap-5">
        {everythingDone ? null : (
          <div className="order-3 min-[1000px]:order-none">
            <Checklist rows={rows} />
          </div>
        )}
        <div className="order-5 min-[1000px]:order-none">
          <Team a={assignment} />
        </div>
      </div>
    </div>
  );
}
