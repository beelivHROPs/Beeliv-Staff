/**
 * Applicant dashboard: placeholder data layer.
 *
 * FRONTEND-ONLY PLACEHOLDER DATA. No backend, no Supabase, no API call (same
 * rule as lib/public-site/jobs.ts's own header comment — this file follows
 * that pattern for the same reason: nothing is wired to a database yet).
 *
 * Content below is adapted from the delivered wireframe
 * (C:\Users\USER\Documents\beeliv-website\applicant\index.html — its JOBS,
 * APPS, DOCS, REQ, NOTIFS, IV_UP, IV_DONE, STAGES, SKILLS arrays), NOT
 * invented beyond what the wireframe already shows. One deliberate change:
 * the wireframe's own JOBS array (8 example roles) is NOT reused here — per
 * instruction, "Find Jobs" reuses `getFeaturedJobs()` from
 * lib/public-site/jobs.ts so a job seen on the public /jobs listing is the
 * same job seen here. Four of the wireframe's eight example roles happen to
 * match jobs.ts's four canonical jobs exactly on role + company (Head Chef /
 * The Urban Grill, Restaurant Supervisor / The Honey Suckle, Bar Supervisor /
 * The Velvet Room, Guest Relations Officer / The Palm Lounge), so application
 * records that reference those roles link to a real `jobId`. The remaining
 * wireframe example applications (Floor Manager · Kalina, Front Desk Officer
 * · Maison 23, Bartender · The Velvet Room) reference companies/roles with no
 * matching live listing — same as the wireframe itself, which also carries
 * applications with `job: null` for roles no longer/not listed. Those keep
 * `jobId: null` here too; their card/detail screens simply don't link back
 * to a job page, which matches production reality (a closed or historical
 * application need not have a current listing).
 */

import type { Job } from "@/lib/public-site/jobs";

export type ApplicantProfile = {
  fullName: string;
  preferredName: string;
  email: string;
  phone: string;
  whatsapp: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  address: string;
  state: string;
  lga: string;
  applicantId: string;
  title: string;
  location: string;
  emergencyContact: { name: string; relationship: string; phone: string };
};

/** Single placeholder signed-in applicant. Stands in for Supabase Auth's session user. */
export const APPLICANT: ApplicantProfile = {
  fullName: "Sarah Chioma Okafor",
  preferredName: "Sarah",
  email: "sarah.okafor@example.com",
  phone: "+234 803 555 0142",
  whatsapp: "+234 803 555 0142",
  dateOfBirth: "14 March 1996",
  gender: "Female",
  nationality: "Nigerian",
  address: "12 Aminu Kano Crescent, Wuse II",
  state: "FCT",
  lga: "AMAC",
  applicantId: "BLV-APP-00482",
  title: "Assistant Floor Manager",
  location: "Abuja, FCT",
  emergencyContact: { name: "Chinedu Okafor", relationship: "Brother", phone: "+234 806 555 0199" },
};

/**
 * Confirmed 8-stage recruitment workflow (docs/BEELIV-APPLICANT-JOURNEY.md
 * "The Journey, End to End" / docs/BEELIV-SOURCE-OF-TRUTH.md §3). Used
 * verbatim for every status stepper/progress indicator in this dashboard —
 * do not invent alternate stage names. The journey map itself floats a
 * "group the 8 into ~5 applicant-facing milestones" simplification, but
 * flags that as its own Proposed Enhancement requiring approval before
 * building, so all 8 are shown as-is here rather than silently collapsed.
 */
export const STAGES = [
  "Application",
  "Application Review/Shortlisting",
  "Interview/Assessment",
  "Documentation",
  "Verification",
  "Selection/Approval",
  "Staff Onboarding",
  "Assignment to Client/Outlet",
] as const;

export type ApplicationGroup = "draft" | "active" | "completed";

export type NextAction = {
  label: string;
  detail: string;
  ctaLabel: string;
  href: string;
};

export type Application = {
  id: string;
  /** Links back to lib/public-site/jobs.ts when the role is still listed there. */
  jobId: string | null;
  role: string;
  company: string;
  location: string;
  employmentType: string;
  status: string;
  statusTone: "warn" | "ok" | "info" | "violet" | "mute";
  group: ApplicationGroup;
  appliedOn: string | null;
  updatedLabel: string;
  /** Index into STAGES for the current tracker position (-1 = draft, not yet submitted). */
  stageIndex: number;
  draftPercent?: number;
  next: NextAction | null;
  pool?: boolean;
  stageDates?: string[];
  answers?: [string, string][];
  activity?: { title: string; detail?: string; when: string }[];
};

export const APPLICATIONS: Application[] = [
  {
    id: "fm",
    jobId: null,
    role: "Floor Manager",
    company: "Kalina",
    location: "Abuja, FCT",
    employmentType: "Full-time",
    status: "Documents needed",
    statusTone: "warn",
    group: "active",
    appliedOn: "12 Sep 2026",
    updatedLabel: "Updated today",
    // Documentation stage (index 3): Interview/Assessment (index 2) is
    // already complete per the activity log below.
    stageIndex: 3,
    next: {
      label: "Upload your guarantor form",
      detail: "Due Fri, 3 Oct 2026. Beeliv needs it to move you to approval.",
      ctaLabel: "Upload document",
      href: "/applicant/documents",
    },
    stageDates: ["12 Sep", "16 Sep", "24 Sep", "In progress", "", "", "", ""],
    answers: [
      ["Hospitality experience", "6 years"],
      ["Expected salary", "\u20a6300,000 \u2013 \u20a6350,000 / month"],
      ["Earliest start", "1 Nov 2026"],
      ["Preferred location", "Abuja"],
      ["Shifts, weekends, holidays", "Yes, yes, yes"],
      ["Screening questions", "3 of 3 answered"],
    ],
    activity: [
      { title: "Documents requested", detail: "Guarantor form and two reference contacts", when: "Today, 9:12 AM" },
      { title: "Assessment completed", detail: "Floor service trial at Kalina", when: "24 Sep 2026" },
      { title: "Interview completed", detail: "Beeliv interview", when: "22 Sep 2026" },
      { title: "Shortlisted", detail: "You were shortlisted for interview", when: "16 Sep 2026" },
      { title: "Application submitted", when: "12 Sep 2026" },
    ],
  },
  {
    id: "gr",
    jobId: "guest-relations-officer",
    role: "Guest Relations Officer",
    company: "The Palm Lounge",
    location: "Abuja",
    employmentType: "Full-time",
    status: "Interview scheduled",
    statusTone: "ok",
    group: "active",
    appliedOn: "5 Sep 2026",
    updatedLabel: "Updated yesterday",
    // Interview/Assessment stage (index 2): shortlisted, interview upcoming.
    stageIndex: 2,
    next: {
      label: "Attend your interview",
      detail: "Thu, 2 Oct 2026 \u00b7 10:00 AM WAT \u00b7 Google Meet",
      ctaLabel: "View interview",
      href: "/applicant/interviews",
    },
    stageDates: ["5 Sep", "26 Sep", "2 Oct", "", "", "", "", ""],
    answers: [
      ["Hospitality experience", "6 years"],
      ["Expected salary", "\u20a6180,000 \u2013 \u20a6220,000 / month"],
      ["Earliest start", "Immediately"],
      ["Preferred location", "Abuja"],
    ],
    activity: [
      { title: "Interview scheduled", detail: "Beeliv interview on Thu, 2 Oct", when: "Yesterday" },
      { title: "Shortlisted", when: "26 Sep 2026" },
      { title: "Application submitted", when: "5 Sep 2026" },
    ],
  },
  {
    id: "fd",
    jobId: null,
    role: "Front Desk Officer",
    company: "Maison 23",
    location: "Lagos",
    employmentType: "Contract",
    status: "Under review",
    statusTone: "info",
    group: "active",
    appliedOn: "28 Aug 2026",
    updatedLabel: "Updated 2 days ago",
    stageIndex: 1,
    next: null,
    stageDates: ["28 Aug", "In review", "", "", "", "", "", ""],
    answers: [
      ["Hospitality experience", "6 years"],
      ["Earliest start", "2 weeks' notice"],
    ],
    activity: [
      { title: "Under review", detail: "The Beeliv team is reviewing your application", when: "26 Sep 2026" },
      { title: "Application submitted", when: "28 Aug 2026" },
    ],
  },
  {
    id: "hc",
    jobId: "head-chef",
    role: "Head Chef",
    company: "The Urban Grill",
    location: "Abuja",
    employmentType: "Full-time",
    status: "Draft",
    statusTone: "mute",
    group: "draft",
    appliedOn: null,
    updatedLabel: "Saved 2 days ago",
    stageIndex: -1,
    draftPercent: 45,
    next: {
      label: "Add your employment history",
      detail: "Step 2 of 6 \u00b7 about 6 minutes left",
      ctaLabel: "Continue application",
      href: "/applicant/apply?job=head-chef",
    },
  },
  {
    id: "bt",
    jobId: null,
    role: "Bartender",
    company: "The Velvet Room",
    location: "Lagos",
    employmentType: "Contract",
    status: "Not selected",
    statusTone: "mute",
    group: "completed",
    appliedOn: "2 Aug 2026",
    updatedLabel: "Closed 20 Aug 2026",
    stageIndex: 1,
    next: null,
    pool: true,
    stageDates: ["2 Aug", "20 Aug", "", "", "", "", "", ""],
    answers: [["Hospitality experience", "6 years"]],
    activity: [
      { title: "Added to talent pool", detail: "We'll suggest you for similar bar roles", when: "20 Aug 2026" },
      { title: "Not selected", detail: "The role was filled", when: "20 Aug 2026" },
      { title: "Application submitted", when: "2 Aug 2026" },
    ],
  },
];

export function getApplications(): Application[] {
  return APPLICATIONS;
}
export function getApplicationById(id: string): Application | undefined {
  return APPLICATIONS.find((a) => a.id === id);
}
export function getDraftApplication(): Application | undefined {
  return APPLICATIONS.find((a) => a.group === "draft");
}
export function getDraftForJob(jobId: string): Application | undefined {
  return APPLICATIONS.find((a) => a.jobId === jobId && a.group === "draft");
}
export function hasAppliedToJob(jobId: string): boolean {
  return APPLICATIONS.some((a) => a.jobId === jobId && a.group !== "draft");
}

export type UpcomingInterview = {
  title: string;
  kind: string;
  applicationLabel: string;
  month: string;
  day: string;
  weekday: string;
  time: string;
  mode: string;
  withWhom: string;
  prep: string[];
};

export const UPCOMING_INTERVIEWS: UpcomingInterview[] = [
  {
    title: "Beeliv interview",
    kind: "Interview",
    applicationLabel: "Guest Relations Officer \u00b7 The Palm Lounge",
    month: "OCT",
    day: "02",
    weekday: "Thursday",
    time: "10:00 \u2013 10:45 AM (WAT)",
    mode: "Video call \u00b7 Google Meet",
    withWhom: "With Adaeze N., Beeliv Recruitment",
    prep: [
      "Test your camera and microphone 10 minutes before",
      "Have your NIN slip nearby",
      "Re-read the role description and your application",
    ],
  },
];

export type CompletedInterview = {
  title: string;
  kind: string;
  applicationLabel: string;
  when: string;
};

export const COMPLETED_INTERVIEWS: CompletedInterview[] = [
  { title: "Floor service trial", kind: "Practical assessment", applicationLabel: "Floor Manager \u00b7 Kalina", when: "24 Sep 2026" },
  { title: "Beeliv interview", kind: "Interview", applicationLabel: "Floor Manager \u00b7 Kalina", when: "22 Sep 2026" },
  { title: "HR screening call", kind: "Screening", applicationLabel: "Floor Manager \u00b7 Kalina", when: "16 Sep 2026" },
];

export type StoredDocument = {
  name: string;
  fileName: string;
  size: string;
  uploadedOn: string;
  usedIn: number;
  status: "Verified" | "Pending review";
};

/** Documents already on file, reused across applications (never re-uploaded per role). */
export const STORED_DOCUMENTS: StoredDocument[] = [
  { name: "CV", fileName: "Sarah_Okafor_CV_2026.pdf", size: "214 KB", uploadedOn: "12 Sep 2026", usedIn: 4, status: "Verified" },
  { name: "Passport photograph", fileName: "passport_photo.jpg", size: "88 KB", uploadedOn: "12 Sep 2026", usedIn: 4, status: "Verified" },
  { name: "NIN slip", fileName: "NIN_slip.pdf", size: "120 KB", uploadedOn: "12 Sep 2026", usedIn: 4, status: "Verified" },
  { name: "Educational certificate", fileName: "OND_Hospitality_Management.pdf", size: "340 KB", uploadedOn: "12 Sep 2026", usedIn: 1, status: "Pending review" },
];

export type RequiredDocument = {
  id: string;
  name: string;
  forApplication: string;
  due: string;
  description: string;
  hasTemplate?: boolean;
  isReferenceForm?: boolean;
  done: boolean;
};

/**
 * Items Beeliv has specifically requested for an in-progress application,
 * per the wireframe. NOT the confirmed 26-field Documentation-stage packet
 * (Personal/Identity, Banking, Current/Previous Employment, Next of Kin,
 * Identification Documents, six Terms & Declarations items — see
 * docs/BEELIV-SOURCE-OF-TRUTH.md §7 / docs/BEELIV-APPLICANT-JOURNEY.md §4).
 * That screen has no wireframe yet and is explicitly out of scope for this
 * build (BEELIV-APPLICANT-JOURNEY.md's own closing line: "screen design is
 * the next explicitly separate task"). Frontend-only placeholder — no real
 * sensitive-data capture or validation logic of any kind lives here.
 */
export const REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    id: "guar",
    name: "Guarantor form",
    forApplication: "Floor Manager \u00b7 Kalina",
    due: "Due Fri, 3 Oct 2026",
    description: "Download the template, have your guarantor sign it, then upload a PDF or clear photo.",
    hasTemplate: true,
    done: false,
  },
  {
    id: "refs",
    name: "Two reference contacts",
    forApplication: "Floor Manager \u00b7 Kalina",
    due: "Due Fri, 3 Oct 2026",
    description: "Former supervisors or managers from hospitality roles. We only contact them at this stage.",
    isReferenceForm: true,
    done: false,
  },
];

export type NotificationTone = "ok" | "warn" | "info" | "violet";

export type AppNotification = {
  id: string;
  group: "Today" | "Earlier";
  tone: NotificationTone;
  icon: "sign" | "shieldok" | "cal" | "file" | "calcheck";
  title: string;
  detail: string;
  time: string;
  unread: boolean;
  link?: { label: string; href: string };
};

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "n1",
    group: "Today",
    tone: "warn",
    icon: "sign",
    title: "Document requested",
    detail: "Upload your guarantor form for Floor Manager at Kalina by 3 Oct.",
    time: "9:12 AM",
    unread: true,
    link: { label: "Upload document", href: "/applicant/documents" },
  },
  {
    id: "n2",
    group: "Today",
    tone: "ok",
    icon: "shieldok",
    title: "Document verified",
    detail: "Your NIN slip has been verified.",
    time: "8:40 AM",
    unread: true,
  },
  {
    id: "n3",
    group: "Earlier",
    tone: "violet",
    icon: "cal",
    title: "Interview scheduled",
    detail: "The Palm Lounge invited you to a Beeliv interview on Thu, 2 Oct at 10:00 AM.",
    time: "Yesterday",
    unread: true,
    link: { label: "View interview", href: "/applicant/interviews" },
  },
  {
    id: "n4",
    group: "Earlier",
    tone: "info",
    icon: "file",
    title: "Application update",
    detail: "Your Front Desk Officer application is under review.",
    time: "2 days ago",
    unread: false,
    link: { label: "View progress", href: "/applicant/applications/fd" },
  },
  {
    id: "n5",
    group: "Earlier",
    tone: "ok",
    icon: "calcheck",
    title: "Assessment completed",
    detail: "Thanks for completing the floor service trial at Kalina.",
    time: "24 Sep",
    unread: false,
  },
];

export const APPLY_STEPS = [
  "Personal details",
  "Experience & availability",
  "Skills",
  "Documents",
  "Screening questions",
  "Review & submit",
] as const;

export const APPLY_STEP_DESCRIPTIONS = [
  "We've filled this in from your profile. Check it's still correct.",
  "Your hospitality background and when you can start.",
  "Pick the skills you use confidently. Choose as many as apply.",
  "Your saved documents are reused. Add only what this role needs.",
  "This role's screening questions.",
  "Check everything before you submit. You can edit any section.",
] as const;

export const SKILL_CATEGORIES: { category: string; skills: string[] }[] = [
  { category: "Kitchen", skills: ["Food safety & HACCP", "Continental cuisine", "Nigerian cuisine", "Grill station", "Pastry", "Menu costing"] },
  { category: "Floor / Service", skills: ["Fine dining service", "Table setting", "POS systems", "Wine service", "Banquets & events"] },
  { category: "Bar", skills: ["Cocktails", "Stock & par levels", "Coffee & barista"] },
  { category: "Management / Operations", skills: ["Staff rostering", "Stock control", "Shift supervision", "Training new staff"] },
];

/** Pre-selected skills shown on Profile / step 3 review, matching what the wireframe pre-fills. */
export const SELECTED_SKILLS: Record<string, string[]> = {
  Kitchen: ["Food safety & HACCP", "Continental cuisine", "Grill station"],
  "Floor / Service": ["Fine dining service"],
  Bar: [],
  "Management / Operations": ["Staff rostering", "Stock control"],
};

export type EmploymentEntry = { role: string; company: string; period: string };
export const EMPLOYMENT_HISTORY: EmploymentEntry[] = [
  { role: "Assistant Floor Manager", company: "The Nest Lounge \u00b7 Abuja", period: "Jan 2023 \u2013 Present \u00b7 3 yrs 9 mos" },
  { role: "Senior Waitress", company: "Grand Palm Hotel \u00b7 Abuja", period: "Mar 2019 \u2013 Dec 2022 \u00b7 3 yrs 10 mos" },
  { role: "Waitress", company: "Caf\u00e9 Lemon \u00b7 Enugu", period: "Jun 2017 \u2013 Feb 2019 \u00b7 1 yr 9 mos" },
];

/** Profile completion checklist (Overview hero card + Profile page). */
export const PROFILE_COMPLETION_PERCENT = 80;
export const PROFILE_MISSING_ITEMS = ["Add a short professional summary", "Add your hospitality certifications"];

export function unreadNotificationsCount(notifications: AppNotification[] = NOTIFICATIONS): number {
  return notifications.filter((n) => n.unread).length;
}

/**
 * Department/type option lists for the Find Jobs filters (matches jobs.ts's
 * Department union). The wireframe's Find Jobs filters also include a
 * "Shift pattern" facet, but lib/public-site/jobs.ts's Job type carries no
 * shift field (and this task is explicitly not to touch that file beyond
 * reusing it) — so that filter group is left out here rather than invented.
 */
export const DEPARTMENT_OPTIONS: Job["department"][] = [
  "Front of house",
  "Kitchen",
  "Bar",
  "Management",
  "Admin & operations",
  "Support",
];
