/**
 * DEV FIXTURE for Operations Activity. FICTIONAL people ("Sample") and clients ("Demo").
 * No NIN / bank value exists here: a protected record is only flagged `sensitive`.
 * Previews: ?state=restricted (403) and the shell's "Prototype state" control
 * (loading / empty / error). Replace with a Supabase adapter implementing OpsActivityAdapter.
 */
import { isoOffset } from "@/lib/applicant/time";
import { RestrictedError } from "../adapter";
import { getPrototypeMode } from "../dev-controls";
import { getAgreementEvents } from "../agreements/mock";
import { getRevealEvents } from "../sensitive";
import type { ActivityAction, ActivityEntityType, ActivityEvent, ActivityPage, ActivityQuery, OpsActivityAdapter } from "./activity-types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const urlState = () => (typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("state") ?? ""));

const PEOPLE = {
  adaeze: { id: "ops-user-1", name: "Adaeze Sample", role: "Head of Operations" },
  tobi: { id: "ops-user-2", name: "Tobi Sample", role: "Operations" },
  funke: { id: "hr-1", name: "Funke Sample", role: "HR" },
  kelechi: { id: "hr-2", name: "Kelechi Sample", role: "HR" },
  bisi: { id: "hr-3", name: "Bisi Sample", role: "HR" },
} as const;
type Who = keyof typeof PEOPLE;

interface Seed {
  d: number;
  h: number;
  m: number;
  who: Who;
  action: ActivityAction;
  type: ActivityEntityType;
  label: string;
  href?: string;
  before?: string;
  after?: string;
  note?: string;
  sensitive?: boolean;
}

const SEEDS: Seed[] = [
  { d: 0, h: 9, m: 42, who: "adaeze", action: "approved", type: "approval", label: "Selection: Halima Sample", href: "/admin/ops/approvals/apr-6", before: "Waiting for Operations", after: "Approved", note: "Approved. Good match for the weekend team." },
  { d: 0, h: 8, m: 15, who: "funke", action: "verified", type: "document", label: "Food handling certificate, Ada Sample", before: "Being checked", after: "Verified" },
  { d: 1, h: 16, m: 5, who: "tobi", action: "assigned", type: "client", label: "Demo Grill Port Harcourt", href: "/admin/ops/assignments", before: "No HR assigned", after: "Kelechi Sample" },
  { d: 1, h: 14, m: 30, who: "adaeze", action: "sent-back", type: "approval", label: "Offer: Dayo Sample", href: "/admin/ops/approvals/apr-10", before: "Waiting for Operations", after: "Sent back to HR", note: "Start date is before the document check finishes. Please move it." },
  { d: 1, h: 11, m: 20, who: "kelechi", action: "published", type: "vacancy", label: "Bar Attendant, Demo Lounge Lagos", before: "Draft", after: "Published" },
  { d: 2, h: 15, m: 48, who: "adaeze", action: "invited", type: "invitation", label: "Kemi Sample (HR)", after: "Invitation sent" },
  { d: 2, h: 10, m: 12, who: "funke", action: "verified", type: "document", label: "Identity document, Emeka Sample", before: "Requested again", after: "Verified", sensitive: true },
  { d: 3, h: 17, m: 2, who: "adaeze", action: "approved", type: "approval", label: "Offer: Segun Sample", href: "/admin/ops/approvals/apr-7", before: "Waiting for Operations", after: "Approved" },
  { d: 3, h: 9, m: 40, who: "bisi", action: "published", type: "vacancy", label: "Floor Supervisor, Demo Hotel Abuja", before: "Draft", after: "Published" },
  { d: 4, h: 13, m: 25, who: "tobi", action: "assigned", type: "client", label: "Demo Hotel Abuja", href: "/admin/ops/assignments", before: "Bisi Sample", after: "Funke Sample" },
  { d: 5, h: 14, m: 55, who: "adaeze", action: "sent-back", type: "approval", label: "Selection: Folake Sample", href: "/admin/ops/approvals/apr-8", before: "Waiting for Operations", after: "Sent back to HR", note: "Please confirm the second referee before we approve." },
  { d: 5, h: 10, m: 8, who: "funke", action: "verified", type: "document", label: "CV, Tunde Sample", before: "Being checked", after: "Verified" },
  { d: 6, h: 16, m: 31, who: "adaeze", action: "invited", type: "invitation", label: "Demo Grill Port Harcourt (client contact)", after: "Invitation sent" },
  { d: 7, h: 11, m: 45, who: "kelechi", action: "published", type: "vacancy", label: "Commis Chef, Demo Lounge Lagos", before: "Draft", after: "Published" },
  { d: 8, h: 15, m: 10, who: "adaeze", action: "approved", type: "approval", label: "Selection: Ada Sample", href: "/admin/ops/approvals/apr-1", before: "Waiting for Operations", after: "Approved" },
  { d: 9, h: 9, m: 52, who: "tobi", action: "invited", type: "invitation", label: "Musa Sample (existing staff)", after: "Invitation sent" },
  { d: 10, h: 14, m: 3, who: "adaeze", action: "rejected", type: "approval", label: "Selection: Tola Sample", href: "/admin/ops/approvals/apr-9", before: "Waiting for Operations", after: "Rejected", note: "Does not meet the supervisor experience Beeliv asked for." },
  { d: 11, h: 12, m: 18, who: "bisi", action: "verified", type: "document", label: "Bank details, Ngozi Sample", before: "Being checked", after: "Verified", sensitive: true },
  { d: 13, h: 16, m: 40, who: "tobi", action: "assigned", type: "client", label: "Demo Lounge Lagos", href: "/admin/ops/assignments", before: "No HR assigned", after: "Kelechi Sample" },
  { d: 14, h: 10, m: 27, who: "funke", action: "published", type: "vacancy", label: "Waiter / Waitress, Demo Hotel Abuja", before: "Draft", after: "Published" },
  { d: 17, h: 15, m: 5, who: "adaeze", action: "approved", type: "approval", label: "Offer: Chidi Sample", href: "/admin/ops/approvals/apr-3", before: "Waiting for Operations", after: "Approved" },
  { d: 19, h: 9, m: 33, who: "adaeze", action: "invited", type: "invitation", label: "Bisi Sample (HR)", after: "Invitation sent" },
  { d: 22, h: 13, m: 50, who: "kelechi", action: "verified", type: "document", label: "Referee contacts, Dayo Sample", before: "Being checked", after: "Verified" },
  { d: 26, h: 11, m: 12, who: "tobi", action: "assigned", type: "client", label: "Demo Hotel Abuja", href: "/admin/ops/assignments", before: "No HR assigned", after: "Bisi Sample" },
  { d: 33, h: 14, m: 20, who: "adaeze", action: "sent-back", type: "approval", label: "Offer: Ngozi Sample", before: "Waiting for Operations", after: "Sent back to HR", note: "Please confirm the start date with the client." },
];

function build(): ActivityEvent[] {
  return SEEDS.map((s, i) => {
    const p = PEOPLE[s.who];
    return {
      id: `evt-${i + 1}`,
      reference: `BLV-AUD-PLACEHOLDER-${i + 1}`,
      at: isoOffset(-s.d, s.h, s.m),
      actorId: p.id,
      actorName: p.name,
      actorRole: p.role,
      action: s.action,
      entityType: s.type,
      entityLabel: s.label,
      entityHref: s.href ?? null,
      before: s.before ?? null,
      after: s.after ?? null,
      note: s.note ?? null,
      sensitive: !!s.sensitive,
    };
  }).sort((a, b) => b.at.localeCompare(a.at));
}

const RANGE_DAYS = { today: 0, "7d": 7, "30d": 30 } as const;

export const mockOpsActivityAdapter: OpsActivityAdapter = {
  async listActivity(q: ActivityQuery): Promise<ActivityPage> {
    const mode = getPrototypeMode();
    if (mode === "loading") return forever();
    if (urlState() === "restricted") {
      await sleep(200);
      throw new RestrictedError();
    }
    await sleep(300);
    if (mode === "error") throw new Error("Dev fixture: simulated failure");
    const all = mode === "empty" ? [] : [...getRevealEvents(), ...getAgreementEvents(), ...build()].sort((a, b) => b.at.localeCompare(a.at));
    const needle = q.search.trim().toLowerCase();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const since = q.range ? startOfToday.getTime() - RANGE_DAYS[q.range] * 86_400_000 : 0;
    const rows = all.filter((e) => {
      if (q.action && e.action !== q.action) return false;
      if (q.actorId && e.actorId !== q.actorId) return false;
      if (q.entityType && e.entityType !== q.entityType) return false;
      if (since && new Date(e.at).getTime() < since) return false;
      if (needle && !`${e.actorName} ${e.entityLabel} ${e.action} ${e.reference} ${e.note ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    const actors = new Map<string, string>();
    all.forEach((e) => actors.set(e.actorId, e.actorName));
    return { rows, total: rows.length, facets: { actors: [...actors].map(([id, name]) => ({ id, name })) }, workspaceEmpty: all.length === 0 };
  },
};
