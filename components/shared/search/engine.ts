/**
 * Global search matching. Simple on purpose: case-insensitive, every word the person
 * typed must appear somewhere in the item, and a match at the start of the title beats a
 * match in the middle, which beats a match only in the muted line or the hidden keywords.
 * Highlighting is done here, in the browser (the server only ranks and returns text).
 */
import type { SearchEntry, SearchGroupDef, SearchShortcut } from "./types";

export const MIN_QUERY = 2;
/** Rows shown per type in the panel before "Show all N". */
export const GROUP_LIMIT = 4;
/** Rows per type on the full results page before "Show more". */
export const PAGE_LIMIT = 10;

export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordStart = (text: string, token: string) => text.startsWith(token) || new RegExp(`[\\s/&(,.-]${escapeRe(token)}`).test(text);

/** 0 = no match. Higher = better. */
export function scoreText(title: string, rest: string, query: string): number {
  const q = norm(query).trim();
  if (!q) return 0;
  const t = norm(title);
  const r = norm(rest);
  const tokens = q.split(/\s+/);
  let score = 0;
  for (const tok of tokens) {
    if (t.startsWith(tok)) score += 30;
    else if (wordStart(t, tok)) score += 20;
    else if (t.includes(tok)) score += 12;
    else if (wordStart(r, tok)) score += 6;
    else if (r.includes(tok)) score += 3;
    else return 0;
  }
  if (t.startsWith(q)) score += 15;
  return score;
}

export interface ResultGroup {
  key: string;
  label: string;
  def: SearchGroupDef;
  /** Every match, best first. */
  entries: SearchEntry[];
}

export function searchEntries(entries: SearchEntry[], groups: SearchGroupDef[], query: string, sort: "relevance" | "name" = "relevance"): ResultGroup[] {
  const scored = new Map<string, { e: SearchEntry; s: number }[]>();
  for (const e of entries) {
    const s = scoreText(e.title, [e.subtitle ?? "", e.status ?? "", ...(e.keys ?? [])].join(" "), query);
    if (s <= 0) continue;
    const list = scored.get(e.group) ?? [];
    list.push({ e, s });
    scored.set(e.group, list);
  }
  const out: ResultGroup[] = [];
  for (const g of groups) {
    const list = scored.get(g.key);
    if (!list?.length) continue;
    if (sort === "name") list.sort((a, b) => a.e.title.localeCompare(b.e.title));
    else list.sort((a, b) => b.s - a.s || a.e.title.localeCompare(b.e.title));
    out.push({ key: g.key, label: g.label, def: g, entries: list.map((x) => x.e) });
  }
  return out;
}

export function matchShortcuts(shortcuts: SearchShortcut[], query: string): SearchShortcut[] {
  const scored = shortcuts.map((s) => ({ s, n: scoreText(s.title, "", query) })).filter((x) => x.n > 0);
  scored.sort((a, b) => b.n - a.n);
  return scored.map((x) => x.s);
}

/**
 * "jobs: chef" limits the search to one type. The word before the colon must be the type's
 * name, its singular or one of its aliases (prefix of at least 3 letters is enough).
 */
export function parseTypePrefix(query: string, groups: SearchGroupDef[]): { type: string | null; rest: string } {
  const m = /^\s*([A-Za-z][A-Za-z &]{1,30}?)\s*:\s*(.*)$/.exec(query);
  if (!m) return { type: null, rest: query };
  const word = norm(m[1]).trim();
  if (word.length < 3) return { type: null, rest: query };
  for (const g of groups) {
    const names = [g.label, g.singular, g.key, ...(g.aliases ?? [])].map(norm);
    if (names.some((n) => n === word || (word.length >= 3 && n.startsWith(word)))) return { type: g.key, rest: m[2] };
  }
  return { type: null, rest: query };
}

/** Splits text into plain and matched pieces for soft highlighting. */
export function highlightParts(text: string, query: string): { t: string; hit: boolean }[] {
  const tokens = norm(query).trim().split(/\s+/).filter((x) => x.length > 0);
  if (!tokens.length || !text) return [{ t: text, hit: false }];
  const n = norm(text);
  // norm() can change length only for decomposed accents; fall back to no highlight then.
  if (n.length !== text.length) return [{ t: text, hit: false }];
  const mark = new Array<boolean>(text.length).fill(false);
  for (const tok of tokens) {
    let from = 0;
    for (;;) {
      const i = n.indexOf(tok, from);
      if (i < 0) break;
      for (let k = i; k < i + tok.length; k++) mark[k] = true;
      from = i + tok.length;
    }
  }
  const out: { t: string; hit: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = out[out.length - 1];
    if (last && last.hit === mark[i]) last.t += text[i];
    else out.push({ t: text[i], hit: mark[i] });
  }
  return out;
}

export type StatusTone = "ok" | "warn" | "bad" | "mute";

/** Dot colour for a plain status word. Words only, so it works for every app. */
export function statusTone(label: string): StatusTone {
  const s = label.toLowerCase();
  if (/(declin|reject|cancel|withdr|expired|absent|suspend|overdue|missing|closed|failed|archiv)/.test(s)) return "bad";
  if (/(pend|wait|draft|review|resubmi|late|closing|pause|hold|new|outstanding|needs|scheduled|submitted|awaiting|not scheduled|assigned|in progress|upcoming|unread)/.test(s)) return "warn";
  if (/(approv|accept|verif|publish|active|complete|present|filled|sent|read|live|done|open|on shift|current)/.test(s)) return "ok";
  return "mute";
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
