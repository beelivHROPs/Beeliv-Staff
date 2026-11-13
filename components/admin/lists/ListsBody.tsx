"use client";

import Link from "next/link";
import { useState } from "react";
import { FilterDropdown } from "@/components/applicant/FilterTabs";
import { ChevronRight } from "@/components/applicant/icons";
import { PageHeading } from "@/components/applicant/primitives";
import { Can } from "@/components/admin/Can";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useListsLoad } from "@/lib/admin/lists/hooks";
import { useListsData } from "@/lib/admin/lists/store";
import { SectionPanel } from "./SectionPanel";
import { SECTIONS } from "./sections";

/**
 * Lists & Rules. Client-style layout, same pattern as Settings: a vertical section nav on the left
 * (a scrolling strip from 768px, a "Jump to" dropdown on phones) and one white card for the chosen list.
 * Reused: PageHeading, FilterDropdown (Settings), ErrorPanel, EmptyState, StatusChip, confirmAction, SelectMenu, the NoteSheet shell.
 */
export function ListsBody() {
  const load = useListsLoad();
  const d = useListsData();
  const [active, setActive] = useState(SECTIONS[0].key);
  const cur = SECTIONS.find((s) => s.key === active) ?? SECTIONS[0];

  if (load.status === "loading") return <ListsSkeleton />;
  if (load.status === "error" || load.status === "restricted") {
    return (
      <div>
        <PageHeading title="Lists & Rules" />
        <ErrorPanel title={load.status === "restricted" ? "Lists & Rules aren't available for this account" : "We couldn't load Lists & Rules"} retry={load.retry} />
      </div>
    );
  }

  const countOf = (key: (typeof SECTIONS)[number]["key"]) => (d[key] as { active: boolean }[]).filter((x) => x.active).length;
  const glyph = (Icon: (typeof SECTIONS)[number]["icon"]) => <Icon className="size-[18px] shrink-0 text-(--ap-violet)" aria-hidden="true" />;

  return (
    <div>
      <PageHeading title="Lists & Rules" />
      <p className="-mt-1 mb-4 text-[13px] text-(--ap-muted)">These start as samples. Edit them to match how Beeliv works.</p>
      <Can cap="journeyTemplates.manage">
        <Link href="/admin/lists/job-templates" className="ap-card mb-4 flex items-center justify-between gap-3 rounded-[20px] px-4.5 py-3.5 hover:bg-(--ap-tint-soft) min-[768px]:px-5">
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold text-(--ap-ink)">Job templates</span>
            <span className="block text-[13px] text-(--ap-muted)">Reusable journeys, documents and screening questions for new jobs.</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-(--ap-muted)" aria-hidden="true" />
        </Link>
      </Can>

      <div className="sticky top-[72px] z-30 mb-4 min-[768px]:hidden">
        <FilterDropdown
          label="List sections"
          prefix="Jump to"
          options={SECTIONS.map((s) => ({ key: s.key, label: s.nav, icon: glyph(s.icon) }))}
          current={{ key: cur.key, label: cur.nav, icon: glyph(cur.icon) }}
          onChange={(k) => setActive(k as typeof active)}
        />
      </div>

      <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-5 max-[1040px]:grid-cols-1">
        <nav aria-label="List sections" className="ap-card ap-scrollbar-none sticky top-[88px] rounded-[20px] p-2.5 max-[1040px]:static max-[1040px]:flex max-[1040px]:gap-1 max-[1040px]:overflow-x-auto max-[767px]:hidden">
          {SECTIONS.map((s) => {
            const on = active === s.key;
            return (
              <button
                key={s.key}
                type="button"
                aria-current={on ? "true" : undefined}
                onClick={() => setActive(s.key)}
                className={`flex min-h-[42px] w-full shrink-0 items-center gap-2.5 rounded-[10px] px-3 py-1 text-left text-[14px] leading-[1.5] ${on ? "bg-(--ap-tint) font-bold text-(--ap-violet)" : "font-semibold text-(--ap-ink-2) hover:bg-(--ap-line-2)"} max-[1040px]:w-auto max-[1040px]:whitespace-nowrap`}
              >
                <s.icon className="ap-duo size-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">{s.nav}</span>
                <span className="text-[12px] font-semibold text-(--ap-muted) tabular-nums">{countOf(s.key)}</span>
              </button>
            );
          })}
        </nav>

        <SectionPanel key={cur.key} def={cur} />
      </div>
    </div>
  );
}

function ListsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading lists">
      <h1 className="sr-only">Lists &amp; Rules</h1>
      <div className="grid grid-cols-[240px_minmax(0,1fr)] items-start gap-5 max-[1040px]:grid-cols-1">
        <div className="ap-sk-box h-[360px] rounded-[20px] max-[767px]:hidden" />
        <div className="ap-sk-box h-[420px] rounded-[20px]" />
      </div>
    </div>
  );
}
