/**
 * DEV FIXTURE: builds the "everything the applicant answered" view from the
 * same sample data the Applicants mock uses. Mirrors the Applicant app's
 * application steps (personal, experience and availability, skills, documents,
 * screening, confirmation) plus the sections HR asked for that the Applicant
 * app does not collect yet (education). FICTIONAL. Declaration wording
 * versions are SAMPLE: the real version numbers need Beeliv confirmation.
 * Replace with the adapter's real submission record.
 */
import { SCREENING_SETS, screeningQuestionsFor, formatScreeningAnswer, type ScreeningQuestion } from "@/lib/applicant/screening";
import type { ApplicantDetail, ApplicationSubmission, SubmissionField, SubmissionSection } from "./types";

const at = (base: string, hours: number) => new Date(new Date(base).getTime() + hours * 3_600_000).toISOString();

/** Deterministic sample answer so the same applicant always shows the same answers. */
function sampleAnswer(q: ScreeningQuestion, seed: number): string | string[] | undefined {
  // Leave one optional question blank for some people so "Not answered" is visible.
  if (!q.required && seed % 4 === 0) return undefined;
  switch (q.type) {
    case "yesno":
      return seed % 5 === 0 ? "No" : "Yes";
    case "number":
      return String(1 + (seed % 6));
    case "single":
      return q.options?.[seed % (q.options?.length ?? 1)];
    case "multi":
      return (q.options ?? []).filter((_, i) => (i + seed) % 2 === 0).slice(0, 3);
    case "text":
      return q.id.includes("pos") ? "Micros, Lightspeed" : "I stayed calm, listened first and offered a replacement at once. (Sample answer.)";
  }
}

export function buildSubmission(d: Omit<ApplicantDetail, "submission" | "screening">, seed: number): { submission: ApplicationSubmission; screening: { id: string; question: string; answer: string }[] } {
  const submittedAt = d.appliedAt;
  const questions = screeningQuestionsFor({ role: d.vacancy }) ?? SCREENING_SETS.frontOfHouse;
  const screeningFields: SubmissionField[] = questions.map((q) => {
    const raw = sampleAnswer(q, seed + q.id.length);
    const value = raw === undefined || (Array.isArray(raw) && raw.length === 0) ? null : formatScreeningAnswer(q, raw);
    return { id: `${d.id}-${q.id}`, label: q.title, value, items: Array.isArray(raw) && raw.length ? raw : undefined, note: q.required ? "Required question" : "Optional question" };
  });

  const nin = d.sensitive.find((s) => /nin/i.test(s.label));
  const first = d.name.split(" ")[0];

  const sections: SubmissionSection[] = [
    {
      id: "personal",
      kind: "personal",
      title: "Personal details",
      lastEditedAt: at(submittedAt, -1),
      fields: [
        { id: "name", label: "Full name", value: d.name },
        { id: "pref", label: "Preferred name", value: first },
        { id: "phone", label: "Phone", value: d.phone },
        { id: "wa", label: "WhatsApp", value: d.phone },
        { id: "email", label: "Email", value: d.email },
        { id: "loc", label: "Location", value: d.location },
        nin
          ? { id: "nin", label: nin.label, value: nin.masked, masked: true, note: "Only the last digits are shown. Not collected at application stage in the Applicant app." }
          : { id: "nin", label: "NIN", value: null, restricted: true },
      ],
    },
    {
      id: "experience",
      kind: "experience",
      title: "Work experience",
      lastEditedAt: at(submittedAt, -2),
      fields: [
        { id: "years", label: "Years of experience", value: "4 years" },
        { id: "summary", label: "Professional summary", value: d.professionalSummary },
        ...d.experience.map((e, i) => ({ id: `exp-${i}`, label: e.role, value: `${e.employer}, ${e.period}` })),
      ],
    },
    {
      id: "education",
      kind: "education",
      title: "Education",
      lastEditedAt: null,
      fields: [{ id: "edu", label: "Education and training", value: null, note: "The Applicant app does not collect education at application stage. Whether it should is for Beeliv to confirm." }],
    },
    {
      id: "skills",
      kind: "skills",
      title: "Skills",
      lastEditedAt: at(submittedAt, -2),
      fields: [{ id: "skills", label: "Hospitality skills", value: `${d.skills.length} selected`, items: d.skills }],
    },
    {
      id: "availability",
      kind: "availability",
      title: "Availability, location and pay",
      lastEditedAt: at(submittedAt, seed % 3 === 0 ? 20 : -1),
      fields: [
        { id: "avail", label: "Availability", value: d.availability },
        { id: "start", label: "Earliest start", value: d.availability === "Immediate" ? "As soon as selected" : d.availability },
        { id: "pref-loc", label: "Preferred locations", value: d.preferredLocations.join(", "), items: d.preferredLocations },
        d.expectedSalary.allowed ? { id: "salary", label: "Expected salary", value: d.expectedSalary.value } : { id: "salary", label: "Expected salary", value: null, restricted: true },
        { id: "type", label: "Employment type", value: d.employmentType },
        { id: "shifts", label: "Willing to work shifts", value: "Yes" },
        { id: "weekends", label: "Willing to work weekends", value: "Yes" },
        { id: "holidays", label: "Willing to work public holidays", value: seed % 5 === 0 ? "No" : "Yes" },
      ],
    },
    {
      id: "documents",
      kind: "documents",
      title: "Documents",
      lastEditedAt: at(submittedAt, -1),
      fields: [
        { id: "cv", label: "CV uploaded", value: d.documents.some((x) => x.group === "cv" && x.uploadedAt) ? "Yes" : "No" },
        { id: "reused", label: "Documents reused from the applicant's profile", value: d.documents.filter((x) => x.uploadedAt).map((x) => x.type).join(", ") || "None", note: "Files are opened from CV & Documents. Opening is a logged action." },
        { id: "cert", label: "Food handler's certificate", value: seed % 2 === 0 ? "Uploaded" : "Not added yet" },
      ],
    },
    {
      id: "screening",
      kind: "screening",
      title: "Role-specific screening questions",
      lastEditedAt: at(submittedAt, -1),
      fields: screeningFields,
    },
    {
      id: "declarations",
      kind: "declarations",
      title: "Declarations and consents",
      lastEditedAt: submittedAt,
      fields: [
        { id: "accurate", label: "I confirm the information is accurate", value: "Accepted", acceptedVersion: "v1 (sample)", acceptedAt: submittedAt },
        { id: "share", label: `Beeliv may share my application with ${d.client} for this role`, value: "Accepted", acceptedVersion: "v1 (sample)", acceptedAt: submittedAt },
      ],
    },
  ];

  return {
    submission: { submittedAt, sections },
    screening: screeningFields.map((f) => ({ id: f.id, question: f.label, answer: f.value ?? "Not answered" })),
  };
}
