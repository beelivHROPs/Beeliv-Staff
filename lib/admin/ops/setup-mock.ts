/**
 * DEV FIXTURE for the Operations Setup Center. FICTIONAL sample values. The
 * validation rules and "done" rules here are PROVISIONAL mock behaviour so the
 * UI can be exercised; the backend owns them (docs/contracts/ops-setup.md).
 * Values marked `unconfirmed` are PROPOSALS (docs/contracts/auth-and-invitations.md
 * section 3.4, ops-approvals.md section 7): needs Beeliv confirmation. Saving here
 * changes nothing real: no invitation, approval or notification setting elsewhere
 * is read from this store. The roles summary is a plain-language copy of
 * docs/architecture/rbac.md and is read only. Replace with a Supabase adapter
 * implementing OpsSetupAdapter.
 *
 * Previews: ?state=restricted (403), ?state=conflict (the first save is refused
 * because someone else saved first), the shell's "Prototype state" control
 * (loading / empty / error).
 */
import { checkPhone } from "@/lib/phone/phone";
import { agreementsPublishedCount } from "../agreements/mock";
import { RestrictedError, type AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import { ConflictError } from "./adapter";
import type { OpsSetupAdapter } from "./setup-adapter";
import { SetupValidationError, type FieldErrors, type RoleSummary, type SetupFormId, type SetupOverview, type SetupRecord, type SetupSectionSummary, type SetupValues } from "./setup-types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
const notify = () => listeners.forEach((l) => l("reset"));
subscribePrototypeMode(notify);

const ME = "Adaeze Sample (Head of Operations)";
const COLLEAGUE = "Tobi Sample (Operations)";
const urlState = () => (typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("state") ?? ""));

async function gate() {
  const mode = getPrototypeMode();
  if (mode === "loading") return forever();
  if (urlState() === "restricted") {
    await sleep(200);
    throw new RestrictedError();
  }
  await sleep(250);
  if (mode === "error") throw new Error("Dev fixture: simulated failure");
  return mode;
}

/* ---------- store ---------- */

type Rec<K extends SetupFormId> = SetupRecord<K>;
const records: { [K in SetupFormId]: Rec<K> } = {
  company: { id: "company", values: { name: "Beeliv Hospitality", city: "Abuja, Nigeria", contactEmail: "", phone: "" }, revision: 1, updatedAt: null, updatedBy: null, unconfirmedFields: [] },
  invitations: { id: "invitations", values: { clientsDays: 7, staffDays: 7, adminsDays: 7 }, revision: 1, updatedAt: null, updatedBy: null, unconfirmedFields: ["clientsDays", "staffDays", "adminsDays"] },
  approvals: { id: "approvals", values: { reminderDays: 3, secondApprover: false }, revision: 1, updatedAt: null, updatedBy: null, unconfirmedFields: ["reminderDays", "secondApprover"] },
  notifications: { id: "notifications", values: { approvalWaiting: true, clientWithoutHr: true, requestWaiting: true, weeklySummary: false }, revision: 1, updatedAt: null, updatedBy: null, unconfirmedFields: [] },
};
let conflictSpent = false;

/* ---------- validation (server-side in production) ---------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const whole = (n: unknown, min: number, max: number) => typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;

function validate<K extends SetupFormId>(id: K, v: SetupValues[K]): FieldErrors {
  const e: FieldErrors = {};
  if (id === "company") {
    const c = v as SetupValues["company"];
    if (!c.name.trim()) e.name = "Enter the company name.";
    if (!c.city.trim()) e.city = "Enter the city.";
    if (c.contactEmail.trim() && !EMAIL.test(c.contactEmail.trim())) e.contactEmail = "Enter a full email address, like name@company.com.";
    if (c.phone.trim()) { const pe = checkPhone(c.phone).error; if (pe) e.phone = pe; }
  } else if (id === "invitations") {
    const i = v as SetupValues["invitations"];
    (["clientsDays", "staffDays", "adminsDays"] as const).forEach((k) => {
      if (!whole(i[k], 1, 60)) e[k] = "Enter a whole number of days from 1 to 60.";
    });
  } else if (id === "approvals") {
    const a = v as SetupValues["approvals"];
    if (a.reminderDays !== null && !whole(a.reminderDays, 1, 30)) e.reminderDays = "Enter a whole number of days from 1 to 30, or leave it empty for no reminder.";
  }
  return e;
}

/* ---------- overview ---------- */

function overview(): SetupOverview {
  const ag = agreementsPublishedCount();
  const c = records.company;
  const companyDone = !!c.values.contactEmail.trim() && !!c.values.phone.trim();
  const sections: SetupSectionSummary[] = [
    { id: "company", title: "Company profile", description: "Name, city and how people reach Beeliv.", status: companyDone ? "done" : "attention", note: companyDone ? `${c.values.name}, ${c.values.city}` : "Add a contact email and phone number.", href: "/admin/ops/setup/company", unconfirmed: false, group: "company" },
    { id: "branding", title: "Branding", description: "Logo, colours and typography.", status: "attention", note: "No approved visual direction yet. Beeliv decides this.", href: "/admin/settings#s-branding", unconfirmed: false, group: "company" },
    { id: "roles", title: "Roles and who can do what", description: "A plain summary of the five roles.", status: "done", note: "Read only, from the access design.", href: "/admin/ops/setup/roles", unconfirmed: false, group: "people" },
    { id: "agreements", title: "Agreements and policies", description: "The wording people read and accept.", status: ag.published === ag.total ? "done" : "attention", note: ag.published === ag.total ? "All documents are published." : `Wording pending from Beeliv: ${ag.published} of ${ag.total} published. Setup cannot be finished without it.`, href: "/admin/ops/setup/agreements", unconfirmed: true, group: "people" },
    { id: "invitations", title: "Invitation policy", description: "How many days an invitation stays open.", status: records.invitations.updatedAt ? "done" : "attention", note: records.invitations.updatedAt ? "Reviewed. The days are still proposals." : "Review the proposed days.", href: "/admin/ops/setup/invitations", unconfirmed: true, group: "people" },
    { id: "approvals", title: "Approval rules", description: "Who approves, and when to be reminded.", status: records.approvals.updatedAt ? "done" : "attention", note: records.approvals.updatedAt ? "Reviewed. The thresholds are still proposals." : "Review the reminder and second-approver rules.", href: "/admin/ops/setup/approvals", unconfirmed: true, group: "work" },
    { id: "lists", title: "Lists and rules", description: "Departments, roles, stages, pick-lists and job templates.", status: "done", note: "Managed on its own page.", href: "/admin/lists", unconfirmed: false, group: "work" },
    { id: "notifications", title: "Notification defaults", description: "What Operations is told about by default.", status: "done", note: "Defaults are on.", href: "/admin/ops/setup/notifications", unconfirmed: false, group: "work" },
  ];
  const doneCount = sections.filter((s) => s.status === "done").length;
  return { sections, doneCount, total: sections.length, nextId: sections.find((s) => s.status === "attention")?.id ?? null };
}

/* ---------- roles (read only copy of docs/architecture/rbac.md) ---------- */

const ROLES: RoleSummary[] = [
  { id: "applicant", name: "Applicant", scope: "Their own account and applications only.", can: ["Apply for jobs and track their applications", "Upload their own documents", "Take assigned tests"], cannot: ["See other people, clients or staff", "See attendance, leave, payroll or reports"], open: ["Whether an application can be withdrawn or edited after sending"] },
  { id: "staff", name: "Assigned staff", scope: "Their own records at the client they are placed with.", can: ["See their own profile, schedule, attendance, leave and warnings", "Read SOPs and training"], cannot: ["See other staff or other clients", "See payroll amounts of others"], open: ["How much of their own payroll information they see"] },
  { id: "hr", name: "Assigned HR", scope: "Only the clients and outlets they are assigned to.", can: ["Review and shortlist applicants", "Check documents and manage staff records for their clients", "Submit selections and offers for approval"], cannot: ["Give final approval", "See clients they are not assigned to"], open: ["Whether HR can create staff records directly", "How extra access is granted"] },
  { id: "client", name: "Client", scope: "Their own business and outlets only.", can: ["Request workforce and review candidates", "See their placed staff, attendance and schedules"], cannot: ["See other clients or Beeliv internal notes", "See staff identity documents or banking details"], open: ["Which payroll information the client sees"] },
  { id: "ops", name: "Head of Operations", scope: "All of Beeliv.", can: ["See every client, outlet, applicant and staff record", "Give final approval or rejection", "See operational reports and company activity"], cannot: [], open: ["Who creates clients and outlets", "Whether Operations assigns HR (it is the likely owner)", "How wide the access to sensitive documents is"] },
];

/* ---------- adapter ---------- */

export const mockOpsSetupAdapter: OpsSetupAdapter = {
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  async getOverview() {
    await gate();
    return overview();
  },

  async getSection<K extends SetupFormId>(id: K) {
    await gate();
    return structuredClone(records[id]) as SetupRecord<K>;
  },

  async saveSection<K extends SetupFormId>(id: K, values: SetupValues[K], expectedRevision: number) {
    await gate();
    await sleep(200);
    const errors = validate(id, values);
    if (Object.keys(errors).length) throw new SetupValidationError(errors);
    const rec = records[id] as SetupRecord<K>;
    // Preview: someone else saved this section a moment before you.
    if (urlState() === "conflict" && !conflictSpent) {
      conflictSpent = true;
      rec.revision += 1;
      rec.updatedAt = new Date().toISOString();
      rec.updatedBy = COLLEAGUE;
      throw new ConflictError("Someone else just saved this");
    }
    if (expectedRevision !== rec.revision) throw new ConflictError("Someone else just saved this");
    rec.values = structuredClone(values);
    rec.revision += 1;
    rec.updatedAt = new Date().toISOString();
    rec.updatedBy = ME;
    return structuredClone(rec);
  },

  async getRoles() {
    await gate();
    return ROLES;
  },
};
