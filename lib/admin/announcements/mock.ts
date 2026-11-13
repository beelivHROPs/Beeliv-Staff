/**
 * DEV FIXTURE for Announcements. Everything is FICTIONAL ("Sample" people,
 * "Demo" clients). Provisional mock behaviour (backend owns the real rules, all
 * need Beeliv confirmation): a person is in the audience when they match every
 * group that has a selection; an announcement expires at the end of its expiry
 * date; whether applicants may receive announcements is undecided. Email is
 * never sent. Replace with a Supabase adapter implementing AnnouncementAdapter.
 */
import { canDo } from "../role-access";
import { isoOffset } from "@/lib/applicant/time";
import type { AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import type { AnnouncementAdapter } from "./adapter";
import {
  AnnouncementValidationError,
  type ActivityEntry,
  type AnnouncementAction,
  type AnnouncementConfig,
  type AnnouncementDetail,
  type AnnouncementInput,
  type AnnouncementRow,
  type AnnouncementStatus,
  type Audience,
  type FieldErrors,
  type Receipt,
} from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
subscribePrototypeMode(() => listeners.forEach((l) => l("reset")));

const ME = "Funke Sample";

const CONFIG: AnnouncementConfig = {
  clients: [
    { id: "c-demo-hotel", name: "Demo Hotel Abuja", outlets: [{ id: "o-demo-hotel-main", name: "Main building" }] },
    { id: "c-demo-lounge", name: "Demo Lounge Lagos", outlets: [{ id: "o-demo-lounge-vi", name: "Victoria Island" }] },
    { id: "c-demo-grill", name: "Demo Grill Port Harcourt", outlets: [{ id: "o-demo-grill-main", name: "Town centre" }] },
  ],
  roles: [
    { id: "r-waiter", name: "Waiter" },
    { id: "r-bartender", name: "Bartender" },
    { id: "r-chef", name: "Chef" },
    { id: "r-housekeeper", name: "Housekeeper" },
    { id: "r-supervisor", name: "Supervisor" },
    { id: "r-host", name: "Host" },
  ],
  canCreate: true,
};

interface Staff {
  id: string;
  name: string;
  roleId: string;
  clientId: string;
  outletId: string;
}
const ROSTER: Staff[] = [
  { id: "st-1", name: "Adaeze Sample", roleId: "r-waiter", clientId: "c-demo-hotel", outletId: "o-demo-hotel-main" },
  { id: "st-2", name: "Bayo Sample", roleId: "r-bartender", clientId: "c-demo-lounge", outletId: "o-demo-lounge-vi" },
  { id: "st-3", name: "Chidi Sample", roleId: "r-chef", clientId: "c-demo-grill", outletId: "o-demo-grill-main" },
  { id: "st-4", name: "Dayo Sample", roleId: "r-waiter", clientId: "c-demo-lounge", outletId: "o-demo-lounge-vi" },
  { id: "st-5", name: "Efe Sample", roleId: "r-housekeeper", clientId: "c-demo-hotel", outletId: "o-demo-hotel-main" },
  { id: "st-6", name: "Folake Sample", roleId: "r-supervisor", clientId: "c-demo-hotel", outletId: "o-demo-hotel-main" },
  { id: "st-7", name: "Gbenga Sample", roleId: "r-chef", clientId: "c-demo-hotel", outletId: "o-demo-hotel-main" },
  { id: "st-8", name: "Halima Sample", roleId: "r-host", clientId: "c-demo-grill", outletId: "o-demo-grill-main" },
  { id: "st-9", name: "Ife Sample", roleId: "r-bartender", clientId: "c-demo-hotel", outletId: "o-demo-hotel-main" },
  { id: "st-10", name: "Jide Sample", roleId: "r-waiter", clientId: "c-demo-grill", outletId: "o-demo-grill-main" },
  { id: "st-11", name: "Kemi Sample", roleId: "r-supervisor", clientId: "c-demo-lounge", outletId: "o-demo-lounge-vi" },
  { id: "st-12", name: "Lanre Sample", roleId: "r-chef", clientId: "c-demo-lounge", outletId: "o-demo-lounge-vi" },
  { id: "st-13", name: "Moji Sample", roleId: "r-housekeeper", clientId: "c-demo-grill", outletId: "o-demo-grill-main" },
  { id: "st-14", name: "Nneka Sample", roleId: "r-waiter", clientId: "c-demo-hotel", outletId: "o-demo-hotel-main" },
];

const nameOf = (list: { id: string; name: string }[], id: string) => list.find((x) => x.id === id)?.name ?? "";
const clientName = (id: string) => CONFIG.clients.find((c) => c.id === id)?.name ?? "";
const outletName = (id: string) => CONFIG.clients.flatMap((c) => c.outlets).find((o) => o.id === id)?.name ?? "";

function inAudience(a: Audience, s: Staff): boolean {
  if (a.allStaff) return true;
  if (!a.clientIds.length && !a.outletIds.length && !a.roleIds.length) return false;
  return (!a.clientIds.length || a.clientIds.includes(s.clientId)) && (!a.outletIds.length || a.outletIds.includes(s.outletId)) && (!a.roleIds.length || a.roleIds.includes(s.roleId));
}

function audienceText(a: Audience, applicants: boolean): string {
  const parts = a.allStaff ? ["All staff"] : [...a.clientIds.map(clientName), ...a.outletIds.map(outletName), ...a.roleIds.map((id) => nameOf(CONFIG.roles, id))].filter(Boolean);
  if (applicants) parts.push("Applicants");
  return parts.length ? parts.join(", ") : "No audience set";
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const ymdOffset = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return ymd(d);
};

interface Item {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  includeApplicants: boolean;
  requiresAcknowledgement: boolean;
  pinned: boolean;
  /** Requested live (published or scheduled). */
  live: boolean;
  /** Ended early by HR. */
  ended: boolean;
  publishMode: "now" | "schedule";
  publishAt: string | null;
  expiresOn: string;
  activity: ActivityEntry[];
  updatedAt: string;
}

const ALL: Audience = { allStaff: true, clientIds: [], outletIds: [], roleIds: [] };
const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7);
let seq = 0;
const entry = (action: string, from: string | null, to: string | null, note?: string): ActivityEntry => ({ id: `act-new-${++seq}`, at: new Date().toISOString(), actor: ME, action, from, to, ...(note ? { note } : {}) });

const STATUS_NAME: Record<AnnouncementStatus, string> = { draft: "Draft", scheduled: "Scheduled", published: "Published", expired: "Expired" };

function statusOf(i: Item): AnnouncementStatus {
  if (!i.live) return "draft";
  if (i.ended) return "expired";
  if (i.publishAt && new Date(i.publishAt).getTime() > Date.now()) return "scheduled";
  if (i.expiresOn && i.expiresOn < ymd(new Date())) return "expired";
  return "published";
}

function receiptsOf(i: Item): Receipt[] {
  const status = statusOf(i);
  if (status !== "published" && status !== "expired") return [];
  return ROSTER.filter((s) => inAudience(i.audience, s)).map((s, n) => {
    const k = (hash(i.id) + n * 7) % 10;
    const ack = i.requiresAcknowledgement && k < 3;
    const read = ack || k < 7;
    return {
      id: `${i.id}-${s.id}`,
      staffId: s.id,
      name: s.name,
      role: nameOf(CONFIG.roles, s.roleId),
      placement: `${clientName(s.clientId)}, ${outletName(s.outletId)}`,
      status: ack ? "acknowledged" : read ? "read" : "unread",
      readAt: read ? isoOffset(-(k % 4), 9 + (k % 5)) : null,
      acknowledgedAt: ack ? isoOffset(-(k % 4), 10 + (k % 5)) : null,
    };
  });
}

const excerpt = (b: string) => (b.length > 140 ? `${b.slice(0, 137).trim()}...` : b).replace(/\s+/g, " ");

function toRow(i: Item): AnnouncementRow {
  const receipts = receiptsOf(i);
  return {
    id: i.id,
    title: i.title,
    excerpt: excerpt(i.body),
    status: statusOf(i),
    audienceLabel: audienceText(i.audience, i.includeApplicants),
    includeApplicants: i.includeApplicants,
    pinned: i.pinned,
    requiresAcknowledgement: i.requiresAcknowledgement,
    publishAt: i.publishAt,
    expiresOn: i.expiresOn,
    counts: {
      recipients: ROSTER.filter((s) => inAudience(i.audience, s)).length,
      read: receipts.filter((r) => r.status !== "unread").length,
      acknowledged: receipts.filter((r) => r.status === "acknowledged").length,
    },
    updatedAt: i.updatedAt,
  };
}

function toDetail(i: Item): AnnouncementDetail {
  const status = statusOf(i);
  const at = i.publishAt ? new Date(i.publishAt) : null;
  return {
    ...toRow(i),
    body: i.body,
    audience: i.audience,
    publishMode: i.publishMode,
    scheduledDate: at ? ymd(at) : "",
    scheduledTime: at ? `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}` : "09:00",
    receipts: receiptsOf(i),
    activity: [...i.activity].sort((a, b) => b.at.localeCompare(a.at)),
    allowedActions: !canDo("announcements.manage") ? [] : status === "draft" ? ["publish"] : status === "scheduled" ? ["unpublish"] : status === "published" ? ["unpublish", "end"] : ["unpublish"],
    canEdit: canDo("announcements.manage"),
  };
}

let items: Item[] = [
  {
    id: "an-oct-rota",
    title: "October rota is now published",
    body: "The October rota is live in your Schedule. Please check your shifts this week and tell your supervisor about any clash before Friday.",
    audience: ALL,
    includeApplicants: false,
    requiresAcknowledgement: false,
    pinned: true,
    live: true,
    ended: false,
    publishMode: "now",
    publishAt: isoOffset(-2, 8),
    expiresOn: ymdOffset(20),
    activity: [
      { id: "an1-a1", at: isoOffset(-3, 15), actor: ME, action: "Created", from: null, to: "Draft" },
      { id: "an1-a2", at: isoOffset(-2, 8), actor: ME, action: "Published", from: "Draft", to: "Published" },
    ],
    updatedAt: isoOffset(-2, 8),
  },
  {
    id: "an-safety",
    title: "Updated fire safety procedure",
    body: "The fire and emergency evacuation SOP has changed. Please read it in SOPs & Training and acknowledge it by the end of the week.",
    audience: ALL,
    includeApplicants: false,
    requiresAcknowledgement: true,
    pinned: false,
    live: true,
    ended: false,
    publishMode: "now",
    publishAt: isoOffset(-5, 9),
    expiresOn: "",
    activity: [
      { id: "an2-a1", at: isoOffset(-6, 14), actor: ME, action: "Created", from: null, to: "Draft" },
      { id: "an2-a2", at: isoOffset(-5, 9), actor: ME, action: "Published", from: "Draft", to: "Published" },
    ],
    updatedAt: isoOffset(-5, 9),
  },
  {
    id: "an-hotel-training",
    title: "Hotel team: service training session",
    body: "A service training session is planned for the Demo Hotel Abuja team. Your supervisor will confirm the time and place.",
    audience: { allStaff: false, clientIds: ["c-demo-hotel"], outletIds: [], roleIds: ["r-waiter", "r-host"] },
    includeApplicants: false,
    requiresAcknowledgement: false,
    pinned: false,
    live: true,
    ended: false,
    publishMode: "schedule",
    publishAt: isoOffset(4, 8),
    expiresOn: ymdOffset(14),
    activity: [
      { id: "an3-a1", at: isoOffset(-1, 11), actor: ME, action: "Created", from: null, to: "Draft" },
      { id: "an3-a2", at: isoOffset(-1, 11), actor: ME, action: "Scheduled", from: "Draft", to: "Scheduled" },
    ],
    updatedAt: isoOffset(-1, 11),
  },
  {
    id: "an-uniform",
    title: "New uniform guidance",
    body: "Draft text. Uniform guidance for all outlets is being finalised and needs Beeliv confirmation before it is published.",
    audience: { allStaff: false, clientIds: [], outletIds: [], roleIds: [] },
    includeApplicants: false,
    requiresAcknowledgement: false,
    pinned: false,
    live: false,
    ended: false,
    publishMode: "now",
    publishAt: null,
    expiresOn: "",
    activity: [{ id: "an4-a1", at: isoOffset(-1, 16), actor: ME, action: "Created", from: null, to: "Draft" }],
    updatedAt: isoOffset(-1, 16),
  },
  {
    id: "an-sept-closing",
    title: "Public holiday opening times",
    body: "Outlets will follow the public holiday opening times shared by your supervisor. Please confirm your shift if you were asked to cover.",
    audience: ALL,
    includeApplicants: false,
    requiresAcknowledgement: false,
    pinned: false,
    live: true,
    ended: false,
    publishMode: "now",
    publishAt: isoOffset(-20, 9),
    expiresOn: ymdOffset(-7),
    activity: [
      { id: "an5-a1", at: isoOffset(-21, 10), actor: ME, action: "Created", from: null, to: "Draft" },
      { id: "an5-a2", at: isoOffset(-20, 9), actor: ME, action: "Published", from: "Draft", to: "Published" },
    ],
    updatedAt: isoOffset(-20, 9),
  },
];

function validate(input: AnnouncementInput, intent: "save" | "publish"): void {
  const f: FieldErrors = {};
  if (!input.title.trim()) f.title = "Enter a title.";
  if (!input.body.trim()) f.body = "Write the announcement.";
  const a = input.audience;
  if (intent === "publish" && !a.allStaff && !a.clientIds.length && !a.outletIds.length && !a.roleIds.length && !input.includeApplicants) f.audience = "Choose who this is for.";
  if (input.publishMode === "schedule" && intent === "publish" && !input.scheduledDate) f.scheduledDate = "Choose the date it goes live.";
  if (Object.keys(f).length) throw new AnnouncementValidationError(f);
}

function applyInput(i: Item, input: AnnouncementInput): Item {
  const when = input.publishMode === "schedule" && input.scheduledDate ? new Date(`${input.scheduledDate}T${input.scheduledTime || "09:00"}:00`).toISOString() : i.publishAt;
  return {
    ...i,
    title: input.title.trim(),
    body: input.body.trim(),
    audience: input.audience,
    includeApplicants: input.includeApplicants,
    requiresAcknowledgement: input.requiresAcknowledgement,
    pinned: input.pinned,
    publishMode: input.publishMode,
    publishAt: input.publishMode === "now" ? i.publishAt : when,
    expiresOn: input.expiresOn,
    updatedAt: new Date().toISOString(),
  };
}

function goLive(i: Item): Item {
  const publishAt = i.publishMode === "schedule" && i.publishAt ? i.publishAt : new Date().toISOString();
  return { ...i, live: true, ended: false, publishAt };
}

function change(id: string, apply: (i: Item) => Item): AnnouncementDetail {
  const found = items.find((i) => i.id === id);
  if (!found) throw new Error("Unknown announcement");
  const next = apply(found);
  items = items.map((i) => (i.id === id ? next : i));
  return toDetail(next);
}

export const mockAnnouncementAdapter: AnnouncementAdapter = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async getConfig() {
    const mode = getPrototypeMode();
    if (mode === "loading") return forever();
    await sleep(200);
    if (mode === "error") throw new Error("Dev fixture: simulated failure");
    return CONFIG;
  },

  async list(q) {
    const mode = getPrototypeMode();
    if (mode === "loading") return forever();
    await sleep(300);
    if (mode === "error") throw new Error("Dev fixture: simulated failure");
    if (mode === "empty") return { rows: [], total: 0, statusCounts: { all: 0, draft: 0, scheduled: 0, published: 0, expired: 0 }, workspaceEmpty: true, canCreate: canDo("announcements.manage") };
    const needle = q.search.trim().toLowerCase();
    const rows = items.map(toRow).filter((r) => !needle || `${r.title} ${r.audienceLabel}`.toLowerCase().includes(needle));
    const c = (s: AnnouncementStatus) => rows.filter((r) => r.status === s).length;
    const filtered = rows.filter((r) => !q.status || r.status === q.status).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
    return {
      rows: filtered.slice(0, q.limit),
      total: filtered.length,
      statusCounts: { all: rows.length, draft: c("draft"), scheduled: c("scheduled"), published: c("published"), expired: c("expired") },
      workspaceEmpty: false,
      canCreate: canDo("announcements.manage"),
    };
  },

  async get(id) {
    const mode = getPrototypeMode();
    if (mode === "loading") return forever();
    await sleep(250);
    if (mode === "error") throw new Error("Dev fixture: simulated failure");
    if (mode === "empty") return null;
    const found = items.find((i) => i.id === id);
    return found ? toDetail(found) : null;
  },

  async create(input, intent) {
    await sleep(400);
    validate(input, intent);
    const base: Item = { id: `an-new-${++seq}`, title: "", body: "", audience: input.audience, includeApplicants: false, requiresAcknowledgement: false, pinned: false, live: false, ended: false, publishMode: "now", publishAt: null, expiresOn: "", activity: [entry("Created", null, "Draft")], updatedAt: "" };
    let item = applyInput(base, input);
    if (intent === "publish") {
      item = goLive(item);
      item.activity = [...item.activity, entry(statusOf(item) === "scheduled" ? "Scheduled" : "Published", "Draft", STATUS_NAME[statusOf(item)])];
    }
    items = [item, ...items];
    return toDetail(item);
  },

  async update(id, input, intent) {
    await sleep(400);
    validate(input, intent);
    return change(id, (i) => {
      let next = applyInput(i, input);
      next.activity = [...i.activity, entry("Edited", null, null)];
      if (intent === "publish" && !i.live) {
        next = goLive(next);
        next.activity = [...next.activity, entry(statusOf(next) === "scheduled" ? "Scheduled" : "Published", "Draft", STATUS_NAME[statusOf(next)])];
      }
      return next;
    });
  },

  async perform(id, action: AnnouncementAction) {
    await sleep(350);
    return change(id, (i) => {
      const status = statusOf(i);
      switch (action) {
        case "publish": {
          if (status !== "draft") throw new Error("Not allowed");
          const next = goLive(i);
          next.updatedAt = new Date().toISOString();
          next.activity = [...i.activity, entry(statusOf(next) === "scheduled" ? "Scheduled" : "Published", "Draft", STATUS_NAME[statusOf(next)])];
          return next;
        }
        case "unpublish":
          return { ...i, live: false, ended: false, updatedAt: new Date().toISOString(), activity: [...i.activity, entry("Unpublished", STATUS_NAME[status], "Draft", "Staff can no longer see it.")] };
        case "end":
          if (status !== "published") throw new Error("Not allowed");
          return { ...i, ended: true, updatedAt: new Date().toISOString(), activity: [...i.activity, entry("Ended early", STATUS_NAME.published, STATUS_NAME.expired)] };
      }
    });
  },
};
