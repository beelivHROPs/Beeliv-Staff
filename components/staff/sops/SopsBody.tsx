"use client";

import { useMemo, useState } from "react";
import { FileText, Search, Video } from "@/components/applicant/icons";
import { ActionPill, Disc, HERO_SURFACE, HeroDeco, LIFT, StateCard } from "../kit";
import { StatusMark, FilterField, FilterSection, FiltersButton } from "@/components/admin/standard";
import { ANY, type FilterDef } from "@/components/admin/listKit";
import { SearchBar } from "@/components/shared/search/SearchCard";
import { dueLabel, displayName, greetingForNow } from "@/lib/staff/format";
import { useSopLibrary, useStaffProfile, useTraining } from "@/lib/staff/hooks";
import { SOP_STATUS_LABEL, byDue, categoryCounts, continueItem, isOpenItem, readSummary, safeHttpsUrl, sopStatus } from "@/lib/staff/sops/derive";
import type { SopItem, SopKind, SopStatus } from "@/lib/staff/sops/types";
import type { TrainingAssignment } from "@/lib/staff/types";
import { NotchCard } from "@/components/shared/premium/NotchCard";
import { BoldTile, type GlyphName } from "@/components/shared/icons";
import { BookOpen } from "../icons";
import { PageError, SK } from "../leave/states";
import { ProgressRing, SectionTitle, SopRow, categoryIcon, tintFor } from "./SopParts";

const TRAIN_ICON = { course: BookOpen, video: Video, document: FileText, practical: BookOpen } as const;
const TRAIN_LABEL = { course: "Course", video: "Video", document: "Document", practical: "Practical" } as const;

/** Phone: one column in reading order. 1241px+: list on the left, "continue" and topics on the right. */
const GRID = "grid max-w-[760px] grid-cols-1 gap-y-6 pt-3 min-[1000px]:mx-0 min-[1000px]:max-w-[1120px] min-[1000px]:grid-cols-[minmax(0,420px)_minmax(0,1fr)] min-[1000px]:gap-x-8 min-[1000px]:gap-y-5";

export function SopsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your SOPs" className={GRID}>
      <h1 className="sr-only">SOPs</h1>
      <div className="min-[1000px]:col-span-2 min-[1000px]:row-start-1">
        <div className={`${SK} h-7 w-56`} />
        <div className={`${SK} mt-2.5 h-4 w-64 max-w-full`} />
      </div>
      <div className="contents min-[1000px]:col-start-1 min-[1000px]:row-start-2 min-[1000px]:flex min-[1000px]:min-w-0 min-[1000px]:flex-col min-[1000px]:gap-5 min-[1000px]:self-start">
        <div className={`${SK} h-[188px]`} />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${SK} h-[112px] w-[136px] shrink-0 rounded-[22px]`} />
          ))}
        </div>
      </div>
      <div className="contents min-[1000px]:col-start-2 min-[1000px]:row-start-2 min-[1000px]:flex min-[1000px]:min-w-0 min-[1000px]:flex-col min-[1000px]:gap-5 min-[1000px]:self-start">
        <div className={`${SK} h-12`} />
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${SK} h-[96px] rounded-[20px]`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Heading({ name, sub }: { name: string; sub: string }) {
  return (
    <header className="min-[1000px]:col-span-2 min-[1000px]:row-start-1">
      <h1 className="text-[24px] leading-tight font-bold text-(--ap-ink)">
        {greetingForNow()} {name}
      </h1>
      <p className="mt-1 text-[16px] text-(--ap-muted)">{sub}</p>
    </header>
  );
}

function ContinueCard({ items }: { items: SopItem[] }) {
  const { read, total } = readSummary(items);
  const next = continueItem(items);
  const href = next ? safeHttpsUrl(next.item.url) : null;
  return (
    <section aria-label="Continue where you left off" className={`${HERO_SURFACE} p-5 min-[1000px]:col-start-1 min-[1000px]:row-span-2 min-[1000px]:row-start-2 min-[1000px]:self-start`}>
      <HeroDeco />
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="inline-flex rounded-full bg-white/16 px-3 py-1 text-[14px] font-semibold">{!next ? "All caught up" : next.resumed ? "Continue where you left off" : "Start here"}</p>
          <p className="mt-3 tabular-nums">
            <span className="text-[44px] leading-none font-bold">{total === 0 ? 0 : Math.round((read / total) * 100)}%</span>
            <span className="ml-2 text-[14px] text-white/80">
              {read} of {total} read
            </span>
          </p>
          {next ? (
            <>
              <h2 className="mt-3 text-[20px] leading-snug font-bold text-white">{next.item.title}</h2>
              <p className="mt-1 text-[14px] text-white/78">
                {next.item.category}
                {next.item.minutes ? ` · ${next.item.minutes} min` : ""}
                {sopStatus(next.item) === "sign-off" ? " · needs your sign-off" : ""}
              </p>
            </>
          ) : (
            <h2 className="mt-2 text-[20px] leading-snug font-bold text-white">You&apos;ve read everything Beeliv shared with you.</h2>
          )}
        </div>
        <ProgressRing read={read} total={total} size={76} track="rgba(255,255,255,.22)" arc="#E8D9A8" text="text-white" />
      </div>
      {next && href ? (
        <ActionPill href={`/staff/sops-training/${next.item.id}`} icon={BookOpen} className="mt-5 min-[1000px]:w-auto" fit>
          {next.resumed ? "Continue reading" : "Start reading"}
        </ActionPill>
      ) : null}
    </section>
  );
}

/** Icon direction B: the matching mark per SOP topic. Topics without one keep the round line icon. */
const TOPIC_GLYPH: Record<string, GlyphName> = { Bar: "cocktail", Kitchen: "chef-hat", Service: "service-bell", Safety: "shield", Policy: "clipboard" };

function CategoryTiles({ items, picked, onPick }: { items: SopItem[]; picked: string | null; onPick: (c: string | null) => void }) {
  const cats = categoryCounts(items);
  if (cats.length < 2) return null;
  return (
    <section aria-labelledby="sop-topics" className="min-[1000px]:col-start-1 min-[1000px]:row-start-4">
      <SectionTitle id="sop-topics">Topics</SectionTitle>
      <div className="-mx-[18px] flex scroll-px-[18px] snap-x gap-3 overflow-x-auto px-[18px] pb-1 max-[380px]:-mx-3.5 max-[380px]:px-3.5 min-[641px]:-mx-7 min-[641px]:px-7 min-[1000px]:mx-0 min-[1000px]:grid min-[1000px]:grid-cols-2 min-[1000px]:overflow-visible min-[1000px]:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cats.map((c) => {
          const Icon = categoryIcon(c.name);
          const on = picked === c.name;
          return (
            <button
              key={c.name}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(on ? null : c.name)}
              className={`flex h-[112px] w-[136px] shrink-0 snap-start flex-col justify-between rounded-[22px] p-3.5 text-left transition-shadow focus-visible:ring-2 focus-visible:ring-(--ap-violet) focus-visible:outline-none min-[1000px]:w-auto ${LIFT} ${tintFor(c.name)} ${on ? "ring-2 ring-(--ap-violet)" : ""}`}
            >
              {TOPIC_GLYPH[c.name] ? <BoldTile glyph={TOPIC_GLYPH[c.name]} tint="lavender" size={40} /> : <Disc icon={Icon} size={40} />}
              <span>
                <b className="block text-[16px] leading-tight font-bold text-(--ap-ink)">{c.name}</b>
                <span className="text-[14px] text-(--ap-ink-2) tabular-nums">
                  {c.count} {c.count === 1 ? "SOP" : "SOPs"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TrainingRow({ t }: { t: TrainingAssignment }) {
  const Icon = TRAIN_ICON[t.training.type];
  const status = t.status === "completed" ? { tone: "ok" as const, word: "Done" } : t.status === "in-progress" ? { tone: "info" as const, word: "In progress" } : { tone: "plum" as const, word: "New" };
  return (
    <li>
      <NotchCard
        href={`/staff/sops-training/${t.id}`}
        tone={t.status === "completed" ? "sage" : "lavender"}
        className="min-h-[88px]"
        badgeLabel={t.training.durationMinutes ? `${t.training.durationMinutes} minutes` : "Training"}
        badge={
          t.training.durationMinutes ? (
            <span className="tabular-nums">
              <span className="block text-[17px] leading-none">{t.training.durationMinutes}</span>
              <span className="block text-[12px] leading-none font-semibold">min</span>
            </span>
          ) : (
            <Icon className="size-[22px]" aria-hidden="true" />
          )
        }
      >
        <b className="block text-[16px] leading-snug font-semibold text-(--ap-ink)">{t.training.title}</b>
        <span className="mt-0.5 block text-[14px] text-(--ap-ink-2)">{TRAIN_LABEL[t.training.type]}</span>
        <span className="mt-2 flex flex-wrap items-center gap-x-3">
          <StatusMark tone={status.tone}>{status.word}</StatusMark>
          {t.dueDate && t.status !== "completed" ? <span className="text-[14px] text-(--ap-ink-2) tabular-nums">{dueLabel(t.dueDate)}</span> : null}
        </span>
      </NotchCard>
    </li>
  );
}

const STATUS_OPTIONS = [
  { value: ANY, label: "All" },
  { value: "new", label: SOP_STATUS_LABEL.new },
  { value: "sign-off", label: SOP_STATUS_LABEL["sign-off"] },
  { value: "read", label: SOP_STATUS_LABEL.read },
];
const KIND_OPTIONS = [
  { value: ANY, label: "All" },
  { value: "document", label: "Documents" },
  { value: "video", label: "Videos" },
  { value: "page", label: "Web pages" },
];

/** SOPs, shown like a small learning app: assigned links to read, a place to continue, and your progress. Links only. */
export function SopsBody() {
  const lib = useSopLibrary();
  const training = useTraining();
  const profile = useStaffProfile();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>(ANY);
  const [kind, setKind] = useState<string>(ANY);
  const [cat, setCat] = useState<string | null>(null);

  const items = useMemo(() => lib.data ?? [], [lib.data]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items
      .filter((s) => (status === ANY || sopStatus(s) === (status as SopStatus)) && (kind === ANY || s.kind === (kind as SopKind)) && (!cat || s.category === cat) && (!needle || `${s.title} ${s.category}`.toLowerCase().includes(needle)))
      .sort(byDue);
  }, [items, q, status, kind, cat]);

  if (lib.status === "loading") return <SopsSkeleton />;
  if (lib.status === "error") {
    return (
      <div className={GRID}>
        <h1 className="sr-only">SOPs</h1>
        <PageError what="your SOPs" retry={lib.retry} />
      </div>
    );
  }

  const name = profile.data ? displayName(profile.data) : "there";
  const trainingList = training.data ?? [];
  if (items.length === 0 && trainingList.length === 0) {
    return (
      <div className={GRID}>
        <Heading name={name} sub="Nothing has been shared with you yet." />
        <StateCard glass="sops" icon={BookOpen} title="No SOPs yet" text="When Beeliv shares an SOP with you, it will appear here, ready to open." />
      </div>
    );
  }

  const narrowed = q.trim() !== "" || status !== ANY || kind !== ANY || cat !== null;
  const trainingFirst = !narrowed && trainingList.length > 0;
  const active = (status !== ANY ? 1 : 0) + (kind !== ANY ? 1 : 0);
  const { read, total } = readSummary(items);
  const toRead = shown.filter(isOpenItem);
  const done = shown.filter((s) => !isOpenItem(s));
  const clear = () => {
    setStatus(ANY);
    setKind(ANY);
  };
  const statusDef: FilterDef = { key: "status", label: "Status", value: status, options: STATUS_OPTIONS, onChange: setStatus };
  const kindDef: FilterDef = { key: "kind", label: "Type", value: kind, options: KIND_OPTIONS, onChange: setKind };

  return (
    <div className={GRID}>
      <Heading name={name} sub={total === 0 ? "Nothing has been shared with you yet." : total - read === 0 ? "You're all caught up." : `${total - read} to go, ${read} of ${total} read.`} />
      {/* Training comes first (project lead): straight under the greeting, across both columns on desktop. */}
      {trainingFirst ? (
        <section aria-labelledby="sop-training" className="min-[1000px]:col-span-2 min-[1000px]:row-start-2">
          <SectionTitle id="sop-training" count={trainingList.length}>
            Training
          </SectionTitle>
          <ul className="grid grid-cols-1 gap-3 min-[1000px]:grid-cols-2">
            {trainingList.map((t) => (
              <TrainingRow key={t.id} t={t} />
            ))}
          </ul>
        </section>
      ) : null}
      {/* Phones: one column in reading order (the wrappers vanish). Desktop: two packed columns, hero + topics left, search + lists right. */}
      <div className={`contents min-[1000px]:col-start-1 ${trainingFirst ? "min-[1000px]:row-start-3" : "min-[1000px]:row-start-2"} min-[1000px]:flex min-[1000px]:min-w-0 min-[1000px]:flex-col min-[1000px]:gap-5 min-[1000px]:self-start`}>
        {total > 0 ? <ContinueCard items={items} /> : null}
        <CategoryTiles items={items} picked={cat} onPick={setCat} />
      </div>

      <div className={`contents min-[1000px]:col-start-2 ${trainingFirst ? "min-[1000px]:row-start-3" : "min-[1000px]:row-start-2"} min-[1000px]:flex min-[1000px]:min-w-0 min-[1000px]:flex-col min-[1000px]:gap-5 min-[1000px]:self-start`}>
      {total > 0 ? (
        <SearchBar
          hideAfter
          className=""
          search={{ value: q, onChange: setQ, label: "Search your SOPs", placeholder: "Search SOPs" }}
          settleKey={`${status}|${kind}|${cat ?? ""}`}
          filterSlot={
          <FiltersButton active={active} resultCount={shown.length} onClear={clear}>
            {({ sheet }) => (
              <>
                <FilterSection title="Status">
                  <FilterField f={statusDef} sheet={sheet} />
                </FilterSection>
                <FilterSection title="Type">
                  <FilterField f={kindDef} sheet={sheet} />
                </FilterSection>
              </>
            )}
          </FiltersButton>
          }
        />
      ) : null}

      <div className="flex min-w-0 flex-col gap-6">
        {narrowed && shown.length === 0 ? (
          <StateCard
            glass="search"
            icon={Search}
            title="No SOPs match"
            text="Try a different word, or clear the filters."
            action={
              <ActionPill variant="outline" compact arrow={false} className="w-full justify-center" onClick={() => { setQ(""); setCat(null); clear(); }}>
                Clear search and filters
              </ActionPill>
            }
          />
        ) : null}
        {toRead.length > 0 ? (
          <section aria-labelledby="sop-assigned">
            <SectionTitle id="sop-assigned" count={toRead.length}>
              {narrowed ? "To read" : "Assigned to you"}
            </SectionTitle>
            <ul className="flex flex-col gap-3">
              {toRead.map((s) => (
                <SopRow key={s.id} item={s} />
              ))}
            </ul>
          </section>
        ) : null}
        {done.length > 0 ? (
          <section aria-labelledby="sop-read">
            <SectionTitle id="sop-read" count={done.length}>
              Read
            </SectionTitle>
            <ul className="flex flex-col gap-3">
              {done.map((s) => (
                <SopRow key={s.id} item={s} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      </div>
    </div>
  );
}
