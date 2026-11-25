"use client";

/**
 * Live Applicant applications: the browser side of /api/applications/[action] (lib/server/applications).
 * Same-origin JSON only; the server derives who is signed in, owner, status and stage. Nothing here is authority.
 */
import type { Application, ApplicationLifecycle, ApplyFormData, Interview } from "./types";
import { explainError, NETWORK_MESSAGE } from "../shared/error-messages";

export type LiveApplicationError = { code: string; message: string };
type Reply<T> =
  { ok: true; value: T } | { ok: false; error: LiveApplicationError };

const FALLBACK: LiveApplicationError = {
  code: "unavailable",
  message: "Applications are temporarily unavailable.",
};

function uuid(): string {
  return crypto.randomUUID();
}

async function call<T>(
  action: string,
  body: Record<string, unknown>,
): Promise<Reply<T>> {
  let res: Response;
  try {
    res = await fetch(`/api/applications/${action}`, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      error: {
        code: "offline",
        message: NETWORK_MESSAGE,
      },
    };
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: FALLBACK };
  }
  const j = json as {
    ok?: boolean;
    error?: { code?: unknown; message?: unknown };
  } & Record<string, unknown>;
  if (j && j.ok === true) {
    const { ok: _ok, ...rest } = j;
    void _ok;
    return { ok: true, value: rest as T };
  }
  const code =
    typeof j?.error?.code === "string" ? j.error.code : "unavailable";
  // Our own wording from lib/shared/error-messages.ts, never the server's text.
  return { ok: false, error: { code, message: code === "unavailable" ? FALLBACK.message : explainError(code, "application") } };
}

/* ---------- wire DTOs (mirror lib/server/applications/types.ts; copied, never imported from lib/server) ---------- */

type ApplyForm = {
  fullName?: string;
  preferredName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  yearsExperience?: string;
  expectedSalary?: string;
  availability?: string;
  earliestStart?: string;
  preferredLocation?: string;
  willingShifts?: "Yes" | "No";
  willingWeekends?: "Yes" | "No";
  willingHolidays?: "Yes" | "No";
  sectors?: string[];
  skills?: Record<string, string[]>;
  screeningAnswers?: Record<string, string>;
};
type DraftDto = {
  applicationId: string;
  vacancyId: string;
  revision: number;
  status: "open";
  form: ApplyForm;
  updatedAt: string;
};
type OpenDraftDto =
  | { state: "open"; draft: DraftDto; replayed: boolean }
  | { state: "submitted"; applicationId: string; replayed: boolean };
type SaveReceiptDto = {
  applicationId: string;
  revision: number;
  replayed: boolean;
};
type SubmitReceiptDto = {
  applicationId: string;
  submittedAt: string;
  revision: number;
  replayed: boolean;
};
type ApplicantApplicationDto = {
  applicationId: string;
  vacancyId: string;
  role: string;
  company: string;
  location: string;
  employmentType: string;
  lifecycle: Exclude<ApplicationLifecycle, "draft">;
  stage: number;
  submittedAt: string;
  updatedAt: string;
};
type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

/* ---------- mapping ---------- */

const yesNo = (v: unknown): "Yes" | "No" | undefined =>
  v === "Yes" || v === "No" ? v : undefined;
const text = (v: unknown, max = 500): string | undefined =>
  typeof v === "string" ? v.trim().slice(0, max) : undefined;

/** Only the fields the server accepts. The local-only certificate filename and empty values are left out. */
export function toWireForm(f: ApplyFormData): ApplyForm {
  const out: ApplyForm = {};
  const put = <K extends keyof ApplyForm>(
    k: K,
    v: ApplyForm[K] | undefined,
  ) => {
    if (v === undefined || v === "") return;
    out[k] = v;
  };
  put("fullName", text(f.fullName, 120));
  put("preferredName", text(f.preferredName, 60));
  put("phone", text(f.phone, 40));
  put("whatsapp", text(f.whatsapp, 40));
  put("email", text(f.email, 254));
  put("yearsExperience", text(f.yearsExperience, 40));
  put("expectedSalary", text(f.expectedSalary, 60));
  put("availability", text(f.availability, 60));
  put("earliestStart", text(f.earliestStart, 40));
  put("preferredLocation", text(f.preferredLocation, 120));
  put("willingShifts", yesNo(f.willingShifts));
  put("willingWeekends", yesNo(f.willingWeekends));
  put("willingHolidays", yesNo(f.willingHolidays));
  if (Array.isArray(f.sectors) && f.sectors.length)
    out.sectors = f.sectors.slice(0, 20);
  if (f.skills && Object.values(f.skills).some((v) => v?.length)) {
    out.skills = Object.fromEntries(
      Object.entries(f.skills).filter(([, v]) => v?.length),
    );
  }
  return out;
}

export function fromWireForm(base: ApplyFormData, w: ApplyForm): ApplyFormData {
  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(w).filter(
        ([k, v]) => v !== undefined && k !== "screeningAnswers",
      ),
    ),
    sectors: w.sectors ?? base.sectors,
    skills: w.skills ?? base.skills,
  } as ApplyFormData;
}

const STAGE_SLOTS = 8;

export function fromApplicationDto(
  d: ApplicantApplicationDto,
  applicantId: string,
  blank: ApplyFormData,
): Application {
  const stageDates: (string | null)[] = Array.from(
    { length: STAGE_SLOTS },
    (_, i) => (i === 0 ? d.submittedAt : null),
  );
  return {
    id: d.applicationId,
    applicantId,
    vacancyId: d.vacancyId,
    role: d.role,
    company: d.company,
    location: d.location,
    employmentType: d.employmentType,
    lifecycle: d.lifecycle,
    stage: Math.max(0, Math.min(STAGE_SLOTS - 1, d.stage)),
    stageDates,
    submittedAt: d.submittedAt,
    updatedAt: d.updatedAt,
    form: blank,
    next: null,
    activity: [{ title: "Application submitted", when: d.submittedAt }],
  };
}

/* ---------- calls ---------- */

export function openDraft(vacancyId: string) {
  return call<OpenDraftDto>("draft-open", { requestId: uuid(), vacancyId });
}
export function getDraft(applicationId: string) {
  return call<OpenDraftDto>("draft-get", { applicationId });
}
export function saveDraft(
  applicationId: string,
  expectedRevision: number,
  form: ApplyFormData,
) {
  return call<SaveReceiptDto>("draft-save", {
    requestId: uuid(),
    applicationId,
    expectedRevision,
    form: toWireForm(form),
  });
}
export function submit(applicationId: string, expectedRevision: number) {
  return call<SubmitReceiptDto>("submit", {
    requestId: uuid(),
    applicationId,
    expectedRevision,
  });
}
export function listMine(page = 1, pageSize = 50) {
  return call<Page<ApplicantApplicationDto>>("list", { page, pageSize });
}
export function readMine(applicationId: string) {
  return call<ApplicantApplicationDto>("read", { applicationId });
}

export type { DraftDto, ApplicantApplicationDto };

/* ---------- interviews (recruitment-interviews-phase2.sql): date, time, length, type, place, state ONLY ---------- */
type ApplicantInterviewDto = {
  id: string;
  applicationId: string;
  role: string;
  company: string;
  startsAt: string;
  durationMins: number;
  mode: "in_person" | "phone" | "video";
  location: string;
  state: "scheduled" | "cancelled" | "completed";
};
const MODE_LABEL: Record<ApplicantInterviewDto["mode"], string> = { in_person: "In person", phone: "Phone", video: "Video" };

export function listMyInterviews() {
  return call<{ items: ApplicantInterviewDto[] }>("interview-mine", {});
}

/** Server reply -> the Applicant Interview card. Never carries scores, notes, recommendation or the interviewer. */
export function fromInterviewDto(d: ApplicantInterviewDto): Interview {
  const link = d.mode === "video" && /^https:\/\/\S+$/i.test(d.location) ? d.location : undefined;
  return {
    id: d.id,
    applicationId: d.applicationId,
    title: "Interview",
    kind: "Interview",
    status: d.state,
    applicationLabel: [d.role, d.company].filter(Boolean).join(" · "),
    scheduledAt: d.startsAt,
    ...(d.state === "completed" ? { completedAt: d.startsAt } : {}),
    mode: MODE_LABEL[d.mode],
    ...(link ? { meetingLink: link } : {}),
    ...(!link && d.location ? { place: d.location } : {}),
    durationMinutes: d.durationMins,
  };
}
