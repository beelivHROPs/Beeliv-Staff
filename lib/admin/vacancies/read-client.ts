/** Browser transport for protected Admin vacancy reads. It never uses sample data. */
import type { VacancyCapabilities, VacancyDetail, VacancyRow, VacancyStatus, VacancyTab } from "./types";

const PATH = "/api/admin/vacancies/read";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = ["draft", "pending-approval", "published", "paused", "closing-soon", "closed", "filled", "cancelled"] as const;
const STORED = STATUSES.filter(status => status !== "closing-soon");
const TABS = ["all", "open", "draft", "pending", "paused", "ended"] as const;
const SORTS = ["newest", "oldest", "closing", "title"] as const;
const ACTIONS = ["submit-for-approval", "publish", "resume", "pause", "close", "mark-filled", "cancel"] as const;
const KINDS = ["application", "screening-questions", "documents-at-application", "test-or-form", "interview", "documents-after-selection", "operations-decision", "offer", "onboarding"] as const;
const CODES = ["unavailable", "invalid_request", "forbidden", "unauthenticated", "mfa_required", "no_access", "rate_limited"] as const;
const CAPABILITY_KEYS = ["canCreate", "canEdit", "canPublish", "canSubmitForApproval", "canPause", "canClose", "canMarkFilled", "canCancel"] as const;

export type VacancyReadCode = typeof CODES[number];
export type VacancyReadRow = Omit<VacancyRow, "counts"> & { revision: number; storedStatus: Exclude<VacancyStatus, "closing-soon">; counts: null; countsReady: false };
export type VacancyReadDetail = Omit<VacancyDetail, "counts"> & { revision: number; storedStatus: Exclude<VacancyStatus, "closing-soon">; counts: null; countsReady: false };
export type VacancyReadConfiguration = { departments: { id: string; name: string; active: boolean }[]; employmentTypes: string[]; benefitKinds: string[]; defaultRequiredDocuments: { atApplication: string[]; afterSelection: string[] }; documentDefaultsReviewed: boolean };
export type VacancyReadResult =
  | { ok: true; mode: "list"; rows: VacancyReadRow[]; total: number; page: number; pageSize: number; tabCounts: Record<VacancyTab, number>; facets: { departments: string[]; clients: { id: string; name: string }[]; recruiters: { id: string; name: string }[] }; workspaceEmpty: boolean; capabilities: VacancyCapabilities; asOf: string }
  | { ok: true; mode: "detail"; record: VacancyReadDetail | null; capabilities: VacancyCapabilities; asOf: string }
  | { ok: true; mode: "config"; configRevision: number; configurationReady: boolean; configuration: VacancyReadConfiguration | null; clients: { id: string; name: string; outlets: { id: string; name: string }[] }[]; capabilities: VacancyCapabilities; asOf: string }
  | { ok: false; code: VacancyReadCode };

function fail(): never { throw new Error("Invalid vacancy read envelope."); }
function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return fail();
  return value as Record<string, unknown>;
}
function string(value: unknown, max: number, required = false): string {
  if (typeof value !== "string" || value.length > max || required && !value.trim()) return fail();
  return value;
}
function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) return fail();
  return value.toLowerCase();
}
function integer(value: unknown, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max) return fail();
  return Number(value);
}
function boolean(value: unknown): boolean { if (typeof value !== "boolean") return fail(); return value; }
function list<T>(value: unknown, max: number, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > max) return fail();
  return value.map(parse);
}
function named(value: unknown): { id: string; name: string } {
  const item = object(value); return { id: uuid(item.id), name: string(item.name, 200, true) };
}
function nullableNamed(value: unknown): { id: string; name: string } | null { return value === null ? null : named(value); }
function timestamp(value: unknown, nullable = false): string | null {
  if (nullable && value === null) return null;
  const text = string(value, 48, true);
  if (!Number.isFinite(Date.parse(text))) return fail();
  return text;
}
function day(value: unknown): string {
  const text = string(value, 10, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(Date.parse(text)) || new Date(text).toISOString().slice(0, 10) !== text) return fail();
  return text;
}
function choice<T extends string>(value: unknown, options: readonly T[]): T {
  if (typeof value !== "string" || !options.includes(value as T)) return fail();
  return value as T;
}
function capabilities(value: unknown): VacancyCapabilities {
  const source = object(value);
  return Object.fromEntries(CAPABILITY_KEYS.map(key => [key, boolean(source[key])])) as unknown as VacancyCapabilities;
}
function strings(value: unknown, max: number, length: number): string[] { return list(value, max, item => string(item, length)); }
function baseRow(value: unknown): VacancyReadRow {
  const r = object(value);
  return {
    id: uuid(r.id), revision: integer(r.revision, 1, 2147483646), reference: string(r.reference, 64, true),
    title: string(r.title, 160, true), department: string(r.department, 100, true),
    client: named(r.client), outlet: nullableNamed(r.outlet), location: string(r.location, 200, true),
    employmentType: string(r.employmentType, 100, true), recruiter: nullableNamed(r.recruiter), openings: integer(r.openings, 1, 1000),
    status: choice(r.status, STATUSES), storedStatus: choice(r.storedStatus, STORED),
    counts: r.counts === null ? null : fail(), countsReady: r.countsReady === false ? false : fail(),
    postedAt: timestamp(r.postedAt, true), closesOn: day(r.closesOn), endedAt: timestamp(r.endedAt, true),
  };
}
function journey(value: unknown): VacancyReadDetail["journey"] {
  return list(value, 20, item => {
    const step = object(item); const kind = choice(step.kind, KINDS); const id = string(step.id, 100, true);
    if (kind !== "interview") { if (step.interview !== undefined) return fail(); return { id, kind }; }
    const raw = object(step.interview);
    return { id, kind, interview: {
      stageName: string(raw.stageName, 100, true), defaultMethod: choice(raw.defaultMethod, ["in-person", "video", "phone"] as const),
      defaultMinutes: integer(raw.defaultMinutes, 10, 240),
      criteria: list(raw.criteria, 20, criterion => { const c = object(criterion); return { id: string(c.id, 100, true), label: string(c.label, 100, true), scale: c.scale === 5 || c.scale === 10 ? c.scale : fail(), weight: integer(c.weight, 1, 5) }; }),
      whoMayScore: list(raw.whoMayScore, 3, role => choice(role, ["hr_officer", "hr_manager", "operations"] as const)),
    } };
  });
}
function detail(value: unknown): VacancyReadDetail {
  const r = object(value); const row = baseRow(r);
  const exp = object(r.experience), salary = object(r.salary), cond = object(r.conditions), docs = object(r.requiredDocuments), interview = object(r.interview);
  const image = r.image === undefined ? undefined : object(r.image);
  const actions = list(r.allowedActions, 7, action => choice(action, ACTIONS));
  if (new Set(actions).size !== actions.length) return fail();
  return {
    ...row, expectedResumption: r.expectedResumption === "" ? "" : day(r.expectedResumption), about: string(r.about, 20000),
    responsibilities: strings(r.responsibilities, 40, 500), essential: strings(r.essential, 40, 500), preferred: strings(r.preferred, 40, 500),
    experience: { minYears: integer(exp.minYears, 0, 60), ...(exp.maxYears === undefined ? {} : { maxYears: integer(exp.maxYears, 0, 60) }), summary: string(exp.summary, 500) },
    skills: strings(r.skills, 50, 120),
    salary: { min: salary.min === null ? null : integer(salary.min, 0, 1_000_000_000), max: salary.max === null ? null : integer(salary.max, 0, 1_000_000_000), frequency: choice(salary.frequency, ["Monthly", "Weekly", "Daily"] as const), negotiable: boolean(salary.negotiable), visibility: choice(salary.visibility, ["public", "internal"] as const) },
    benefits: list(r.benefits, 30, item => { const b = object(item); return { id: string(b.id, 100, true), kind: string(b.kind, 80, true), detail: string(b.detail, 500, true), visibility: choice(b.visibility, ["public", "internal"] as const) }; }),
    conditions: { workingDays: string(cond.workingDays, 300), shiftSystem: string(cond.shiftSystem, 300), hours: string(cond.hours, 300), weekends: string(cond.weekends, 300), publicHolidays: string(cond.publicHolidays, 300) },
    requiredDocuments: { atApplication: strings(docs.atApplication, 30, 150), afterSelection: strings(docs.afterSelection, 30, 150) },
    screeningQuestions: list(r.screeningQuestions, 30, item => { const q = object(item); return { id: string(q.id, 100, true), text: string(q.text, 1000, true), required: boolean(q.required), answerType: choice(q.answerType, ["yes-no", "text"] as const) }; }),
    ...(r.testFormId === undefined ? {} : { testFormId: uuid(r.testFormId) }),
    ...(image === undefined ? {} : { image: { source: choice(image.source, ["default", "library"] as const), ref: string(image.ref, 100), alt: string(image.alt, 200, true) } }),
    journey: journey(r.journey), recruitmentProcess: strings(r.recruitmentProcess, 20, 120),
    interview: { method: string(interview.method, 100), location: string(interview.location, 200) },
    allowedActions: actions, canEdit: boolean(r.canEdit),
    activity: list(r.activity, 100, item => { const a = object(item); return { id: uuid(a.id), at: timestamp(a.at)!, actor: string(a.actor, 200), action: string(a.action, 40, true), from: a.from === null ? null : string(a.from, 40), to: string(a.to, 40, true), ...(a.reason === undefined ? {} : { reason: string(a.reason, 2000) }) }; }),
  };
}
function configuration(value: unknown): VacancyReadConfiguration {
  const c = object(value), docs = object(c.defaultRequiredDocuments);
  return { departments: list(c.departments, 50, item => { const d = object(item); return { id: uuid(d.id), name: string(d.name, 80, true), active: boolean(d.active) }; }),
    employmentTypes: strings(c.employmentTypes, 30, 100), benefitKinds: strings(c.benefitKinds, 40, 100),
    defaultRequiredDocuments: { atApplication: strings(docs.atApplication, 30, 150), afterSelection: strings(docs.afterSelection, 30, 150) },
    documentDefaultsReviewed: boolean(c.documentDefaultsReviewed) };
}
type ReadQuery = { mode: "list" | "detail" | "config"; id?: string; page: number; pageSize: number; search: string; status: string; tab: VacancyTab; department: string; clientId: string; recruiterId: string; sort: typeof SORTS[number] };
function parseQuery(raw: unknown): ReadQuery {
  const v = object(raw), mode = v.mode === undefined ? "list" : choice(v.mode, ["list", "detail", "config"] as const);
  const allowed = mode === "list" ? ["mode", "page", "pageSize", "search", "status", "tab", "department", "clientId", "recruiterId", "sort"] : mode === "detail" ? ["mode", "id"] : ["mode"];
  if (Object.keys(v).some(key => !allowed.includes(key))) return fail();
  const id = mode === "detail" ? uuid(v.id) : undefined;
  const page = v.page === undefined ? 1 : integer(v.page, 1, 9999), pageSize = v.pageSize === undefined ? 20 : integer(v.pageSize, 1, 50);
  const search = v.search === undefined ? "" : string(v.search, 120).trim();
  const status = v.status === undefined ? "" : v.status === "" ? "" : choice(v.status, STATUSES);
  const tab = v.tab === undefined ? "all" : choice(v.tab, TABS);
  const department = v.department === undefined ? "" : string(v.department, 100).trim();
  const clientId = v.clientId === undefined || v.clientId === "" ? "" : uuid(v.clientId);
  const recruiterId = v.recruiterId === undefined || v.recruiterId === "" ? "" : v.recruiterId === "none" ? "none" : uuid(v.recruiterId);
  const sort = v.sort === undefined ? "newest" : choice(v.sort, SORTS);
  return { mode, ...(id ? { id } : {}), page, pageSize, search, status, tab, department, clientId, recruiterId, sort };
}
function selected(envelope: unknown, query: ReadQuery): Exclude<VacancyReadResult, { ok: false }> {
  const r = object(envelope);
  if (r.ok !== true || r.mode !== query.mode) return fail();
  const asOf = timestamp(r.asOf)!; const allowed = capabilities(r.capabilities);
  if (query.mode === "detail") {
    const record = r.record === null ? null : detail(r.record);
    if (record && record.id !== query.id) return fail();
    return { ok: true, mode: "detail", record, capabilities: allowed, asOf };
  }
  if (query.mode === "config") {
    const configRevision = integer(r.configRevision, 0, 2147483646), configurationReady = boolean(r.configurationReady);
    const config = r.configuration === null ? null : configuration(r.configuration);
    if (configRevision === 0 ? config !== null || configurationReady : config === null || config.documentDefaultsReviewed !== configurationReady) return fail();
    const clients = list(r.clients, 10000, item => { const c = object(item); return { ...named(c), outlets: list(c.outlets, 10000, named) }; });
    return { ok: true, mode: "config", configRevision, configurationReady, configuration: config, clients, capabilities: allowed, asOf };
  }
  const rows = list(r.rows, query.pageSize, baseRow), total = integer(r.total, rows.length, Number.MAX_SAFE_INTEGER);
  const page = integer(r.page, 1, 9999), pageSize = integer(r.pageSize, 1, 50);
  if (page !== query.page || pageSize !== query.pageSize || new Set(rows.map(row => row.id)).size !== rows.length) return fail();
  const rawCounts = object(r.tabCounts), tabCounts = Object.fromEntries(TABS.map(tab => [tab, integer(rawCounts[tab], 0, Number.MAX_SAFE_INTEGER)])) as Record<VacancyTab, number>;
  if (Object.keys(rawCounts).length !== TABS.length || tabCounts.all !== TABS.slice(1).reduce((sum, tab) => sum + tabCounts[tab], 0) || tabCounts[query.tab] !== total) return fail();
  const rawFacets = object(r.facets), departments = strings(rawFacets.departments, 10000, 100), clients = list(rawFacets.clients, 10000, named), recruiters = list(rawFacets.recruiters, 10000, named);
  const workspaceEmpty = boolean(r.workspaceEmpty);
  if (workspaceEmpty && tabCounts.all !== 0 || new Set(departments).size !== departments.length || new Set(clients.map(c => c.id)).size !== clients.length || new Set(recruiters.map(c => c.id)).size !== recruiters.length) return fail();
  return { ok: true, mode: "list", rows, total, page, pageSize, tabCounts, facets: { departments, clients, recruiters }, workspaceEmpty, capabilities: allowed, asOf };
}

/** All failures stay failures. The caller decides how to show retry, empty, and restricted states. */
export async function readVacancies(raw: unknown, fetcher: typeof fetch = fetch): Promise<VacancyReadResult> {
  let query: ReadQuery;
  try { query = parseQuery(raw); }
  catch { return { ok: false, code: "invalid_request" }; }
  try {
    const response = await fetcher(PATH, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query) });
    const envelope: unknown = await response.json();
    if (response.ok) return selected(envelope, query);
    const r = object(envelope), error = object(r.error);
    if (r.ok !== false || typeof error.code !== "string" || !CODES.includes(error.code as VacancyReadCode) || typeof error.message !== "string") return { ok: false, code: "unavailable" };
    return { ok: false, code: error.code as VacancyReadCode };
  } catch { return { ok: false, code: "unavailable" }; }
}
