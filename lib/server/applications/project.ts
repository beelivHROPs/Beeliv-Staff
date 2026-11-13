/**
 * Explicit DTO projection. Each parser rebuilds the DTO field by field, so a database or
 * gateway reply that carries extra data (paths, notes, scores) cannot leak through.
 * A malformed reply returns null and the caller reports a safe code.
 */
import { UUID, plain, validateForm } from "./validation";
import type { AdminApplicationDetailDto, AdminApplicationRowDto, ApplicantApplicationDto, ApplicationLifecycle, DraftDto, Page } from "./types";

const LIFECYCLES: readonly string[] = ["submitted", "in_talent_pool", "not_selected", "withdrawn", "completed"];
const SLOTS = ["cv", "passport-photo", "valid-id"] as const;

const id = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const str = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const int = (v: unknown, min: number, max: number): v is number => Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max;
const when = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));

export function projectDraft(v: unknown): DraftDto | null {
  if (!plain(v) || !id(v.applicationId) || !id(v.vacancyId) || !int(v.revision, 1, 1_000_000) || v.status !== "open" || !when(v.updatedAt)) return null;
  const form = validateForm(v.form);
  return form.ok ? { applicationId: v.applicationId, vacancyId: v.vacancyId, revision: v.revision, status: "open", form: form.value, updatedAt: v.updatedAt } : null;
}

export function projectApplicantApplication(v: unknown): ApplicantApplicationDto | null {
  if (!plain(v) || !id(v.applicationId) || !id(v.vacancyId) || !str(v.role, 200) || !str(v.company, 200) || !str(v.location, 200) || !str(v.employmentType, 100)
    || typeof v.lifecycle !== "string" || !LIFECYCLES.includes(v.lifecycle) || !int(v.stage, 0, 7) || !when(v.submittedAt) || !when(v.updatedAt)) return null;
  return { applicationId: v.applicationId, vacancyId: v.vacancyId, role: v.role, company: v.company, location: v.location, employmentType: v.employmentType, lifecycle: v.lifecycle as ApplicationLifecycle, stage: v.stage, submittedAt: v.submittedAt, updatedAt: v.updatedAt };
}

export function projectAdminRow(v: unknown): AdminApplicationRowDto | null {
  if (!plain(v) || !id(v.applicationId) || !id(v.vacancyId) || !str(v.vacancyReference, 64) || !str(v.role, 200) || !id(v.clientId) || !str(v.clientName, 200)
    || !(v.outletId === null || id(v.outletId)) || !str(v.applicantName, 200) || typeof v.lifecycle !== "string" || !LIFECYCLES.includes(v.lifecycle)
    || !int(v.stage, 0, 7) || !when(v.submittedAt)) return null;
  return { applicationId: v.applicationId, vacancyId: v.vacancyId, vacancyReference: v.vacancyReference, role: v.role, clientId: v.clientId, clientName: v.clientName, outletId: v.outletId as string | null, applicantName: v.applicantName, lifecycle: v.lifecycle as ApplicationLifecycle, stage: v.stage, submittedAt: v.submittedAt };
}

export function projectAdminDetail(v: unknown): AdminApplicationDetailDto | null {
  const row = projectAdminRow(v);
  if (!row || !plain(v) || !Array.isArray(v.attachments) || v.attachments.length > 3 || !Array.isArray(v.events) || v.events.length > 50) return null;
  const form = validateForm(v.form);
  if (!form.ok) return null;
  const attachments: AdminApplicationDetailDto["attachments"] = [];
  for (const a of v.attachments) {
    if (!plain(a) || !(SLOTS as readonly unknown[]).includes(a.slot) || !int(a.versionNumber, 1, 2_147_483_647) || !str(a.scanState, 40) || !str(a.reviewState, 40)) return null;
    attachments.push({ slot: a.slot as AdminApplicationDetailDto["attachments"][number]["slot"], versionNumber: a.versionNumber, scanState: a.scanState, reviewState: a.reviewState });
  }
  const events: AdminApplicationDetailDto["events"] = [];
  for (const e of v.events) {
    if (!plain(e) || (e.action !== "draft_opened" && e.action !== "submitted") || !when(e.at)) return null;
    events.push({ action: e.action, at: e.at });
  }
  return { ...row, form: form.value, attachments, events };
}

export function projectPage<T>(v: unknown, item: (x: unknown) => T | null, pageSize: number, page: number): Page<T> | null {
  if (!plain(v) || !Array.isArray(v.items) || v.items.length > pageSize || !int(v.total, v.items.length, 1_000_000_000) || v.page !== page || v.pageSize !== pageSize) return null;
  const items: T[] = [];
  for (const entry of v.items) {
    const parsed = item(entry);
    if (parsed === null) return null;
    items.push(parsed);
  }
  return { items, total: v.total, page, pageSize };
}
