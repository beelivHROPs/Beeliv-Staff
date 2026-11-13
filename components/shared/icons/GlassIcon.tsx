import { useId, type CSSProperties } from "react";

/**
 * Glass empty-state hero icons (project lead, 2026-10-26). Layered glassmorphism, 96 grid, original drawings:
 * a solid gradient back shape, a semi-transparent frosted front shape (white about 55% fading to 10%, thin white
 * top-left edge), a small bright highlight and a blurred coloured glow offset underneath.
 * Each icon has its OWN colour from a small curated palette that sits well with Beeliv purple and gold.
 * Use ONLY in the large empty states (StateCard / EmptyState); never in navigation, buttons, rows or chips.
 *
 * Dark mode: glass and glow are tokens. Defaults are the light values; an app's dark theme lowers them by setting
 * --glass-front-a (front glass start opacity), --glass-front-b (end opacity) and --glass-glow-o (glow opacity).
 */
export type GlassName = "jobs" | "notifications" | "documents" | "applications" | "sops" | "saved" | "search" | "leave" | "calendar" | "people" | "clients" | "activity" | "tests" | "inbox" | "shield" | "help";
export type GlassColour = "lavender" | "aqua" | "rose" | "amber" | "mint" | "plum" | "sky" | "coral" | "indigo" | "teal" | "lime" | "slate" | "orange" | "magenta" | "emerald" | "violet";

export const GLASS_PALETTE: Record<GlassColour, [string, string]> = {
  coral: ["#ffb3a0", "#ee6a45"],
  indigo: ["#a5adff", "#4a54d6"],
  teal: ["#7fe6d6", "#169c92"],
  lime: ["#d9ee86", "#86b02a"],
  slate: ["#c0cbe0", "#6b7ba3"],
  orange: ["#ffc489", "#ea7a1c"],
  magenta: ["#f7a6e8", "#c03fb0"],
  emerald: ["#93e8ab", "#1f9d55"],
  violet: ["#c3a8ff", "#6c3fe6"],
  lavender: ["#bfa6f7", "#7c4ddb"],
  aqua: ["#86e3e8", "#1fa9c1"],
  rose: ["#ffa3bd", "#e14d7e"],
  amber: ["#ffd883", "#ef9f25"],
  mint: ["#a4ebc4", "#2fb177"],
  plum: ["#cf7be6", "#6a1b8f"],
  sky: ["#97c8ff", "#4a7de8"],
};

/** One colour per icon, chosen so a screen with several empty states never repeats one. */
export const GLASS_COLOUR: Record<GlassName, GlassColour> = {
  jobs: "plum",
  notifications: "amber",
  documents: "aqua",
  applications: "lavender",
  sops: "mint",
  saved: "rose",
  search: "sky",
  leave: "coral",
  calendar: "indigo",
  people: "teal",
  clients: "lime",
  activity: "slate",
  tests: "orange",
  inbox: "magenta",
  shield: "emerald",
  help: "violet",
};

export function GlassIcon({ name, size = 96, colour, className = "" }: { name: GlassName; size?: number; colour?: GlassColour; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const [c1, c2] = GLASS_PALETTE[colour ?? GLASS_COLOUR[name]];
  const back = `url(#${uid}b)`;
  const front = `url(#${uid}f)`;
  const edge = `url(#${uid}e)`;
  const frontStyle: CSSProperties = { stroke: edge, strokeWidth: 1.4 };
  const body = {
    jobs: (
      <>
        <rect x="33" y="14" width="28" height="22" rx="9" fill="none" stroke={back} strokeWidth="7" />
        <rect x="12" y="28" width="62" height="46" rx="15" fill={back} />
        <rect x="26" y="42" width="58" height="40" rx="15" fill={front} style={frontStyle} />
        <rect x="49" y="55" width="12" height="9" rx="4" fill="#fff" opacity=".8" />
      </>
    ),
    notifications: (
      <>
        <path d="M44 14c-13 0-21 9-21 22v10c0 6-3 10-7 14h56c-4-4-7-8-7-14V36c0-13-8-22-21-22z" fill={back} stroke={back} strokeWidth="6" strokeLinejoin="round" />
        <circle cx="44" cy="76" r="8" fill={back} />
        <path d="M52 30c-12 0-19 8-19 20v8c0 6-3 10-7 13h52c-4-3-7-7-7-13v-8c0-12-7-20-19-20z" fill={front} style={frontStyle} strokeLinejoin="round" />
        <circle cx="76" cy="26" r="9" fill="#fff" opacity=".9" />
      </>
    ),
    documents: (
      <>
        <rect x="16" y="10" width="46" height="62" rx="14" fill={back} stroke={back} strokeWidth="4" />
        <rect x="30" y="32" width="54" height="48" rx="14" fill={front} style={frontStyle} />
        <rect x="40" y="46" width="30" height="5" rx="2.5" fill="#fff" opacity=".85" />
        <rect x="40" y="58" width="20" height="5" rx="2.5" fill="#fff" opacity=".65" />
      </>
    ),
    applications: (
      <>
        <path d="M14 42L78 16 60 80 44 56z" fill={back} stroke={back} strokeWidth="8" strokeLinejoin="round" />
        <path d="M44 56L78 16 60 80z" fill={front} style={frontStyle} strokeLinejoin="round" />
        <path d="M44 56l8-14" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8" />
      </>
    ),
    sops: (
      <>
        <rect x="18" y="14" width="48" height="62" rx="14" fill={back} />
        <rect x="31" y="8" width="22" height="14" rx="7" fill={back} stroke="#fff" strokeOpacity=".5" strokeWidth="1.4" />
        <rect x="32" y="34" width="52" height="46" rx="14" fill={front} style={frontStyle} />
        <path d="M45 57l8 8 14-15" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity=".92" />
      </>
    ),
    saved: (
      <>
        <path d="M30 14h30a8 8 0 0 1 8 8v52L45 58 22 74V22a8 8 0 0 1 8-8z" fill={back} stroke={back} strokeWidth="6" strokeLinejoin="round" />
        <path d="M44 28h28a8 8 0 0 1 8 8v50L58 70 36 86V36a8 8 0 0 1 8-8z" fill={front} style={frontStyle} strokeLinejoin="round" />
      </>
    ),
    leave: (
      <>
        <rect x="26" y="9" width="9" height="16" rx="4.5" fill={back} />
        <rect x="50" y="9" width="9" height="16" rx="4.5" fill={back} />
        <rect x="12" y="16" width="60" height="58" rx="17" fill={back} />
        <rect x="28" y="38" width="56" height="44" rx="15" fill={front} style={frontStyle} />
        <circle cx="56" cy="60" r="8" fill="#fff" opacity=".92" />
        <path d="M56 46v4M56 70v4M42 60h4M66 60h4M46 50l3 3M63 67l3 3M66 50l-3 3M49 67l-3 3" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity=".85" />
      </>
    ),
    calendar: (
      <>
        <rect x="26" y="9" width="9" height="16" rx="4.5" fill={back} />
        <rect x="50" y="9" width="9" height="16" rx="4.5" fill={back} />
        <rect x="12" y="16" width="60" height="58" rx="17" fill={back} />
        <rect x="28" y="38" width="56" height="44" rx="15" fill={front} style={frontStyle} />
        <path d="M45 60l8 8 15-16" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity=".92" />
      </>
    ),
    people: (
      <>
        <circle cx="34" cy="28" r="14" fill={back} />
        <rect x="12" y="46" width="46" height="34" rx="17" fill={back} />
        <circle cx="62" cy="38" r="12" fill={front} style={frontStyle} />
        <rect x="42" y="56" width="44" height="28" rx="14" fill={front} style={frontStyle} />
      </>
    ),
    clients: (
      <>
        <rect x="14" y="36" width="60" height="42" rx="14" fill={back} />
        <rect x="9" y="16" width="70" height="26" rx="12" fill={back} stroke={back} strokeWidth="2" />
        <rect x="46" y="52" width="38" height="34" rx="13" fill={front} style={frontStyle} />
        <rect x="26" y="52" width="10" height="12" rx="4" fill="#fff" opacity=".75" />
      </>
    ),
    activity: (
      <>
        <circle cx="42" cy="42" r="30" fill={back} />
        <circle cx="54" cy="54" r="24" fill={front} style={frontStyle} />
        <path d="M54 40v15l10 7" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity=".92" />
      </>
    ),
    tests: (
      <>
        <path d="M24 56l-8 26 17-7 8 9 5-24z" fill={back} stroke={back} strokeWidth="4" strokeLinejoin="round" />
        <circle cx="42" cy="36" r="26" fill={back} />
        <circle cx="54" cy="48" r="22" fill={front} style={frontStyle} />
        <path d="M45 49l7 7 12-14" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity=".92" />
      </>
    ),
    inbox: (
      <>
        <rect x="10" y="20" width="62" height="48" rx="15" fill={back} />
        <rect x="24" y="34" width="62" height="46" rx="15" fill={front} style={frontStyle} />
        <path d="M32 46l23 16 23-16" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
      </>
    ),
    shield: (
      <>
        <path d="M42 10l28 10v22c0 19-13 30-28 38-15-8-28-19-28-38V20z" fill={back} stroke={back} strokeWidth="6" strokeLinejoin="round" />
        <path d="M54 30l26 9v21c0 17-11 27-26 34-15-7-26-17-26-34V39z" fill={front} style={frontStyle} strokeLinejoin="round" />
        <path d="M44 60l8 8 14-15" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity=".92" />
      </>
    ),
    help: (
      <>
        <circle cx="42" cy="42" r="30" fill={back} />
        <circle cx="54" cy="54" r="24" fill={front} style={frontStyle} />
        <path d="M47 48a7.5 7.5 0 1 1 10.5 6.5c-3 1.6-4 3-4 6" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" opacity=".92" />
        <circle cx="53.5" cy="68" r="3" fill="#fff" opacity=".92" />
      </>
    ),
    search: (
      <>
        <line x1="62" y1="62" x2="80" y2="80" stroke={back} strokeWidth="13" strokeLinecap="round" />
        <circle cx="40" cy="40" r="26" fill={back} />
        <circle cx="48" cy="48" r="21" fill={front} style={frontStyle} />
      </>
    ),
  }[name];
  return (
    <span className={`inline-flex shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden="true" data-glass-icon={name}>
      <svg viewBox="0 0 96 96" width={size} height={size} focusable="false" overflow="visible">
        <defs>
          <linearGradient id={`${uid}b`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={c1} />
            <stop offset="1" stopColor={c2} />
          </linearGradient>
          <linearGradient id={`${uid}f`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" style={{ stopOpacity: "var(--glass-front-a, .55)" }} />
            <stop offset="1" stopColor="#fff" style={{ stopOpacity: "var(--glass-front-b, .1)" }} />
          </linearGradient>
          <linearGradient id={`${uid}e`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".95" />
            <stop offset=".55" stopColor="#fff" stopOpacity=".1" />
            <stop offset="1" stopColor="#fff" stopOpacity=".35" />
          </linearGradient>
          <filter id={`${uid}g`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <ellipse cx="52" cy="84" rx="28" ry="9" fill={c2} filter={`url(#${uid}g)`} style={{ opacity: "var(--glass-glow-o, .35)" }} />
        {body}
        <ellipse cx="30" cy="26" rx="6" ry="3.2" fill="#fff" opacity=".85" transform="rotate(-30 30 26)" />
      </svg>
    </span>
  );
}

/** The glass icon an empty state should show for the line icon it was given (matched by the icon's name), or undefined to keep its current picture. */
const BY_ICON: Record<string, GlassName> = {
  Bell: "notifications",
  Megaphone: "notifications",
  Bookmark: "saved",
  Search: "search",
  FileText: "applications",
  Send: "applications",
  Briefcase: "jobs",
  BriefcaseBusiness: "jobs",
  FolderOpen: "documents",
  Files: "documents",
  FileCheck2: "documents",
  Upload: "documents",
  BookOpen: "sops",
  ClipboardList: "sops",
  ClipboardCheck: "sops",
};
Object.assign(BY_ICON, {
  Users: "people",
  UsersRound: "people",
  UserRound: "people",
  IdCard: "people",
  Calendar: "calendar",
  CalendarCheck: "calendar",
  CalendarClock: "calendar",
  CalendarDays: "calendar",
  Clock3: "activity",
  Clock: "activity",
  History: "activity",
  BarChart3: "activity",
  Activity: "activity",
  Store: "clients",
  Layers: "clients",
  Building2: "clients",
  CircleHelp: "help",
  LifeBuoy: "help",
  Mail: "inbox",
  MessageSquareText: "inbox",
  LockKeyhole: "shield",
  ShieldCheck: "shield",
  Shield: "shield",
  Sun: "leave",
  DoorOpen: "leave",
  Award: "tests",
  CircleCheck: "tests",
  Check: "tests",
  ScrollText: "documents",
  Eye: "search",
  Sparkles: "notifications",
} satisfies Record<string, GlassName>);

/** Real failures keep their current look: only empty states get glass. */
const ERROR_TITLE = /couldn'?t (load|save)|can'?t load|failed|went wrong|error|try again later|something happened/i;

/** First match wins. The title decides when the line icon would give the wrong picture (e.g. Files on a leave panel). */
const BY_TITLE: [RegExp, GlassName][] = [
  [/no results|not found|nothing found|match|can'?t find|search/i, "search"],
  [/leave|time off/i, "leave"],
  [/interview|schedule|shift|calendar|assessment|upcoming/i, "calendar"],
  [/inbox|message|mail|conversation|repl(y|ies)/i, "inbox"],
  [/notification|caught up|nothing new|announcement|news/i, "notifications"],
  [/sop|training|learn|topic/i, "sops"],
  [/test|quiz/i, "tests"],
  [/document|file|upload|form\b|forms\b/i, "documents"],
  [/saved/i, "saved"],
  [/offer|application|request/i, "applications"],
  [/access|permission|locked|restricted|security|session|suspended/i, "shield"],
  [/client|outlet|business|venue|organisation|organization|brand/i, "clients"],
  [/applicant|candidate|staff|team|people|worker|person|employee|user|member|workforce|talent|interviewer/i, "people"],
  [/help|support|ticket|faq|question/i, "help"],
  [/history|activity|audit|log\b|record|attendance|check-in|report|analytics|chart|trend/i, "activity"],
  [/job|role|vacanc|position|assignment|opening/i, "jobs"],
];

export function glassForIcon(icon: unknown, title?: string): GlassName | undefined {
  if (title && ERROR_TITLE.test(title)) return undefined;
  const name = (icon as { displayName?: string } | null)?.displayName;
  if (name === "CircleAlert" || name === "ShieldAlert" || name === "Exclaim") return undefined;
  if (title) for (const [re, g] of BY_TITLE) if (re.test(title)) return g;
  return name ? BY_ICON[name] : undefined;
}
