/**
 * Pure helpers for the SOP library: display status, counts, ordering and the
 * safe-link check. No business rules beyond "what word do we show".
 */
import type { SopItem, SopStatus } from "./types";

export const SOP_KIND_LABEL = { document: "Document", video: "Video", page: "Web page" } as const;

export function sopStatus(s: SopItem): SopStatus {
  if (!s.readAt) return "new";
  if (s.needsSignOff && !s.signedOff) return "sign-off";
  return "read";
}

export const SOP_STATUS_LABEL: Record<SopStatus, string> = { new: "New", "sign-off": "Needs sign-off", read: "Read" };

/** A link is only ever opened when it parses and is https. Returns the clean href or null. */
export function safeHttpsUrl(raw: string): string | null {
  // Dev-only sample files served from public/dev-samples (git-ignored, never in production builds).
  if (process.env.NODE_ENV !== "production" && /^\/dev-samples\/[\w.-]+\.pdf$/.test(raw)) return raw;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** Not finished yet: never opened, or opened but waiting for the sign-off. */
export const isOpenItem = (s: SopItem) => sopStatus(s) !== "read";

/** Due soonest first, then required, then title; items with no due date go last. */
export function byDue(a: SopItem, b: SopItem): number {
  if (a.dueDate !== b.dueDate) return a.dueDate === null ? 1 : b.dueDate === null ? -1 : a.dueDate.localeCompare(b.dueDate);
  if (a.required !== b.required) return a.required ? -1 : 1;
  return a.title.localeCompare(b.title);
}

/** The SOP to offer on "Continue where you left off": the latest opened one that still needs something, else the next unread. */
export function continueItem(items: SopItem[]): { item: SopItem; resumed: boolean } | null {
  const opened = items.filter((s) => s.lastOpenedAt && isOpenItem(s)).sort((a, b) => (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? ""));
  if (opened[0]) return { item: opened[0], resumed: true };
  const next = items.filter(isOpenItem).sort(byDue)[0];
  return next ? { item: next, resumed: false } : null;
}

export function readSummary(items: SopItem[]): { read: number; total: number; waitingSignOff: number } {
  return { read: items.filter((s) => sopStatus(s) === "read").length, total: items.length, waitingSignOff: items.filter((s) => sopStatus(s) === "sign-off").length };
}

export function categoryCounts(items: SopItem[]): { name: string; count: number; open: number }[] {
  const map = new Map<string, { name: string; count: number; open: number }>();
  for (const s of items) {
    const c = map.get(s.category) ?? { name: s.category, count: 0, open: 0 };
    c.count += 1;
    if (isOpenItem(s)) c.open += 1;
    map.set(s.category, c);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function sopMeta(s: SopItem): string {
  return [SOP_KIND_LABEL[s.kind], s.minutes ? `${s.minutes} min` : null].filter(Boolean).join(" · ");
}
