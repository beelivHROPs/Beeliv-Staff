/**
 * DEV FIXTURE for the SOP library: link details, read receipts and a few
 * extra assigned SOPs so every category state can be seen. The real links and
 * receipts come from the backend. Example URLs only (example.com).
 */
import type { SOP, SOPAssignment } from "../types";
import { addDays, todayISO } from "../format";
import type { SopItem, SopKind, SopReceipt } from "./types";

type Link = { url: string; kind: SopKind; minutes: number | null };

export const MOCK_SOP_LINKS: Record<string, Link> = {
  "sop-hygiene": { url: "https://example.com/beeliv/sops/kitchen-hygiene.pdf", kind: "document", minutes: 6 },
  // The fire-safety PDF, bar video and allergen link use real public sample hosts so the in-app reader can be checked:
  // a PDF in a frame, a YouTube player, and a video on a host that cannot be embedded (shows the "open in a new tab" fallback).
  "sop-fire": { url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", kind: "document", minutes: 8 },
  "sop-table": { url: "https://example.com/beeliv/sops/table-service", kind: "page", minutes: 10 },
  "sop-bar": { url: "https://www.youtube.com/watch?v=M7lc1UVf-VE", kind: "video", minutes: 7 },
  "sop-allergen": { url: "https://videos.example.org/beeliv/allergens", kind: "video", minutes: 5 },
  "sop-till": { url: "https://example.com/beeliv/sops/till-handling", kind: "page", minutes: null },
  // DEV ONLY: the real BH-HR-001 policy PDF, served from public/dev-samples (git-ignored) so the reader can show a real document.
  "sop-policy": { url: "/dev-samples/BH-HR-001-staff-welfare-hr-workplace-policy.pdf", kind: "document", minutes: 20 },
};

const sop = (id: string, title: string, category: string, description: string, version: string, ack: boolean): SOP => ({ id, title, category, description, version, department: null, requiresAcknowledgement: ack });

/** Extra assignments (the three older ones stay in adapters/mock.ts). */
export function extraSopAssignments(today = todayISO()): SOPAssignment[] {
  const base = { acknowledged: false, progress: 0, status: "assigned" as const, required: false };
  return [
    { ...base, id: "sa-bar", sop: sop("sop-bar", "Bar set-up and close-down", "Bar", "Opening checks, garnish prep and closing the bar.", "v1", false), assignedAt: addDays(today, -6), dueDate: null },
    { ...base, id: "sa-policy", sop: sop("sop-policy", "Staff welfare and workplace policy (BH-HR-001)", "Policy", "How Beeliv looks after staff: leave, attendance, conduct and escalation.", "v1", false), assignedAt: addDays(today, -1), dueDate: addDays(today, 7) },
    { ...base, id: "sa-allergen", sop: sop("sop-allergen", "Allergen awareness", "Kitchen", "Asking, recording and passing on allergy information.", "v2", false), assignedAt: addDays(today, -4), dueDate: addDays(today, 14) },
    { ...base, id: "sa-till", sop: sop("sop-till", "Handling the till", "Service", "Opening float, payments and end-of-shift count.", "v1", false), assignedAt: addDays(today, -20), dueDate: null, progress: 100, status: "completed" as const },
  ];
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

/** Receipts that already exist for this person. */
export function seedReceipts(): SopReceipt[] {
  return [
    { sopId: "sop-hygiene", version: "v1", readAt: hoursAgo(24 * 29), lastOpenedAt: hoursAgo(24 * 29) },
    { sopId: "sop-table", version: "v2", readAt: hoursAgo(24 * 3), lastOpenedAt: hoursAgo(26) },
    { sopId: "sop-till", version: "v1", readAt: hoursAgo(24 * 18), lastOpenedAt: hoursAgo(24 * 18) },
  ];
}

/** Joins assignments, links and receipts into the rows the screens show. Assignments with no link are left out. */
export function buildSopItems(assignments: SOPAssignment[], receipts: SopReceipt[]): SopItem[] {
  const out: SopItem[] = [];
  for (const a of assignments) {
    const link = MOCK_SOP_LINKS[a.sop.id];
    if (!link) continue;
    // A receipt only counts for the version it was recorded against.
    const r = receipts.find((x) => x.sopId === a.sop.id && x.version === a.sop.version);
    out.push({
      id: a.id,
      sopId: a.sop.id,
      title: a.sop.title,
      category: a.sop.category,
      description: a.sop.description,
      version: a.sop.version,
      kind: link.kind,
      url: link.url,
      minutes: link.minutes,
      assignedAt: a.assignedAt,
      dueDate: a.dueDate,
      required: a.required,
      needsSignOff: a.sop.requiresAcknowledgement,
      signedOff: a.acknowledged,
      readAt: r?.readAt ?? null,
      lastOpenedAt: r?.lastOpenedAt ?? null,
    });
  }
  return out;
}
