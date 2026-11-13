import type { ReactNode } from "react";
import type { LucideIcon } from "@/components/applicant/icons";

/**
 * Small line illustrations for empty states (brand violet strokes, pale lavender fills, one gold accent).
 * Inline SVG: no image files, nothing to download, and they follow the app's colour tokens.
 * `artFor(icon)` picks the picture from the icon an empty state already uses.
 */
export type ArtKind = "people" | "clock" | "shield" | "book" | "history" | "help" | "announce" | "tasks" | "applications" | "interviews" | "done" | "documents" | "notifications" | "saved" | "search" | "locked" | "staff" | "generic";

const V = "var(--ap-violet, #70008A)";
const F1 = "#F3E8F8";
const F2 = "#E6D2F0";
const G = "#C1AC75";

const SCENES: Record<ArtKind, ReactNode> = {
  // two people: workforce, candidates, teams
  people: (
    <>
      <circle cx="46" cy="38" r="12" fill={F1} stroke={V} strokeWidth="2.4" />
      <path d="M24 78c0-12 10-20 22-20s22 8 22 20z" fill={F1} stroke={V} strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="82" cy="42" r="10" fill="#fff" stroke={V} strokeWidth="2.4" />
      <path d="M66 78c0-9 7-15 16-15s16 6 16 15" stroke={V} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <circle cx="96" cy="26" r="6" fill={G} />
    </>
  ),
  // clock: attendance, shifts, time
  clock: (
    <>
      <circle cx="60" cy="50" r="30" fill={F1} stroke={V} strokeWidth="2.4" />
      <path d="M60 32v19l12 8" stroke={V} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="60" cy="50" r="3" fill={G} />
    </>
  ),
  // shield with a tick: compliance, protection
  shield: (
    <>
      <path d="M60 18l28 10v22c0 17-12 28-28 34-16-6-28-17-28-34V28z" fill={F1} stroke={V} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M48 52l9 9 16-18" stroke={G} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  // open book: SOPs and training
  book: (
    <>
      <path d="M60 28c-8-6-22-8-34-6v50c12-2 26 0 34 6z" fill={F1} stroke={V} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M60 28c8-6 22-8 34-6v50c-12-2-26 0-34 6z" fill="#fff" stroke={V} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M36 38h16M36 48h16M70 38h16M70 48h12" stroke={V} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M86 18l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z" fill={G} />
    </>
  ),
  // clock with a back arrow: history
  history: (
    <>
      <circle cx="60" cy="50" r="28" fill={F1} stroke={V} strokeWidth="2.4" />
      <path d="M60 36v15l10 6" stroke={V} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M26 44l-6 8 9 3" stroke={G} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  // speech bubble with a question mark: help
  help: (
    <>
      <path d="M28 28a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8H58L42 80V66h-6a8 8 0 0 1-8-8z" fill={F1} stroke={V} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M52 40a8 8 0 1 1 11 7c-3 1.5-3 3-3 6" stroke={V} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="58" r="2" fill={G} />
    </>
  ),
  // megaphone: announcements
  announce: (
    <>
      <path d="M26 42h14l34-18v52L40 58H26z" fill={F1} stroke={V} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M44 58l4 18h10l-4-16" stroke={V} strokeWidth="2.4" strokeLinejoin="round" fill="none" />
      <path d="M84 40a14 14 0 0 1 0 20M92 32a26 26 0 0 1 0 36" stroke={G} strokeWidth="3" strokeLinecap="round" fill="none" />
    </>
  ),
  // clipboard: requests, tasks
  tasks: (
    <>
      <rect x="34" y="22" width="52" height="62" rx="8" fill={F1} stroke={V} strokeWidth="2.4" />
      <rect x="48" y="16" width="24" height="12" rx="5" fill="#fff" stroke={V} strokeWidth="2.4" />
      <path d="M46 46h8M60 46h16M46 60h8M60 60h16" stroke={V} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="94" cy="76" r="9" fill={G} />
      <path d="M90 76l3 3 6-7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  // papers with a magnifier / plus: nothing applied yet
  applications: (
    <>
      <rect x="34" y="18" width="52" height="64" rx="8" fill={F1} stroke={V} strokeWidth="2.4" />
      <path d="M46 36h28M46 48h28M46 60h16" stroke={V} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="84" cy="74" r="14" fill="#fff" stroke={V} strokeWidth="2.4" />
      <path d="M84 68v12M78 74h12" stroke={G} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  // calendar with an empty day
  interviews: (
    <>
      <rect x="28" y="24" width="64" height="56" rx="9" fill={F1} stroke={V} strokeWidth="2.4" />
      <path d="M28 40h64" stroke={V} strokeWidth="2.4" />
      <path d="M46 18v12M74 18v12" stroke={V} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="60" cy="60" r="8" fill="#fff" stroke={G} strokeWidth="2.6" strokeDasharray="3 4" />
    </>
  ),
  // calendar with a tick: finished
  done: (
    <>
      <rect x="28" y="24" width="64" height="56" rx="9" fill={F1} stroke={V} strokeWidth="2.4" />
      <path d="M28 40h64" stroke={V} strokeWidth="2.4" />
      <path d="M46 18v12M74 18v12" stroke={V} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M49 60l8 8 15-17" stroke={G} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  // folder with a sheet sliding in
  documents: (
    <>
      <path d="M26 34a6 6 0 0 1 6-6h18l8 9h30a6 6 0 0 1 6 6v33a6 6 0 0 1-6 6H32a6 6 0 0 1-6-6z" fill={F1} stroke={V} strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="42" y="22" width="34" height="38" rx="5" fill="#fff" stroke={V} strokeWidth="2.2" />
      <path d="M50 34h18M50 42h18M50 50h10" stroke={V} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="82" cy="70" r="9" fill={G} />
      <path d="M82 75v-9M78 70l4-4 4 4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  // bell with a quiet tick
  notifications: (
    <>
      <path d="M60 22c-14 0-22 10-22 24v12l-6 8h56l-6-8V46c0-14-8-24-22-24z" fill={F1} stroke={V} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M52 74a8 8 0 0 0 16 0" stroke={V} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <circle cx="82" cy="30" r="11" fill={G} />
      <path d="M77 30l4 4 7-8" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  // bookmark ribbon
  saved: (
    <>
      <path d="M40 20h40a4 4 0 0 1 4 4v56L60 64 36 80V24a4 4 0 0 1 4-4z" fill={F1} stroke={V} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M60 32l3.2 6.5 7.2 1-5.2 5 1.3 7.1L60 48.2 53.5 51.6l1.3-7.1-5.2-5 7.2-1z" fill="none" stroke={G} strokeWidth="2.4" strokeLinejoin="round" />
    </>
  ),
  // magnifier over blank cards: no matches
  search: (
    <>
      <rect x="24" y="28" width="46" height="14" rx="5" fill={F1} stroke={V} strokeWidth="2.2" />
      <rect x="24" y="48" width="38" height="14" rx="5" fill={F1} stroke={V} strokeWidth="2.2" />
      <circle cx="74" cy="56" r="17" fill="#fff" stroke={V} strokeWidth="2.6" />
      <path d="M86 68l12 12" stroke={V} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M68 56h12" stroke={G} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  // padlock: not open yet
  locked: (
    <>
      <rect x="34" y="50" width="52" height="34" rx="8" fill={F1} stroke={V} strokeWidth="2.4" />
      <path d="M44 50V40a16 16 0 0 1 32 0v10" stroke={V} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="66" r="5" fill={G} />
      <path d="M60 70v7" stroke={G} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  // briefcase with a spark: staff / career
  staff: (
    <>
      <rect x="28" y="38" width="64" height="44" rx="9" fill={F1} stroke={V} strokeWidth="2.4" />
      <path d="M48 38v-6a6 6 0 0 1 6-6h12a6 6 0 0 1 6 6v6" stroke={V} strokeWidth="2.4" fill="none" />
      <path d="M28 58h64" stroke={V} strokeWidth="2.4" />
      <path d="M60 52v12" stroke={V} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M92 24l2.4 5 5 2.4-5 2.4L92 39l-2.4-5.2-5-2.4 5-2.4z" fill={G} />
    </>
  ),
  generic: (
    <>
      <circle cx="60" cy="52" r="30" fill={F1} stroke={V} strokeWidth="2.4" />
      <path d="M48 52h24M60 40v24" stroke={G} strokeWidth="3.4" strokeLinecap="round" />
    </>
  ),
};

const BY_NAME: Record<string, ArtKind> = {
  Calendar: "interviews", CalendarClock: "interviews", CalendarDays: "interviews", Sun: "clock", DoorOpen: "clock",
  CalendarCheck: "done", Check: "notifications", CircleCheck: "done", CheckCircle: "done",
  FileText: "applications", Briefcase: "applications", BriefcaseBusiness: "applications",
  FolderOpen: "documents", Files: "documents", FileCheck2: "documents", Upload: "documents",
  Bell: "notifications", Bookmark: "saved", Search: "search", LockKeyhole: "locked", Sparkles: "staff",
  Users: "people", UsersRound: "people", UserRound: "people", People: "people",
  Clock3: "clock", Clock: "clock", Timer: "clock",
  ShieldCheck: "shield", Shield: "shield",
  BookOpen: "book", GraduationCap: "book", Video: "book",
  History: "history", CircleHelp: "help", LifeBuoy: "help",
  Megaphone: "announce", ClipboardList: "tasks", ClipboardCheck: "tasks", Activity: "clock", ActivityIcon: "clock",
};

/** The empty state's own icon decides its picture (matched by the icon's name). New screens need nothing extra:
 *  pass an icon, or set `art` on <EmptyState> to choose a picture explicitly. */
export function artFor(icon: LucideIcon): ArtKind {
  const name = (icon as unknown as { displayName?: string }).displayName ?? "";
  return BY_NAME[name] ?? "generic";
}

export function EmptyArt({ kind, className = "h-[104px] w-[130px]" }: { kind: ArtKind; className?: string }) {
  return (
    <svg viewBox="0 0 120 96" className={className} fill="none" aria-hidden="true">
      <ellipse cx="60" cy="88" rx="34" ry="4.5" fill={F2} opacity=".7" />
      {SCENES[kind]}
    </svg>
  );
}
