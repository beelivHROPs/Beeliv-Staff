"use client";

/**
 * State and keyboard behaviour for the global search panel. Used by both the desktop
 * field and the phone sheet (they each own an instance; only one is ever visible).
 *
 * - The searchable list is fetched once each time the panel opens (provider.load) and kept
 *   in memory while it stays open: no network, no per-keystroke fetching.
 * - Typing does not search: results appear after Enter, behind a short spinner (lib/ui/search-feel.ts).
 * - "jobs: chef" (or choosing a type chip) limits the search to one type.
 * - Empty query: a few "Quick actions" for this role, then recent searches (clearable) and a suggestion.
 * - Typing: matching actions ("Schedule an interview") come first, then the data types.
 * - ">" (or Ctrl+Shift+P) is an optional shortcut that lists every action; it is not the main path.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { LucideIcon } from "@/components/applicant/icons";
import { Search, Sparkles } from "@/components/applicant/icons";
import { SEARCH_FEEL_MS } from "@/lib/ui/search-feel";
import { GROUP_LIMIT, MIN_QUERY, parseTypePrefix, scoreText, searchEntries } from "./engine";
import type { SearchAction, SearchEntry, SearchGroupDef, SearchProvider } from "./types";

export type SearchRow =
  | { kind: "item"; id: string; title: string; subtitle?: string; icon: LucideIcon; href: string; status?: string; person?: boolean; hint?: string; terms: string }
  | { kind: "more"; id: string; sectionKey: string; title: string }
  | { kind: "recent"; id: string; title: string }
  | { kind: "action"; id: string; action: SearchAction; recent: boolean; terms: string };

export interface SearchSection {
  key: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
  rows: SearchRow[];
  /** "Clear" button in the heading (recent searches). */
  clearable?: boolean;
}

export interface SearchChip {
  key: string | null;
  label: string;
  count: number;
  icon?: LucideIcon;
}

export type SearchStatus = "idle" | "loading" | "ready" | "failed";

const RECENT_MAX = 5;
const FILTERED_LIMIT = 8;
const recentKey = (appId: string) => `beeliv-search-recent-${appId}`;
const usedKey = (appId: string) => `beeliv-search-actions-${appId}`;
const ACTION_RECENT_MAX = 5;
const QUICK_MAX = 5;

function readUsed(appId: string): string[] {
  try {
    const raw = window.localStorage.getItem(usedKey(appId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, ACTION_RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function writeUsed(appId: string, list: string[]) {
  try {
    window.localStorage.setItem(usedKey(appId), JSON.stringify(list));
  } catch {
    // Storage unavailable: "recently used" simply is not kept.
  }
}

/** Actions that match a typed word (label, area or hidden synonyms), best first. */
function rankActions(actions: SearchAction[], q: string): SearchAction[] {
  return actions
    .map((a) => ({ a, s: scoreText(a.title, [a.category, ...(a.keywords ?? [])].join(" "), q) }))
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || x.a.title.localeCompare(y.a.title))
    .map((x) => x.a);
}

function readRecent(appId: string): string[] {
  try {
    const raw = window.localStorage.getItem(recentKey(appId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function writeRecent(appId: string, list: string[]) {
  try {
    window.localStorage.setItem(recentKey(appId), JSON.stringify(list));
  } catch {
    // Storage unavailable: recent searches simply are not kept.
  }
}

/** The "See all results" page for a query (and optionally one type). */
export function searchPageHref(provider: Pick<SearchProvider, "searchPath">, q: string, type?: string | null): string {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (type) p.set("type", type);
  const s = p.toString();
  return s ? `${provider.searchPath}?${s}` : provider.searchPath;
}

export function toItemRow(g: SearchGroupDef, e: SearchEntry, terms: string): SearchRow {
  return { kind: "item", id: `${g.key}-${e.id}`, title: e.title, subtitle: e.subtitle, icon: e.icon, href: e.href, status: e.status, person: e.person, hint: g.singular, terms };
}

export function useGlobalSearch(provider: SearchProvider, onNavigate?: () => void, groupLimit: number = GROUP_LIMIT) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQueryState] = useState("");
  const [settled, setSettled] = useState("");
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [chip, setChipState] = useState<string | null>(null);
  const [used, setUsed] = useState<string[]>([]);
  const loadId = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    const id = ++loadId.current;
    setStatus("loading");
    provider.load().then(
      (list) => {
        if (id !== loadId.current) return;
        setEntries(list);
        setStatus("ready");
      },
      () => {
        if (id !== loadId.current) return;
        setEntries([]);
        setStatus("failed");
      },
    );
  }, [provider]);

  const openRef = useRef(false);
  const openPanel = useCallback(() => {
    if (openRef.current) return;
    openRef.current = true;
    setOpen(true);
    setRecent(readRecent(provider.appId));
    setUsed(readUsed(provider.appId));
    load();
  }, [load, provider.appId]);

  const closePanel = useCallback(() => {
    loadId.current++;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSubmitting(false);
    openRef.current = false;
    setOpen(false);
  }, []);

  /** Close and clear, ready for the next time. */
  const reset = useCallback(() => {
    closePanel();
    setQueryState("");
    setSettled("");
    setActive(0);
    setExpanded([]);
    setChipState(null);
  }, [closePanel]);

  // Typing does not search. Results follow Enter (startSearch below) after a short wait with a spinner; clearing the box resets at once.
  useEffect(() => {
    if (query.trim() !== "") return;
    const t = setTimeout(() => {
      setSettled("");
      setActive(0);
      setExpanded([]);
    }, 0);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);
  const startSearch = () => {
    const trimmed = query.trim();
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSubmitting(true);
    searchTimer.current = setTimeout(() => {
      setSettled(trimmed);
      setActive(0);
      setExpanded([]);
      setSubmitting(false);
    }, SEARCH_FEEL_MS);
  };

  const setQuery = (v: string) => {
    setQueryState(v);
    if (!open) openPanel();
  };

  const setChip = (key: string | null) => {
    setChipState(key);
    setActive(0);
    setExpanded([]);
  };

  const clearRecent = () => {
    writeRecent(provider.appId, []);
    setRecent([]);
  };

  /** Remove one recent search (the small x on a phone pill). */
  const removeRecent = (title: string) => {
    const next = readRecent(provider.appId).filter((r) => r !== title);
    writeRecent(provider.appId, next);
    setRecent(next);
  };


  // Optional power-user shortcut: ">" lists every action (the main path is plain typing).
  const commandMode = provider.actions.length > 0 && query.trimStart().startsWith(">");
  const cmdTerm = commandMode ? query.trimStart().slice(1).trim() : "";
  const parsed = useMemo(() => (commandMode ? { type: null, rest: "" } : parseTypePrefix(settled, provider.groups)), [settled, provider.groups, commandMode]);
  const type = commandMode ? null : (parsed.type ?? chip);
  const term = parsed.rest.trim();
  const searching = !commandMode && term.length >= MIN_QUERY;

  /** Every match across all types (counts for the chips). */
  const allGroups = useMemo(() => (searching ? searchEntries(entries, provider.groups, term) : []), [entries, provider.groups, term, searching]);

  const chips = useMemo<SearchChip[]>(() => {
    if (!searching || allGroups.length === 0) return [];
    const total = allGroups.reduce((n, g) => n + g.entries.length, 0);
    return [{ key: null, label: "All", count: total }, ...allGroups.map((g) => ({ key: g.key, label: g.label, count: g.entries.length, icon: g.def.icon }))];
  }, [allGroups, searching]);

  const sections = useMemo<SearchSection[]>(() => {
    const out: SearchSection[] = [];
    const cap = (key: string, label: string, rows: SearchRow[], limit: number, extra: Partial<SearchSection> = {}) => {
      const isOpen = expanded.includes(key);
      // One spare row is not worth a "Show all": just show it.
      const fits = rows.length <= limit + 1;
      const list = isOpen || fits ? [...rows] : rows.slice(0, limit);
      if (!fits && !isOpen) list.push({ kind: "more", id: `more-${key}`, sectionKey: key, title: `Show all ${rows.length}` });
      out.push({ key, label, rows: list, count: rows.length, ...extra });
    };

    const actionRow = (a: SearchAction, recentMark: boolean, t: string): SearchRow => ({ kind: "action", id: `${recentMark ? "actr" : "act"}-${a.id}`, action: a, recent: recentMark, terms: t });
    const byId = (id: string) => provider.actions.find((a) => a.id === id);

    if (commandMode) {
      const recentActs = used.map(byId).filter((a): a is SearchAction => !!a);
      const ranked = cmdTerm ? rankActions(provider.actions, cmdTerm) : provider.actions.filter((a) => !recentActs.includes(a));
      if (!cmdTerm && recentActs.length) out.push({ key: "cmd-recent", label: "Recently used", rows: recentActs.map((a) => actionRow(a, true, "")) });
      const cats: { name: string; rows: SearchRow[] }[] = [];
      for (const a of ranked) {
        let c = cats.find((x) => x.name === a.category);
        if (!c) cats.push((c = { name: a.category, rows: [] }));
        c.rows.push(actionRow(a, false, cmdTerm));
      }
      for (const c of cats) out.push({ key: `cat-${c.name}`, label: c.name, rows: c.rows });
      return out;
    }
    if (searching && !type) {
      // Actions whose own label matches come first. Actions that only match a hidden synonym ("leave" -> Sign out) never
      // outrank or crowd out real results: they show only when nothing else matched (">" lists every action regardless).
      const ranked = rankActions(provider.actions, term);
      const strong = ranked.filter((a) => scoreText(a.title, "", term) > 0);
      const hits = (strong.length > 0 || allGroups.length > 0 ? strong : ranked).slice(0, 3);
      if (hits.length) out.push({ key: "actions", label: "Actions", icon: Sparkles, rows: hits.map((a) => actionRow(a, false, term)) });
    }

    // One type chosen, nothing typed yet: browse that type.
    if (type && !searching) {
      const def = provider.groups.find((g) => g.key === type);
      if (def) {
        const rows = entries.filter((e) => e.group === type).map((e) => toItemRow(def, e, ""));
        if (rows.length) cap(def.key, def.label, rows, FILTERED_LIMIT, { icon: def.icon });
      }
      return out;
    }
    if (settled.length === 0) {
      // Project lead 2026-10-18: search covers the app's own things only, never the sidebar pages ("Go to" removed).
      if (provider.actions.length) {
        const usedActs = used.map(byId).filter((a): a is SearchAction => !!a);
        const quick = provider.actions.filter((a) => a.quick);
        const list = [...usedActs.filter((a) => a.quick), ...quick.filter((a) => !usedActs.includes(a))].slice(0, QUICK_MAX);
        const rows: SearchRow[] = list.map((a) => actionRow(a, false, ""));
        if (provider.actions.length > list.length) rows.push({ kind: "more", id: "more-cmd", sectionKey: "cmd", title: "See all actions" });
        if (rows.length) out.push({ key: "actions-empty", label: "Quick actions", icon: Sparkles, rows });
      }
      if (recent.length) out.push({ key: "recent", label: "Recent searches", clearable: true, rows: recent.map((r) => ({ kind: "recent", id: `recent-${r}`, title: r })) });
      return out;
    }
    if (searching) {
      for (const g of allGroups) {
        if (type && g.key !== type) continue;
        cap(
          g.key,
          g.label,
          g.entries.map((e) => toItemRow(g.def, e, term)),
          type ? FILTERED_LIMIT : groupLimit,
          { icon: g.def.icon },
        );
      }
      if (allGroups.length) out.push({ key: "seeall", label: "", rows: [{ kind: "item", id: "seeall", title: `See all results for "${term}"`, icon: Search, href: searchPageHref(provider, term, type), terms: "" }] });
    }
    // Pages come first for a typed word, before any matching action.
    const pagesAt = out.findIndex((x) => x.key === "pages");
    if (pagesAt > 0) out.unshift(...out.splice(pagesAt, 1));
    if (provider.fallback && !type) {
      const f = provider.fallback(term || settled);
      out.push({ key: "fallback", label: "", rows: [{ kind: "item", id: "fallback", title: f.title, icon: f.icon, href: f.href, terms: "" }] });
    }
    return out;
  }, [settled, term, type, searching, entries, expanded, recent, provider, allGroups, commandMode, cmdTerm, used, groupLimit]);

  const flat = useMemo(() => sections.flatMap((s) => s.rows), [sections]);
  const activeRow = flat[Math.min(active, Math.max(flat.length - 1, 0))] ?? null;
  const activeId = activeRow ? `gs-${activeRow.id}` : undefined;

  const hasResults = sections.some((s) => s.key !== "recent" && s.key !== "fallback" && s.key !== "seeall" && s.key !== "actions" && s.key !== "actions-empty" && s.rows.some((r) => r.kind === "item"));
  const noResults = searching && status === "ready" && !hasResults;
  const loading = (searching || !!type) && status === "loading";
  const failed = (searching || !!type) && status === "failed" && !hasResults;
  const tooShort = !commandMode && settled.length > 0 && !searching && !type;
  const noActions = commandMode && cmdTerm.length > 0 && sections.length === 0;
  const typeLabel = type ? provider.groups.find((g) => g.key === type)?.label : undefined;

  const choose = (row: SearchRow, newTab = false) => {
    if (row.kind === "more") {
      if (row.sectionKey === "cmd") {
        setQueryState(">");
        setActive(0);
        return;
      }
      setExpanded((e) => [...e, row.sectionKey]);
      return;
    }
    if (row.kind === "action") {
      const a = row.action;
      writeUsed(provider.appId, [a.id, ...readUsed(provider.appId).filter((x) => x !== a.id)].slice(0, ACTION_RECENT_MAX));
      reset();
      onNavigate?.();
      if (a.href) router.push(a.href);
      else void a.run?.();
      return;
    }
    if (row.kind === "recent") {
      setQueryState(row.title);
      setSettled(row.title);
      setActive(0);
      return;
    }
    if (searching) writeRecent(provider.appId, [term, ...readRecent(provider.appId).filter((r) => r !== term)].slice(0, RECENT_MAX));
    if (newTab) {
      window.open(row.href, "_blank", "noopener");
      return;
    }
    reset();
    onNavigate?.();
    router.push(row.href);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) openPanel();
      if (flat.length === 0) return;
      const dir = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (Math.min(i, flat.length - 1) + dir + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!commandMode && query.trim() !== "" && query.trim() !== settled) {
        startSearch();
        return;
      }
      if (activeRow && open && !submitting) choose(activeRow, e.ctrlKey || e.metaKey);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        closePanel();
      }
    }
  };

  /** Esc from anywhere inside the panel (for example from a type chip). */
  const onEscapeKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      closePanel();
    }
  };

  const awaitingEnter = !commandMode && !submitting && query.trim() !== "" && query.trim() !== settled;

  return {
    submitting,
    awaitingEnter,
    onEscapeKey,
    open,
    openPanel,
    closePanel,
    reset,
    query,
    setQuery,
    sections,
    flat,
    activeId,
    activeRow,
    setActive: (id: string) => setActive(Math.max(0, flat.findIndex((r) => r.id === id))),
    choose,
    onKeyDown,
    status,
    retry: load,
    noResults,
    commandMode,
    noActions,
    openCommands: () => setQuery(">"),
    leaveCommands: () => setQueryState(""),
    loading,
    failed,
    tooShort,
    searching,
    settled,
    term,
    type,
    typeLabel,
    chips,
    setChip,
    clearRecent,
    removeRecent,
    provider,
  };
}

export type GlobalSearchController = ReturnType<typeof useGlobalSearch>;
