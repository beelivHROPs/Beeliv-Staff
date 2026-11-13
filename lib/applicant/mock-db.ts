/**
 * Applicant dashboard: mock seed data for the two prototype states.
 *
 * Per project-lead direction (2026-09-28): "The Applicant interface should
 * never depend on fake applications, fake interviews, fake document statuses
 * or TBD... If there is nothing there, the real state is: No applications
 * yet." The wireframe's own mechanism for this is a real prototype-state
 * toggle (`st.mode`, "active" | "new") — NEW_SEED below is the genuine empty
 * state that toggle shows; ACTIVE_SEED is the wireframe's example content,
 * shown only when that toggle is explicitly set to "active" (its own
 * default, matched here). Neither is real Supabase data — see service.ts's
 * header comment.
 *
 * Content in ACTIVE_SEED is adapted from the delivered wireframe
 * (C:\Users\USER\Documents\beeliv-website\applicant\index.html — its APPS,
 * DOCS, REQ, NOTIFS, IV_UP, IV_DONE arrays), not invented beyond what it
 * already shows. Job cross-references use lib/public-site/jobs.ts ids where
 * role+company match exactly (see individual comments below) rather than a
 * second, duplicate job dataset.
 *
 * All dates/timestamps are computed as offsets from `new Date()` each day
 * (isoOffset(), via getSeeds()) rather than hardcoded calendar strings, per
 * project-lead direction (2026-09-28) — so nothing here goes stale relative
 * to whenever this is actually viewed. Components format these ISO strings
 * at render time (lib/applicant/time.ts, RelativeTime.tsx) rather than
 * reading a pre-baked display string.
 */
import { isoOffset } from "./time";
import type {
  ApplicantDocument,
  Application,
  ApplicantProfile,
  AppNotification,
  Interview,
} from "./types";

export type MockSeed = {
  profile: ApplicantProfile;
  applications: Application[];
  documents: ApplicantDocument[];
  interviews: Interview[];
  notifications: AppNotification[];
};

/**
 * Builds both seeds with dates relative to *today*. Called per calendar day
 * (see getSeeds) instead of once at module load, so a dev/server process that
 * stays up past midnight doesn't render yesterday's "in 4 days" (Friday) while
 * the browser renders today's (Saturday) — that mismatch broke hydration.
 */
function buildSeeds(): { ACTIVE_SEED: MockSeed; NEW_SEED: MockSeed; PLACED_SEED: MockSeed } {
  const APPLICANT_ID = "applicant-sarah-okafor";

  /* ------------------------------------------------------------------ */
  /* ACTIVE — the wireframe's example content                            */
  /* ------------------------------------------------------------------ */

  const activeProfile: ApplicantProfile = {
    id: APPLICANT_ID,
    fullName: "Sarah Chioma Okafor",
    preferredName: "Sarah",
    email: "sarah.okafor@example.com",
    phone: "+234 803 555 0142",
    whatsapp: "+234 803 555 0142",
    dateOfBirth: "14 March 1996",
    gender: "Female",
    nationality: "Nigerian",
    address: "12 Aminu Kano Crescent, Wuse II",
    // State/LGA of ORIGIN (not residence). SAMPLE DATA invented for the
    // prototype persona (2026-09-29) — not supplied by Beeliv.
    state: "Anambra",
    lga: "Onitsha North",
    applicantId: "BLV-APP-00482",
    title: "Assistant Floor Manager",
    location: "Abuja, FCT",
    emergencyContact: { name: "Chinedu Okafor", relationship: "Brother", phone: "+234 806 555 0199" },
    professionalSummary: "",
    certifications: [],
    // reasonForLeaving values are SAMPLE DATA invented for the prototype (2026-09-29).
    employmentHistory: [
      { role: "Assistant Floor Manager", company: "The Nest Lounge \u00b7 Abuja", period: "Jan 2023 \u2013 Present \u00b7 3 yrs 9 mos" },
      { role: "Senior Waitress", company: "Grand Palm Hotel \u00b7 Abuja", period: "Mar 2019 \u2013 Dec 2022 \u00b7 3 yrs 10 mos", reasonForLeaving: "Promoted into a floor management role elsewhere" },
      { role: "Waitress", company: "Caf\u00e9 Lemon \u00b7 Enugu", period: "Jun 2017 \u2013 Feb 2019 \u00b7 1 yr 9 mos", reasonForLeaving: "Relocated to Abuja" },
    ],
    // Skill names/categories follow the requirements doc (Module 1 \u00a72), migrated 2026-09-29.
    skills: {
      Kitchen: ["Food safety", "Continental", "Grill"],
      Floor: ["Fine dining"],
      Bar: [],
      Management: ["Scheduling", "Inventory"],
    },
    preferredLocations: ["Abuja", "Lagos"],
    availability: "Available in 2 weeks",
    willingShifts: true,
    willingWeekendsHolidays: true,
    expectedSalary: "\u20a6200,000 \u2013 \u20a6350,000 / month",
    staffEntitlement: { granted: false, grantedAt: null, outletName: null },
  };

  function form(overrides: Partial<Application["form"]>): Application["form"] {
    return {
      fullName: activeProfile.fullName,
      preferredName: activeProfile.preferredName,
      phone: activeProfile.phone,
      whatsapp: activeProfile.whatsapp,
      email: activeProfile.email,
      yearsExperience: "5\u20137 years",
      expectedSalary: activeProfile.expectedSalary,
      availability: activeProfile.availability,
      earliestStart: "2026-11-01",
      preferredLocation: "Abuja",
      willingShifts: "Yes",
      willingWeekends: "Yes",
      willingHolidays: "Yes",
      sectors: ["Restaurant", "Hotel"],
      skills: activeProfile.skills,
      roleCertificateFileName: null,
      // Per-role answers (lib/applicant/screening.ts), keyed by question id.
      screeningAnswers: {},
      ...overrides,
    };
  }

  const activeApplications: Application[] = [
    {
      id: "fm",
      applicantId: APPLICANT_ID,
      vacancyId: null, // Kalina · Floor Manager has no matching live listing in lib/public-site/jobs.ts
      role: "Floor Manager",
      company: "Kalina",
      location: "Abuja, FCT",
      employmentType: "Full-time",
      lifecycle: "submitted",
      // Documentation stage (index 3): Interview/Assessment (index 2) already complete.
      stage: 3,
      stageDates: [isoOffset(-16), isoOffset(-12), isoOffset(-4), isoOffset(0), null, null, null, null],
      submittedAt: isoOffset(-16),
      updatedAt: isoOffset(0, 9, 12),
      form: form({ expectedSalary: "\u20a6200,000 \u2013 \u20a6350,000 / month", earliestStart: "2026-11-01", screeningAnswers: { "mgmt-years": "3", "mgmt-team": "6 \u2013 15", "mgmt-areas": ["Staff supervision", "Scheduling", "Guest complaint resolution"], "mgmt-late": "Yes" } }),
      next: {
        label: "Complete your documentation",
        detail: `Due ${new Date(isoOffset(5)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).replace("Sept", "Sep")}. Your onboarding details, next of kin and terms, plus the guarantor form. Beeliv needs these to move you to verification.`,
        ctaLabel: "Continue documentation",
        href: "/applicant/applications/fm/documentation",
        tone: "warn",
      },
      activity: [
        { title: "Documents requested", detail: "Guarantor form and two reference contacts", when: isoOffset(0, 9, 12) },
        { title: "Assessment completed", detail: "Floor service trial at Kalina", when: isoOffset(-4) },
        { title: "Interview completed", detail: "Beeliv interview", when: isoOffset(-6) },
        { title: "Shortlisted", detail: "You were shortlisted for interview", when: isoOffset(-12) },
        { title: "Application submitted", when: isoOffset(-16) },
      ],
    },
    {
      id: "ww",
      applicantId: APPLICANT_ID,
      vacancyId: "waiter-waitress", // lib/applicant/jobs.ts: Waiter / Waitress · Brunch Lane (wireframe APPS[1])
      role: "Waiter / Waitress",
      company: "Brunch Lane",
      location: "Lagos",
      employmentType: "Full-time",
      lifecycle: "submitted",
      // Interview/Assessment stage (index 2): shortlisted, interview upcoming.
      stage: 2,
      stageDates: [isoOffset(-23), isoOffset(-2), isoOffset(4), null, null, null, null, null],
      submittedAt: isoOffset(-23),
      updatedAt: isoOffset(-1, 10),
      form: form({ expectedSalary: "\u20a6100,000 \u2013 \u20a6200,000 / month", earliestStart: "2026-10-06", preferredLocation: "Lagos", screeningAnswers: { "foh-years": "4", "foh-service": "Restaurant", "foh-pos": "Yes" } }),
      next: {
        label: "Attend your interview",
        detail: `${new Date(isoOffset(4)).toLocaleDateString("en-US", { weekday: "long" })} \u00b7 10:00 AM WAT \u00b7 Google Meet`,
        ctaLabel: "View interview",
        href: "/applicant/interviews",
        tone: "ok",
      },
      activity: [
        { title: "Interview scheduled", detail: "Beeliv interview with Brunch Lane", when: isoOffset(-1, 10) },
        { title: "Shortlisted", when: isoOffset(-2) },
        { title: "Application submitted", when: isoOffset(-23) },
      ],
    },
    {
      id: "fd",
      applicantId: APPLICANT_ID,
      vacancyId: null, // Maison 23 · Front Desk Officer has no matching live listing
      role: "Front Desk Officer",
      company: "Maison 23",
      location: "Lagos",
      employmentType: "Contract",
      lifecycle: "submitted",
      stage: 1,
      stageDates: [isoOffset(-31), isoOffset(-2), null, null, null, null, null, null],
      submittedAt: isoOffset(-31),
      updatedAt: isoOffset(-2, 9),
      form: form({ availability: "2 weeks' notice", preferredLocation: "Lagos", screeningAnswers: { "foh-years": "2", "foh-service": "Hotel", "foh-pos": "Yes" } }),
      next: null,
      activity: [
        { title: "Under review", detail: "The Beeliv team is reviewing your application", when: isoOffset(-2, 9) },
        { title: "Application submitted", when: isoOffset(-31) },
      ],
    },
    {
      id: "sc",
      applicantId: APPLICANT_ID,
      vacancyId: "sous-chef", // lib/applicant/jobs.ts: Sous Chef · The Urban Grill (wireframe APPS[3])
      role: "Sous Chef",
      company: "The Urban Grill",
      location: "Abuja",
      employmentType: "Full-time",
      lifecycle: "draft",
      stage: -1,
      stageDates: [],
      submittedAt: null,
      updatedAt: isoOffset(-2, 16),
      draftPercent: 45,
      form: form({ skills: { Kitchen: [], Floor: [], Bar: [], Management: [] }, screeningAnswers: {} }),
      next: {
        label: "Add your employment history",
        detail: "Step 2 of 6 \u00b7 about 6 minutes left",
        ctaLabel: "Continue application",
        href: "/applicant/apply?job=sous-chef",
      },
      activity: [{ title: "Draft started", when: isoOffset(-2, 16) }],
    },
    {
      id: "bt",
      applicantId: APPLICANT_ID,
      vacancyId: null, // was The Velvet Room · Bartender; that req is now closed/filled
      role: "Bartender",
      company: "The Velvet Room",
      location: "Lagos",
      employmentType: "Contract",
      lifecycle: "in_talent_pool",
      stage: 1,
      stageDates: [isoOffset(-57), isoOffset(-39), null, null, null, null, null, null],
      submittedAt: isoOffset(-57),
      updatedAt: isoOffset(-39),
      form: form({ preferredLocation: "Lagos" }),
      next: null,
      activity: [
        { title: "Added to talent pool", detail: "We'll suggest you for similar bar roles", when: isoOffset(-39) },
        { title: "Not selected", detail: "The role was filled", when: isoOffset(-39) },
        { title: "Application submitted", when: isoOffset(-57) },
      ],
    },
  ];

  const activeDocuments: ApplicantDocument[] = [
    {
      id: "doc-cv",
      ownerId: APPLICANT_ID,
      category: "application",
      docType: "cv",
      name: "CV",
      fileName: "Sarah_Okafor_CV_2026.pdf",
      size: "214 KB",
      uploadedOn: isoOffset(-16),
      status: "verified",
      usedInApplicationIds: ["fm", "ww", "fd", "bt"],
    },
    {
      id: "doc-photo",
      ownerId: APPLICANT_ID,
      category: "application",
      docType: "passport-photo",
      name: "Passport photograph",
      fileName: "passport_photo.jpg",
      size: "88 KB",
      uploadedOn: isoOffset(-16),
      status: "verified",
      usedInApplicationIds: ["fm", "ww", "fd", "bt"],
    },
    {
      id: "doc-nin",
      ownerId: APPLICANT_ID,
      // Front-loaded per direct project-lead instruction (2026-09-28): ID
      // document uploads are captured at Application stage, not deferred —
      // see ApplyBody.tsx's header comment. A raw NIN NUMBER is never
      // collected anywhere; this is a document (file) status only.
      category: "application",
      // Module 1 §3 "Valid ID"; the NIN slip is the accepted example (id kept stable).
      docType: "valid-id",
      name: "Valid ID",
      fileName: "NIN_slip.pdf",
      size: "120 KB",
      uploadedOn: isoOffset(-16),
      status: "verified",
      usedInApplicationIds: ["fm", "ww", "fd", "bt"],
      description: "NIN slip",
    },
    {
      id: "doc-cert",
      ownerId: APPLICANT_ID,
      category: "application",
      docType: "educational-certificate",
      name: "Educational certificate",
      fileName: "OND_Hospitality_Management.pdf",
      size: "340 KB",
      uploadedOn: isoOffset(-16),
      status: "action-required",
      usedInApplicationIds: ["fm"],
      // SAMPLE DATA: HR's reason, shown to the applicant verbatim.
      resubmission: {
        reason: "The bottom of the page is cut off in your scan, so we can't read the grade. Please upload the full page.",
        requestedAt: isoOffset(-2, 11),
      },
    },
    {
      id: "doc-guarantor",
      ownerId: APPLICANT_ID,
      // Pre-employment (approved as a real, intended field per project-lead
      // direction 2026-09-28) — requested later, gradually, only as this one
      // application progresses; not part of the initial Draft Application.
      category: "pre-employment",
      docType: "guarantor-form",
      name: "Guarantor form",
      fileName: "guarantor_form.jpg",
      size: "1.2 MB",
      uploadedOn: isoOffset(-3),
      status: "action-required",
      usedInApplicationIds: [],
      forApplicationId: "fm",
      due: isoOffset(5),
      description: "Download the template, have your guarantor sign it, then upload a PDF or clear photo.",
      hasTemplate: true,
      // SAMPLE DATA: HR's reason, shown to the applicant verbatim.
      resubmission: {
        reason: "Your guarantor's signature is missing. Please ask them to sign the form, then upload a clear photo or scan.",
        requestedAt: isoOffset(-1, 14),
      },
    },
    {
      id: "doc-references",
      ownerId: APPLICANT_ID,
      category: "pre-employment",
      docType: "reference-contacts",
      name: "Two reference contacts",
      fileName: null,
      size: null,
      uploadedOn: null,
      status: "action-required",
      usedInApplicationIds: [],
      forApplicationId: "fm",
      due: isoOffset(5),
      description: "Former supervisors or managers from hospitality roles. We only contact them at this stage.",
      isReferenceForm: true,
    },
  ];

  const activeInterviews: Interview[] = [
    {
      id: "iv-ww-1",
      applicationId: "ww",
      title: "Beeliv interview",
      kind: "Interview",
      status: "scheduled",
      applicationLabel: "Waiter / Waitress \u00b7 Brunch Lane",
      scheduledAt: isoOffset(4, 10, 0),
      durationMinutes: 45, // wireframe IV_UP[0]: "10:00 – 10:45 AM (WAT)"
      mode: "Video call \u00b7 Google Meet",
      meetingLink: "https://meet.example.com/sample-room", // SAMPLE link, fictional
      withWhom: "With Adaeze N., Beeliv Recruitment",
      prep: [
        "Test your camera and microphone 10 minutes before",
        "Have your valid ID (e.g. NIN slip) nearby",
        "Re-read the role description and your application",
      ],
    },
    {
      id: "iv-fm-1",
      applicationId: "fm",
      title: "Floor service trial",
      kind: "Practical assessment",
      status: "completed",
      applicationLabel: "Floor Manager \u00b7 Kalina",
      completedAt: isoOffset(-4),
    },
    {
      // SAMPLE DATA (2026-09-29): illustrates Module 1 §5 Stage 3, Client/Business Interview.
      id: "iv-fm-client",
      applicationId: "fm",
      title: "Meeting with Kalina management",
      kind: "Client interview",
      status: "completed",
      applicationLabel: "Floor Manager · Kalina",
      completedAt: isoOffset(-5),
    },
    {
      id: "iv-fm-2",
      applicationId: "fm",
      title: "Beeliv interview",
      kind: "Interview",
      status: "completed",
      applicationLabel: "Floor Manager \u00b7 Kalina",
      completedAt: isoOffset(-6),
    },
    {
      id: "iv-fm-3",
      applicationId: "fm",
      title: "HR screening call",
      kind: "Screening",
      status: "completed",
      applicationLabel: "Floor Manager \u00b7 Kalina",
      completedAt: isoOffset(-12),
    },
  ];

  const activeNotifications: AppNotification[] = [
    {
      id: "n1",
      kind: "document-request",
      tone: "warn",
      icon: "sign",
      title: "Document requested",
      detail: `Add your two reference contacts for Floor Manager at Kalina by ${new Date(isoOffset(5)).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.`,
      createdAt: isoOffset(0, 9, 12),
      unread: true,
      link: { label: "Upload document", href: "/applicant/documents" },
    },
    {
      id: "n1b",
      kind: "document-request",
      tone: "warn",
      icon: "sign",
      title: "Your guarantor form needs to be uploaded again",
      detail: "Your guarantor's signature is missing. Please upload a new file.",
      createdAt: isoOffset(-1, 14),
      unread: true,
      link: { label: "Upload a new file", href: "/applicant/documents#doc-doc-guarantor" },
    },
    {
      id: "n2",
      kind: "documents-verified",
      tone: "ok",
      icon: "shieldok",
      title: "Document verified",
      detail: "Your valid ID (NIN slip) has been verified.",
      createdAt: isoOffset(0, 8, 40),
      unread: true,
    },
    {
      id: "n3",
      kind: "interview-invitation",
      tone: "violet",
      icon: "cal",
      title: "Interview scheduled",
      detail: "Brunch Lane invited you to a Beeliv interview.",
      createdAt: isoOffset(-1, 10),
      unread: true,
      link: { label: "View interview", href: "/applicant/interviews" },
    },
    {
      id: "n4",
      tone: "info",
      icon: "file",
      title: "Application update",
      detail: "Your Front Desk Officer application is under review.",
      createdAt: isoOffset(-2, 9),
      unread: false,
      link: { label: "View progress", href: "/applicant/applications/fd" },
    },
    {
      id: "n5",
      tone: "ok",
      icon: "calcheck",
      title: "Assessment completed",
      detail: "Thanks for completing the floor service trial at Kalina.",
      createdAt: isoOffset(-4, 15),
      unread: false,
    },
    // SAMPLE DATA (2026-09-29): two Module 1 §8 kinds, consistent with the
    // Brunch Lane application's existing activity (shortlisted 2 days ago,
    // interview in 4 days). Not supplied by Beeliv.
    {
      id: "n6",
      kind: "interview-reminder",
      tone: "violet",
      icon: "cal",
      title: "Interview reminder",
      detail: `Your Beeliv interview for Waiter / Waitress at Brunch Lane is on ${new Date(isoOffset(4)).toLocaleDateString("en-US", { weekday: "long" })} at 10:00 AM. Test your camera and microphone beforehand.`,
      createdAt: isoOffset(0, 7, 30),
      unread: true,
      link: { label: "View interview", href: "/applicant/interviews" },
    },
    {
      id: "n7",
      kind: "shortlisted",
      tone: "ok",
      icon: "spark",
      title: "You've been shortlisted",
      detail: "Good news: you were shortlisted for Waiter / Waitress at Brunch Lane.",
      createdAt: isoOffset(-2, 11),
      unread: false,
      link: { label: "View progress", href: "/applicant/applications/ww" },
    },
  ];

  const ACTIVE_SEED: MockSeed = {
    profile: activeProfile,
    applications: activeApplications,
    documents: activeDocuments,
    interviews: activeInterviews,
    notifications: activeNotifications,
  };

  /* ------------------------------------------------------------------ */
  /* NEW — genuine empty state (mirrors the wireframe's "new applicant"  */
  /* mode: NOTIFS_NEW, apps() returning [] etc.)                         */
  /* ------------------------------------------------------------------ */

  const newProfile: ApplicantProfile = {
    id: APPLICANT_ID,
    fullName: "New Applicant",
    preferredName: "",
    email: "",
    phone: "",
    whatsapp: "",
    dateOfBirth: "",
    gender: "",
    nationality: "",
    address: "",
    state: "",
    lga: "",
    applicantId: "BLV-APP-00000",
    title: "",
    location: "",
    emergencyContact: { name: "", relationship: "", phone: "" },
    professionalSummary: "",
    certifications: [],
    employmentHistory: [],
    skills: {},
    preferredLocations: [],
    availability: "",
    willingShifts: false,
    willingWeekendsHolidays: false,
    expectedSalary: "",
    staffEntitlement: { granted: false, grantedAt: null, outletName: null },
  };

  const NEW_SEED: MockSeed = {
    profile: newProfile,
    applications: [],
    documents: [],
    interviews: [],
    notifications: [
      {
        id: "welcome",
        tone: "violet",
        icon: "spark",
        title: "Welcome to Beeliv",
        detail: "Your account is ready. Complete your profile, then apply in a few minutes.",
        createdAt: isoOffset(0),
        unread: true,
        link: { label: "Complete profile", href: "/applicant/profile" },
      },
    ],
  };

  /* ------------------------------------------------------------------ */
  /* SELECTED — prototype-only state (project lead, 2026-09-29): the same  */
  /* persona after Kalina's Floor Manager application reaches Selection/   */
  /* Approval with an employment OFFER, to demo the locked transition:    */
  /* review offer → accept → onboarding → placement confirmed → staff      */
  /* access activated → Staff Hub. SAMPLE DATA.                            */
  /* ------------------------------------------------------------------ */
  const placed: MockSeed = JSON.parse(JSON.stringify(ACTIVE_SEED));
  const fmApp = placed.applications.find((a) => a.id === "fm");
  if (fmApp) {
    fmApp.stage = 5;
    fmApp.stageDates = [isoOffset(-30), isoOffset(-26), isoOffset(-18), isoOffset(-12), isoOffset(-6), isoOffset(0, 9), null, null];
    fmApp.updatedAt = isoOffset(0, 9);
    fmApp.offer = {
      sentAt: isoOffset(0, 9),
      respondBy: isoOffset(4, 17),
      role: "Floor Manager",
      outlet: "Kalina",
      location: "Abuja, FCT",
      employmentType: "Full-time",
      resumptionDate: isoOffset(14, 8),
      reportingTo: "Outlet Manager, Kalina",
      letterFileName: "Beeliv_Offer_Kalina_FloorManager.pdf",
      status: "pending",
      respondedAt: null,
    };
    fmApp.next = {
      label: "Review your offer",
      detail: "Kalina has offered you the Floor Manager role. Review the offer and respond.",
      ctaLabel: "Review offer",
      href: "/applicant/applications/fm/offer",
      tone: "ok",
    };
    fmApp.activity = [
      { title: "Offer sent", detail: "Floor Manager · Kalina", when: isoOffset(0, 9) },
      { title: "Employment approved", detail: "Management approval", when: isoOffset(-1) },
      { title: "Documents verified", when: isoOffset(-6) },
      ...fmApp.activity,
    ];
  }
  // Documentation is done in this state: fm's pre-employment documents are verified.
  placed.documents = placed.documents.map((d) =>
    d.category === "pre-employment" && d.forApplicationId === "fm" ? { ...d, status: "verified", fileName: d.fileName ?? "submitted.pdf", uploadedOn: d.uploadedOn ?? isoOffset(-8) } : d,
  );
  placed.notifications = [
    {
      id: "offer-kalina",
      kind: "offer",
      tone: "ok",
      icon: "spark",
      title: "You've been selected — review your offer",
      detail: "Kalina has offered you the Floor Manager role.",
      createdAt: isoOffset(0, 9),
      unread: true,
      link: { label: "Review offer", href: "/applicant/applications/fm/offer" },
    },
    ...placed.notifications.map((n) => ({ ...n, unread: false })),
  ];
  const PLACED_SEED = placed;

  return { ACTIVE_SEED, NEW_SEED, PLACED_SEED };
}

let cache: { day: string; seeds: { ACTIVE_SEED: MockSeed; NEW_SEED: MockSeed; PLACED_SEED: MockSeed } } | null = null;

/** Today's seeds (rebuilt when the local date changes). */
export function getSeeds(): { ACTIVE_SEED: MockSeed; NEW_SEED: MockSeed; PLACED_SEED: MockSeed } {
  const day = new Date().toDateString();
  if (!cache || cache.day !== day) cache = { day, seeds: buildSeeds() };
  return cache.seeds;
}
