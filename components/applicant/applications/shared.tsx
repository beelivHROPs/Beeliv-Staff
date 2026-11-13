/**
 * Shared presentation pieces for the three screens this folder serves:
 * My Applications, Application detail, Interviews & Assessments.
 *
 * Each piece mirrors a specific wireframe rule-set in
 * beeliv-website/applicant/index.html (the LAST matching rule wins there,
 * so values below come from its final override layer, ~lines 1220-1282):
 *   ScreenHeading -> .ph-h        (h1 53/44/30px .ap-serif, p .ap-bd)
 *   CoMonogram    -> .co-logo.mono (Karla 700, per-company colour pair)
 *   TabBar        -> .tabs / .tabs .n
 *   CardHeading   -> .ch h2       (29px .ap-serif, 25px on phones)
 *   RowIcon       -> .ri / .di    (tinted tile, glyph filled at 16%)
 *
 * Kept local (not in primitives.tsx) because primitives is shared with
 * other screens that are being revised in parallel.
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "@/components/applicant/icons";
import {
  Award,
  FilePenLine,
  FileText,
  IdCard,
  Image as ImageIcon,
  Users,
} from "@/components/applicant/icons";
import { APPLICATION_STAGES, type Application, type Interview } from "@/lib/applicant/types";
import { FilterTabs } from "../FilterTabs";
import { PAGE_TITLE } from "../primitives";
import { sectionTitleClass } from "../SectionCard";

/* ------------------------------------------------------------------ */
/* Layout pieces                                                       */
/* ------------------------------------------------------------------ */

export function ScreenHeading({ title }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pt-3 pb-5 max-[767px]:items-start max-[767px]:pt-0 max-[767px]:pb-1">
      <div className="min-w-0">
        <h1 className={`${PAGE_TITLE} ap-pagehead-title max-[767px]:text-[28px]`}>{title}</h1>
      </div>
    </div>
  );
}

/** Same deterministic pairs + hash as the wireframe's MONO / monoColor(). */
const MONO_PAIRS = [
  ["#F6EEF9", "#5B087B"],
  ["#EDE0F5", "#4A0668"],
  ["#F3E8F8", "#70008A"],
] as const;

function monoColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return MONO_PAIRS[h % MONO_PAIRS.length];
}

function monoInitials(name: string): string {
  const w = name.replace(/^the\s+/i, "").split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "") + (w[1]?.[0] ?? "")).toUpperCase();
}

/**
 * Wireframe `.co-logo.mono`: Karla 700 initials (NOT serif) on the company's
 * colour pair, 14px radius, hairline border. `fontSize` follows the
 * wireframe: 17px on list cards, size*0.36 when an explicit size is passed.
 */
export function CoMonogram({ name, className = "", fontSize }: { name: string; className?: string; fontSize?: number }) {
  const [bg, fg] = monoColor(name);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-[14px] border border-[rgba(17,17,27,.04)] font-bold tracking-[0.02em] ${className}`}
      style={{ background: bg, color: fg, fontSize, fontFamily: "var(--font-sans), Karla, system-ui, sans-serif" }}
    >
      {monoInitials(name)}
    </span>
  );
}

/** Wireframe .tabs on tablet/desktop, a dropdown filter on phones (see FilterTabs). */
export function TabBar<K extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: { key: K; label: string; count: number }[];
  active: K;
  onChange: (k: K) => void;
  label: string;
}) {
  return <FilterTabs label={label} options={tabs} value={active} onChange={onChange} />;
}

export function CardHeading({ title, right, aside = false }: { title: string; right?: ReactNode; aside?: boolean }) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-3 max-[640px]:items-start">
      <h2 className={sectionTitleClass(aside)}>{title}</h2>
      {right}
    </div>
  );
}

const ROW_ICON_TONE = {
  violet: "bg-[#F8F3FA] text-(--ap-violet)",
  ok: "bg-[#DCFCE7] text-[#15803D]",
  warn: "bg-[#FEF3C7] text-[#B45309]",
} as const;

/** Wireframe `.ri` (44px) / `.doc .di` (40px) tile; glyph paths filled at 16% like the wireframe. */
export function RowIcon({ icon: Icon, tone = "violet", size = 44 }: { icon: LucideIcon; tone?: keyof typeof ROW_ICON_TONE; size?: 40 | 44 }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-xl ${ROW_ICON_TONE[tone]} [&_svg_:is(path,rect,circle)]:fill-current [&_svg_:is(path,rect,circle)]:[fill-opacity:.16] max-[640px]:size-10!`}
      style={{ width: size, height: size }}
    >
      <Icon className="size-5.5" strokeWidth={1.6} />
    </span>
  );
}

/** Document glyphs per the wireframe's DOCS/REQ `i` keys (sign, users, file, photo, idcard, award). */
export function docIcon(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (n.includes("guarantor")) return FilePenLine;
  if (n.includes("reference")) return Users;
  if (n.includes("photo")) return ImageIcon;
  if (n.startsWith("nin") || n.includes("id card") || n.includes("passport data")) return IdCard;
  if (n.includes("certificate")) return Award;
  return FileText;
}

/* ------------------------------------------------------------------ */
/* Status + date formatting                                            */
/* ------------------------------------------------------------------ */

export type ChipTone = "warn" | "ok" | "info" | "violet" | "mute";

/**
 * Applicant-facing status chip, as worded in the wireframe's APPS
 * ("Documents needed", "Interview scheduled", "Under review", "Draft",
 * "Not selected"). Derived from the real lifecycle/stage/interview fields,
 * never stored. Where no plain-language label fits, the confirmed stage
 * name is used unchanged.
 */
export function applicationStatus(a: Application, interviews: Interview[]): { label: string; tone: ChipTone } {
  switch (a.lifecycle) {
    case "draft":
      return { label: "Draft", tone: "mute" };
    case "withdrawn":
      return { label: "Withdrawn", tone: "mute" };
    case "not_selected":
    case "in_talent_pool":
      return { label: "Not selected", tone: "mute" };
    case "completed":
      return { label: "Placed", tone: "ok" };
    default: {
      if (interviews.some((v) => v.applicationId === a.id && v.status === "scheduled")) {
        return { label: "Interview scheduled", tone: "ok" };
      }
      if (a.next?.tone === "warn" && a.next.href.includes("/documents")) return { label: "Documents needed", tone: "warn" };
      if (a.stage <= 1) return { label: "Under review", tone: "info" };
      if (a.stage === 4) return { label: "Under verification", tone: "violet" };
      return { label: APPLICATION_STAGES[a.stage] ?? "In progress", tone: a.stage >= 6 ? "ok" : "violet" };
    }
  }
}

export const isTerminal = (a: Application) =>
  a.lifecycle === "withdrawn" || a.lifecycle === "not_selected" || a.lifecycle === "in_talent_pool" || a.lifecycle === "completed";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "12 Sep 2026" (the wireframe's format; avoids en-GB's "Sept"). */
export function fmtDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
/** "12 Sep" */
export function fmtDayShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
/** "Fri, 2 Oct 2026" */
export function fmtWeekdayDay(iso: string): string {
  return `${WEEKDAYS_SHORT[new Date(iso).getDay()]}, ${fmtDay(iso)}`;
}
function clock(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/ /g, " ");
}

/** Whole calendar days between today and `iso` (negative = past). */
export function dayDiff(iso: string): number {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  const b = new Date(iso);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Lower-case relative day for inline sentences: "today", "yesterday", "3 days ago", "on 12 Sep 2026". */
export function relDay(iso: string): string {
  const diff = -dayDiff(iso);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 7) return `${diff} days ago`;
  return `on ${fmtDay(iso)}`;
}

/** Activity timestamp like the wireframe: "Today, 9:12 AM" / "Yesterday" / "24 Sep 2026". */
export function fmtActivity(iso: string): string {
  const diff = -dayDiff(iso);
  if (diff <= 0) return `Today, ${clock(new Date(iso))}`;
  if (diff === 1) return "Yesterday";
  return fmtDay(iso);
}

/** "Due in 5 days" / "Due tomorrow" / "Due today" / "Overdue" */
export function dueIn(iso: string): string {
  const diff = dayDiff(iso);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due in ${diff} days`;
}

/** List-card timestamp line, worded per the wireframe (Saved / Closed / Updated). */
export function updatedLine(a: Application): string {
  if (a.lifecycle === "draft") return `Saved ${relDay(a.updatedAt)}`;
  if (isTerminal(a)) return `Closed ${fmtDay(a.updatedAt)}`;
  return `Updated ${relDay(a.updatedAt)}`;
}

/* Interview times are shown in West Africa Time, as the wireframe does ("(WAT)"). */
const WAT = "Africa/Lagos";
function watParts(iso: string) {
  const d = new Date(iso);
  // Newer ICU puts a narrow no-break space before AM/PM; normalise it.
  const get = (o: Intl.DateTimeFormatOptions) => d.toLocaleString("en-US", { timeZone: WAT, ...o }).replace(/ /g, " ");
  return {
    month: get({ month: "short" }).toUpperCase(),
    day: get({ day: "2-digit" }),
    dayNum: get({ day: "numeric" }),
    monthName: get({ month: "short" }),
    year: get({ year: "numeric" }),
    weekday: get({ weekday: "long" }),
    weekdayShort: get({ weekday: "short" }),
    time: get({ hour: "numeric", minute: "2-digit" }),
  };
}

export function interviewTile(iso: string) {
  const p = watParts(iso);
  return { month: p.month, day: p.day, weekday: p.weekday };
}

/** "10:00 – 10:45 AM (WAT)", or "10:00 AM (WAT)" without a duration. */
export function interviewTimeRange(iso: string, durationMinutes?: number): string {
  const start = watParts(iso).time;
  if (!durationMinutes) return `${start} (WAT)`;
  const end = watParts(new Date(new Date(iso).getTime() + durationMinutes * 60_000).toISOString()).time;
  const [sT, sP] = start.split(" ");
  const [eT, eP] = end.split(" ");
  return sP === eP ? `${sT} – ${eT} ${eP} (WAT)` : `${start} – ${end} (WAT)`;
}

/** "Friday, 2 Oct" */
export function interviewDayLabel(iso: string): string {
  const p = watParts(iso);
  return `${p.weekday}, ${p.dayNum} ${p.monthName}`;
}

/** "Fri, 2 Oct 2026" in WAT */
export function interviewDateLong(iso: string): string {
  const p = watParts(iso);
  return `${p.weekdayShort}, ${p.dayNum} ${p.monthName} ${p.year}`;
}
