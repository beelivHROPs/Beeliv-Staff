"use client";

/**
 * SOPs & Training list (HR). One screen, three tabs: SOPs / Training /
 * Agreements. Layout reflows by the CONTAINER's width: a table when there is
 * room, stacked cards otherwise. Search, filters and the tab live in the URL.
 * "Show more" grows the visible count (no pagers).
 *
 * Reused: PageHeading / EmptyState (applicant), FilterTabs, SearchField +
 * FilterSelect (client records-filters), StatusChip (via parts), ErrorPanel
 * (staff), RowMenu (admin overview), ShowMore (admin), useUrlParams (admin).
 */
import { useCan } from "@/lib/admin/role-access";
import Link from "next/link";
import { useRef, useState } from "react";
import { FileText, Plus, Search, Video, X } from "@/components/applicant/icons";
import { BoldTile, type GlyphName } from "@/components/shared/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { BookOpen } from "@/components/staff/icons";
import { useUrlParams } from "@/components/admin/applicants/url";
import { RowMenu, type RowMenuItem } from "@/components/admin/overview/RowMenu";
import { ShowMore } from "@/components/admin/ShowMore";
import { ANY, ListCard, ListToolbar, useBatch } from "@/components/admin/listKit";
import { toast } from "@/components/ui/toast";
import { useContentList } from "@/lib/admin/sops-training/hooks";
import type { ContentKind, ContentPage, ContentQuery, ContentRow, ContentStatus } from "@/lib/admin/sops-training/types";
import { useContentActions } from "./actions";
import { ACTION_LABEL, contentEditHref, contentHref, DONE_LABEL, formatYmd, KIND_NEW, KIND_ONE, KIND_TAB_LABEL, KINDS, newContentHref, REQUIRED_LABEL, STATUS_LABEL, STATUS_ORDER } from "./meta";
import { CompletionBar, ContentStatusChip, Restricted } from "./parts";

/** Topic tile glyphs (same bold tiles as the Staff SOPs screen). Categories without a match keep the clipboard mark. */
function topicGlyph(name: string): GlyphName {
  const n = name.toLowerCase();
  if (/safety|hygiene|health/.test(n)) return "shield";
  if (/guest|service/.test(n)) return "service-bell";
  if (/bar/.test(n)) return "cocktail";
  if (/kitchen|food/.test(n)) return "chef-hat";
  if (/cash|payment/.test(n)) return "till";
  return "clipboard";
}

/** Row icon tint carries the status: lavender = published, sand = draft, grey = archived. */
const STATUS_TINT: Record<ContentStatus, string> = {
  published: "bg-(--ap-tint) text-(--ap-violet)",
  draft: "bg-[color-mix(in_srgb,var(--ap-warn-bg)_55%,transparent)] text-(--ap-warn)",
  archived: "bg-(--ap-line-2) text-(--ap-muted)",
};

const withAny = (label: string, opts: { value: string; label: string }[]) => [{ value: ANY, label }, ...opts];
const isKind = (v: string): v is ContentKind => (KINDS as string[]).includes(v);
const isStatus = (v: string): v is ContentStatus => (STATUS_ORDER as string[]).includes(v);

const NOUN: Record<ContentKind, string> = { sop: "SOPs", training: "training courses", agreement: "agreements" };
const EMPTY_COPY: Record<ContentKind, string> = {
  sop: "An SOP is a document staff read and, if required, acknowledge. Drafts stay private until you publish them.",
  training: "Training records say who should take which course, by when, and track completion. Drafts stay private until you publish them.",
  agreement: "Agreements are documents staff must accept. A new version asks everyone to accept again. Drafts stay private until you publish them.",
};

function dateText(r: ContentRow): string {
  if (r.kind === "training") return r.dueDate ? `Due ${formatYmd(r.dueDate)}` : "No due date";
  const d = r.dueDate ? ` · due ${formatYmd(r.dueDate)}` : "";
  return r.effectiveDate ? `Effective ${formatYmd(r.effectiveDate)}${d}` : "No effective date";
}

export function ContentList() {
  const canManage = useCan("content.manage");
  const url = useUrlParams();
  const rawTab = url.get("tab");
  const kind: ContentKind = isKind(rawTab) ? rawTab : "sop";
  const { limit, more } = useBatch(`${kind}|${url.get("q")}|${url.get("status")}|${url.get("category")}`);
  const query: ContentQuery = { kind, search: url.get("q"), status: isStatus(url.get("status")) ? (url.get("status") as ContentStatus) : "", category: url.get("category"), limit };

  const live = useContentList(query);
  const [shown, setShown] = useState<ContentPage | null>(null);
  if (live.data && live.data !== shown) setShown(live.data);
  const page = live.data ?? shown;

  const [searchText, setSearchText] = useState(query.search);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (v: string) => {
    setSearchText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      url.set({ q: v.trim() || undefined });
    }, 250);
  };
  const setFilter = (key: string, v: string) => {
    url.set({ [key]: v === ANY || v === "" ? undefined : v });
  };
  const clearAll = () => {
    setSearchText("");
    url.set({ q: undefined, status: undefined, category: undefined });
  };
  const narrowing = !!(query.search || query.status || query.category);

  const actions = useContentActions({
    onDone: (_d, message) => toast.add({ title: message, type: "success" }),
    onError: (message) => toast.add({ title: message, type: "error" }),
  });

  const heading = (right?: React.ReactNode) => <PageHeading title="SOPs & Training" right={right} />;

  if (live.status === "error") {
    return (
      <>
        {heading()}
        <ErrorPanel title="We could not load SOPs and training" retry={live.retry} />
      </>
    );
  }
  if (live.status === "restricted") {
    return (
      <>
        {heading()}
        <Restricted what="SOPs and training" />
      </>
    );
  }
  if (!page) return <ListSkeleton />;

  const newButton = page.canCreate ? (
    <Link href={newContentHref(kind)} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
      <Plus className="size-4" aria-hidden="true" /> {KIND_NEW[kind]}
    </Link>
  ) : undefined;

  if (page.workspaceEmpty) {
    return (
      <>
        {heading(newButton)}
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={BookOpen} title="Nothing published or drafted yet" description="Create an SOP, a training course or an agreement for staff. Drafts stay private until you publish them." action={newButton} />
        </div>
      </>
    );
  }

  const menuFor = (r: ContentRow) => {
    const items: RowMenuItem[] = [{ label: `View ${r.kind === "training" ? "course" : r.kind}`, href: contentHref(r.id) }];
    if (!canManage) return <RowMenu label={`Actions for ${r.title}`} items={items} />;
    if (r.status !== "archived") items.push({ label: "Edit", href: contentEditHref(r.id) });
    const act = (a: "publish" | "unpublish" | "archive" | "restore"): RowMenuItem => ({ label: ACTION_LABEL[a], tone: a === "archive" ? "danger" : "default", onSelect: () => void actions.start(r, a) });
    if (r.status === "draft") items.push(act("publish"), act("archive"));
    else if (r.status === "published") items.push(act("unpublish"), act("archive"));
    else items.push(act("restore"));
    return <RowMenu label={`Actions for ${r.title}`} items={items} />;
  };

  const refreshing = live.status === "loading";
  return (
    <div>
      {heading(newButton)}

      <TopicTiles kind={kind} page={page} picked={query.category} onPick={(c) => setFilter("category", c ?? ANY)} />

      <ListCard title="SOPs & Training" summary={`${page.total} ${page.total === 1 ? "item" : "items"}${narrowing ? " match your filters" : ""}`}>
      <ListToolbar
        tabsLabel="SOPs, training or agreements"
        tabs={KINDS.map((k) => ({ key: k, label: KIND_TAB_LABEL[k], count: page.kindCounts[k] }))}
        tab={kind}
        onTab={(k: ContentKind) => {
          url.set({ tab: k === "sop" ? undefined : k, q: undefined, status: undefined, category: undefined });
          setSearchText("");
        }}
        search={{ value: searchText, onChange: onSearch, label: `Search ${NOUN[kind]}`, placeholder: "Search title, category or audience" }}
        filters={[
          { key: "status", label: "Status", value: query.status || ANY, onChange: (v) => setFilter("status", v), options: withAny("All statuses", STATUS_ORDER.map((st) => ({ value: st, label: `${STATUS_LABEL[st]} (${page.statusCounts[st]})` }))) },
          { key: "category", label: "Category", value: query.category || ANY, onChange: (v) => setFilter("category", v), options: withAny("All categories", page.facets.categories.map((c) => ({ value: c, label: c }))) },
        ]}
        sort={null}
      />

      <div className={`@container transition-opacity ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
        {page.total === 0 ? (
          <div className="py-6">
            {narrowing ? (
              <EmptyState
                icon={Search}
                title={`No ${NOUN[kind]} match`}
                description={query.search ? "Check the spelling, or try a title, category or audience." : "Nothing matches the current filters."}
                action={
                  <button type="button" onClick={clearAll} className="ap-btn ap-btn-s ap-btn-sm">
                    <X className="size-4" aria-hidden="true" /> Clear search and filters
                  </button>
                }
              />
            ) : (
              <EmptyState icon={BookOpen} title={`No ${NOUN[kind]} yet`} description={EMPTY_COPY[kind]} action={newButton} />
            )}
          </div>
        ) : (
          <ContentRows rows={page.rows} menuFor={menuFor} />
        )}
      </div>

      <ShowMore shown={page.rows.length} total={page.total} onMore={more} onClear={narrowing ? clearAll : null} />
      </ListCard>
    </div>
  );
}

/* ---------- shared bits ---------- */

function Progress({ r }: { r: ContentRow }) {
  if (r.counts.assigned === 0) return <span className="text-[13px] text-(--ap-muted)">{r.status === "draft" && !r.liveVersion ? "Not assigned yet" : "No one assigned"}</span>;
  return (
    <div className="min-w-0">
      <CompletionBar done={r.counts.done} total={r.counts.assigned} label={DONE_LABEL[r.kind]} />
      <p className="mt-1 truncate text-[12px] leading-snug text-(--ap-muted) tabular-nums">
        {r.counts.done} of {r.counts.assigned} {DONE_LABEL[r.kind].toLowerCase()}
        {r.counts.overdue ? <b className="text-(--ap-rose)"> · {r.counts.overdue} overdue</b> : null}
        {r.counts.reaccept ? <b className="text-(--ap-warn)"> · {r.counts.reaccept} to accept again</b> : null}
      </p>
    </div>
  );
}

const versionText = (r: ContentRow) => `${r.category} · ${r.version}${r.liveVersion ? ` (staff see ${r.liveVersion})` : ""}`;
const requiredText = (r: ContentRow) => (r.required ? REQUIRED_LABEL[r.kind].on : REQUIRED_LABEL[r.kind].off);

/* ---------- topic tiles (same as the Staff SOPs screen; a tile filters by category) ---------- */

function TopicTiles({ kind, page, picked, onPick }: { kind: ContentKind; page: ContentPage; picked: string; onPick: (c: string | null) => void }) {
  const cats = page.facets.categories;
  if (cats.length < 2) return null;
  // Counts are only exact when every row is on screen and no topic is picked.
  const exact = page.rows.length === page.total && !picked;
  const countOf = (c: string) => page.rows.filter((r) => r.category === c).length;
  const unit = kind === "sop" ? "SOP" : kind === "training" ? "course" : "agreement";
  return (
    <section aria-labelledby="sop-topics" className="@container mb-5">
      <h2 id="sop-topics" className="mb-3 text-[18px] font-bold text-(--ap-ink)">Topics</h2>
      <div className="ap-scrollbar-none -mx-3 flex scroll-px-3 snap-x gap-3 overflow-x-auto px-3 pb-1 min-[768px]:mx-0 min-[768px]:grid min-[768px]:grid-cols-3 min-[768px]:overflow-visible min-[768px]:px-0 min-[1100px]:grid-cols-4">
        {cats.map((c) => {
          const on = picked === c;
          const n = exact ? countOf(c) : null;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(on ? null : c)}
              className={`flex h-[128px] w-[148px] shrink-0 snap-start flex-col justify-between rounded-[22px] border border-(--ap-line) bg-(--ap-tint) p-3.5 text-left transition-shadow hover:shadow-(--ap-shadow) focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none min-[768px]:w-auto ${on ? "ring-2 ring-(--ap-violet)" : ""}`}
            >
              <BoldTile glyph={topicGlyph(c)} tint="lavender" size={40} />
              <span>
                <b className="block line-clamp-2 text-[16px] leading-tight font-bold text-(--ap-ink)">{c}</b>
                <span className="block h-5 text-[14px] text-(--ap-ink-2) tabular-nums">{n === null ? "" : `${n} ${n === 1 ? unit : `${unit}s`}`}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- premium rows (one layout on phone and desktop) ---------- */

function ContentRows({ rows, menuFor }: { rows: ContentRow[]; menuFor: (r: ContentRow) => React.ReactNode }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {rows.map((r) => {
        const Icon = r.hasVideo ? Video : r.kind === "training" ? BookOpen : FileText;
        return (
          <li key={r.id} className="rounded-[20px] border border-(--ap-line) bg-(--ap-surface,#fff) transition-colors has-[a:hover]:border-(--ap-tint-2)">
            <div className="flex items-center gap-2 pr-2">
              <Link href={contentHref(r.id)} className="flex min-h-[72px] min-w-0 flex-1 items-center gap-3.5 rounded-[20px] px-3 py-3 focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none" aria-label={`${r.title}. ${STATUS_LABEL[r.status]}. Opens the ${KIND_ONE[r.kind].toLowerCase()}.`}>
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${STATUS_TINT[r.status]}`}>
                  <Icon className="size-[22px]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[16px] leading-snug font-semibold text-(--ap-ink)">{r.title}</b>
                  <span className="mt-0.5 block truncate text-[14px] text-(--ap-muted)" title={`${versionText(r)} · For ${r.audienceLabel}`}>{versionText(r)} · For {r.audienceLabel}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <ContentStatusChip status={r.status} />
                    <span className="text-[14px] text-(--ap-muted) tabular-nums">{requiredText(r)} · {dateText(r)}</span>
                  </span>
                </span>
              </Link>
              <div className="hidden w-[220px] shrink-0 @min-[760px]:block">
                <Progress r={r} />
              </div>
              {menuFor(r)}
            </div>
            <div className="px-4 pb-3 @min-[760px]:hidden">
              <Progress r={r} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ListSkeleton() {
  const sk = "ap-shimmer rounded-2xl";
  return (
    <div role="status" aria-busy="true" aria-label="Loading SOPs and training">
      <PageHeading title="SOPs & Training" />
      <div className={`${sk} mb-4 h-11 w-96 max-w-full`} />
      <div className={`${sk} mb-3 h-12`} />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`${sk} h-[84px]`} />
        ))}
      </div>
    </div>
  );
}
