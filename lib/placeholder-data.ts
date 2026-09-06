// PLACEHOLDER DATA ONLY.
//
// Nothing in this file is real Beeliv business data. It exists solely to give
// Stage 1 structural screens realistic-looking content before any database
// or API integration exists. Names, outlets, and positions are intentionally
// generic/fictitious — do not treat any value here as a Beeliv-confirmed fact,
// and do not use it as a source for future documentation or schema decisions.

export interface JobListingPreview {
  id: string;
  title: string;
  location: string;
  summary: string;
  description: string;
  requirements: string[];
}

export const SAMPLE_JOB_LISTINGS: JobListingPreview[] = [
  {
    id: "front-desk-associate",
    title: "Front Desk Associate",
    location: "Multiple Beeliv Locations",
    summary:
      "Greet guests, manage check-in/check-out, and support daily front-of-house operations.",
    description:
      "This is placeholder job description text. The approved job description content for this role has not yet been supplied.",
    requirements: [
      "Placeholder requirement — content pending",
      "Placeholder requirement — content pending",
    ],
  },
  {
    id: "housekeeping-supervisor",
    title: "Housekeeping Supervisor",
    location: "Multiple Beeliv Locations",
    summary:
      "Oversee housekeeping staff and maintain guest-room and common-area standards.",
    description:
      "This is placeholder job description text. The approved job description content for this role has not yet been supplied.",
    requirements: [
      "Placeholder requirement — content pending",
      "Placeholder requirement — content pending",
    ],
  },
  {
    id: "restaurant-server",
    title: "Restaurant Server",
    location: "Multiple Beeliv Locations",
    summary: "Deliver attentive guest service in the outlet's dining area.",
    description:
      "This is placeholder job description text. The approved job description content for this role has not yet been supplied.",
    requirements: [
      "Placeholder requirement — content pending",
      "Placeholder requirement — content pending",
    ],
  },
];

// A single sample applicant's own application — used on the Applicant
// Overview / My Application screens. Stage labels are PROPOSED per
// docs/architecture/recruitment-workflow.md §B (no source document confirms
// these exact names or their sequencing).
export const SAMPLE_APPLICANT = {
  name: "Amaka Okoye",
  position: "People & Culture Officer",
  applicationId: "BLV-2026-0142",
  appliedOn: "Aug 12, 2026",
  outlet: "Sample Outlet 1",
  status: "Under Review" as const,
  // Documentation (BEELIV-APPLICANT-JOURNEY.md stage 4, "the thick step") is
  // only reached after Application Review/Shortlisting (2) AND Interview/
  // Assessment (3) both complete. Gates the Documentation wizard
  // (DocumentsScreen.tsx) and the related dashboard/My Application copy —
  // keep those three in sync with this flag rather than letting them assume
  // documentation is already reachable. Set true here (rather than false,
  // which would be more literally consistent with `status: "Under Review"`
  // above) so the wizard previews open by default — flip to false to see
  // the locked state instead.
  isShortlisted: true,
  documentsComplete: 0,
  documentsTotal: 5,
  progressPercent: 45,
};

export const SAMPLE_APPLICATION_ACTIVITY = [
  {
    title: "Application under review",
    description: "Your application is now being reviewed by the recruitment team.",
    date: "Today, 10:42 AM",
    tone: "primary" as const,
  },
  // No "Documents requested" entry here — Documentation is workflow stage 4,
  // reached only after Shortlisting (2) and Interview/Assessment (3), and
  // this applicant is still mid-stage-2 (see SAMPLE_APPLICANT.isShortlisted
  // above). An entry implying documents were already requested would
  // contradict that.
  {
    title: "Application received",
    description: "We received your application.",
    date: "Aug 12, 2026",
    tone: "success" as const,
  },
  {
    title: "Application submitted",
    description: "You submitted your application for People & Culture Officer.",
    date: "Aug 12, 2026",
    tone: "success" as const,
  },
];

// Per-document cards for the Applicant Documents screen. Sourced from the
// approved Documents design artifact (Beeliv Applicant Portal). "Submitted"
// / "Required" map to the CONFIRMED "upload required documents" / "view
// documentation completion status" capabilities (rbac.md §1); "Pending
// Review," "Approved," and "Requires Attention" are PROPOSED display states
// only — recruitment-workflow.md §7 does not confirm a review/verification
// step exists. Titles/descriptions are illustrative placeholder content, not
// a confirmed Beeliv document checklist (requirements.md §5 field list is
// still PROPOSED).
export interface SampleDocumentEntry {
  id: string;
  title: string;
  description: string;
  status: "submitted" | "required" | "pending-review" | "approved" | "attention";
  icon?: "file" | "person";
  provenanceNote?: string;
}

export const SAMPLE_APPLICANT_DOCUMENTS: SampleDocumentEntry[] = [
  {
    id: "personal-information",
    title: "Personal Information",
    description: "Name, contact, address",
    status: "submitted",
  },
  {
    id: "nin-document",
    title: "NIN Document",
    description: "Required identity document",
    status: "required",
  },
  {
    id: "passport-photograph",
    title: "Passport Photograph",
    description: "Recent, plain background",
    status: "pending-review",
    icon: "person",
    provenanceNote: "Review step: proposed",
  },
  {
    id: "proof-of-address",
    title: "Proof of Address",
    description: "Utility bill or equivalent",
    status: "approved",
    provenanceNote: "Approval authority: proposed",
  },
  {
    id: "onboarding-acknowledgement",
    title: "Onboarding Acknowledgement",
    description: "Upload didn't complete",
    status: "attention",
  },
];

// Illustrative pre-filled values for the Documentation intake wizard
// (app/applicant/documentation) — field set per docs/BEELIV-SOURCE-OF-
// TRUTH.md §7. Uses the same fictitious applicant identity as SAMPLE_
// APPLICANT ("Amaka Okoye") so the two screens read as the same person.
// Every value below is generic/fictitious placeholder content, not a real
// Beeliv applicant record — do not treat any value here as confirmed data,
// and note the sensitive-section values are obviously-fake structural
// placeholders (e.g. all-zero NIN), not a real identity/bank number.
export const SAMPLE_DOCUMENTATION_INTAKE = {
  personal: {
    fullName: "Amaka Okoye",
    email: "amaka.okoye@example.com",
    phone: "080X XXX XXXX",
    team: "Sample Team",
    sex: "Female",
    relationshipStatus: "Single",
    physicallyChallenged: "No",
    birthday: "1996-04-12",
    nationality: "Nigerian",
    stateOfOrigin: "Sample State",
    lga: "Sample LGA",
    homeAddress: "Sample Street, Sample City",
    educationalQualification: "B.Sc. (Sample Discipline)",
  },
  employment: {
    current: {
      organizationName: "Sample Organization Ltd.",
      organizationLocation: "Sample City",
      organizationContact: "www.sample-organization.example",
      jobPosition: "Sample Job Title",
      jobDescription: "Placeholder description of day-to-day responsibilities.",
      reportingManager: "Sample Manager Name",
    },
    previous: {
      organizationName: "Sample Prior Organization",
      organizationLocation: "Sample City",
      organizationContact: "www.sample-prior-org.example",
      jobPosition: "Sample Prior Job Title",
      jobDescription: "Placeholder description of prior responsibilities.",
      reportingManager: "Sample Prior Manager Name",
      startMonth: "2022-01",
      endMonth: "2023-06",
    },
  },
  nextOfKin: {
    name: "Sample Next of Kin",
    phone: "080X XXX XXXX",
    address: "Sample Street, Sample City",
    relationship: "Sibling",
  },
  // Deliberately obvious placeholder values (all-zero NIN, generic account
  // number) — never real-looking, per this file's own top-of-file warning.
  sensitive: {
    nin: "00000000000",
    bankAccountName: "Amaka Okoye",
    bankAccountNumber: "0000000000",
    bankName: "Sample Bank",
  },
};

export interface SampleStaffRecord {
  id: string;
  name: string;
  position: string;
  outlet: string;
  documentationStatus: "Complete" | "Incomplete";
  employmentStatus: "Active" | "Onboarding";
}

// Assigned Staff's own dashboard content — a fictitious record distinct from
// SAMPLE_STAFF (which represents an HR/Client/Ops-facing staff *list*), so
// the logged-in Staff sample identity (app/staff/layout.tsx) doesn't have to
// coincidentally match a specific row in that list.
export const SAMPLE_STAFF_PROFILE = {
  name: "Tobi Adewale",
  position: "Front Desk Associate",
  outlet: "Sample Outlet 1",
  department: "Front of House",
  employmentStatus: "Active" as const,
};

export interface SampleShift {
  id: string;
  label: string;
  date: string;
  time: string;
}

export const SAMPLE_UPCOMING_SHIFTS: SampleShift[] = [
  { id: "shift-1", label: "Morning Shift", date: "Tomorrow", time: "7:00 AM – 3:00 PM" },
  { id: "shift-2", label: "Morning Shift", date: "Aug 16, 2026", time: "7:00 AM – 3:00 PM" },
  { id: "shift-3", label: "Evening Shift", date: "Aug 18, 2026", time: "3:00 PM – 11:00 PM" },
];

export interface SampleNotice {
  id: string;
  title: string;
  date: string;
}

export const SAMPLE_STAFF_NOTICES: SampleNotice[] = [
  { id: "notice-1", title: "Uniform policy update", date: "Aug 12, 2026" },
];

export interface SampleWarning {
  id: string;
  staffName: string;
  reason: string;
  date: string;
}

// Warnings/disciplinary records — CONFIRMED capability (Proposal §2D), no
// severity taxonomy exists in any source document, so none is invented here.
export const SAMPLE_WARNINGS: SampleWarning[] = [
  { id: "warning-1", staffName: "Sample Staff Member B", reason: "Late arrival", date: "Aug 10, 2026" },
  // warning-2 through warning-4 — added alongside the extra SAMPLE_STAFF
  // records so a "by reason" breakdown has more than one data point; same
  // shape/fields as the original entry, no new reason taxonomy invented
  // (reasons are still free-text, matching the "no severity taxonomy exists
  // in any source document" note above).
  { id: "warning-2", staffName: "Sample Staff Member D", reason: "Uniform violation", date: "Aug 14, 2026" },
  { id: "warning-3", staffName: "Sample Staff Member A", reason: "Late arrival", date: "Aug 18, 2026" },
  { id: "warning-4", staffName: "Sample Staff Member H", reason: "Missed shift", date: "Aug 22, 2026" },
];

export const SAMPLE_ATTENDANCE_TODAY = {
  present: 2,
  total: 3,
};

export interface SamplePipelineStage {
  stage: string;
  count: number;
}

// Stage labels match the confirmed 8-stage recruitment workflow
// (docs/architecture/recruitment-workflow.md, 2026-09-02 revision).
export const SAMPLE_RECRUITMENT_PIPELINE: SamplePipelineStage[] = [
  { stage: "Applied", count: 14 },
  { stage: "Review/Shortlisting", count: 6 },
  { stage: "Interview/Assessment", count: 3 },
  { stage: "Documentation", count: 2 },
];

export const SAMPLE_PAYROLL_SCHEDULE = {
  nextPayrollDate: "Aug 31, 2026",
  cadence: "Monthly",
};

export const SAMPLE_CLIENT_ORGANIZATIONS_COUNT = 4;
export const SAMPLE_OUTLETS_COUNT = 6;

export const SAMPLE_STAFF: SampleStaffRecord[] = [
  {
    id: "staff-1",
    name: "Sample Staff Member A",
    position: "Front Desk Associate",
    outlet: "Sample Outlet 1",
    documentationStatus: "Complete",
    employmentStatus: "Active",
  },
  {
    id: "staff-2",
    name: "Sample Staff Member B",
    position: "Housekeeping Supervisor",
    outlet: "Sample Outlet 1",
    documentationStatus: "Incomplete",
    employmentStatus: "Onboarding",
  },
  {
    id: "staff-3",
    name: "Sample Staff Member C",
    position: "Restaurant Server",
    outlet: "Sample Outlet 2",
    documentationStatus: "Complete",
    employmentStatus: "Active",
  },
  // staff-4 through staff-8 — added so per-outlet status breakdowns (e.g.
  // HR's dashboard) have more than 1-2 records to chart; same shape/fields
  // as the original three, no new statuses or business rules introduced.
  {
    id: "staff-4",
    name: "Sample Staff Member D",
    position: "Front Desk Associate",
    outlet: "Sample Outlet 1",
    documentationStatus: "Complete",
    employmentStatus: "Active",
  },
  {
    id: "staff-5",
    name: "Sample Staff Member E",
    position: "Maintenance Technician",
    outlet: "Sample Outlet 1",
    documentationStatus: "Complete",
    employmentStatus: "Active",
  },
  {
    id: "staff-6",
    name: "Sample Staff Member F",
    position: "Restaurant Server",
    outlet: "Sample Outlet 2",
    documentationStatus: "Incomplete",
    employmentStatus: "Onboarding",
  },
  {
    id: "staff-7",
    name: "Sample Staff Member G",
    position: "Housekeeping Attendant",
    outlet: "Sample Outlet 2",
    documentationStatus: "Complete",
    employmentStatus: "Active",
  },
  {
    id: "staff-8",
    name: "Sample Staff Member H",
    position: "Front Desk Associate",
    outlet: "Sample Outlet 1",
    documentationStatus: "Incomplete",
    employmentStatus: "Onboarding",
  },
];
