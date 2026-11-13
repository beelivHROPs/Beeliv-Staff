/**
 * sessionStorage helpers for the Request Talent flow (client only).
 *
 * Two keys, both per browser tab and gone when the tab closes:
 *   - DRAFT_KEY: what the visitor has typed so far, so a refresh or browser
 *     Back/Forward keeps their answers. Only what they typed; cleared as soon as
 *     the request is submitted.
 *   - SENT_KEY: the non-sensitive display info the "Request received" screen
 *     needs (need labels, headcount, location, reference). No name, email or
 *     phone is ever written here.
 *
 * Every call is wrapped: storage can throw (private mode, quota, disabled).
 */
import type { NeedId } from "./request";
import { parseDraft, type Draft } from "./request-rules";

const DRAFT_KEY = "beeliv.request.draft.v1";
const SENT_KEY = "beeliv.request.sent.v1";

export function loadDraft(): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? parseDraft(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft): void {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable: the form still works, it just will not survive a refresh */
  }
}

export function clearDraft(): void {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** What the received screen shows. Deliberately contains no contact details. */
export type SentInfo = {
  needs: NeedId[];
  headcount: number | null;
  location: string;
  reference: string | null;
};

export function saveSent(info: SentInfo): void {
  try {
    window.sessionStorage.setItem(SENT_KEY, JSON.stringify(info));
  } catch {
    /* ignore */
  }
}

/** Raw string snapshot for useSyncExternalStore ("" when nothing stored). */
export function readSentRaw(): string {
  try {
    return window.sessionStorage.getItem(SENT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function parseSent(raw: string): SentInfo | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<SentInfo>;
    const needs = Array.isArray(o.needs)
      ? (o.needs.filter((n): n is NeedId =>
          ["recruitment", "training", "systems", "audit", "unsure"].includes(n as string),
        ) as NeedId[])
      : [];
    return {
      needs,
      headcount: typeof o.headcount === "number" && Number.isFinite(o.headcount) ? o.headcount : null,
      location: typeof o.location === "string" ? o.location.slice(0, 200) : "",
      reference: typeof o.reference === "string" ? o.reference.slice(0, 40) : null,
    };
  } catch {
    return null;
  }
}
