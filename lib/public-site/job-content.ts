/**
 * Job detail page copy (public, /jobs/[id]).
 *
 * Source of truth: canvas-source Job-Desktop.dc.html / Job-Mobile.dc.html
 * ("JOB DETAIL · PUBLIC"), extended 2026-09-29 to the requirements doc's
 * §2.15 job-listing structure (docs/requirements/beeliv-recruitment-and-job-
 * listings-2026-09-29.md): job facts, key responsibilities, essential vs
 * preferred requirements, experience, skills, working conditions, benefits,
 * required documents, screening questions and the recruitment process.
 *
 * Per-job content (about, responsibilities, requirements, salary, documents
 * ...) now comes from lib/public-site/job-details.ts - SAMPLE content, to be
 * replaced by Beeliv's real vacancy data. Only the shared section labels and
 * fixed copy live here.
 *
 * Correction (2026-09-29): a valid ID is required AT APPLICATION (§2.12, and
 * the applicant Apply flow already asks for it). The earlier "Required later"
 * copy said "Only if you're shortlisted: valid ID, ..." - that was wrong and
 * has been replaced.
 */

export const JOB_DETAIL = {
  clientFallback: "Confidential client",
  breadcrumbRoot: "Find Jobs",

  factsTitle: "Job facts",
  aboutTitle: "About the role",
  doTitle: "Key responsibilities",
  needTitle: "Requirements",
  essentialTitle: "Essential",
  preferredTitle: "Preferred",
  preferredNote: "Nice to have. You can still apply without these.",
  experienceTitle: "Experience",
  skillsTitle: "Skills required",
  conditionsTitle: "Working conditions",
  benefitsTitle: "Benefits",
  screeningTitle: "Screening questions",
  screeningIntro: "You'll answer a few short questions about this role when you apply:",
  processTitle: "Recruitment process",
  interviewLabel: "Interview:",
  showAll: "Show all",

  applyEyebrow: "Applying",
  requiredNowTitle: "Required to apply",
  requiredNowExtra: "A few screening questions",
  requiredLaterTitle: "Required after selection",
  requiredLaterNote: "Only asked for once you are selected, so you're not surprised later.",

  applyCta: "Apply Now →",
  closedCta: "Applications closed",
  applyNote: "Takes a few minutes. You'll create a free Beeliv account, or log in if you have one.",
  shareLabel: "Share",

  bannerEyebrow: "Recruiting through Beeliv",
  bannerBody:
    "Beeliv screens every applicant before introducing them to the business, and keeps you updated at each stage.",

  relatedTitle: "More roles like this",
  relatedCta: "View all jobs →",
  cardCta: "View Role →",
} as const;
