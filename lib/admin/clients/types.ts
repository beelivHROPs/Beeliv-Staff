/**
 * Clients & Outlets slice (HR, spec 9, 28.1 "Clients & Outlets": Client ID,
 * organisation, contacts, outlets, Client users, assigned HR, workforce,
 * requests, compliance and activity). Presentation contracts only. HR sees
 * ASSIGNED clients / outlets only; the backend enforces it (RLS).
 * Not in the spec, so "needs Beeliv confirmation": client / outlet status
 * values, which contact fields HR may see, client agreements.
 * References (BLV-CLI-..., BLV-OUT-...) are server-generated; screens never
 * compose them. All data is FICTIONAL.
 */
import type { AssignedHr, PersonRef, StaffStatus } from "../staff/types";

export type { AssignedHr, PersonRef };

/** PROVISIONAL: the spec lists no client / outlet status values. */
export type OrgStatus = "invited" | "active" | "onboarding" | "inactive";

export interface ClientRow {
  id: string;
  reference: string;
  name: string;
  outletsCount: number;
  activeStaff: number;
  openVacancies: number;
  /** Primary + count. primary === null means NO HR is assigned (requests go to the Operations queue). Shape is relied on by other screens: do not change. */
  assignedHr: AssignedHr;
  /** Every assigned HR name, primary first (display only). */
  hrNames: string[];
  status: OrgStatus;
}

export interface ClientsQuery {
  search: string;
  status: "" | OrgStatus;
  /** Sort id, see CLIENT_SORTS. */
  sort: string;
  /** How many rows to return (Show more grows this). */
  limit: number;
}

export const CLIENT_SORTS = [
  { value: "name", label: "Name A-Z" },
  { value: "staff", label: "Most staff" },
  { value: "vacancies", label: "Most open vacancies" },
];

export interface ClientsPage {
  rows: ClientRow[];
  statusCounts: Record<"all" | OrgStatus, number>;
  total: number;
  workspaceEmpty: boolean;
}

export interface OutletRow {
  id: string;
  reference: string;
  name: string;
  address: string;
  city: string;
  activeStaff: number;
  openVacancies: number;
  status: OrgStatus;
  assignedHr: AssignedHr;
}

export interface ClientStaffRow {
  id: string;
  reference: string;
  name: string;
  role: string;
  outletId: string;
  outlet: string;
  status: StaffStatus;
}

export interface ClientVacancyRow {
  id: string;
  title: string;
  outletId: string;
  outlet: string;
  openings: number;
  status: "Published" | "Draft" | "Closed";
}

export interface ClientContact {
  id: string;
  name: string;
  title: string;
  email: string;
  /** Null when the adapter does not release it to this user (which fields HR may see needs Beeliv confirmation). */
  phone: string | null;
}

/** Who did what, when. Every change to a client or outlet writes one. */
export interface ActivityEntry {
  id: string;
  actor: string;
  at: string;
  action: string;
}

/** Who assigned an HR user to a client or outlet, and when. Read-only in the HR app. */
export interface HrAssignmentEntry {
  id: string;
  name: string;
  role: "Primary" | "Additional";
  assignedBy: string;
  at: string;
}

export interface ClientDetail extends ClientRow {
  hrHistory: HrAssignmentEntry[];
  /** Every authorised HR user for this client (spec 9.1: many-to-many). */
  hrUsers: (PersonRef & { primary: boolean })[];
  business: { type: string; city: string; address: string };
  /** Onboarding steps. Null when the client is fully onboarded and no checklist applies. */
  onboarding: { id: string; label: string; done: boolean }[] | null;
  /** Agreements acknowledged. Which agreements exist needs Beeliv confirmation. */
  agreements: { id: string; name: string; version: string; acknowledgedAt: string | null }[];
  accessSummary: string;
  createdBy: string;
  createdAt: string;
  outlets: OutletRow[];
  staff: ClientStaffRow[];
  vacancies: ClientVacancyRow[];
  contacts: ClientContact[];
  /** Documents-on-file summary from the staff records. Null = nothing to summarise yet ("later"). */
  compliance: { verified: number; total: number; needAttention: number } | null;
  activity: ActivityEntry[];
}

export interface OutletDetail {
  client: { id: string; name: string };
  outlet: OutletRow;
  phone: string;
  /** Person in charge at the outlet. Empty when not recorded. */
  manager: string;
  notes: string;
  /** Cover picture (demo: this visit only). */
  cover: string | null;
  hrUsers: (PersonRef & { primary: boolean })[];
  hrHistory: HrAssignmentEntry[];
  staff: ClientStaffRow[];
  vacancies: ClientVacancyRow[];
  activity: ActivityEntry[];
}

/** Non-sensitive fields HR may edit. */
export interface OutletEdit {
  address?: string;
  city?: string;
  phone?: string;
  notes?: string;
  cover?: string | null;
}
