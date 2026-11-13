/**
 * Applicant dashboard: static reference/taxonomy data.
 *
 * NOT mock user data (contrast with mock-db.ts) — these are fixed UI labels
 * and option lists that exist regardless of which applicant is signed in or
 * which prototype mode is active, so they are not subject to the "no fake
 * data" rule the way seeded applications/documents/notifications are.
 */
import type { Job } from "@/lib/public-site/jobs";
import type {
  DocumentCategory,
  DocumentStatus,
  DocumentTypeKey,
  Gender,
  NotificationIcon,
  NotificationKind,
  NotificationTone,
} from "./types";

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

/**
 * Skills, verbatim from the requirements doc (docs/requirements/
 * beeliv-recruitment-and-job-listings-2026-09-29.md, Module 1 §2 "Skills").
 * Category keys are also the keys of ApplicantProfile.skills /
 * ApplyFormData.skills. ("Inventory" appears under both Bar and Management
 * in the doc; selections are stored per category, so that is kept as-is.)
 */
export const SKILL_CATEGORIES: { category: string; skills: string[] }[] = [
  {
    category: "Kitchen",
    skills: ["Continental", "Nigerian cuisine", "Asian cuisine", "Pastry", "Sushi", "Grill", "Butchery", "Food preparation", "Food safety"],
  },
  { category: "Floor", skills: ["Table service", "Fine dining", "POS", "Wine service", "Guest relations", "Upselling", "Reservations"] },
  { category: "Bar", skills: ["Cocktails", "Mocktails", "Wine", "Spirits", "Bar setup", "Inventory", "Mixology"] },
  {
    category: "Management",
    skills: ["Staff supervision", "Inventory", "Cost control", "Scheduling", "Reporting", "Guest complaint resolution", "Team management"],
  },
];

/** Previous hospitality sectors, verbatim from Module 1 §2 "Employment Information". */
export const SECTOR_OPTIONS = ["Restaurant", "Hotel", "Lounge", "Bar", "QSR", "Fine dining", "Catering", "Other"];

/**
 * Gender options (Module 1 §2): Female or Male only — project-lead decision,
 * 2026-09-29. Label is "Gender"; this is the same field Beeliv's onboarding
 * form calls "Sex" (docs/BEELIV-RECRUITMENT-SPEC.md §4).
 */
export const GENDER_OPTIONS: Gender[] = ["Female", "Male"];

/* ------------------------------------------------------------------ */
/* Documents (Module 1 §3)                                             */
/* ------------------------------------------------------------------ */

export type DocumentTypeInfo = {
  key: DocumentTypeKey;
  label: string;
  category: DocumentCategory;
  /** The doc's "Required" column, verbatim. */
  required: "Yes" | "Depending on role" | "Where applicable" | "After selection" | "Where required" | "Optional";
  /** Accepted example, shown under the label (e.g. Valid ID -> NIN slip). */
  example?: string;
  /** Can the applicant add this type themselves from the Documents page? */
  selfAdd: boolean;
  /** Earlier display names that map to this type (records saved before docType existed). */
  aliases?: string[];
};

/**
 * Module 1 §3 checklist. Application documents are collected up front;
 * pre-employment documents are only requested once an application reaches
 * that stage (the doc's own "don't make every document mandatory" rule).
 * "Two reference contacts" is the existing reference-contacts form and is
 * kept alongside the doc's separate "Reference letter" row.
 */
export const DOCUMENT_TYPES: DocumentTypeInfo[] = [
  { key: "cv", label: "CV", category: "application", required: "Yes", selfAdd: false, aliases: ["CV/Resume"] },
  { key: "passport-photo", label: "Passport photograph", category: "application", required: "Yes", selfAdd: false },
  { key: "valid-id", label: "Valid ID", category: "application", required: "Yes", example: "e.g. NIN slip", selfAdd: false, aliases: ["NIN slip"] },
  { key: "educational-certificate", label: "Educational certificate", category: "application", required: "Depending on role", selfAdd: true },
  { key: "professional-certificate", label: "Professional certificate", category: "application", required: "Where applicable", example: "e.g. food handler's or hygiene certificate", selfAdd: true, aliases: ["Food handler's certificate"] },
  { key: "employment-evidence", label: "Previous employment evidence", category: "application", required: "Where applicable", example: "e.g. employment letter or payslip", selfAdd: true },
  { key: "guarantor-form", label: "Guarantor form", category: "pre-employment", required: "After selection", selfAdd: false },
  { key: "reference-contacts", label: "Two reference contacts", category: "pre-employment", required: "After selection", selfAdd: false },
  { key: "reference-letter", label: "Reference letter", category: "pre-employment", required: "After selection", selfAdd: false },
  { key: "medical-fitness", label: "Medical/Fitness document", category: "pre-employment", required: "Where required", selfAdd: false },
  { key: "other", label: "Other supporting documents", category: "pre-employment", required: "Optional", selfAdd: true },
];

/** Resolves a document's checklist type from `docType`, falling back to its name (older records). */
export function documentTypeOf(doc: { docType?: DocumentTypeKey; name: string }): DocumentTypeInfo | undefined {
  if (doc.docType) return DOCUMENT_TYPES.find((t) => t.key === doc.docType);
  const n = doc.name.toLowerCase();
  return DOCUMENT_TYPES.find((t) => t.label.toLowerCase() === n || t.aliases?.some((a) => a.toLowerCase() === n));
}

/**
 * Module 1 §3 status wording, mapped from the internal DocumentStatus
 * (display only): application docs Pending / Uploaded / Approved,
 * pre-employment docs Pending / Submitted / Verified.
 */
export function documentStatusLabel(doc: { category: DocumentCategory; status: DocumentStatus; resubmitted?: boolean }): string {
  if (doc.status === "action-required") return "Pending";
  if (doc.status === "pending-review" && doc.resubmitted) return "Resubmitted, waiting for review";
  if (doc.status === "pending-review") return doc.category === "application" ? "Uploaded" : "Submitted";
  return doc.category === "application" ? "Approved" : "Verified";
}

/* ------------------------------------------------------------------ */
/* Notifications (Module 1 §8)                                         */
/* ------------------------------------------------------------------ */

/**
 * Per-kind tone + coarse glyph. The coarse `icon` is what AppShell's bell
 * menu understands; NotificationsBody/OverviewBody draw a finer glyph per kind.
 * Kinds are exactly docs/BEELIV-RECRUITMENT-SPEC.md §7. "Not selected"
 * deliberately uses a neutral (info) tone, never an alarm colour.
 */
export const NOTIFICATION_KINDS: Record<NotificationKind, { label: string; tone: NotificationTone; icon: NotificationIcon }> = {
  "application-received": { label: "Application received", tone: "info", icon: "file" },
  shortlisted: { label: "Shortlisted", tone: "ok", icon: "spark" },
  "interview-invitation": { label: "Interview invitation", tone: "violet", icon: "cal" },
  "interview-reminder": { label: "Interview reminder", tone: "violet", icon: "cal" },
  "document-request": { label: "Additional document request", tone: "warn", icon: "sign" },
  "documentation-reminder": { label: "Documentation reminder", tone: "warn", icon: "sign" },
  "documents-verified": { label: "Documents verified", tone: "ok", icon: "shieldok" },
  "client-approval": { label: "Client approval", tone: "ok", icon: "shieldok" },
  offer: { label: "Offer", tone: "ok", icon: "spark" },
  placement: { label: "Placement", tone: "ok", icon: "calcheck" },
  "resumption-date": { label: "Resumption date", tone: "violet", icon: "calcheck" },
  "not-selected": { label: "Not selected", tone: "info", icon: "file" },
  "talent-pool": { label: "Talent pool", tone: "violet", icon: "spark" },
};

/**
 * Respectful wording for a "not selected" notice (project-lead direction,
 * 2026-09-29). Use this, never "Rejected", in anything the applicant sees.
 */
export const NOT_SELECTED_MESSAGE = "This application wasn't selected to proceed at this time.";
export const SCREENING_Q2_OPTIONS = ["Under 50", "50 – 150", "150 – 300", "Over 300"];

/**
 * Department option list for the Find Jobs filters (matches jobs.ts's
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

export const EMPLOYMENT_TYPE_OPTIONS = ["Full-time", "Part-time", "Contract"];
export const LOCATION_OPTIONS = ["Abuja", "Lagos"];

/**
 * Checklist the derived profile-completeness score is computed from (see
 * computeProfileCompleteness in service.ts). A real percentage computed from
 * actual filled fields, not a hardcoded number.
 */
/** Weights sum to 100 (wireframe: active applicant = 80% with summary + certifications left). */
export const PROFILE_CHECKLIST: { key: string; label: string; short: string; weight: number }[] = [
  { key: "professionalSummary", label: "Add a short professional summary", short: "a professional summary", weight: 10 },
  { key: "certifications", label: "Add your hospitality certifications", short: "your certifications", weight: 10 },
  { key: "employmentHistory", label: "Add your employment history", short: "employment history", weight: 15 },
  { key: "skills", label: "Add your skills", short: "skills", weight: 15 },
  { key: "emergencyContact", label: "Add an emergency contact", short: "an emergency contact", weight: 10 },
  { key: "cv", label: "Upload your CV", short: "CV", weight: 15 },
  { key: "passportPhoto", label: "Upload a passport photograph", short: "a passport photograph", weight: 10 },
  { key: "preferences", label: "Set your availability and preferred locations", short: "your availability", weight: 15 },
];

/** Nigeria's 36 states + the FCT (fixed public list, not a business rule). */
export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT (Abuja)", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara",
];

/**
 * Expected-salary bands (monthly, NGN) for the Apply/Profile dropdown.
 * PLACEHOLDER BANDS — requested by the project lead (2026-09-28) as "3–4
 * options"; the exact ranges are NOT confirmed by Beeliv and must be
 * replaced once Beeliv supplies its real bands.
 */
export const SALARY_BANDS = [
  "Under ₦100,000 / month",
  "₦100,000 – ₦200,000 / month",
  "₦200,000 – ₦350,000 / month",
  "Above ₦350,000 / month",
  "Open to discuss",
];
