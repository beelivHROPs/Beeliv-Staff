"use client";

/**
 * "See all results" page, shared by the four apps (app/{admin,client,staff,applicant}/search).
 * Same provider and engine as the top-bar panel: type chips with counts, sort by relevance
 * or name, results grouped by type. Presentation over mock data; the real version is the
 * scoped server search (docs/contracts/frontend-backend-needs-2026-10-17.md, row 15).
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageHeading } from "@/components/applicant/primitives";
import { Search, X } from "@/components/applicant/icons";
import { MIN_QUERY, PAGE_LIMIT, parseTypePrefix, searchEntries } from "./engine";
import { useIsPhone } from "@/components/applicant/motion";
import { GlassIcon } from "@/components/shared/icons";
import { EnterHint, PhoneChips, PhoneGroupHeading, PhoneMoreRow, PhoneNoResults, PhoneResultRow, PhoneSpinner } from "./PhoneSearch";
import { SearchCard } from "./SearchCard";
import { useSettledSearch } from "./useSettledSearch";
import { ChipRow, GroupHeading, Note, ResultRow, Skeleton } from "./SearchParts";
import type { SearchEntry, SearchProvider } from "./types";
import { toItemRow, type SearchChip } from "./useGlobalSearch";

export function SearchResultsPage({ provider }: { provider: SearchProvider }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const typeParam = params.get("type");
  const [text, setText] = useState(q);
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);
  const [sort, setSort] = useState<"relevance" | "name">("relevance");
  const [showAll, setShowAll] = useState<string[]>([]);

  useEffect(() => {
    let live = true;
    provider.load().then(
      (list) => {
        if (!live) return;
        setEntries(list);
        setStatus("ready");
      },
      () => live && setStatus("failed"),
    );
    return () => {
      live = false;
    };
  }, [provider, attempt]);

  // Keep the address in step with the box (debounced), so a result page can be shared or reloaded.
  useEffect(() => {
    const t = setTimeout(() => {
      if (text.trim() === q) return;
      const p = new URLSearchParams();
      if (text.trim()) p.set("q", text.trim());
      if (typeParam) p.set("type", typeParam);
      const s = p.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    }, 250);
    return () => clearTimeout(t);
  }, [text, q, typeParam, pathname, router]);

  const phone = useIsPhone();
  const draft = useSettledSearch({ value: text, onChange: setText });
  const parsed = useMemo(() => parseTypePrefix(text, provider.groups), [text, provider.groups]);
  const type = parsed.type ?? typeParam;
  const term = parsed.rest.trim();
  const searching = term.length >= MIN_QUERY;
  const all = useMemo(() => (searching ? searchEntries(entries, provider.groups, term, sort) : []), [entries, provider.groups, term, searching, sort]);
  const total = all.reduce((n, g) => n + g.entries.length, 0);
  const chips: SearchChip[] = [{ key: null, label: "All", count: total }, ...all.map((g) => ({ key: g.key, label: g.label, count: g.entries.length, icon: g.def.icon }))];
  const shown = type ? all.filter((g) => g.key === type) : all;
  const shownTotal = shown.reduce((n, g) => n + g.entries.length, 0);

  const pickType = (key: string | null) => {
    const p = new URLSearchParams();
    if (term) p.set("q", term);
    if (key) p.set("type", key);
    setText(term);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  if (phone) {
    const phoneLimit = 5;
    return (
      <div className="mx-auto max-w-[860px] pb-6">
        <PageHeading title="Search" />
        <SearchCard value={draft.draft} onChange={draft.setDraft} onSubmit={draft.submit} onClear={draft.clear} label={provider.label} placeholder={provider.placeholder} />
        {draft.busy ? <PhoneSpinner /> : null}
        <div hidden={draft.busy}>
          {searching && all.length > 0 ? (
            <>
              <div className="-mx-[18px] mt-4">
                <PhoneChips chips={chips} value={type} onPick={pickType} />
              </div>
              {shown.map((g) => {
                const open = showAll.includes(g.key) || !!type;
                const list = open ? g.entries : g.entries.slice(0, phoneLimit);
                return (
                  <section key={g.key}>
                    <PhoneGroupHeading label={g.label} count={g.entries.length} />
                    <div role="listbox" aria-label={g.label}>
                      {list.map((e) => {
                        const row = toItemRow(g.def, e, term);
                        return row.kind === "item" ? <PhoneResultRow key={e.id} row={row} onPick={() => router.push(e.href)} /> : null;
                      })}
                    </div>
                    {!open && g.entries.length > phoneLimit ? <PhoneMoreRow id={`more-${g.key}`} onPick={() => setShowAll((a) => [...a, g.key])} /> : null}
                  </section>
                );
              })}
            </>
          ) : null}
          {status === "loading" && (searching || !!type) ? <Skeleton /> : null}
          {status === "failed" ? (
            <Note title="Search is not available right now">
              <button type="button" onClick={() => { setStatus("loading"); setAttempt((a) => a + 1); }} className="font-bold text-(--ap-violet)">
                Try again
              </button>
            </Note>
          ) : null}
          {status === "ready" && searching && all.length === 0 ? <PhoneNoResults term={term} onClear={draft.clear} /> : null}
          {!searching && status !== "failed" ? (
            <div className="flex flex-col items-center px-6 pt-12 text-center">
              <GlassIcon name="search" size={84} />
              <p className="mt-2 max-w-[280px] text-[16px] text-(--ap-muted)">{text.trim().length > 0 ? `Type at least ${MIN_QUERY} letters to search everything.` : provider.hint}</p>
              <EnterHint />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[860px]">
      <PageHeading title="Search" />
      <div className="flex h-12 items-center gap-2.5 rounded-xl border border-(--ap-line) bg-(--ap-surface) px-3.5 text-(--ap-muted) focus-within:border-(--ap-violet)">
        <Search className="size-5 shrink-0" aria-hidden="true" />
        <input
          type="search"
          autoFocus
          aria-label={provider.label}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={provider.placeholder}
          autoComplete="off"
          className="w-full min-w-0 border-0 bg-transparent text-[16px] text-(--ap-ink) outline-none placeholder:text-(--ap-muted) [&::-webkit-search-cancel-button]:hidden"
        />
        {text ? (
          <button type="button" aria-label="Clear search" onClick={() => setText("")} className="flex size-7 shrink-0 items-center justify-center rounded-full hover:bg-(--ap-line-2)">
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {searching && all.length > 0 ? (
        <>
          <ChipRow chips={chips} value={type} onPick={pickType} className="mt-4" />
          <div className="mt-4 mb-2 flex items-center justify-between gap-3 text-[13px] text-(--ap-muted)">
            <span>
              {shownTotal} result{shownTotal === 1 ? "" : "s"} for &quot;{term}&quot;
            </span>
            <span className="inline-flex items-center gap-1">
              Sort
              {(["relevance", "name"] as const).map((k) => (
                <button key={k} type="button" aria-pressed={sort === k} onClick={() => setSort(k)} className={`rounded-md px-2 py-1 font-semibold ${sort === k ? "bg-(--ap-line-2) text-(--ap-ink)" : "hover:text-(--ap-ink)"}`}>
                  {k === "relevance" ? "Relevance" : "A to Z"}
                </button>
              ))}
            </span>
          </div>
        </>
      ) : null}

      <div className="mt-3 overflow-hidden rounded-2xl border border-(--ap-line-2) bg-(--ap-surface) p-1.5">
        {status === "loading" && (searching || !!type) ? <Skeleton /> : null}
        {status === "failed" ? (
          <Note title="Search is not available right now">
            <button
              type="button"
              onClick={() => {
                setStatus("loading");
                setAttempt((a) => a + 1);
              }}
              className="font-bold text-(--ap-violet)"
            >
              Try again
            </button>
          </Note>
        ) : null}
        {status === "ready" && searching && all.length === 0 ? <Note glassSize={96} title={`Nothing found for "${term}"`}>Try a name or a reference, or a shorter word.</Note> : null}
        {!searching && status !== "failed" ? (
          <div>
            <p className="px-2.5 py-3 text-[13px] text-(--ap-faint)">{text.trim().length > 0 ? `Type at least ${MIN_QUERY} letters to search everything.` : provider.hint}</p>
          </div>
        ) : null}
        {shown.map((g) => {
          const open = showAll.includes(g.key) || !!type;
          const list = open ? g.entries : g.entries.slice(0, PAGE_LIMIT);
          return (
            <section key={g.key} className="border-t border-(--ap-line-2) pb-1 first:border-t-0">
              <GroupHeading label={g.label} icon={g.def.icon} count={g.entries.length} />
              <div role="listbox" aria-label={g.label}>
                {list.map((e) => {
                  const row = toItemRow(g.def, e, term);
                  return row.kind === "item" ? <ResultRow key={e.id} row={row} onPick={() => router.push(e.href)} /> : null;
                })}
              </div>
              {!open && g.entries.length > PAGE_LIMIT ? (
                <button type="button" onClick={() => setShowAll((a) => [...a, g.key])} className="ml-[44px] flex h-9 items-center rounded-lg px-2.5 text-[13px] font-bold text-(--ap-violet) hover:bg-(--ap-line-2)">
                  Show all {g.entries.length}
                </button>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
