/**
 * Re-acceptance gate (docs/contracts/pilot-decisions-2026-10-18.md, decision 2).
 * When a required agreement gets a new published version, the people who must accept it
 * are notified and blocked from business screens until they accept.
 *
 * PRESENTATION FIXTURE ONLY. The real state is server-owned (a per-person "pending
 * agreement version" and a server-side block on business routes, see
 * docs/contracts/ops-agreements.md section 10). This file only lets the prototype show it:
 *   - `?demo=reaccept` (server-decided, lib/dev-demo.ts): a clearly labelled sample is pending.
 *   - Publishing a version with "People must accept again" on in the mock Agreements store
 *     writes a pending item to this browser's localStorage so the mock users see it.
 * Both exist ONLY when the layout rendered `data-bv-demo="on"` (preview mode, not a
 * production build, never when the backend is live). Remove with the other demo code.
 */
import { useMemo, useSyncExternalStore } from "react";

export type ReacceptApp = "admin" | "client" | "staff";

export interface PendingAgreement {
  docId: string;
  title: string;
  version: string;
  /** The publisher's change note, plain text. */
  changeNote: string;
  /** Plain text body; null = wording not available (cannot be accepted). */
  body: string | null;
  publishedAt: string;
  /** True for the labelled `?demo=reaccept` sample. */
  sample?: boolean;
}

interface Stored extends PendingAgreement {
  audience: ReacceptApp[];
  acceptedBy: ReacceptApp[];
  /** The publishing identity counts as having read it. */
  publishedByOps: boolean;
}

const KEY = "bv-reaccept-v1";
const DEMO_KEY = "bv-reaccept-demo-accepted-v1";
const EVENT = "bv-reaccept-change";

/** Who must accept which document (mirrors ops-agreements.md section 1; needs Beeliv confirmation). */
export const AUDIENCE: Record<string, ReacceptApp[]> = {
  "staff-welfare": ["staff"],
  "data-protection": ["staff", "admin"],
  "client-terms": ["client"],
};

const SAMPLE_DOC: Record<ReacceptApp, { docId: string; title: string }> = {
  admin: { docId: "data-protection", title: "Data protection and confidentiality" },
  client: { docId: "client-terms", title: "Client terms" },
  staff: { docId: "staff-welfare", title: "Staff Welfare, HR & Workplace Policy Standard" },
};

const SAMPLE: Omit<PendingAgreement, "docId" | "title"> = {
  version: "v2.0",
  changeNote: "LAYOUT SAMPLE ONLY. This note shows where the publisher's description of what changed will appear.",
  body: "LAYOUT SAMPLE ONLY. This is not Beeliv wording and has no legal meaning. It exists so the acceptance screen can be reviewed. Beeliv supplies the real text.",
  publishedAt: new Date(2026, 9, 18, 9, 0).toISOString(),
  sample: true,
};

const live = (): boolean => typeof document !== "undefined" && !!document.querySelector('[data-bv-demo="on"]');
const demoName = (): string | null => (live() ? new URLSearchParams(window.location.search).get("demo") : null);

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the prototype state simply is not kept.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Called by the mock Agreements adapter after a publish. No-op unless the demo flag is on. */
export function recordMockPublish(p: { docId: string; title: string; version: string; changeNote: string; body: string; publishedAt: string; reaccept: boolean }) {
  if (!live()) return;
  const audience = AUDIENCE[p.docId];
  if (!audience) return; // public pages never block
  const items = read<Stored[]>(KEY, []).filter((i) => i.docId !== p.docId);
  if (p.reaccept) items.unshift({ docId: p.docId, title: p.title, version: p.version, changeNote: p.changeNote, body: p.body, publishedAt: p.publishedAt, audience, acceptedBy: [], publishedByOps: true });
  write(KEY, items);
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  window.addEventListener("popstate", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
    window.removeEventListener("popstate", cb);
  };
}
/** Subscribe for services that need to refresh (notifications). */
export const subscribeReaccept = subscribe;

const snapshot = (): string => {
  if (!live()) return "off";
  return `${demoName() ?? ""}|${window.localStorage.getItem(KEY) ?? ""}|${window.localStorage.getItem(DEMO_KEY) ?? ""}`;
};

const EMPTY: ReturnType<typeof compute> = { pending: [], all: [] };

function compute(app: ReacceptApp, isOps: boolean): { pending: PendingAgreement[]; all: (PendingAgreement & { accepted: boolean })[] } {
  if (!live()) return { pending: [], all: [] };
  const demo = demoName() === "reaccept";
  const demoDone = read<ReacceptApp[]>(DEMO_KEY, []);
  const all: (PendingAgreement & { accepted: boolean })[] = [];
  if (demo) all.push({ ...SAMPLE, ...SAMPLE_DOC[app], accepted: demoDone.includes(app) });
  for (const i of read<Stored[]>(KEY, [])) {
    if (!i.audience.includes(app)) continue;
    const accepted = i.acceptedBy.includes(app) || (app === "admin" && isOps && i.publishedByOps);
    all.push({ ...i, accepted });
  }
  return { pending: all.filter((x) => !x.accepted), all };
}

/** What the person still has to accept, and the notification history. `isOps`: the Operations identity published it, so it is not asked again. */
export function useReaccept(app: ReacceptApp, isOps = false) {
  const snap = useSyncExternalStore(subscribe, snapshot, () => "off");
  // During hydration `snap` is "off" (the server snapshot), so the first client render matches the server HTML.
  return useMemo(() => (snap === "off" ? EMPTY : compute(app, isOps)), [snap, app, isOps]);
}

/** Records the acceptance of one pending item for this app (mock). */
export function acceptReaccept(app: ReacceptApp, item: PendingAgreement) {
  if (item.sample) {
    const done = read<ReacceptApp[]>(DEMO_KEY, []);
    if (!done.includes(app)) write(DEMO_KEY, [...done, app]);
    return;
  }
  write(KEY, read<Stored[]>(KEY, []).map((i) => (i.docId === item.docId && i.version === item.version && !i.acceptedBy.includes(app) ? { ...i, acceptedBy: [...i.acceptedBy, app] } : i)));
}

/** Notification entries for the app (read once accepted). Shaped by the caller. */
export function reacceptNotes(app: ReacceptApp, isOps = false): { id: string; title: string; message: string; createdAt: string; read: boolean; version: string }[] {
  const { all } = compute(app, isOps);
  return all.map((i) => ({
    id: `reaccept-${i.docId}-${i.version}`,
    title: i.accepted ? `You accepted the updated ${i.title}` : `A new version of ${i.title} needs your acceptance`,
    message: i.accepted ? `Version ${i.version.replace(/^v/, "")} is on record.` : `Version ${i.version.replace(/^v/, "")} was published. Please review and accept it to keep using Beeliv.`,
    createdAt: i.publishedAt,
    read: i.accepted,
    version: i.version,
  }));
}
