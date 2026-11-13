/**
 * Operations Setup Center data shapes (docs/contracts/ops-setup.md, DRAFT).
 * Presentation-facing only: the backend owns validation, who may change what and
 * the audit trail. FICTIONAL sample values. Anything not confirmed by Beeliv is
 * flagged by the adapter (`unconfirmed`), never silently decided by the UI.
 */
import type { ISODateTime } from "../types";

export type SetupSectionId = "company" | "roles" | "invitations" | "lists" | "agreements" | "approvals" | "notifications" | "branding";
export type SetupFormId = "company" | "invitations" | "approvals" | "notifications";
export type SetupStatus = "done" | "attention";

export interface SetupSectionSummary {
  id: SetupSectionId;
  title: string;
  /** One plain line under the title. */
  description: string;
  status: SetupStatus;
  /** Why it needs attention, or the short summary when done. */
  note: string;
  /** Where "open" goes: a setup sub-page, or another screen. */
  href: string;
  /** True when the value(s) shown are proposals that Beeliv has not confirmed. */
  unconfirmed: boolean;
  group: "company" | "people" | "work";
}

export interface SetupOverview {
  sections: SetupSectionSummary[];
  doneCount: number;
  total: number;
  /** First section that needs attention, for the one main button. */
  nextId: SetupSectionId | null;
}

export interface CompanyProfile {
  name: string;
  city: string;
  contactEmail: string;
  phone: string;
}
export interface InvitationPolicy {
  /** Days an invitation can still be accepted. All proposals: needs Beeliv confirmation. */
  clientsDays: number;
  staffDays: number;
  adminsDays: number;
}
export interface ApprovalRules {
  /** Days a request may wait before Operations is reminded. null = no reminder. Needs Beeliv confirmation. */
  reminderDays: number | null;
  /** Whether a second person must also approve. Needs Beeliv confirmation. */
  secondApprover: boolean;
}
export interface NotificationDefaults {
  approvalWaiting: boolean;
  clientWithoutHr: boolean;
  requestWaiting: boolean;
  weeklySummary: boolean;
}

export interface SetupValues {
  company: CompanyProfile;
  invitations: InvitationPolicy;
  approvals: ApprovalRules;
  notifications: NotificationDefaults;
}

/** A saved form: the values, who last saved, and the revision to send back with the next save. */
export interface SetupRecord<K extends SetupFormId> {
  id: K;
  values: SetupValues[K];
  revision: number;
  /** Null until someone has saved this section. */
  updatedAt: ISODateTime | null;
  updatedBy: string | null;
  /** Fields whose current value is a proposal, not a Beeliv decision. Keys of `values`. */
  unconfirmedFields: string[];
}

export type FieldErrors = Record<string, string>;

/** Fields failed validation on the server. Shown inline, input is kept. */
export class SetupValidationError extends Error {
  fields: FieldErrors;
  constructor(fields: FieldErrors) {
    super("Some fields need fixing");
    this.name = "SetupValidationError";
    this.fields = fields;
  }
}

export interface RoleSummary {
  id: string;
  name: string;
  /** Where they work, in one line. */
  scope: string;
  can: string[];
  cannot: string[];
  /** Still open in the RBAC design: needs Beeliv confirmation. */
  open: string[];
}
