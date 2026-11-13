/**
 * DEV FIXTURE for SOPs, Training and Agreements. Everything is FICTIONAL
 * ("Sample" people, "Demo" clients). The rules below (how an audience is
 * matched, what a new version does to existing completions, which action is
 * allowed in which status) are PROVISIONAL mock behaviour so the UI can be
 * exercised; the spec is silent and the backend owns them (needs Beeliv
 * confirmation). There is no file storage: PDFs and videos carry metadata only.
 * Replace with a Supabase adapter implementing ContentAdapter.
 */
import { canDo } from "../role-access";
import { isoOffset } from "@/lib/applicant/time";
import type { AdapterEvent } from "../adapter";
import { getPrototypeMode, subscribePrototypeMode } from "../dev-controls";
import type { ContentAdapter } from "./adapter";
import {
  ContentValidationError,
  type ActivityEntry,
  type Assignee,
  type Audience,
  type ContentAction,
  type ContentConfig,
  type ContentDetail,
  type ContentInput,
  type ContentKind,
  type ContentRow,
  type ContentStatus,
  type Counts,
  type FieldErrors,
  type PdfAttachment,
  type SectionInput,
  type TrackStatus,
  type TrainingType,
  type VersionEntry,
  type VideoSlot,
} from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const forever = () => new Promise<never>(() => {});
const listeners = new Set<(e: AdapterEvent) => void>();
subscribePrototypeMode(() => listeners.forEach((l) => l("reset")));

const ME = "Funke Sample";
const OTHER = "Kelechi Sample";

/* ---------- configurable data (departments, roles, clients, categories) ---------- */

const CONFIG: ContentConfig = {
  categories: {
    sop: ["Food safety", "Guest service", "Cash handling", "Health and safety", "Bar operations", "Housekeeping"],
    training: ["Guest service", "Food safety", "Bar operations", "Beverage"],
    agreement: ["Conduct", "Confidentiality", "Appearance"],
  },
  departments: [
    { id: "d-foh", name: "Front of house" },
    { id: "d-kitchen", name: "Kitchen" },
    { id: "d-bar", name: "Bar" },
    { id: "d-hk", name: "Housekeeping" },
    { id: "d-mgmt", name: "Management" },
  ],
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
  trainingTypes: [
    { value: "course", label: "Course" },
    { value: "video", label: "Video" },
    { value: "document", label: "Document" },
    { value: "practical", label: "Practical" },
  ],
  canCreate: true,
};

interface Staff {
  id: string;
  name: string;
  roleId: string;
  deptId: string;
  clientId: string;
  outletId: string;
}
const ROSTER: Staff[] = [
  { id: "st-1", name: "Adaeze Sample", roleId: "r-waiter", deptId: "d-foh", clientId: "c-demo-hotel", outletId: "o-demo-hotel-main" },
  { id: "st-2", name: "Bayo Sample", roleId: "r-bartender", deptId: "d-bar", clientId: "c-demo-lounge", outletId: "o-demo-lounge-vi" },
  { id: "st-3", name: "Chidi Sample", roleId: "r-chef", deptId: "d-kitchen", clientId: "c-demo-grill", outletId: "o-demo-grill-main" },
  { id: "st-4", name: "Dayo Sample", roleId: "r-waiter", deptId: "d-foh", clientId: "c-demo-lounge", outletId: "o-demo-lounge-vi" },
  { id: "st-5", name: "Efe Sample", roleId: "r-housekeeper", deptId: "d-hk", clientId: "c-demo-hotel", outletId: "o-demo-hotel-main" },
  { id: "st-6", name: "Folake Sample", roleId: "r-supervisor", deptId: "d-mgmt", clientId: "c-demo-hotel", outletId: "o-demo-hotel-main" },
  { id: "st-7", name: "Gbenga Sample", roleId: "r-chef", deptId: "d-kitchen", clientId: "c-demo-hotel", outletId: "o-demo-hotel-main" },
  { id: "st-8", name: "Halima Sample", roleId: "r-host", deptId: "d-foh", clientId: "c-demo-grill", outletId: "o-demo-grill-main" },
  { id: "st-9", name: "Ife Sample", roleId: "r-bartender", deptId: "d-bar", clientId: "c-demo-hotel", outletId: "o-demo-hotel-main" },
  { id: "st-10", name: "Jide Sample", roleId: "r-waiter", deptId: "d-foh", clientId: "c-demo-grill", outletId: "o-demo-grill-main" },
  { id: "st-11", name: "Kemi Sample", roleId: "r-supervisor", deptId: "d-mgmt", clientId: "c-demo-lounge", outletId: "o-demo-lounge-vi" },
  { id: "st-12", name: "Lanre Sample", roleId: "r-chef", deptId: "d-kitchen", clientId: "c-demo-lounge", outletId: "o-demo-lounge-vi" },
  { id: "st-13", name: "Moji Sample", roleId: "r-housekeeper", deptId: "d-hk", clientId: "c-demo-grill", outletId: "o-demo-grill-main" },
  { id: "st-14", name: "Nneka Sample", roleId: "r-waiter", deptId: "d-foh", clientId: "c-demo-hotel", outletId: "o-demo-hotel-main" },
];

const nameOf = (list: { id: string; name: string }[], id: string) => list.find((x) => x.id === id)?.name ?? "";
const roleName = (id: string) => nameOf(CONFIG.roles, id);
const clientName = (id: string) => CONFIG.clients.find((c) => c.id === id)?.name ?? "";
const outletName = (id: string) => CONFIG.clients.flatMap((c) => c.outlets).find((o) => o.id === id)?.name ?? "";

/** PROVISIONAL: a person is in the audience when they match every group that has a selection (any one value within a group). Needs Beeliv confirmation. */
function inAudience(a: Audience, s: Staff): boolean {
  if (a.allStaff) return true;
  const any = a.clientIds.length || a.outletIds.length || a.roleIds.length || a.departmentIds.length;
  if (!any) return false;
  return (
    (!a.clientIds.length || a.clientIds.includes(s.clientId)) &&
    (!a.outletIds.length || a.outletIds.includes(s.outletId)) &&
    (!a.roleIds.length || a.roleIds.includes(s.roleId)) &&
    (!a.departmentIds.length || a.departmentIds.includes(s.deptId))
  );
}

function audienceLabel(a: Audience): string {
  if (a.allStaff) return "All staff";
  const parts = [
    ...a.clientIds.map(clientName),
    ...a.outletIds.map(outletName),
    ...a.roleIds.map(roleName),
    ...a.departmentIds.map((id) => nameOf(CONFIG.departments, id)),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "No audience set";
}

/* ---------- dates ---------- */

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const ymdOffset = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return ymd(d);
};
const todayYmd = () => ymd(new Date());

/* ---------- state ---------- */

interface Item {
  id: string;
  kind: ContentKind;
  title: string;
  category: string;
  summary: string;
  departmentId: string;
  trainingType: TrainingType;
  durationMinutes: number | null;
  required: boolean;
  effectiveDate: string;
  dueDate: string;
  sections: SectionInput[];
  pdf: PdfAttachment | null;
  video: VideoSlot | null;
  audience: Audience;
  status: ContentStatus;
  versionNo: number;
  liveNo: number | null;
  versions: VersionEntry[];
  activity: ActivityEntry[];
  assignees: Assignee[];
  updatedAt: string;
}

const hash = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7);
let seq = 0;
const entry = (action: string, from: string | null, to: string | null, note?: string): ActivityEntry => ({ id: `act-new-${++seq}`, at: new Date().toISOString(), actor: ME, action, from, to, ...(note ? { note } : {}) });

function makeAssignee(item: Item, s: Staff, i: number): Assignee {
  const k = (hash(item.id) + i * 7) % 10;
  let status: TrackStatus;
  if (item.kind === "agreement") status = k < 6 ? "accepted" : "pending";
  else status = k < 4 ? "completed" : k < 6 ? "in-progress" : "assigned";
  if ((status === "assigned" || status === "in-progress") && item.dueDate && item.dueDate < todayYmd()) status = "overdue";
  const done = status === "completed" || status === "accepted";
  return {
    id: `${item.id}-${s.id}`,
    staffId: s.id,
    name: s.name,
    role: roleName(s.roleId),
    placement: `${clientName(s.clientId)}, ${outletName(s.outletId)}`,
    status,
    dueDate: item.dueDate,
    doneAt: done ? isoOffset(-(k + 1), 10) : null,
    doneVersion: done ? `v${item.liveNo ?? item.versionNo}` : null,
  };
}

/** Keeps existing progress for people still in the audience, adds new people, drops removed ones. */
function reassign(item: Item): Assignee[] {
  const prev = new Map(item.assignees.map((a) => [a.staffId, a]));
  return ROSTER.filter((s) => inAudience(item.audience, s)).map((s, i) => {
    const old = prev.get(s.id);
    return old ? { ...old, dueDate: item.dueDate, status: refreshOverdue(item, old) } : makeAssignee(item, s, i);
  });
}
function refreshOverdue(item: Item, a: Assignee): TrackStatus {
  if (a.status === "overdue" && !(item.dueDate && item.dueDate < todayYmd())) return "assigned";
  if ((a.status === "assigned" || a.status === "in-progress") && item.dueDate && item.dueDate < todayYmd()) return "overdue";
  return a.status;
}

function counts(assignees: Assignee[]): Counts {
  const n = (...s: TrackStatus[]) => assignees.filter((a) => s.includes(a.status)).length;
  return { assigned: assignees.length, done: n("completed", "accepted"), inProgress: n("in-progress"), overdue: n("overdue"), reaccept: n("reaccept") };
}

const ALL: Audience = { allStaff: true, clientIds: [], outletIds: [], roleIds: [], departmentIds: [] };
const aud = (p: Partial<Audience>): Audience => ({ ...ALL, allStaff: false, ...p });

function seed(p: Partial<Item> & Pick<Item, "id" | "kind" | "title" | "category" | "summary" | "sections" | "audience" | "status">, ageDays: number, liveNoteBy = ME): Item {
  const versionNo = p.versionNo ?? 1;
  const base: Item = {
    departmentId: "",
    trainingType: "course",
    durationMinutes: null,
    required: false,
    effectiveDate: "",
    dueDate: "",
    pdf: null,
    video: null,
    versionNo,
    liveNo: p.status === "published" ? versionNo : null,
    versions: [],
    activity: [],
    assignees: [],
    updatedAt: isoOffset(-ageDays, 11),
    ...p,
  };
  const live = base.liveNo;
  base.versions = p.versions ?? [
    ...Array.from({ length: (live ?? versionNo) - 1 }, (_, i) => ({ version: `v${i + 1}`, state: "superseded" as const, at: isoOffset(-ageDays - 60 + i * 20, 10), by: OTHER, note: "Earlier version" })),
    { version: `v${versionNo}`, state: live ? ("live" as const) : ("draft" as const), at: isoOffset(-ageDays, 11), by: liveNoteBy, note: live ? "Published" : "Draft" },
  ];
  base.activity = p.activity ?? [
    { id: `${p.id}-a1`, at: isoOffset(-ageDays - 2, 9), actor: liveNoteBy, action: "Created", from: null, to: "Draft" },
    ...(live ? [{ id: `${p.id}-a2`, at: isoOffset(-ageDays, 11), actor: liveNoteBy, action: "Published", from: "Draft", to: "Published" }] : []),
  ];
  if (base.status !== "draft" || base.liveNo) base.assignees = reassign(base);
  return base;
}

const sec = (id: string, title: string, body: string): SectionInput => ({ id, title, body });
const PLACEHOLDER_LEGAL = "[Placeholder wording. The final legal text needs Beeliv confirmation before this is published.]";

let items: Item[] = buildSeed();

function buildSeed(): Item[] {
  seq = 0;
  const reack = seed(
    {
      id: "ct-sop-hygiene",
      kind: "sop",
      title: "Food safety and hygiene",
      category: "Food safety",
      summary: "How every team member keeps food, hands and surfaces safe during service.",
      departmentId: "d-kitchen",
      required: true,
      effectiveDate: ymdOffset(-40),
      dueDate: ymdOffset(-5),
      sections: [
        sec("s1", "Personal hygiene", "Wash hands before starting a shift, after breaks and after handling raw food.\n\nHair is tied back and uniforms are clean at the start of every shift."),
        sec("s2", "Storing and labelling food", "Label every container with the date it was prepared.\n\nKeep raw and cooked food apart and store chilled items at the right temperature. The exact temperature limits need Beeliv confirmation."),
        sec("s3", "Cleaning surfaces", "Clean and sanitise preparation surfaces between tasks.\n\nReport any pest sign to your supervisor straight away."),
      ],
      pdf: { fileName: "food-safety-handbook.pdf", sizeBytes: 482_000 },
      audience: aud({ departmentIds: ["d-kitchen", "d-bar"] }),
      status: "published",
      versionNo: 3,
    },
    52,
  );
  return [
    reack,
    seed(
      {
        id: "ct-sop-opening",
        kind: "sop",
        title: "Restaurant opening checklist",
        category: "Guest service",
        summary: "The steps to open the floor before the first guest arrives.",
        departmentId: "d-foh",
        required: true,
        effectiveDate: ymdOffset(-20),
        dueDate: ymdOffset(10),
        sections: [
          sec("s1", "Before doors open", "Check tables, menus and lighting.\n\nConfirm the day's bookings and special requests with your supervisor."),
          sec("s2", "Greeting guests", "Greet every guest within the standard Beeliv time. The time standard needs Beeliv confirmation.\n\nSeat guests, offer menus and note allergies."),
        ],
        video: { mode: "link", url: "https://example.com/videos/opening-checklist" },
        audience: aud({ roleIds: ["r-waiter", "r-host"] }),
        status: "published",
      },
      21,
    ),
    seed(
      {
        id: "ct-sop-cash",
        kind: "sop",
        title: "Cash handling and till reconciliation",
        category: "Cash handling",
        summary: "How to take payment, give change and reconcile the till at close.",
        departmentId: "d-foh",
        required: true,
        effectiveDate: ymdOffset(14),
        dueDate: "",
        sections: [sec("s1", "Taking payment", "Count change back to the guest.\n\nNever leave the till open and unattended.")],
        audience: aud({ clientIds: ["c-demo-lounge", "c-demo-grill"], roleIds: ["r-waiter", "r-supervisor"] }),
        status: "draft",
      },
      3,
    ),
    seed(
      {
        id: "ct-sop-fire",
        kind: "sop",
        title: "Fire and emergency evacuation",
        category: "Health and safety",
        summary: "What to do and where to go if the alarm sounds.",
        departmentId: "d-mgmt",
        required: false,
        effectiveDate: ymdOffset(-90),
        dueDate: "",
        sections: [sec("s1", "When the alarm sounds", "Stay calm and guide guests to the nearest marked exit.\n\nDo not use lifts.")],
        pdf: { fileName: "evacuation-plan.pdf", sizeBytes: 215_000 },
        audience: ALL,
        status: "published",
      },
      35,
    ),
    seed(
      {
        id: "ct-sop-bar-close",
        kind: "sop",
        title: "Bar closing procedure",
        category: "Bar operations",
        summary: "Closing the bar, stock check and cleaning.",
        departmentId: "d-bar",
        required: true,
        effectiveDate: ymdOffset(-200),
        sections: [sec("s1", "Closing steps", "Count stock, clean the taps and lock the spirits cabinet.")],
        audience: aud({ departmentIds: ["d-bar"] }),
        status: "archived",
        versionNo: 2,
      },
      120,
    ),
    seed(
      {
        id: "ct-tr-service",
        kind: "training",
        title: "Service excellence basics",
        category: "Guest service",
        summary: "A short course on greeting, listening and handling guest concerns calmly.",
        trainingType: "course",
        durationMinutes: 45,
        required: true,
        dueDate: ymdOffset(12),
        sections: [
          sec("s1", "Why service matters", "Guests remember how they were treated more than anything else."),
          sec("s2", "Handling a complaint", "Listen, apologise, act and follow up."),
        ],
        audience: ALL,
        status: "published",
      },
      14,
    ),
    seed(
      {
        id: "ct-tr-alcohol",
        kind: "training",
        title: "Responsible alcohol service",
        category: "Bar operations",
        summary: "Recognising when to refuse service and keeping guests safe.",
        trainingType: "video",
        durationMinutes: 30,
        required: true,
        dueDate: ymdOffset(-3),
        sections: [sec("s1", "Overview", "Watch the video then read the notes. The legal age and local rules need Beeliv confirmation.")],
        video: { mode: "upload", fileName: "responsible-service.mp4", sizeBytes: 38_400_000 },
        audience: aud({ roleIds: ["r-bartender", "r-waiter"] }),
        status: "published",
      },
      28,
    ),
    seed(
      {
        id: "ct-tr-allergen",
        kind: "training",
        title: "Allergen awareness",
        category: "Food safety",
        summary: "The major allergens and how to answer a guest's allergy question.",
        trainingType: "document",
        durationMinutes: 20,
        required: false,
        sections: [sec("s1", "Overview", "Draft content. To be completed.")],
        pdf: { fileName: "allergen-guide.pdf", sizeBytes: 301_000 },
        audience: aud({ departmentIds: ["d-kitchen", "d-foh"] }),
        status: "draft",
      },
      1,
    ),
    seed(
      {
        id: "ct-ag-conduct",
        kind: "agreement",
        title: "Staff Welfare, HR & Workplace Policy Standard (BH-HR-001)",
        category: "Conduct",
        summary: "Beeliv's staff welfare, HR and workplace policy. Staff confirm they have read it and agree to comply.",
        required: true,
        effectiveDate: ymdOffset(-10),
        sections: [sec("s1", "Agreement wording", `${PLACEHOLDER_LEGAL}\n\nI will treat guests, colleagues and clients with respect.`)],
        audience: ALL,
        status: "published",
        versionNo: 2,
      },
      10,
    ),
    seed(
      {
        id: "ct-ag-confidential",
        kind: "agreement",
        title: "Confidentiality agreement",
        category: "Confidentiality",
        summary: "Keeping guest, client and company information private.",
        required: true,
        effectiveDate: ymdOffset(-60),
        sections: [sec("s1", "Agreement wording", PLACEHOLDER_LEGAL)],
        audience: ALL,
        status: "published",
      },
      60,
    ),
    seed(
      {
        id: "ct-ag-uniform",
        kind: "agreement",
        title: "Uniform and grooming policy",
        category: "Appearance",
        summary: "Acknowledging the uniform and grooming standard.",
        required: false,
        effectiveDate: ymdOffset(20),
        sections: [sec("s1", "Agreement wording", PLACEHOLDER_LEGAL)],
        audience: aud({ clientIds: ["c-demo-hotel"] }),
        status: "draft",
      },
      2,
    ),
  ].map(fixAgreement);
}

/** The code of conduct is on v2: the people who accepted v1 must accept again. */
function fixAgreement(i: Item): Item {
  if (i.id !== "ct-ag-conduct") return i;
  return {
    ...i,
    assignees: i.assignees.map((a, n) => (a.status === "accepted" && n % 2 === 0 ? { ...a, status: "reaccept" as const, doneVersion: "v1" } : a)),
    versions: i.versions.map((v) => (v.version === "v2" ? { ...v, note: "Published. People who accepted v1 were asked to accept again." } : v)),
  };
}

/* ---------- mapping ---------- */

function allowed(i: Item): ContentAction[] {
  return i.status === "draft" ? ["publish", "archive"] : i.status === "published" ? ["unpublish", "archive"] : ["restore"];
}

function toRow(i: Item): ContentRow {
  return {
    id: i.id,
    kind: i.kind,
    title: i.title,
    category: i.category,
    version: `v${i.versionNo}`,
    liveVersion: i.status === "draft" && i.liveNo ? `v${i.liveNo}` : null,
    status: i.status,
    audienceLabel: audienceLabel(i.audience),
    required: i.required,
    effectiveDate: i.effectiveDate,
    dueDate: i.dueDate,
    counts: counts(i.assignees),
    updatedAt: i.updatedAt,
    hasPdf: !!i.pdf,
    hasVideo: !!i.video,
  };
}

const toDetail = (i: Item): ContentDetail => ({
  ...toRow(i),
  summary: i.summary,
  departmentId: i.departmentId,
  trainingType: i.trainingType,
  durationMinutes: i.durationMinutes,
  sections: i.sections,
  pdf: i.pdf,
  video: i.video,
  audience: i.audience,
  versions: [...i.versions].reverse(),
  activity: [...i.activity].sort((a, b) => b.at.localeCompare(a.at)),
  assignees: i.assignees,
  allowedActions: canDo("content.manage") ? allowed(i) : [],
  canEdit: i.status !== "archived" && canDo("content.manage"),
});

function validate(input: ContentInput, intent: "save" | "publish"): void {
  const f: FieldErrors = {};
  if (!input.title.trim()) f.title = "Enter a title.";
  if (!input.category) f.category = "Choose a category.";
  if (!input.sections.length || input.sections.some((s) => !s.title.trim() || !s.body.trim())) f.sections = "Every section needs a title and some text.";
  if (intent === "publish" && !input.audience.allStaff && !input.audience.clientIds.length && !input.audience.outletIds.length && !input.audience.roleIds.length && !input.audience.departmentIds.length) f.audience = "Choose who this is for.";
  if (input.video?.mode === "link" && !/^https?:\/\//i.test(input.video.url.trim())) f.video = "Enter a link that starts with http:// or https://.";
  if (Object.keys(f).length) throw new ContentValidationError(f);
}

function applyInput(i: Item, input: ContentInput): Item {
  const duration = input.durationMinutes.trim() ? Number(input.durationMinutes) : null;
  return {
    ...i,
    title: input.title.trim(),
    category: input.category,
    summary: input.summary.trim(),
    departmentId: input.departmentId,
    trainingType: input.trainingType,
    durationMinutes: duration !== null && Number.isFinite(duration) ? duration : null,
    required: input.required,
    effectiveDate: input.effectiveDate,
    dueDate: input.dueDate,
    sections: input.sections.map((s) => ({ id: s.id, title: s.title.trim(), body: s.body.trim() })),
    pdf: input.pdf,
    video: input.video,
    audience: input.audience,
    updatedAt: new Date().toISOString(),
  };
}

function publishItem(i: Item): Item {
  const supersedes = i.liveNo && i.liveNo !== i.versionNo;
  const next: Item = {
    ...i,
    status: "published",
    liveNo: i.versionNo,
    versions: i.versions.map((v) => (v.version === `v${i.versionNo}` ? { ...v, state: "live" as const, at: new Date().toISOString(), by: ME, note: "Published" } : v.state === "live" ? { ...v, state: "superseded" as const } : v)),
    updatedAt: new Date().toISOString(),
  };
  // PROVISIONAL: a new agreement version forces re-acceptance (the project lead's rule). A new SOP version keeps earlier acknowledgements, shown against the older version (needs Beeliv confirmation).
  const refreshed = reassign(next);
  next.assignees = supersedes && i.kind === "agreement" ? refreshed.map((a) => (a.status === "accepted" ? { ...a, status: "reaccept" as const } : a)) : refreshed;
  return next;
}

function change(id: string, apply: (i: Item) => Item): ContentDetail {
  const found = items.find((i) => i.id === id);
  if (!found) throw new Error("Unknown item");
  const next = apply(found);
  items = items.map((i) => (i.id === id ? next : i));
  return toDetail(next);
}

const STATUS_NAME: Record<ContentStatus, string> = { draft: "Draft", published: "Published", archived: "Archived" };

function emptyPage(): ReturnType<ContentAdapter["list"]> extends Promise<infer P> ? P : never {
  const z = { all: 0, draft: 0, published: 0, archived: 0 };
  return { rows: [], total: 0, statusCounts: z, kindCounts: { sop: 0, training: 0, agreement: 0 }, facets: { categories: [] }, workspaceEmpty: true, canCreate: canDo("content.manage") };
}

export const mockContentAdapter: ContentAdapter = {
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
    if (mode === "empty") return emptyPage();
    const ofKind = items.filter((i) => i.kind === q.kind);
    const needle = q.search.trim().toLowerCase();
    const searched = ofKind.filter((i) => (!q.category || i.category === q.category) && (!needle || `${i.title} ${i.category} ${audienceLabel(i.audience)}`.toLowerCase().includes(needle)));
    const filtered = searched.filter((i) => !q.status || i.status === q.status).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const c = (s: ContentStatus) => searched.filter((i) => i.status === s).length;
    return {
      rows: filtered.slice(0, q.limit).map(toRow),
      total: filtered.length,
      statusCounts: { all: searched.length, draft: c("draft"), published: c("published"), archived: c("archived") },
      kindCounts: { sop: items.filter((i) => i.kind === "sop").length, training: items.filter((i) => i.kind === "training").length, agreement: items.filter((i) => i.kind === "agreement").length },
      facets: { categories: [...new Set(ofKind.map((i) => i.category))].sort() },
      workspaceEmpty: false,
      canCreate: canDo("content.manage"),
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
    const id = `ct-new-${++seq}`;
    let item: Item = applyInput(
      {
        id,
        kind: input.kind,
        title: "",
        category: "",
        summary: "",
        departmentId: "",
        trainingType: "course",
        durationMinutes: null,
        required: false,
        effectiveDate: "",
        dueDate: "",
        sections: [],
        pdf: null,
        video: null,
        audience: input.audience,
        status: "draft",
        versionNo: 1,
        liveNo: null,
        versions: [{ version: "v1", state: "draft", at: new Date().toISOString(), by: ME, note: "Draft" }],
        activity: [entry("Created", null, "Draft")],
        assignees: [],
        updatedAt: "",
      },
      input,
    );
    if (intent === "publish") {
      item = publishItem(item);
      item.activity = [entry("Published", "Draft", "Published"), ...item.activity];
    }
    items = [item, ...items];
    return toDetail(item);
  },

  async update(id, input, intent) {
    await sleep(400);
    validate(input, intent);
    return change(id, (i) => {
      if (i.status === "archived") throw new Error("Not allowed");
      let next = applyInput(i, input);
      if (i.status === "published") {
        // Editing a published item creates the next version as a draft; staff keep seeing the live one.
        const n = i.versionNo + 1;
        next = {
          ...next,
          status: "draft",
          versionNo: n,
          versions: [...i.versions, { version: `v${n}`, state: "draft", at: new Date().toISOString(), by: ME, note: "Draft of the next version" }],
          activity: [...i.activity, entry(`Created v${n} as a draft`, `v${i.versionNo} live`, `v${n} draft`, `Staff keep seeing v${i.versionNo} until v${n} is published.`)],
        };
      } else {
        next = { ...next, activity: [...i.activity, entry("Edited", null, null)] };
      }
      if (intent === "publish") {
        const before = next.status;
        next = publishItem(next);
        next.activity = [...next.activity, entry("Published", STATUS_NAME[before], STATUS_NAME.published)];
      }
      return next;
    });
  },

  async perform(id, input) {
    await sleep(350);
    return change(id, (i) => {
      if (!allowed(i).includes(input.action)) throw new Error("Not allowed");
      const at = new Date().toISOString();
      switch (input.action) {
        case "publish": {
          const next = publishItem(i);
          next.activity = [...i.activity, entry(i.liveNo && i.liveNo !== i.versionNo ? `Published v${i.versionNo}` : "Published", STATUS_NAME[i.status], STATUS_NAME.published)];
          return next;
        }
        case "unpublish":
          return { ...i, status: "draft", liveNo: null, updatedAt: at, versions: i.versions.map((v) => (v.state === "live" ? { ...v, state: "draft" as const } : v)), activity: [...i.activity, entry("Unpublished", STATUS_NAME.published, STATUS_NAME.draft, "Staff can no longer open it. Progress already recorded is kept.")] };
        case "archive":
          return { ...i, status: "archived", updatedAt: at, activity: [...i.activity, entry("Archived", STATUS_NAME[i.status], STATUS_NAME.archived)] };
        case "restore":
          return { ...i, status: "draft", liveNo: null, updatedAt: at, activity: [...i.activity, entry("Restored", STATUS_NAME.archived, STATUS_NAME.draft)] };
      }
    });
  },
};
