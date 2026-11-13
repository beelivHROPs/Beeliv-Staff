/**
 * Find Jobs filter state + pure helpers (wireframe `st.f`, filtered(),
 * activeChips(), alertCriteria() — beeliv-website/applicant/index.html).
 * Filter state round-trips through the URL (?q=&loc=&dept=&type=&exp=&pay=&shift=&posted=&sort=&saved=1)
 * so the top-bar search, deep links and Back all land on the same view.
 *
 * Experience level, Salary range and Date posted were added for the
 * requirements doc's §2.14 (docs/requirements/beeliv-recruitment-and-job-
 * listings-2026-09-29.md). Their bands live in lib/public-site/job-details.ts
 * (salary bands are placeholders - Beeliv has not supplied real ones).
 */
import {
  Briefcase,
  Calendar,
  ChefHat,
  Clock3,
  ConciergeBell,
  LifeBuoy,
  Moon,
  RotateCw,
  ScrollText,
  Sun,
  UsersRound,
  Wine,
  type LucideIcon,
} from "@/components/applicant/icons";
import type { ApplicantJob } from "@/lib/applicant/jobs";
import {
  DATE_POSTED_OPTIONS,
  EXPERIENCE_BANDS,
  SALARY_FILTER_BANDS,
  experienceBand,
  matchesDatePosted,
  matchesSalaryBand,
} from "@/lib/public-site/job-details";

export type Sort = "recent" | "pay";
export type ListKey = "dept" | "type" | "exp" | "pay" | "shift";

export type JobFilters = {
  q: string;
  loc: string;
  dept: string[];
  type: string[];
  /** Experience bands (EXPERIENCE_BANDS), matched on the vacancy's minimum years. */
  exp: string[];
  /** Salary bands (SALARY_FILTER_BANDS), incl. "Not listed". */
  pay: string[];
  shift: string[];
  /** DATE_POSTED_OPTIONS value; "" = any time. */
  posted: string;
  sort: Sort;
};

export const EMPTY_FILTERS: JobFilters = { q: "", loc: "", dept: [], type: [], exp: [], pay: [], shift: [], posted: "", sort: "recent" };

export { DATE_POSTED_OPTIONS };

export const LOCATIONS = ["Abuja", "Lagos"] as const;

/* Same icon in the same place as the wireframe's DEPTS / TYPES / SHIFTS arrays. */
export const OPTION_GROUPS: { key: ListKey; title: string; options: { value: string; icon?: LucideIcon }[] }[] = [
  {
    key: "dept",
    title: "Department",
    options: [
      { value: "Front of house", icon: ConciergeBell },
      { value: "Kitchen", icon: ChefHat },
      { value: "Bar", icon: Wine },
      { value: "Management", icon: UsersRound },
      { value: "Admin & operations", icon: Briefcase },
      { value: "Support", icon: LifeBuoy },
    ],
  },
  {
    key: "type",
    title: "Employment type",
    options: [
      { value: "Full-time", icon: Briefcase },
      { value: "Part-time", icon: Clock3 },
      { value: "Contract", icon: ScrollText },
      { value: "Casual", icon: Calendar },
    ],
  },
  { key: "exp", title: "Experience level", options: EXPERIENCE_BANDS.map((value) => ({ value })) },
  { key: "pay", title: "Salary range", options: SALARY_FILTER_BANDS.map(({ value }) => ({ value })) },
  {
    key: "shift",
    title: "Shift pattern",
    options: [
      { value: "Day", icon: Sun },
      { value: "Evening", icon: Clock3 },
      { value: "Night", icon: Moon },
      { value: "Rotating", icon: RotateCw },
    ],
  },
];

type Params = { [key: string]: string | string[] | undefined };

function one(v: string | string[] | undefined): string {
  return typeof v === "string" ? v : Array.isArray(v) ? (v[0] ?? "") : "";
}
function list(v: string | string[] | undefined): string[] {
  return one(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const oneOf = (values: readonly string[]) => (v: string) => values.includes(v);

export function filtersFromParams(p: Params): { filters: JobFilters; saved: boolean } {
  const loc = one(p.loc);
  const posted = one(p.posted);
  return {
    filters: {
      q: one(p.q),
      loc: (LOCATIONS as readonly string[]).includes(loc) ? loc : "",
      dept: list(p.dept),
      type: list(p.type),
      exp: list(p.exp).filter(oneOf(EXPERIENCE_BANDS)),
      pay: list(p.pay).filter(oneOf(SALARY_FILTER_BANDS.map((b) => b.value))),
      shift: list(p.shift),
      posted: DATE_POSTED_OPTIONS.some((o) => o.value === posted) ? posted : "",
      sort: one(p.sort) === "pay" ? "pay" : "recent",
    },
    saved: one(p.saved) === "1",
  };
}

export function filtersToSearch(f: JobFilters, saved: boolean): string {
  const s = new URLSearchParams();
  if (f.q.trim()) s.set("q", f.q.trim());
  if (f.loc) s.set("loc", f.loc);
  if (f.dept.length) s.set("dept", f.dept.join(","));
  if (f.type.length) s.set("type", f.type.join(","));
  if (f.exp.length) s.set("exp", f.exp.join(","));
  if (f.pay.length) s.set("pay", f.pay.join(","));
  if (f.shift.length) s.set("shift", f.shift.join(","));
  if (f.posted) s.set("posted", f.posted);
  if (f.sort !== "recent") s.set("sort", f.sort);
  if (saved) s.set("saved", "1");
  const str = s.toString();
  return str ? `?${str}` : "";
}

/** Wireframe filtered(): search matches role + company + department; "Pay listed first" is a stable sort. */
export function applyFilters(jobs: ApplicantJob[], f: JobFilters): ApplicantJob[] {
  const q = f.q.trim().toLowerCase();
  const r = jobs.filter((j) => {
    if (q && !`${j.role} ${j.company} ${j.department}`.toLowerCase().includes(q)) return false;
    if (f.loc && j.location !== f.loc) return false;
    if (f.dept.length && !f.dept.includes(j.department)) return false;
    if (f.type.length && !f.type.includes(j.employmentType)) return false;
    if (f.exp.length && !f.exp.includes(experienceBand(j.experience.minYears))) return false;
    if (f.pay.length && !f.pay.some((b) => matchesSalaryBand(j.salary, b))) return false;
    if (f.shift.length && !f.shift.includes(j.shift)) return false;
    if (!matchesDatePosted(j.daysAgo, f.posted)) return false;
    return true;
  });
  return f.sort === "pay" ? [...r].sort((a, b) => (b.pay ? 1 : 0) - (a.pay ? 1 : 0)) : r;
}

export function activeFilterCount(f: JobFilters): number {
  return f.dept.length + f.type.length + f.exp.length + f.pay.length + f.shift.length + (f.loc ? 1 : 0) + (f.posted ? 1 : 0);
}

/** Wireframe activeChips(): [key, value, label]. */
export function activeChips(f: JobFilters): { key: ListKey | "loc" | "posted"; value: string; label: string }[] {
  const c: { key: ListKey | "loc" | "posted"; value: string; label: string }[] = [];
  (["dept", "type", "exp", "pay", "shift"] as const).forEach((k) =>
    f[k].forEach((v) => c.push({ key: k, value: v, label: chipLabel(k, v) })),
  );
  if (f.loc) c.push({ key: "loc", value: f.loc, label: f.loc });
  if (f.posted) c.push({ key: "posted", value: f.posted, label: postedLabel(f.posted) });
  return c;
}

function chipLabel(k: ListKey, v: string): string {
  if (k === "shift") return `${v} shift`;
  if (k === "exp") return v === "Entry level" ? v : `${v} experience`;
  if (k === "pay") return v === "Not listed" ? "Salary not listed" : v;
  return v;
}

function postedLabel(v: string): string {
  return `Posted: ${(DATE_POSTED_OPTIONS.find((o) => o.value === v)?.label ?? v).toLowerCase()}`;
}

/** Wireframe alertCriteria(). */
export function alertCriteria(f: JobFilters): string[] {
  const c = [...f.dept, ...f.type, ...f.exp.map((x) => chipLabel("exp", x)), ...f.pay.map((x) => chipLabel("pay", x)), ...f.shift.map((x) => `${x} shift`)];
  if (f.loc) c.push(f.loc);
  if (f.q.trim()) c.unshift(`"${f.q.trim()}"`);
  return c.length ? c : ["All hospitality roles", "Abuja & Lagos"];
}

/** sessionStorage key: the list's last search string, so the job page's "All jobs" link restores it. */
export const LIST_SEARCH_KEY = "beeliv-applicant-jobs-search";
