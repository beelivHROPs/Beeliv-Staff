/** Labels, tones and links for Team & Access. Display only. */
import type { ChipTone } from "@/components/client/StatusChip";
import type { AccountStatus, CapabilityLevel, InvitationKind, InvitationStatus, TeamTab } from "@/lib/admin/team-access/types";

export const TEAM_HREF = "/admin/team-access";
export const INVITATIONS_HREF = `${TEAM_HREF}/invitations`;

export const TAB_ORDER: TeamTab[] = ["internal", "clients", "accounts", "invitations", "roles"];
export const TAB_LABEL: Record<TeamTab, string> = { internal: "Internal team", clients: "Client users", accounts: "Accounts", invitations: "Invitations", roles: "Roles and access" };
export const isTeamTab = (v: string): v is TeamTab => (TAB_ORDER as string[]).includes(v);

export const ACCOUNT_LABEL: Record<AccountStatus, string> = { invited: "Invited", active: "Active", suspended: "Suspended", deactivated: "Deactivated" };
export const ACCOUNT_TONE: Record<AccountStatus, ChipTone> = { invited: "warn", active: "ok", suspended: "bad", deactivated: "mute" };
export const ACCOUNT_ORDER: (AccountStatus | "all")[] = ["all", "invited", "active", "suspended", "deactivated"];

export const INVITE_LABEL: Record<InvitationStatus, string> = { pending: "Pending", accepted: "Accepted", expired: "Expired", revoked: "Revoked" };
export const INVITE_TONE: Record<InvitationStatus, ChipTone> = { pending: "warn", accepted: "ok", expired: "mute", revoked: "bad" };
export const INVITE_ORDER: (InvitationStatus | "all")[] = ["all", "pending", "accepted", "expired", "revoked"];
export const KIND_LABEL: Record<InvitationKind, string> = { internal: "Internal", client: "Client", staff: "Staff" };

export const LEVEL_LABEL: Record<CapabilityLevel, string> = { yes: "Yes", scoped: "Within scope", no: "No", tbc: "Needs Beeliv confirmation" };
export const LEVEL_SHORT: Record<CapabilityLevel, string> = { yes: "Yes", scoped: "Scoped", no: "No", tbc: "TBC" };
export const LEVEL_TONE: Record<CapabilityLevel, ChipTone> = { yes: "ok", scoped: "info", no: "mute", tbc: "warn" };

export const DELIVERY_LABEL: Record<import("@/lib/admin/team-access/types").DeliveryStatus, string> = { "not-sent": "Not sent", queued: "Queued", sent: "Sent", failed: "Failed", copied: "Link created" };
export const DELIVERY_TONE: Record<import("@/lib/admin/team-access/types").DeliveryStatus, ChipTone> = { "not-sent": "mute", queued: "info", sent: "ok", failed: "bad", copied: "info" };
