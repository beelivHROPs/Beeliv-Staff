"use client";

/**
 * Staff Home on phones. A greeting with a progress ring around your photo, one
 * rich Today card (the strong block), a "needs you" card only when something is
 * owed, the week as a big number with day bars, a sideways row of what to read
 * and learn, and a pair of cards for leave and documents. Wider screens keep
 * the existing Home. Presentation only: all values come from the existing hooks.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { Calendar, ChevronRight, CircleAlert, Clock3, ExternalLink, FileText, Files, MapPin, Sun, Upload, Video } from "@/components/applicant/icons";
import { addDays, dayMonth, dayNumber, displayName, formatClock, formatDateTimeClock, greetingForNow, longDate, parseDate, timeAgo, todayISO, toISODate, weekday } from "@/lib/staff/format";
import { useSchedule, useSopLibrary, useTraining } from "@/lib/staff/hooks";
import { isOpenItem, sopMeta, sopStatus } from "@/lib/staff/sops/derive";
import type { Shift, StaffHome } from "@/lib/staff/types";
import { BookOpen, LogIn } from "../icons";
import { ActionPill, Disc, HERO_SURFACE, HeroDeco, LIFT, PASTEL, Ring, Segmented, type PastelTone } from "../kit";
import { runClock } from "./HomeHero";
import { BoldTile } from "@/components/shared/icons";

const dateLine = () => parseDate(todayISO()).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

function hoursOf(s: Shift): number {
  const [h1, m1] = s.startTime.split(":").map(Number);
  const [h2, m2] = s.endTime.split(":").map(Number);
  return Math.max(0, (h2 * 60 + m2 - (h1 * 60 + m1)) / 60);
}
const fmtH = (h: number) => (Number.isInteger(h) ? String(h) : h.toFixed(1));

/** Hours so far versus planned for a set of shifts. A shift counts as done once its day has passed or it is completed. */
function tally(shifts: Shift[], today: string) {
  const live = shifts.filter((s) => s.status !== "cancelled");
  const total = live.reduce((n, s) => n + hoursOf(s), 0);
  const done = live.filter((s) => s.date < today || s.status === "completed").reduce((n, s) => n + hoursOf(s), 0);
  return { live, total, done, share: total > 0 ? done / total : 0 };
}

export function useRange() {
  const today = todayISO();
  return useMemo(() => {
    const d = parseDate(today);
    const monday = addDays(today, -((d.getDay() + 6) % 7));
    const monthStart = toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
    const monthEnd = toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    return { today, monday, sunday: addDays(monday, 6), monthStart, monthEnd, from: monday < monthStart ? monday : monthStart, to: addDays(monday, 6) > monthEnd ? addDays(monday, 6) : monthEnd };
  }, [today]);
}

/* ---------- Greeting ---------- */

/** Text only: your photo lives in the top bar, and the week figure lives in the hours card, so neither repeats here. */
export function Greeting({ home }: { home: StaffHome }) {
  return (
    <header className="px-1">
      {/* On phones the greeting and name live in the top bar, so they show once. */}
      <p className="text-[15px] text-(--ap-muted) max-[767px]:hidden">{greetingForNow().replace(",", "")}</p>
      <h1 className="truncate text-[32px] leading-tight font-bold text-(--ap-ink) max-[767px]:sr-only">{displayName(home.profile)}</h1>
      <p className="text-[15px] text-(--ap-muted)">{dateLine()}</p>
    </header>
  );
}

/* ---------- Today ---------- */

function PillAction({ icon, children, onClick, href }: { icon: typeof LogIn; children: React.ReactNode; onClick?: () => void; href?: string }) {
  return (
    <ActionPill icon={icon} onClick={onClick} href={href} className="mt-5">
      {children}
    </ActionPill>
  );
}

/** Outlet names often start with the client ("Kalina, Abuja"): drop that prefix so the client shows once and the place once. */
function placeOnly(client: string, outlet: string): string {
  const o = outlet.trim();
  if (o.toLowerCase().startsWith(client.trim().toLowerCase())) {
    const rest = o.slice(client.trim().length).replace(/^[\s,\-–·:]+/, "");
    if (rest) return rest;
  }
  return o;
}

function ClientChip({ name, place }: { name: string; place: string }) {
  return (
    <p className="mt-4 flex items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/92 text-[15px] font-bold text-(--ap-plum,#292052)" aria-hidden="true">
        {name.slice(0, 1)}
      </span>
      <span className="min-w-0 leading-tight">
        <b className="block truncate text-[16px]">{name}</b>
        <span className="flex items-center gap-1 text-[14px] text-white/78">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{place}</span>
        </span>
      </span>
    </p>
  );
}

export function TodayCard({ home }: { home: StaffHome }) {
  const { today, assignment } = home;
  const shift = today.shift;
  const [mountedAt] = useState(() => Date.now());
  const next = home.upcoming.find((s) => s.date > todayISO());

  let label = "Today";
  let big = "Day off";
  let sub: string | null = next ? `Next shift ${longDate(next.date)}, ${formatClock(next.startTime)}` : "Nothing is scheduled yet. Enjoy the rest.";
  let action: React.ReactNode = next ? (
    <PillAction icon={Calendar} href={`/staff/schedule/${next.id}`}>
      View next shift
    </PillAction>
  ) : null;
  let ringValue = 0;
  let ringText: React.ReactNode = <Sun className="size-6" aria-hidden="true" />;
  let ringLabel = "Day off";
  let who: { name: string; place: string } | null = assignment ? { name: assignment.client.name, place: placeOnly(assignment.client.name, assignment.outlet.name) } : null;

  if (!assignment) {
    big = "No assignment yet";
    sub = "Beeliv will let you know as soon as one is confirmed.";
    action = null;
  } else if (shift && today.state !== "no-shift") {
    big = `${formatClock(shift.startTime)} – ${formatClock(shift.endTime)}`.replaceAll(" ", " ");
    who = { name: shift.client, place: `${placeOnly(shift.client, shift.outlet)} · ${shift.section}` };
    const hrs = hoursOf(shift);
    ringText = (
      <span className="text-center leading-none tabular-nums">
        <b className="block text-[20px]">{fmtH(hrs)}</b>
        <span className="text-[13px] text-white/78">hrs</span>
      </span>
    );
    ringLabel = `${fmtH(hrs)} hour shift`;
    const view = (
      <PillAction icon={Clock3} href={`/staff/schedule/${shift.id}`}>
        View shift
      </PillAction>
    );
    switch (today.state) {
      case "ready":
        sub = "Your shift starts soon. Ready when you are.";
        action = (
          <PillAction icon={LogIn} onClick={() => runClock("in", shift)}>
            Check in
          </PillAction>
        );
        break;
      case "upcoming":
        label = "Later today";
        sub = "Check-in opens a little before you start.";
        action = view;
        break;
      case "checked-in": {
        label = "On shift";
        sub = today.checkedInAt ? `Checked in at ${formatDateTimeClock(today.checkedInAt)}` : "You're on shift. Have a great one.";
        const start = today.checkedInAt ? new Date(today.checkedInAt).getTime() : mountedAt;
        ringValue = Math.min(1, Math.max(0.04, (mountedAt - start) / (hrs * 3_600_000)));
        action = (
          <PillAction icon={LogIn} onClick={() => runClock("out", shift)}>
            Check out
          </PillAction>
        );
        break;
      }
      case "checked-out":
        label = "Done for today";
        sub = today.checkedOutAt ? `Checked out at ${formatDateTimeClock(today.checkedOutAt)}. Thank you.` : "Thank you for today.";
        ringValue = 1;
        action = view;
        break;
      case "attention":
        label = "Needs a look";
        sub = today.attentionReason ?? "Your attendance needs a quick look.";
        action = (
          <PillAction icon={CircleAlert} href="/staff/attendance">
            View attendance
          </PillAction>
        );
        break;
    }
  }

  return (
    <section aria-label="Today" className={`${HERO_SURFACE} p-5`}>
      <HeroDeco />
      <div className="flex items-start justify-between gap-3">
        <p className="inline-flex items-center rounded-full bg-white/16 px-3 py-1 text-[14px] font-semibold">{label}</p>
        <Ring value={ringValue} size={72} stroke={6} track="rgba(255,255,255,.22)" arc="#e8d9a8" label={ringLabel}>
          {ringText}
        </Ring>
      </div>
      <p className="-mt-3 text-[28px] leading-[1.1] font-bold tabular-nums max-[380px]:text-[26px]">{big}</p>
      {sub ? <p className="mt-2 text-[16px] text-white/85">{sub}</p> : null}
      {who ? <ClientChip name={who.name} place={who.place} /> : null}
      {action}
    </section>
  );
}

/* ---------- Needs you ---------- */

export function NeedsYou({ home }: { home: StaffHome }) {
  const lib = useSopLibrary();
  const unread = (lib.data ?? []).filter((s) => sopStatus(s) === "new");
  const first = home.requiredActions.find((a) => a.kind !== "sop" && a.kind !== "training") ?? home.requiredActions[0];
  let title: string;
  let href: string;
  let button: string;
  let extra = home.requiredActions.length - 1;
  if (first) {
    title = first.title;
    href = first.href;
    button = first.actionLabel;
  } else if (unread.length) {
    title = unread.length === 1 ? `New SOP to read: ${unread[0].title}` : `${unread.length} new SOPs to read`;
    href = "/staff/sops-training";
    button = "Open SOPs";
    extra = 0;
  } else return null;
  return (
    <section aria-label="Needs your attention" className={`rounded-[22px] p-4 ${PASTEL.sand} ${LIFT}`}>
      <div className="flex items-center gap-3.5">
        <Disc icon={first?.kind === "document" || first?.kind === "document-request" ? Upload : CircleAlert} size={48} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-(--ap-warn)">Needs you{extra > 0 ? ` · ${extra} more after this` : ""}</p>
          <p className="text-[16px] leading-snug font-bold text-(--ap-ink)">{title}</p>
          {first?.dueDate ? <p className="text-[14px] text-(--ap-ink-2) tabular-nums">Due {dayMonth(first.dueDate)}</p> : null}
        </div>
      </div>
      <ActionPill href={href} variant="purple" compact className="mt-3.5 w-full">
        {button}
      </ActionPill>
    </section>
  );
}

/* ---------- Week / Month ---------- */

function WeekMonth({ value, onChange }: { value: "week" | "month"; onChange: (v: "week" | "month") => void }) {
  return (
    <Segmented
      label="Show"
      value={value}
      onChange={onChange}
      options={[
        { key: "week", label: "Week" },
        { key: "month", label: "Month" },
      ]}
    />
  );
}

export function WeekCard({ shifts, r }: { shifts: Shift[]; r: ReturnType<typeof useRange> }) {
  const [mode, setMode] = useState<"week" | "month">("week");
  const { today } = r;
  const bars = useMemo(() => {
    if (mode === "week") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = addDays(r.monday, i);
        const hrs = shifts.filter((s) => s.date === d && s.status !== "cancelled").reduce((n, s) => n + hoursOf(s), 0);
        return { key: d, top: weekday(d).slice(0, 3), bottom: String(dayNumber(d)), hrs, now: d === today, past: d < today };
      });
    }
    // Month: one bar per week (Monday start) that touches this month.
    const out: { key: string; top: string; bottom: string; hrs: number; now: boolean; past: boolean }[] = [];
    let mon = addDays(r.monthStart, -((parseDate(r.monthStart).getDay() + 6) % 7));
    let n = 1;
    while (mon <= r.monthEnd) {
      const end = addDays(mon, 6);
      const hrs = shifts.filter((s) => s.date >= mon && s.date <= end && s.date >= r.monthStart && s.date <= r.monthEnd && s.status !== "cancelled").reduce((a, s) => a + hoursOf(s), 0);
      out.push({ key: mon, top: `Wk ${n}`, bottom: dayMonth(mon < r.monthStart ? r.monthStart : mon), hrs, now: today >= mon && today <= end, past: end < today });
      mon = addDays(mon, 7);
      n += 1;
    }
    return out;
  }, [mode, shifts, r, today]);

  const scope = mode === "week" ? shifts.filter((s) => s.date >= r.monday && s.date <= r.sunday) : shifts.filter((s) => s.date >= r.monthStart && s.date <= r.monthEnd);
  const t = tally(scope, today);
  const pct = Math.round(t.share * 100);
  const max = Math.max(8, ...bars.map((b) => b.hrs));
  return (
    <section aria-label="Hours" className={`rounded-[26px] p-5 ${PASTEL.lavender} ${LIFT}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold text-(--ap-ink)">Your hours</h2>
        <WeekMonth value={mode} onChange={setMode} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-(--ap-ink) tabular-nums">
          <span className="text-[44px] leading-none font-bold">{fmtH(t.total)}</span>
          <span className="ml-1.5 text-[16px] font-semibold text-(--ap-ink-2)">hrs {mode === "week" ? "this week" : "this month"}</span>
        </p>
        {t.done > 0 ? <span className="mb-1 rounded-full bg-(--ap-surface,#fff) px-3 py-1 text-[14px] font-bold text-(--ap-violet) tabular-nums">{pct}% done</span> : null}
      </div>
      <p className="mt-1 text-[14px] text-(--ap-ink-2) tabular-nums">{t.live.length === 0 ? "Nothing scheduled yet" : t.done === 0 ? `${t.live.length} ${t.live.length === 1 ? "shift" : "shifts"} planned · starts ${t.live.some((s) => s.date === today) ? "today" : "soon"}` : `${fmtH(t.done)} hrs worked, ${fmtH(t.total - t.done)} to go · ${t.live.length} ${t.live.length === 1 ? "shift" : "shifts"}`}</p>
      <ol className={`mt-5 grid gap-2 ${mode === "week" ? "grid-cols-7" : "grid-cols-5"}`} aria-label="Hours for each day">
        {bars.map((b) => (
          <li key={b.key} className="flex flex-col items-center gap-1">
            <span className={`h-[18px] text-[13px] font-bold tabular-nums ${b.hrs ? "text-(--ap-ink-2)" : "text-transparent"}`}>{b.hrs ? fmtH(b.hrs) : "0"}</span>
            <div className="flex h-[72px] w-full items-end justify-center">
              <span className={`block w-full max-w-[30px] rounded-full ${b.hrs === 0 ? "bg-white/70" : b.now ? "bg-(--staff-deep,#1b1340)" :b.past ? "bg-(--ap-violet)/45" : "bg-(--ap-violet)"}`} style={{ height: b.hrs === 0 ? 10 : Math.max(18, Math.round((b.hrs / max) * 72)) }} />
            </div>
            <span className={`flex flex-col items-center rounded-full px-1.5 py-1 text-center leading-tight ${b.now ? "bg-(--staff-deep,#1b1340) text-white" : "text-(--ap-muted)"}`}>
              <span className="text-[13px] font-semibold">{b.top}</span>
              <span className="text-[14px] font-bold tabular-nums">{b.bottom}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- Read and learn (sideways row) ---------- */

type LearnTile = { key: string; title: string; meta: string; tone: PastelTone; icon: typeof FileText; value: number; word: string; href: string; order: number };

export function LearnRow() {
  const lib = useSopLibrary();
  const training = useTraining();
  const sops = lib.data ?? [];
  const tiles: LearnTile[] = [
    ...sops.map<LearnTile>((s) => {
      const st = sopStatus(s);
      return {
        key: s.id,
        title: s.title,
        meta: sopMeta(s),
        tone: st === "new" ? "lavender" : st === "sign-off" ? "sand" : "sage",
        icon: s.kind === "video" ? Video : s.kind === "page" ? ExternalLink : FileText,
        value: st === "read" ? 1 : st === "sign-off" ? 0.6 : 0,
        word: st === "new" ? "New" : st === "sign-off" ? "Needs sign-off" : "Read",
        href: `/staff/sops-training/${s.id}`,
        order: st === "read" ? 3 : st === "sign-off" ? 0 : 1,
      };
    }),
    ...(training.data ?? []).map<LearnTile>((t) => ({
      key: t.id,
      title: t.training.title,
      meta: `Training${t.training.durationMinutes ? ` · ${t.training.durationMinutes} min` : ""}`,
      tone: "gold",
      icon: BookOpen,
      value: t.progress / 100,
      word: t.status === "completed" ? "Done" : t.progress > 0 ? `${t.progress}% done` : "New",
      href: `/staff/sops-training/${t.id}`,
      order: t.status === "completed" ? 3 : 2,
    })),
  ].sort((a, b) => a.order - b.order);
  if (tiles.length === 0) return null;
  const read = sops.filter((s) => !isOpenItem(s)).length;
  return (
    <section aria-labelledby="home-learn">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id="home-learn" className="text-[18px] font-bold text-(--ap-ink)">Read and learn</h2>
          <p className="text-[14px] text-(--ap-muted) tabular-nums">{sops.length ? `${read} of ${sops.length} SOPs read` : "Assigned to you"}</p>
        </div>
        <Link href="/staff/sops-training" className="inline-flex h-11 items-center gap-1 text-[14px] font-bold text-(--ap-violet)">
          See all <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <ul className="-mx-[18px] flex scroll-px-[18px] snap-x gap-3 overflow-x-auto px-[18px] pt-1 pb-4 max-[380px]:-mx-3.5 max-[380px]:px-3.5 min-[768px]:mx-0 min-[768px]:scroll-px-0 min-[768px]:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tiles.slice(0, 6).map((t) => (
          <li key={t.key} className="shrink-0 snap-start">
            <Link href={t.href} className={`flex h-[188px] w-[164px] flex-col justify-between rounded-[22px] p-4 focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none ${PASTEL[t.tone]} ${LIFT}`}>
              <Ring value={t.value} size={56} stroke={4} track="rgba(255,255,255,.7)" arc="currentColor">
                <Disc icon={t.icon} size={42} />
              </Ring>
              <span>
                <b className="line-clamp-2 block text-[16px] leading-snug font-bold text-(--ap-ink)">{t.title}</b>
                <span className="mt-0.5 block truncate text-[14px] text-(--ap-ink-2)">{t.meta}</span>
                <span className="mt-1 block text-[14px] font-semibold">{t.word}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Leave and documents ---------- */

function StatPair({ home }: { home: StaffHome }) {
  const owing = home.requiredActions.filter((a) => a.kind === "document" || a.kind === "document-request").length;
  const leave = home.leaveSummary;
  const pending = home.leave.find((l) => l.status === "pending" || l.status === "approved");
  const cards = [
    {
      href: "/staff/leave",
      glyph: "calendar" as const,
      tone: "lavender" as const,
      label: "Leave",
      big: leave ? String(leave.remaining) : pending ? (pending.status === "approved" ? "Booked" : "Asked") : "0",
      unit: leave ? `${leave.unit} left` : pending ? `${dayMonth(pending.startDate)}` : "requests",
    },
    {
      href: "/staff/documents",
      glyph: "upload" as const,
      tone: owing > 0 ? ("lavender" as const) : ("sage" as const),
      label: "Documents",
      big: owing > 0 ? String(owing) : "All set",
      unit: owing > 0 ? "to upload" : "nothing to send",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <Link key={c.label} href={c.href} className={`relative isolate flex min-h-[148px] flex-col justify-between overflow-hidden rounded-[22px] p-4 focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none ${PASTEL[c.tone]} ${LIFT}`}>
          <span className="pointer-events-none absolute -right-8 -bottom-10 -z-10 size-32 rounded-full bg-white/45" aria-hidden="true" />
          <span className="pointer-events-none absolute -top-10 -left-6 -z-10 size-24 rounded-full bg-white/30" aria-hidden="true" />
          <span className="flex items-center justify-between">
            <BoldTile glyph={c.glyph} tint={c.tone} size={44} weight="bold" />
            <ChevronRight className="size-5 opacity-70" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-[14px] font-semibold text-(--ap-ink-2)">{c.label}</span>
            <b className="block text-[30px] leading-tight font-bold text-(--ap-ink) tabular-nums">{c.big}</b>
            <span className="block text-[14px] text-(--ap-ink-2)">{c.unit}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

/** Latest company news, desktop only (phones keep Home short). One quiet list in one container. */
function Announcements({ home }: { home: StaffHome }) {
  const items = home.announcements.slice(0, 2);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="home-news" className="max-[767px]:hidden">
      <h2 id="home-news" className="mb-3 text-[18px] font-bold text-(--ap-ink)">
        Company news
      </h2>
      <ul className="overflow-hidden rounded-[22px] border border-(--ap-line) bg-(--ap-surface,#fff)">
        {items.map((a) => (
          <li key={a.id} className="border-t border-(--ap-line-2) p-4 first:border-t-0">
            <b className="block text-[16px] text-(--ap-ink)">{a.title}</b>
            <p className="mt-0.5 line-clamp-2 text-[15px] text-(--ap-ink-2)">{a.body}</p>
            <span className="mt-1 block text-[14px] text-(--ap-muted)">{timeAgo(a.publishedAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One layout at every width: phones stack it, desktop puts today on the left and the week, reading and stats on the right. */
export function HomeMobile({ home }: { home: StaffHome }) {
  const r = useRange();
  const { data } = useSchedule({ from: r.from, to: r.to });
  const shifts = useMemo(() => data ?? [], [data]);
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 pt-2 pb-2 min-[1000px]:grid min-[1000px]:grid-cols-[minmax(0,460px)_minmax(0,1fr)] min-[1000px]:items-start min-[1000px]:gap-x-8">
      <div className="min-[1000px]:col-span-2">
        <Greeting home={home} />
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <TodayCard home={home} />
        <NeedsYou home={home} />
        <Announcements home={home} />
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <WeekCard shifts={shifts} r={r} />
        <LearnRow />
        <StatPair home={home} />
      </div>
    </div>
  );
}
