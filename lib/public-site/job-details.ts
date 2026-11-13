/**
 * Per-vacancy job-listing detail (docs/requirements/beeliv-recruitment-and-
 * job-listings-2026-09-29.md, Module 2 §2.1–2.15), shared by the public
 * /jobs/[id] page and the applicant dashboard's /applicant/jobs/[id] page so
 * one vacancy reads the same everywhere.
 *
 * ---------------------------------------------------------------------------
 * SAMPLE CONTENT - to be replaced by Beeliv's real vacancy data.
 * There is no database yet (CLAUDE.md §5). Every JOB_DETAILS entry below is
 * illustrative copy grounded in the requirements document's own examples
 * (Waiter responsibilities §2.3, Floor Manager "About" §2.2, essential /
 * preferred examples §2.4, experience examples §2.5, the 11:30 PM closing-
 * time example §2.7, the BLV-KAL-FM-001 job-ref pattern §2.9). Job refs,
 * openings, resumption dates, working hours and benefits are NOT real Beeliv
 * vacancy terms. Pay figures and closing dates are unchanged from the
 * existing placeholder listings.
 * ---------------------------------------------------------------------------
 *
 * Only the applicant-visible parts of a vacancy are modelled. HR-only
 * listing states (Draft / Pending Approval / Paused / Cancelled, §2.13),
 * internal-only salary figures (§2.6 "Public / Internal Only"), recruiter,
 * age/gender requirements (a legal/compliance decision, not built) never
 * appear here.
 */
import type { Department } from "./jobs";
import { scheduleFor } from "@/lib/jobs/shared";
import { APPLICATION_STAGES } from "@/lib/applicant/types";
import type { JobState } from "@/lib/jobs/status";

/** §2.13 - the subset an applicant can ever see. */
export type ListingStatus = "Published" | "Closing soon" | "Closed" | "Filled";
export type SalaryFrequency = "Monthly" | "Weekly" | "Daily";
/** §2.5 Yes/No experience flags (only the "Yes" ones are listed). */
export type ExperienceFlag = "Management" | "Fine dining" | "Hotel" | "QSR" | "International cuisine" | "POS";
/** §2.6 benefit kinds; each is only listed when set for the vacancy. */
export type BenefitKind = "Feeding" | "Transport" | "Accommodation" | "Medical" | "Leave" | "Service charge" | "Staff welfare" | "Other";

export type JobDetails = {
  /** §2.9 e.g. "BLV-URB-SC-001" (BLV-<outlet>-<role>-<seq>). */
  jobRef: string;
  openings: number;
  /** ISO date (YYYY-MM-DD), or null when the listing is closed without a public date. */
  deadline: string | null;
  /** ISO date (YYYY-MM-DD). */
  expectedResumption: string;
  status: ListingStatus;
  about: string;
  responsibilities: string[];
  essential: string[];
  /** Nice-to-have - HR does not reject for a missing preferred item (§2.4). */
  preferred: string[];
  experience: { minYears: number; maxYears?: number; summary: string; flags: ExperienceFlag[] };
  skills: string[];
  /**
   * Public salary only. `min`/`max` null = Beeliv chose not to publish a figure,
   * shown as "Competitive, based on experience" (§2.6).
   */
  salary: { min: number | null; max: number | null; frequency: SalaryFrequency; negotiable?: boolean };
  benefits: { kind: BenefitKind; detail: string }[];
  conditions: {
    workingDays: string;
    shiftSystem: string;
    hours: string;
    weekends: string;
    publicHolidays: string;
    resumptionTime: string;
    closingTime: string;
    accommodation?: string;
    transport?: string;
  };
  interviewMethod: string;
  requiredDocuments: { atApplication: string[]; afterSelection: string[] };
};

/** §2.12 - valid ID is required AT APPLICATION, not only after shortlisting. */
export const DEFAULT_REQUIRED_DOCUMENTS: JobDetails["requiredDocuments"] = {
  atApplication: ["CV", "Passport photograph", "Valid ID"],
  afterSelection: ["Guarantor information", "Reference letter", "Relevant certificates", "Other employment documentation"],
};

/**
 * §2.10 "Recruitment Process Shown to Applicant" - default list, in the SAME stage names as the application
 * tracker (APPLICATION_STAGES, lib/applicant/types.ts). A job's own list comes from its journey through the one
 * mapping in lib/journeys/types.ts (applicantTimeline), so the job page and the tracker never use different names.
 */
export const RECRUITMENT_PROCESS = APPLICATION_STAGES;

/* §2.4 examples, shared as a base for every role. */
const ESSENTIAL_BASE = [
  "Minimum secondary school certificate or relevant qualification.",
  "Good communication skills.",
  "Ability to work shifts, weekends and public holidays.",
  "Ability to follow operational procedures.",
  "Valid identification/documentation.",
];

const JOB_DETAILS: Record<string, JobDetails> = {
  "sous-chef": {
    jobRef: "BLV-URB-SC-001",
    openings: 1,
    deadline: "2026-10-15",
    expectedResumption: "2026-11-02",
    status: "Published",
    about:
      "The Sous Chef supports the Head Chef in running the kitchen: leading the line during service, supervising kitchen staff and keeping food quality, costing and hygiene consistent.",
    responsibilities: [
      "Run the pass and keep tickets moving during peak service.",
      "Supervise and brief kitchen staff before each shift.",
      "Prepare dishes to standardized recipes and portion sizes.",
      "Support food costing, ordering and stock rotation.",
      "Lead the kitchen when the Head Chef is off.",
      "Enforce food safety, hygiene and cleaning schedules.",
      "Support opening and closing procedures.",
    ],
    essential: ["Relevant hospitality experience (see experience requirements).", ...ESSENTIAL_BASE],
    preferred: ["Professional culinary certification.", "Previous fine-dining experience.", "Previous supervisory experience."],
    experience: {
      minYears: 3,
      maxYears: 5,
      summary: "Minimum 3–5 years in a professional kitchen, including at least 1 year in a supervisory role.",
      flags: ["Management", "International cuisine"],
    },
    skills: ["Continental", "Grill", "Food preparation", "Food safety", "Staff supervision", "Cost control"],
    salary: { min: 250_000, max: 320_000, frequency: "Monthly" },
    benefits: [
      { kind: "Feeding", detail: "Staff meal on every shift" },
      { kind: "Leave", detail: "Annual leave after probation" },
    ],
    conditions: {
      workingDays: "6 days a week, 1 rotating day off",
      shiftSystem: "Rotating morning and evening shifts",
      hours: "About 10 hours per shift",
      weekends: "Yes, on rotation",
      publicHolidays: "Yes, on rotation",
      resumptionTime: "7:00 AM (morning) / 2:00 PM (evening)",
      closingTime: "Evening shift ends 11:30 PM",
    },
    interviewMethod: "In person at The Urban Grill, Abuja, with a kitchen practical",
    requiredDocuments: DEFAULT_REQUIRED_DOCUMENTS,
  },

  "head-chef": {
    jobRef: "BLV-URB-HC-001",
    openings: 1,
    deadline: "2026-10-15",
    expectedResumption: "2026-11-02",
    status: "Published",
    about:
      "The Head Chef leads the kitchen team: menu execution, food quality, food cost and hygiene standards, and training kitchen staff to deliver consistently.",
    responsibilities: [
      "Lead the kitchen team and plan shift rotas.",
      "Maintain recipes, plating standards and menu knowledge.",
      "Control food cost, ordering and stock levels.",
      "Train and assess kitchen staff.",
      "Enforce food safety, hygiene and cleaning schedules.",
      "Work with the floor team on service timing and guest feedback.",
    ],
    essential: ["Relevant hospitality experience (see experience requirements).", ...ESSENTIAL_BASE],
    preferred: ["Professional culinary certification.", "Previous fine-dining experience.", "Hospitality diploma/certificate."],
    experience: {
      minYears: 5,
      summary: "Minimum 5 years in hospitality kitchens, including at least 2 years leading a kitchen team.",
      flags: ["Management", "International cuisine"],
    },
    skills: ["Continental", "Nigerian cuisine", "Food safety", "Cost control", "Team management", "Scheduling"],
    salary: { min: null, max: null, frequency: "Monthly", negotiable: true },
    benefits: [
      { kind: "Feeding", detail: "Staff meal on every shift" },
      { kind: "Medical", detail: "Basic medical cover" },
      { kind: "Leave", detail: "Annual leave after probation" },
    ],
    conditions: {
      workingDays: "6 days a week",
      shiftSystem: "Split shifts across lunch and dinner service",
      hours: "About 10 hours per day",
      weekends: "Yes",
      publicHolidays: "Yes, on rotation",
      resumptionTime: "9:00 AM",
      closingTime: "11:30 PM",
    },
    interviewMethod: "In person at The Urban Grill, Abuja, with a cooking practical",
    requiredDocuments: DEFAULT_REQUIRED_DOCUMENTS,
  },

  "bar-supervisor": {
    jobRef: "BLV-VLV-BS-001",
    openings: 1,
    deadline: "2026-10-10",
    expectedResumption: "2026-10-19",
    status: "Closing soon",
    about:
      "The Bar Supervisor runs the bar during service: supervising bartenders, keeping drinks consistent and fast, and managing bar stock and setup.",
    responsibilities: [
      "Supervise bartenders and barbacks during service.",
      "Prepare classic and house cocktails to spec.",
      "Set up and close down the bar each shift.",
      "Count bar inventory and report variances.",
      "Coordinate with the floor team on orders and timing.",
      "Handle guest complaints at the bar professionally.",
      "Follow responsible-service, hygiene and safety requirements.",
    ],
    essential: ["Relevant bar experience (see experience requirements).", ...ESSENTIAL_BASE],
    preferred: ["Wine/beverage knowledge.", "POS experience.", "Previous supervisory experience."],
    experience: {
      minYears: 3,
      summary: "Minimum 3 years behind a bar in a lounge, hotel or restaurant, including at least 1 year supervising.",
      flags: ["Management", "POS"],
    },
    skills: ["Cocktails", "Mocktails", "Spirits", "Bar setup", "Inventory", "Mixology"],
    salary: { min: null, max: null, frequency: "Monthly", negotiable: true },
    benefits: [
      { kind: "Service charge", detail: "Share of service charge" },
      { kind: "Transport", detail: "Late-night transport after closing" },
    ],
    conditions: {
      workingDays: "5 nights a week",
      shiftSystem: "Evening shifts",
      hours: "About 9 hours per shift",
      weekends: "Yes, every weekend",
      publicHolidays: "Yes",
      resumptionTime: "4:00 PM",
      closingTime: "1:00 AM (later on event nights)",
      transport: "Provided after closing",
    },
    interviewMethod: "In person at The Velvet Room, Lagos, with a cocktail practical",
    requiredDocuments: DEFAULT_REQUIRED_DOCUMENTS,
  },

  "guest-relations-officer": {
    jobRef: "BLV-PLM-GRO-001",
    openings: 2,
    deadline: "2026-10-12",
    expectedResumption: "2026-10-26",
    status: "Published",
    about:
      "The Guest Relations Officer is the first point of contact for guests: welcoming them, managing reservations and seating, and making sure every visit starts and ends well.",
    responsibilities: [
      "Welcome and engage guests professionally.",
      "Manage reservations, walk-ins and seating.",
      "Share menu, events and service information with guests.",
      "Handle basic guest complaints professionally and escalate when needed.",
      "Record guest feedback and follow up on repeat guests.",
      "Coordinate with the floor and bar teams on table readiness.",
    ],
    essential: ["Relevant hospitality experience where required.", ...ESSENTIAL_BASE],
    preferred: ["Hospitality diploma/certificate.", "POS experience.", "Previous fine-dining experience."],
    experience: {
      minYears: 1,
      summary: "Minimum 1 year in a guest-facing role in a restaurant, hotel, lounge or similar hospitality environment.",
      flags: [],
    },
    skills: ["Guest relations", "Reservations", "Upselling", "POS"],
    salary: { min: 180_000, max: 220_000, frequency: "Monthly" },
    benefits: [
      { kind: "Feeding", detail: "Staff meal on every shift" },
      { kind: "Leave", detail: "Annual leave after probation" },
    ],
    conditions: {
      workingDays: "5 days a week",
      shiftSystem: "Day shifts",
      hours: "About 9 hours per shift",
      weekends: "Yes, on rotation",
      publicHolidays: "Yes, on rotation",
      resumptionTime: "10:00 AM",
      closingTime: "7:00 PM",
    },
    interviewMethod: "Online screening call, then in person at The Palm Lounge, Abuja",
    requiredDocuments: DEFAULT_REQUIRED_DOCUMENTS,
  },

  "restaurant-supervisor": {
    jobRef: "BLV-HSK-RS-001",
    openings: 1,
    deadline: "2026-10-18",
    expectedResumption: "2026-11-02",
    status: "Published",
    // §2.2's own Floor Manager "About" example, adapted to this supervisory role.
    about:
      "The Restaurant Supervisor coordinates front-of-house operations, maintains service standards, supervises service staff and ensures guests receive a consistent and professional dining experience.",
    responsibilities: [
      "Brief the service team before each shift and assign sections.",
      "Supervise the approved service sequence on the floor.",
      "Handle guest complaints professionally and resolve them on the spot.",
      "Check opening and closing procedures are completed.",
      "Monitor stock of service items and report shortages.",
      "Prepare shift reports for the outlet manager.",
    ],
    essential: ["Relevant hospitality experience (see experience requirements).", ...ESSENTIAL_BASE],
    preferred: ["Hospitality diploma/certificate.", "Previous fine-dining experience.", "POS experience.", "Wine/beverage knowledge."],
    experience: {
      minYears: 3,
      maxYears: 5,
      summary: "Minimum 3–5 years in hospitality, including at least 1 year in a supervisory or management role.",
      flags: ["Management", "POS"],
    },
    skills: ["Staff supervision", "Guest complaint resolution", "Scheduling", "Reporting", "Table service"],
    salary: { min: null, max: null, frequency: "Monthly", negotiable: true },
    benefits: [
      { kind: "Feeding", detail: "Staff meal on every shift" },
      { kind: "Service charge", detail: "Share of service charge" },
      { kind: "Leave", detail: "Annual leave after probation" },
    ],
    conditions: {
      workingDays: "6 days a week",
      shiftSystem: "Rotating morning and evening shifts",
      hours: "About 10 hours per shift",
      weekends: "Yes",
      publicHolidays: "Yes, on rotation",
      resumptionTime: "10:00 AM (morning) / 2:00 PM (evening)",
      // §2.7's own example.
      closingTime: "Evening shift ends 11:30 PM",
    },
    interviewMethod: "In person at The Honey Suckle, Abuja, with a floor practical",
    requiredDocuments: DEFAULT_REQUIRED_DOCUMENTS,
  },

  "admin-operations-officer": {
    jobRef: "BLV-M23-AOO-001",
    openings: 1,
    deadline: "2026-10-20",
    expectedResumption: "2026-11-02",
    status: "Published",
    about:
      "The Admin & Operations Officer keeps the outlet's paperwork and back office running: staff records, stock and purchase records, rotas and daily reports.",
    responsibilities: [
      "Keep staff records, rotas and attendance sheets up to date.",
      "Record stock received, issued and counted.",
      "Prepare daily and weekly operations reports.",
      "Follow up on supplier orders and invoices.",
      "Support the outlet manager with scheduling and admin tasks.",
    ],
    essential: ["Relevant admin or operations experience.", ...ESSENTIAL_BASE],
    preferred: ["Hospitality diploma/certificate.", "Previous hospitality experience.", "POS experience."],
    experience: {
      minYears: 2,
      summary: "Minimum 2 years in an admin or operations role, ideally in a restaurant, hotel or lounge.",
      flags: [],
    },
    skills: ["Inventory", "Scheduling", "Reporting", "Cost control"],
    salary: { min: 200_000, max: 260_000, frequency: "Monthly" },
    benefits: [
      { kind: "Feeding", detail: "Staff meal each working day" },
      { kind: "Leave", detail: "Annual leave after probation" },
    ],
    conditions: {
      workingDays: "Monday to Saturday",
      shiftSystem: "Day shifts",
      hours: "About 9 hours per day",
      weekends: "Saturdays",
      publicHolidays: "Occasionally",
      resumptionTime: "9:00 AM",
      closingTime: "6:00 PM",
    },
    interviewMethod: "Online interview, then in person at Maison 23, Lagos",
    requiredDocuments: DEFAULT_REQUIRED_DOCUMENTS,
  },

  "waiter-waitress": {
    jobRef: "BLV-BRL-WT-001",
    openings: 3,
    deadline: null,
    expectedResumption: "2026-10-12",
    status: "Closed",
    about:
      "The Waiter / Waitress looks after guests from seating to payment: taking orders accurately, serving to Beeliv service standards and keeping the section clean and ready.",
    // §2.3's own Waiter example, verbatim.
    responsibilities: [
      "Welcome and engage guests professionally.",
      "Follow the approved service sequence.",
      "Demonstrate strong menu and beverage knowledge.",
      "Take and accurately enter guest orders.",
      "Coordinate with kitchen and bar teams.",
      "Serve food and beverages according to Beeliv service standards.",
      "Monitor guest satisfaction throughout the dining experience.",
      "Handle basic guest complaints professionally.",
      "Maintain table and service station cleanliness.",
      "Process or coordinate bills and payments where applicable.",
      "Support opening and closing procedures.",
      "Follow restaurant SOPs, hygiene and safety requirements.",
    ],
    essential: ["Relevant hospitality experience where required.", ...ESSENTIAL_BASE],
    preferred: ["POS experience.", "Wine/beverage knowledge.", "Previous fine-dining experience."],
    experience: {
      // §2.5's own example.
      minYears: 2,
      summary: "Minimum 2 years' experience in a restaurant, hotel, lounge or similar hospitality environment.",
      flags: ["POS"],
    },
    skills: ["Table service", "POS", "Guest relations", "Upselling"],
    salary: { min: null, max: null, frequency: "Monthly" },
    benefits: [{ kind: "Feeding", detail: "Staff meal on every shift" }],
    conditions: {
      workingDays: "5 days a week",
      shiftSystem: "Day shifts",
      hours: "About 9 hours per shift",
      weekends: "Yes",
      publicHolidays: "Yes, on rotation",
      resumptionTime: "7:30 AM",
      closingTime: "4:30 PM",
    },
    interviewMethod: "In person at Brunch Lane, Lagos, with a table-service practical",
    requiredDocuments: DEFAULT_REQUIRED_DOCUMENTS,
  },

  "line-cook": {
    jobRef: "BLV-CLM-LC-001",
    openings: 2,
    deadline: "2026-10-16",
    expectedResumption: "2026-10-26",
    status: "Published",
    about:
      "The Line Cook prepares and cooks dishes on an assigned station during evening service, to standardized recipes and food safety rules.",
    responsibilities: [
      "Prepare your station (mise en place) before service.",
      "Cook dishes to standardized recipes and plating standards.",
      "Keep tickets moving and communicate with the pass.",
      "Label, date and rotate stock correctly.",
      "Clean down your station at close.",
    ],
    essential: ["Relevant kitchen experience where required.", ...ESSENTIAL_BASE],
    preferred: ["Professional culinary certification.", "Food safety training."],
    experience: {
      minYears: 1,
      summary: "Minimum 1 year in a restaurant, hotel or catering kitchen.",
      flags: [],
    },
    skills: ["Food preparation", "Grill", "Food safety", "Nigerian cuisine"],
    salary: { min: 120_000, max: 150_000, frequency: "Monthly" },
    benefits: [{ kind: "Feeding", detail: "Staff meal on every shift" }],
    conditions: {
      workingDays: "4 evenings a week",
      shiftSystem: "Evening shifts",
      hours: "About 7 hours per shift",
      weekends: "Yes",
      publicHolidays: "Yes, on rotation",
      resumptionTime: "4:30 PM",
      closingTime: "11:30 PM",
    },
    interviewMethod: "In person at Café Lemon, Abuja, with a kitchen practical",
    requiredDocuments: DEFAULT_REQUIRED_DOCUMENTS,
  },

  "housekeeping-supervisor": {
    jobRef: "BLV-GPH-HKS-001",
    openings: 1,
    deadline: "2026-10-19",
    expectedResumption: "2026-11-02",
    status: "Published",
    about:
      "The Housekeeping Supervisor leads the room and public-area cleaning team, making sure every room is inspected and guest-ready on time.",
    responsibilities: [
      "Assign rooms and areas to housekeeping staff each shift.",
      "Inspect rooms before they are released to guests.",
      "Track linen, amenities and cleaning stock.",
      "Train staff on cleaning standards and safe use of chemicals.",
      "Report maintenance issues promptly.",
    ],
    essential: ["Relevant housekeeping experience (see experience requirements).", ...ESSENTIAL_BASE],
    preferred: ["Hospitality diploma/certificate.", "Previous supervisory experience."],
    experience: {
      minYears: 3,
      summary: "Minimum 3 years in hotel housekeeping, including at least 1 year supervising a team.",
      flags: ["Hotel", "Management"],
    },
    skills: ["Staff supervision", "Inventory", "Scheduling", "Reporting"],
    salary: { min: null, max: null, frequency: "Monthly", negotiable: true },
    benefits: [
      { kind: "Feeding", detail: "Staff meal on every shift" },
      { kind: "Accommodation", detail: "Shared staff accommodation available" },
      { kind: "Medical", detail: "Basic medical cover" },
    ],
    conditions: {
      workingDays: "6 days a week",
      shiftSystem: "Rotating morning and afternoon shifts",
      hours: "About 9 hours per shift",
      weekends: "Yes, on rotation",
      publicHolidays: "Yes, on rotation",
      resumptionTime: "7:00 AM (morning) / 1:00 PM (afternoon)",
      closingTime: "4:00 PM (morning) / 10:00 PM (afternoon)",
      accommodation: "Shared staff accommodation available",
    },
    interviewMethod: "In person at Grand Palm Hotel, Lagos",
    requiredDocuments: DEFAULT_REQUIRED_DOCUMENTS,
  },
};

/** Neutral fallback so a listing without detail content still renders (sections with no items are hidden). */
function fallbackDetails(id: string, department?: Department): JobDetails {
  return {
    jobRef: `BLV-${id.slice(0, 6).toUpperCase()}`,
    openings: 1,
    deadline: null,
    expectedResumption: "",
    status: "Published",
    about: "",
    responsibilities: [],
    essential: department ? ESSENTIAL_BASE : [],
    preferred: [],
    experience: { minYears: 0, summary: "", flags: [] },
    skills: [],
    salary: { min: null, max: null, frequency: "Monthly" },
    benefits: [],
    conditions: { workingDays: "", shiftSystem: "", hours: "", weekends: "", publicHolidays: "", resumptionTime: "", closingTime: "" },
    interviewMethod: "",
    requiredDocuments: DEFAULT_REQUIRED_DOCUMENTS,
  };
}

/** Sync lookup (also used by /jobs/[id]/loading.tsx's skeleton). Swap for a real query later. */
const STATE_TO_LISTING: Record<JobState, ListingStatus> = { open: "Published", "closing-soon": "Closing soon", closed: "Closed", filled: "Filled" };

export function jobDetailsFor(id: string, department?: Department): JobDetails {
  const base = JOB_DETAILS[id] ?? fallbackDetails(id, department);
  // The close date and the listing status come from the ONE shared schedule (lib/jobs), computed against
  // today's date, never from the hand-set strings in the sample entries above.
  const sched = scheduleFor(id);
  if (!sched) return base;
  return { ...base, deadline: sched.closesOn, status: STATE_TO_LISTING[sched.availability.state] };
}

/* ------------------------------------------------------------ formatting */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-10-15" -> "15 October 2026" (deterministic: no locale, no timezone). */
export function formatLongDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

const k = (n: number) => `₦${Math.round(n / 1000)}k`;

/** "₦250k – ₦320k" or null when not published. */
export function salaryRangeLabel(s: JobDetails["salary"]): string | null {
  if (s.min == null && s.max == null) return null;
  if (s.min != null && s.max != null) return `${k(s.min)} – ${k(s.max)}`;
  return s.min != null ? `From ${k(s.min)}` : `Up to ${k(s.max!)}`;
}

const PER: Record<SalaryFrequency, string> = { Monthly: "month", Weekly: "week", Daily: "day" };

/** Short chip label, e.g. "₦250k – ₦320k / month"; null when no figure is published. */
export function payChipLabel(s: JobDetails["salary"]): string | null {
  const range = salaryRangeLabel(s);
  return range ? `${range} / ${PER[s.frequency]}` : null;
}

/** Full public salary line (§2.6). */
export function salaryLabel(s: JobDetails["salary"]): string {
  const range = salaryRangeLabel(s);
  if (!range) return "Competitive, based on experience";
  return `${range} / ${PER[s.frequency]}${s.negotiable ? " · negotiable" : ""}`;
}

/** Compact experience label, e.g. "3–5 years", "5+ years", "Entry level". */
export function experienceLabel(e: JobDetails["experience"]): string {
  if (e.minYears <= 0) return "Entry level";
  if (e.maxYears) return `${e.minYears}–${e.maxYears} years`;
  return `${e.minYears}+ year${e.minYears === 1 ? "" : "s"}`;
}

/** Working-conditions rows, skipping unset optional ones. */
export function conditionRows(c: JobDetails["conditions"]): [string, string][] {
  const rows: [string, string | undefined][] = [
    ["Working days", c.workingDays],
    ["Shift system", c.shiftSystem],
    ["Working hours", c.hours],
    ["Weekends", c.weekends],
    ["Public holidays", c.publicHolidays],
    ["Resumption time", c.resumptionTime],
    ["Closing time", c.closingTime],
    ["Accommodation", c.accommodation],
    ["Transport", c.transport],
  ];
  return rows.filter((r): r is [string, string] => Boolean(r[1]));
}

/* ------------------------------------------------------------ filter bands */

/** §2.14 experience filter bands, keyed on a vacancy's minimum years. */
export const EXPERIENCE_BANDS = ["Entry level", "1–3 years", "3–5 years", "5+ years"] as const;
export function experienceBand(minYears: number): (typeof EXPERIENCE_BANDS)[number] {
  if (minYears < 1) return "Entry level";
  if (minYears < 3) return "1–3 years";
  if (minYears < 5) return "3–5 years";
  return "5+ years";
}

/** §2.14 salary filter bands (monthly, placeholder figures - Beeliv has not supplied real bands). */
export const SALARY_FILTER_BANDS = [
  { value: "Under ₦150k", min: 0, max: 150_000 },
  { value: "₦150k – ₦250k", min: 150_000, max: 250_000 },
  { value: "₦250k+", min: 250_000, max: Infinity },
  { value: "Not listed", min: NaN, max: NaN },
] as const;
export type SalaryBand = (typeof SALARY_FILTER_BANDS)[number]["value"];

export function matchesSalaryBand(s: JobDetails["salary"], band: string): boolean {
  const b = SALARY_FILTER_BANDS.find((x) => x.value === band);
  if (!b) return false;
  const listed = s.min != null || s.max != null;
  if (b.value === "Not listed") return !listed;
  if (!listed) return false;
  const lo = s.min ?? s.max!;
  const hi = s.max ?? s.min!;
  return hi >= b.min && lo < b.max;
}

/** §2.14 date-posted filter. */
export const DATE_POSTED_OPTIONS = [
  { value: "", label: "Any time", days: Infinity },
  /** `days` = the largest whole-day age still inside the window (posted today = 0). */
  { value: "24h", label: "Last 24 hours", days: 0 },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
] as const;

export function matchesDatePosted(daysAgo: number, value: string): boolean {
  const o = DATE_POSTED_OPTIONS.find((x) => x.value === value);
  if (!o || !value) return true;
  return daysAgo <= o.days;
}

/** A listing is open to new applications only while Published / Closing soon. */
export function isOpenStatus(status: ListingStatus): boolean {
  return status === "Published" || status === "Closing soon";
}
