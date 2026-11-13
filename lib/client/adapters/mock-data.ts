/**
 * ====================================================================
 *  DEV FIXTURE - NOT REAL DATA. Delete when the Supabase adapter lands.
 * ====================================================================
 * The ONE deterministic source of Client sample data (brief section 28). Every
 * number the Client UI shows - tiles, donut, trend, schedule coverage,
 * attendance records, compliance, distribution - is derived from the records
 * built here, so they cannot disagree. There is no Math.random(): variety
 * comes from a small integer hash of (person, day), and every date is
 * computed relative to "today", so the demo always looks current.
 *
 * Persona: Kalina Hospitality (Mr. Adeyemi), outlets Kalina Abuja / Lekki /
 * Lagos. Kalina Abuja "today" is pinned to the brief's example:
 *   48 active - 42 present - 2 late - 1 absent - 3 on leave  (87.5%)
 * IDs are fixed fixture strings; nothing generates IDs in the browser.
 */
import { addDays, todayISO } from "../format";
import { DEPARTMENT_ORDER, SHIFTS } from "../labels";
import type {
  AttendanceRecord,
  AttendanceStatus,
  BeelivTeam,
  CandidateDetail,
  CandidateReview,
  ComplianceItem,
  ComplianceState,
  DepartmentId,
  ISODate,
  Outlet,
  PayrollEntry,
  ShiftKey,
  WorkforceMember,
  WorkforceRequest,
} from "../types";

export const CLIENT_NAME = "Kalina Hospitality";

export const USER = { id: "usr-client-001", firstName: "Tunde", lastName: "Adeyemi", salutation: "Mr.", avatarUrl: null, email: "tunde.adeyemi@kalina.example" } as const;

/** Contact channels are TBD until Beeliv approves them - name and role only. */
export const TEAM: BeelivTeam = { name: "Blessing Adebayo", role: "HR Manager", phone: null, email: null };

export const OUTLETS: Outlet[] = [
  { id: "kalina-abuja", name: "Kalina Abuja", location: "Abuja, FCT", imageUrl: null },
  { id: "kalina-lekki", name: "Kalina Lekki", location: "Lekki, Lagos", imageUrl: null },
  { id: "kalina-lagos", name: "Kalina Lagos", location: "Victoria Island, Lagos", imageUrl: null },
];

/* ------------------------------------------------------------------ */
/* Per-outlet composition                                              */
/* ------------------------------------------------------------------ */

type Spec = {
  departments: Record<DepartmentId, number>;
  /** [assigned, required] per shift. Assigned must add up to the headcount. */
  shifts: Record<ShiftKey, [number, number]>;
  /** Today's exceptions by member index within the outlet (Abuja only; others use the hash). */
  today?: { late: number[]; absent: number[]; leave: number[] };
  /** Compliance exceptions by member index. */
  compliance: Partial<Record<ComplianceState, number[]>>;
};

const SPEC: Record<string, Spec> = {
  "kalina-abuja": {
    departments: { "floor-service": 16, kitchen: 13, bar: 8, admin: 5, support: 6 },
    shifts: { morning: [18, 20], evening: [24, 24], night: [6, 8] },
    today: { late: [5, 29], absent: [37], leave: [11, 22, 41] },
    compliance: { outstanding: [20, 44], "update-required": [14], expiring: [6] },
  },
  "kalina-lekki": {
    departments: { "floor-service": 11, kitchen: 9, bar: 5, admin: 3, support: 4 },
    shifts: { morning: [12, 14], evening: [16, 16], night: [4, 6] },
    compliance: { outstanding: [5], expiring: [17] },
  },
  "kalina-lagos": {
    departments: { "floor-service": 8, kitchen: 7, bar: 4, admin: 2, support: 3 },
    shifts: { morning: [9, 10], evening: [12, 12], night: [3, 4] },
    compliance: { "update-required": [9] },
  },
};

const FIRST = ["Chinedu", "Amaka", "Tunde", "Ngozi", "Emeka", "Funke", "Ibrahim", "Zainab", "Segun", "Chioma", "Yusuf", "Bisi", "Uche", "Halima", "Femi", "Kemi", "Obinna"];
const LAST = ["Okafor", "Balogun", "Ekwueme", "Nwosu", "Bello", "Eze", "Lawal", "Okonkwo", "Musa", "Adebayo", "Ojo", "Uzor", "Danjuma", "Ogunleye", "Chukwu", "Salami", "Idowu", "Akande", "Nnamdi"];

const ROLES: Record<DepartmentId, string[]> = {
  "floor-service": ["Waiter", "Waitress", "Host", "Floor Captain"],
  kitchen: ["Line Cook", "Chef de Partie", "Sous Chef", "Kitchen Porter", "Pastry Cook"],
  bar: ["Bartender", "Barback", "Bar Supervisor"],
  admin: ["Cashier", "Front Desk Officer", "Stock Controller", "Accounts Assistant"],
  support: ["Cleaner", "Steward", "Driver", "Store Keeper"],
};
const DOCUMENT: Record<DepartmentId, string> = {
  "floor-service": "Food Handling Certificate",
  kitchen: "Food Safety Certificate",
  bar: "Food Handling Certificate",
  admin: "Health Certificate",
  support: "Health Certificate",
};

/** Small integer hash -> 0..999. Deterministic stand-in for "variety". */
function mix(a: number, b: number): number {
  let x = (Math.imul(a + 1, 374761393) + Math.imul(b + 7, 668265263)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x ^= x >>> 16;
  return (x >>> 0) % 1000;
}

const pad = (n: number, w: number) => String(n).padStart(w, "0");

/* ------------------------------------------------------------------ */
/* Build (once, lazily)                                                */
/* ------------------------------------------------------------------ */

export type Fixture = {
  today: ISODate;
  members: WorkforceMember[];
  records: AttendanceRecord[];
  compliance: ComplianceItem[];
  requiredByOutlet: Record<string, Record<ShiftKey, number>>;
  requests: WorkforceRequest[];
  candidates: CandidateReview[];
  candidateExtras: Record<string, Pick<CandidateDetail, "profileSummary" | "interviewSummary" | "documents" | "comments">>;
  screening: Record<string, number>;
  payroll: PayrollEntry[];
};

let cache: Fixture | null = null;

/** How many days of attendance history exist (covers 30-day and custom ranges). */
const HISTORY_DAYS = 60;

export function getFixture(): Fixture {
  const today = todayISO();
  if (cache && cache.today === today) return cache;

  const members: WorkforceMember[] = [];
  const memberIndex = new Map<string, number>(); // member id -> index within its outlet
  const complianceItems: ComplianceItem[] = [];
  const requiredByOutlet: Fixture["requiredByOutlet"] = {};
  const todayOverride = new Map<string, AttendanceStatus>();
  let g = 0; // global person counter (names, hashes)

  for (const outlet of OUTLETS) {
    const spec = SPEC[outlet.id];
    const n = Object.values(spec.departments).reduce((a, b) => a + b, 0);
    requiredByOutlet[outlet.id] = { morning: spec.shifts.morning[1], evening: spec.shifts.evening[1], night: spec.shifts.night[1] };
    const { morning, evening } = { morning: spec.shifts.morning[0], evening: spec.shifts.evening[0] };

    let idx = 0;
    for (const dept of DEPARTMENT_ORDER) {
      for (let k = 0; k < spec.departments[dept]; k++, idx++, g++) {
        // Shifts are spread across departments with a coprime stride (7 is coprime with 24, 32 and 48).
        const slot = (idx * 7) % n;
        const shift: ShiftKey = slot < morning ? "morning" : slot < morning + evening ? "evening" : "night";
        const named = outlet.id === "kalina-abuja" && idx === 20 ? "David James" : outlet.id === "kalina-abuja" && idx === 6 ? "Sarah Ade" : null;
        const id = `${outlet.id}-m${pad(idx + 1, 2)}`;
        memberIndex.set(id, idx);
        members.push({
          id,
          staffId: `BLV-STF-${pad(200 + g, 5)}`,
          name: named ?? `${FIRST[g % FIRST.length]} ${LAST[g % LAST.length]}`,
          role: ROLES[dept][k % ROLES[dept].length],
          departmentId: dept,
          outletId: outlet.id,
          assignmentStatus: "active",
          startDate: addDays(today, -(45 + (mix(g, 3) % 700))),
          shift,
          photoUrl: null,
        });
      }
    }

    // Today's pinned exceptions (Abuja) - everything else that day is "present".
    if (spec.today) {
      for (const i of spec.today.late) todayOverride.set(`${outlet.id}-m${pad(i + 1, 2)}`, "late");
      for (const i of spec.today.absent) todayOverride.set(`${outlet.id}-m${pad(i + 1, 2)}`, "absent");
      for (const i of spec.today.leave) todayOverride.set(`${outlet.id}-m${pad(i + 1, 2)}`, "on-leave");
    }

    // Compliance: one approved operational document per person.
    for (const m of members.filter((x) => x.outletId === outlet.id)) {
      const i = memberIndex.get(m.id) ?? 0;
      const state = (Object.keys(spec.compliance) as ComplianceState[]).find((s) => spec.compliance[s]?.includes(i)) ?? "complete";
      complianceItems.push({
        id: `doc-${m.id}`,
        memberId: m.id,
        staffName: m.name,
        outletId: m.outletId,
        document: DOCUMENT[m.departmentId],
        state,
        // "Expiring soon" is backend-decided; the fixture simply carries the date (12 Oct in the brief's example).
        expiresOn: state === "expiring" ? addDays(today, 12) : null,
      });
    }
  }

  // Attendance records: one per person per day over the history window.
  const records: AttendanceRecord[] = [];
  members.forEach((m, gi) => {
    for (let off = 0; off < HISTORY_DAYS; off++) {
      const date = addDays(today, -off);
      let status: AttendanceStatus;
      const pinned = off === 0 ? todayOverride.get(m.id) : undefined;
      if (pinned) status = pinned;
      else if (off === 0 && SPEC[m.outletId].today) status = "present";
      else {
        const v = mix(gi, off + 1000);
        status = v < 25 ? "absent" : v < 70 ? "late" : v < 105 ? "on-leave" : "present";
      }
      const v2 = mix(gi, off + 5000);
      const start = Number(SHIFTS[m.shift].start.slice(0, 2)) * 60;
      // Clock-in is display data only: a small spread around the shift start (fixture, implies no rule).
      const minutes = status === "late" ? start + 10 + (v2 % 31) : start + (v2 % 17) - 8;
      const wrapped = ((minutes % 1440) + 1440) % 1440;
      records.push({
        id: `att-${m.id}-${date}`,
        date,
        memberId: m.id,
        staffId: m.staffId,
        staffName: m.name,
        role: m.role,
        departmentId: m.departmentId,
        outletId: m.outletId,
        shift: m.shift,
        status,
        clockIn: status === "present" || status === "late" ? `${pad(Math.floor(wrapped / 60), 2)}:${pad(wrapped % 60, 2)}` : null,
      });
    }
  });

  // Workforce requests (Client -> Beeliv HR). Labels are backend-authored fixture text.
  const req = (id: number, outletId: string, role: string, departmentId: DepartmentId, count: number, status: WorkforceRequest["status"], reason: string, daysAgo: number, updatedAgo: number, hasUpdate = false): WorkforceRequest => ({
    id: `req-${id}`,
    publicId: `BLV-REQ-${pad(id, 4)}`,
    outletId,
    role,
    departmentId,
    count,
    resumptionDate: addDays(today, 21 + id),
    reason,
    notes: "",
    status,
    submittedOn: addDays(today, -daysAgo),
    updatedOn: addDays(today, -updatedAgo),
    hasUpdate,
  });
  const requests: WorkforceRequest[] = [
    req(1, "kalina-abuja", "Waiter", "floor-service", 2, "in-recruitment", "Expansion", 12, 1, true),
    req(2, "kalina-abuja", "Restaurant Supervisor", "floor-service", 1, "candidates-submitted", "Replacement", 20, 2),
    req(3, "kalina-abuja", "Bartender", "bar", 2, "in-recruitment", "Replacement", 15, 4),
    req(4, "kalina-lekki", "Sous Chef", "kitchen", 1, "candidates-submitted", "New opening", 18, 3),
    req(5, "kalina-lekki", "Barback", "bar", 1, "submitted", "Expansion", 2, 2),
    req(6, "kalina-lagos", "Cashier", "admin", 1, "in-recruitment", "Replacement", 9, 5),
  ];
  // Candidates deliberately submitted by Beeliv HR for review; screening is a count only.
  const cand = (id: number, name: string, position: string, outletId: string, submittedAgo: number, experience: string, skills: string[], feedback: CandidateReview["feedback"] = null): CandidateReview => ({
    id: `cand-${id}`,
    name,
    position,
    outletId,
    submittedOn: addDays(today, -submittedAgo),
    experienceSummary: experience,
    skills,
    feedback,
  });
  const candidates: CandidateReview[] = [
    cand(1, "Ifeoma Nwosu", "Restaurant Supervisor", "kalina-abuja", 2, "6 years in full-service restaurants", ["Team leadership", "Guest relations", "Rota planning"]),
    cand(2, "Kelechi Obi", "Restaurant Supervisor", "kalina-abuja", 2, "4 years, hotel dining rooms", ["Service standards", "Training", "POS systems"]),
    cand(3, "Adaeze Uche", "Restaurant Supervisor", "kalina-abuja", 2, "5 years, casual and fine dining", ["Floor management", "Complaint handling"]),
    cand(4, "Damilola Fashola", "Sous Chef", "kalina-lekki", 3, "7 years in hotel kitchens", ["Menu costing", "Team supervision", "HACCP"]),
    cand(5, "Chidi Onuoha", "Sous Chef", "kalina-lekki", 3, "5 years, restaurant kitchens", ["Grill and sauce", "Prep planning"]),
    cand(6, "Rasheed Ogunbanjo", "Sous Chef", "kalina-lekki", 5, "6 years, banqueting and catering", ["Large-volume production", "Stock control"], "interested"),
  ];

  // Detail shown on the candidate page (Beeliv-authorised fields only; document NAMES, never files).
  const extra = (profileSummary: string, interviewSummary: string, documents: string[]) => ({ profileSummary, interviewSummary, documents, comments: [] });
  const candidateExtras: Fixture["candidateExtras"] = {
    "cand-1": extra("Confident floor leader who has run busy dining rooms and trained new servers.", "Interviewed by Beeliv HR. Clear communicator with strong guest-handling examples. Assessment: recommended for review.", ["CV", "Food Handling Certificate", "Reference letter"]),
    "cand-2": extra("Hotel-trained supervisor with a strong service-standards background.", "Interviewed by Beeliv HR. Calm under pressure; keen on training roles. Assessment: recommended for review.", ["CV", "Food Handling Certificate"]),
    "cand-3": extra("Experienced in both casual and fine dining floors; handles complaints well.", "Interviewed by Beeliv HR. Practical, people-first approach. Assessment: recommended for review.", ["CV", "Reference letter"]),
    "cand-4": extra("Senior hotel-kitchen cook with menu costing and team supervision experience.", "Interviewed by Beeliv HR. Strong technical answers; practical kitchen assessment passed.", ["CV", "Food Safety Certificate", "Reference letter"]),
    "cand-5": extra("Restaurant-kitchen cook comfortable running a section.", "Interviewed by Beeliv HR. Good prep discipline; practical kitchen assessment passed.", ["CV", "Food Safety Certificate"]),
    "cand-6": extra("Large-volume production specialist from banqueting and catering.", "Interviewed by Beeliv HR. Reliable and organised; practical kitchen assessment passed.", ["CV", "Food Safety Certificate", "Reference letter"]),
  };

  // Payroll schedule visibility: three completed months, then the next month upcoming.
  const now = new Date();
  const payroll: PayrollEntry[] = [];
  for (const outlet of OUTLETS) {
    const headcount = members.filter((m) => m.outletId === outlet.id).length;
    for (let k = -2; k <= 1; k++) {
      const first = new Date(now.getFullYear(), now.getMonth() + k, 1);
      const last = new Date(now.getFullYear(), now.getMonth() + k + 1, 0);
      const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
      payroll.push({
        id: `pay-${outlet.id}-${iso(first).slice(0, 7)}`,
        outletId: outlet.id,
        outletName: outlet.name,
        label: first.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
        periodStart: iso(first),
        periodEnd: iso(last),
        scheduledDate: iso(last),
        workforceIncluded: headcount,
        status: k === 1 ? "upcoming" : "completed",
      });
    }
  }

  cache = { today, members, records, compliance: complianceItems, requiredByOutlet, requests, candidates, candidateExtras, screening: { "req-3": 2 }, payroll };
  return cache;
}

/* ------------------------------------------------------------------ */
/* New-client onboarding (DEV FIXTURE)                                 */
/* ------------------------------------------------------------------ */

/** Pre-filled from the invitation; the user confirms or edits them at "Your details". */
export const ONBOARDING_DETAILS = { fullName: "", jobTitle: "", phone: "", preferredContact: "email" } as const;

/** Titles only. The full text is supplied by Beeliv (TBD) - never invented here. */
export const ONBOARDING_AGREEMENTS = [
  { id: "client-terms", title: "Beeliv Client terms", version: "1.0" },
  { id: "data-use", title: "Data-use acknowledgement", version: "1.0" },
] as const;

/** Placeholder default (all on) until Beeliv approves the notification set. TBD. */
export const ONBOARDING_NOTIFICATIONS = { candidates: true, requests: true, attendance: true, compliance: true, payroll: true, interviews: true, recruitmentProgress: true, staffAssignments: true, scheduleChanges: true, complianceExpiring: true, announcements: true, channelInApp: true, channelEmail: true } as const;
