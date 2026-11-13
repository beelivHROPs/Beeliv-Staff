"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "@/components/applicant/icons";
import { PageHeading } from "@/components/applicant/primitives";
import { useWorkforce } from "@/lib/client/hooks";
import { plural } from "@/lib/client/format";
import { DEPARTMENT_LABEL, DEPARTMENT_ORDER } from "@/lib/client/labels";
import { analyticsFamilyHref, staffHref } from "@/lib/client/links";
import { useOutletState } from "@/lib/client/outlet";
import { useUrlParams } from "@/lib/client/url-state";
import type { WorkforceMember } from "@/lib/client/types";
import { AnalyticsLink } from "../AnalyticsLink";
import { PersonPhoto } from "../PersonPhoto";
import { HeroCard } from "@/components/shared/premium";
import { GlassIcon } from "@/components/shared/icons";
import { Chip, ChipRow, MoreActions, PhoneFilterBar, type PhoneFilterGroup } from "../phone";
import { FILTER_ROW, FilterSelect, SearchField } from "../records-filters";
import { StatusMark } from "@/components/admin/standard/StatusMark";
import { AnalyticsPanel, ChartEmptyState } from "../charts";
import { NoStaffYet, WorkforceError, WorkforceSkeleton } from "./WorkforceStates";

const PAGE = 20;
const ALL = "all";



/**
 * My Workforce (brief sections 17-18): who Beeliv has placed at the selected
 * outlet(s). One directory (table on tablet / desktop, cards on phones) with
 * search and filters, plus department chips (with counts) that filter the
 * list. Charts live on the Analytics page. Department, role, status and outlet live in the URL, so an Overview
 * link (?department=kitchen) lands on the filtered list. Nothing sensitive
 * exists in WorkforceMember, so none of it can be shown.
 */
export function WorkforceBody() {
  const { data, status, retry } = useWorkforce();
  const outlet = useOutletState();
  const url = useUrlParams();
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);

  const department = url.get("department") || ALL;
  const role = url.get("role") || ALL;
  const assignment = url.get("assignment") || ALL;
  const outletId = url.get("outlet") || ALL;
  const allOutlets = outlet.scope === "all";
  const outletName = (id: string) => outlet.outlets.find((o) => o.id === id)?.name ?? "";

  const members = useMemo(() => data ?? [], [data]);
  const roles = useMemo(() => [...new Set(members.map((m) => m.role))].sort((a, b) => a.localeCompare(b)), [members]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members
      .filter((m) => (department === ALL || m.departmentId === department) && (role === ALL || m.role === role) && (assignment === ALL || m.assignmentStatus === assignment) && (!allOutlets || outletId === ALL || m.outletId === outletId))
      .filter((m) => !needle || m.name.toLowerCase().includes(needle) || m.staffId.toLowerCase().includes(needle) || m.role.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, q, department, role, assignment, outletId, allOutlets]);

  // Department chip counts ignore the department filter itself so every chip stays comparable.
  const chipBase = useMemo(() => members.filter((m) => (role === ALL || m.role === role) && (assignment === ALL || m.assignmentStatus === assignment) && (!allOutlets || outletId === ALL || m.outletId === outletId)), [members, role, assignment, outletId, allOutlets]);
  const analyticsHref = analyticsFamilyHref("workforce", { department: department === ALL ? undefined : department, role: role === ALL ? undefined : role });
  const filtered = q.trim() !== "" || department !== ALL || role !== ALL || assignment !== ALL || (allOutlets && outletId !== ALL);
  const setFilter = (patch: Record<string, string>) => {
    setShown(PAGE);
    url.set(Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v === ALL ? undefined : v])));
  };
  const clear = () => {
    setQ("");
    setShown(PAGE);
    url.set({ department: undefined, role: undefined, assignment: undefined, outlet: undefined });
  };

  const phoneGroups: PhoneFilterGroup[] = [
    { key: "role", title: "Role", value: role, onChange: (v) => setFilter({ role: v }), options: [{ value: ALL, label: "All roles" }, ...roles.map((r) => ({ value: r, label: r }))] },
    { key: "assignment", title: "Assignment", value: assignment, onChange: (v) => setFilter({ assignment: v }), options: [{ value: ALL, label: "All" }, { value: "active", label: "Active" }, { value: "ended", label: "Ended" }] },
    ...(allOutlets ? [{ key: "outlet", title: "Outlet", value: outletId, onChange: (v: string) => setFilter({ outlet: v }), options: [{ value: ALL, label: "All outlets" }, ...outlet.outlets.map((o) => ({ value: o.id, label: o.name }))] }] : []),
  ];

  if (status === "loading") return <WorkforceSkeleton />;
  if (status === "error" || status === "restricted") return <WorkforceError retry={retry} />;

  const subtitle = allOutlets ? "Search and review the staff Beeliv has placed across your outlets." : "Search and review the staff Beeliv has placed at this outlet.";
  const count = filtered ? `${rows.length} of ${members.length} ${members.length === 1 ? "person" : "people"} match your filters` : `${plural(members.length, "person", "people")}${allOutlets ? " across all outlets" : " at this outlet"}`;

  // Phone layout (below 768px): its own page built from the same data and filters; the desktop layout below is unchanged.
  const deptCounts = DEPARTMENT_ORDER.map((d) => ({ d, n: chipBase.filter((m) => m.departmentId === d).length })).filter((x) => x.n > 0 || x.d === department);
  const phone = (
    <PhoneWorkforce
      members={members}
      rows={rows}
      shown={shown}
      onMore={() => setShown((n) => n + PAGE)}
      deptCounts={deptCounts}
      department={department}
      onDepartment={(d) => setFilter({ department: d })}
      search={{ value: q, onChange: (v) => { setQ(v); setShown(PAGE); }, label: "Search staff", placeholder: "Search name or role" }}
      groups={phoneGroups}
      active={[role, assignment, allOutlets ? outletId : ALL].filter((v) => v !== ALL).length}
      onReset={() => setFilter({ role: ALL, assignment: ALL, outlet: ALL })}
      onClear={clear}
      filtered={filtered}
      empty={status === "empty"}
      outletName={allOutlets ? outletName : undefined}
      analyticsHref={analyticsHref}
    />
  );

  return (
    <>
      {phone}
      <div className="max-[767px]:hidden">
      <PageHeading title="My Workforce" subtitle={subtitle} right={<MoreActions actions={[{ label: "View workforce analytics", href: analyticsHref }]} />} />
      {status === "empty" ? (
        <NoStaffYet />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="max-[767px]:hidden">
            <AnalyticsLink href={analyticsHref} label="View workforce analytics" />
          </div>
          <AnalyticsPanel anchor="records" title="Staff" subtitle={count}>
            <DepartmentChips members={chipBase} active={department} onPick={(d) => setFilter({ department: d })} />
            <PhoneFilterBar
              search={{ value: q, onChange: (v) => { setQ(v); setShown(PAGE); }, label: "Search staff", placeholder: "Search staff" }}
              groups={phoneGroups}
              active={[role, assignment, allOutlets ? outletId : ALL].filter((v) => v !== ALL).length}
              resultCount={rows.length}
              onReset={() => setFilter({ role: ALL, assignment: ALL, outlet: ALL })}
            />
            <div className="mb-4 flex flex-col gap-2.5 max-[767px]:hidden">
              <SearchField
                value={q}
                onChange={(v) => {
                  setQ(v);
                  setShown(PAGE);
                }}
                label="Search staff"
                placeholder="Search by name, staff ID or role"
              />
              <div className={FILTER_ROW}>
                <FilterSelect label="Department" value={department} onChange={(v) => setFilter({ department: v })} options={[{ value: ALL, label: "All departments" }, ...DEPARTMENT_ORDER.map((d) => ({ value: d, label: DEPARTMENT_LABEL[d] }))]} />
                <FilterSelect label="Role" value={role} onChange={(v) => setFilter({ role: v })} options={[{ value: ALL, label: "All roles" }, ...roles.map((r) => ({ value: r, label: r }))]} />
                <FilterSelect label="Assignment status" value={assignment} onChange={(v) => setFilter({ assignment: v })} options={[{ value: ALL, label: "All statuses" }, { value: "active", label: "Active" }, { value: "ended", label: "Ended" }]} />
                {allOutlets ? <FilterSelect label="Outlet" value={outletId} onChange={(v) => setFilter({ outlet: v })} options={[{ value: ALL, label: "All outlets" }, ...outlet.outlets.map((o) => ({ value: o.id, label: o.name }))]} /> : null}
              </div>
            </div>

            {rows.length === 0 ? (
              <ChartEmptyState
                icon={Search}
                title="No staff match these filters"
                description="Try a different search, or clear the filters to see everyone."
                action={
                  <button type="button" onClick={clear} className="ap-btn ap-btn-s ap-btn-sm mt-1">
                    Clear filters
                  </button>
                }
                height={180}
              />
            ) : (
              <>
                <StaffTable rows={rows.slice(0, shown)} showOutlet={allOutlets} outletName={outletName} />
                <StaffCards rows={rows.slice(0, shown)} showOutlet={allOutlets} outletName={outletName} />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-(--ap-muted)">
                  <span>
                    Showing {Math.min(shown, rows.length)} of {rows.length}
                  </span>
                  <span className="flex items-center gap-2">
                    {filtered ? (
                      <button type="button" onClick={clear} className="ap-hit font-bold text-(--ap-violet) hover:text-(--ap-violet-2)">
                        Clear filters
                      </button>
                    ) : null}
                    {rows.length > shown ? (
                      <button type="button" onClick={() => setShown((n) => n + PAGE)} className="ap-btn ap-btn-s ap-btn-sm">
                        Show more
                      </button>
                    ) : null}
                  </span>
                </div>
              </>
            )}
          </AnalyticsPanel>

        </div>
      )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Phone page: eyebrow + title, one plum hero, find, grouped A to Z     */
/* ------------------------------------------------------------------ */

function PhoneWorkforce({
  members, rows, shown, onMore, deptCounts, department, onDepartment, search, groups, active, onReset, onClear, filtered, empty, outletName, analyticsHref,
}: {
  members: WorkforceMember[];
  rows: WorkforceMember[];
  shown: number;
  onMore: () => void;
  deptCounts: { d: (typeof DEPARTMENT_ORDER)[number]; n: number }[];
  department: string;
  onDepartment: (d: string) => void;
  search: { value: string; onChange: (v: string) => void; label: string; placeholder: string };
  groups: PhoneFilterGroup[];
  active: number;
  onReset: () => void;
  onClear: () => void;
  filtered: boolean;
  empty: boolean;
  outletName?: (id: string) => string;
  analyticsHref: string;
}) {
  const departments = new Set(members.map((m) => m.departmentId)).size;
  const activeCount = members.filter((m) => m.assignmentStatus === "active").length;
  const visible = rows.slice(0, shown);
  const letters: { letter: string; items: WorkforceMember[] }[] = [];
  for (const m of visible) {
    const l = (m.name.trim()[0] ?? "#").toUpperCase();
    const last = letters[letters.length - 1];
    if (last && last.letter === l) last.items.push(m);
    else letters.push({ letter: l, items: [m] });
  }
  return (
    <div className="flex flex-col gap-5 min-[768px]:hidden">
      <header>
        <p className="text-[12px] font-bold tracking-[.14em] text-(--ap-violet) uppercase">Your team</p>
        <h1 className="mt-1 text-[32px] leading-none font-bold text-(--ap-ink)">Workforce</h1>
        <p className="mt-2 text-[14.5px] text-(--ap-muted)">Everyone working across your {outletName ? "outlets" : "outlet"}</p>
      </header>

      {empty ? (
        <NoStaffYet />
      ) : (
        <>
          <HeroCard eyebrow="Your workforce" ariaLabel="Workforce summary">
            <div className="flex items-end gap-4">
              <p className="flex flex-col">
                <b className="text-[52px] leading-none font-bold tabular-nums">{members.length}</b>
                <span className="mt-1.5 text-[14px] whitespace-nowrap text-white/85">team {members.length === 1 ? "member" : "members"}</span>
              </p>
              <dl className="m-0 ml-auto flex gap-4 border-l border-white/25 pl-4">
                <div>
                  <dt className="text-[12px] text-white/75">Departments</dt>
                  <dd className="m-0 text-[24px] leading-tight font-bold tabular-nums">{departments}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-white/75">Active</dt>
                  <dd className="m-0 text-[24px] leading-tight font-bold tabular-nums">{activeCount}</dd>
                </div>
              </dl>
            </div>
          </HeroCard>

          <section aria-labelledby="pw-find" className="min-w-0 rounded-[22px] border border-(--ap-line) bg-(--ap-surface) p-4">
            <h2 id="pw-find" className="mb-3 text-[16px] font-semibold text-(--ap-ink)">Find a team member</h2>
            <PhoneFilterBar search={search} groups={groups} active={active} resultCount={rows.length} onReset={onReset} />
            <ChipRow label="Filter by department" className="mb-0">
              <Chip on={department === ALL} onClick={() => onDepartment(ALL)} count={members.length}>All</Chip>
              {deptCounts.map(({ d, n }) => (
                <Chip key={d} on={department === d} onClick={() => onDepartment(department === d ? ALL : d)} count={n}>{DEPARTMENT_LABEL[d]}</Chip>
              ))}
            </ChipRow>
          </section>

          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[12px] font-bold tracking-[.14em] text-(--ap-muted) uppercase">All members <span className="tabular-nums">{rows.length}</span></h2>
            <Link href={analyticsHref} className="ap-hit text-[13px] font-semibold text-(--ap-violet)">Analytics</Link>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center rounded-[22px] border border-(--ap-line) bg-(--ap-surface) p-5 text-center">
              <GlassIcon name="search" size={80} />
              <p className="text-[15px] font-semibold text-(--ap-ink)">No staff match these filters</p>
              <p className="mt-1 text-[13.5px] text-(--ap-muted)">Try a different search, or clear the filters to see everyone.</p>
              <button type="button" onClick={onClear} className="ap-btn ap-btn-s ap-btn-sm mt-3">Clear filters</button>
            </div>
          ) : (
            <>
              {letters.map(({ letter, items }) => (
                <section key={letter} aria-label={`Names starting with ${letter}`}>
                  <div className="mb-2.5 flex items-center gap-3 px-1">
                    <b className="text-[14px] font-bold text-(--ap-violet)">{letter}</b>
                    <span aria-hidden="true" className="h-px flex-1 bg-(--ap-line)" />
                    <span className="text-[12px] text-(--ap-muted) tabular-nums">{items.length}</span>
                  </div>
                  <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                    {items.map((m) => (
                      <li key={m.id}>
                        <Link href={staffHref(m.id)} className="flex min-h-[68px] items-center gap-3 rounded-[20px] border border-(--ap-line) bg-(--ap-surface) p-3.5 active:bg-(--ap-tint-soft)">
                          <PersonPhoto name={m.name} photoUrl={m.photoUrl} size={44} />
                          <span className="min-w-0 flex-1 leading-tight">
                            <b className="block truncate text-[15px] font-semibold text-(--ap-ink)">{m.name}</b>
                            <span className="mt-0.5 block truncate text-[13px] text-(--ap-muted)">
                              {m.role} &middot; {DEPARTMENT_LABEL[m.departmentId]}
                              {outletName ? ` · ${outletName(m.outletId)}` : ""}
                            </span>
                            {m.assignmentStatus === "ended" ? (
                              <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-(--ap-muted)"><span aria-hidden="true" className="size-1.5 rounded-full bg-(--ap-faint)" />Ended</span>
                            ) : null}
                          </span>
                          <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <div className="flex items-center justify-between gap-3 text-[13px] text-(--ap-muted)">
                <span>Showing {Math.min(shown, rows.length)} of {rows.length}</span>
                <span className="flex items-center gap-2">
                  {filtered ? <button type="button" onClick={onClear} className="ap-hit font-bold text-(--ap-violet)">Clear filters</button> : null}
                  {rows.length > shown ? <button type="button" onClick={onMore} className="ap-btn ap-btn-s ap-btn-sm">Show more</button> : null}
                </span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/** Department chips with counts. Each chip filters the list (?department=); the counts follow the outlet, role and assignment filters. */
function DepartmentChips({ members, active, onPick }: { members: WorkforceMember[]; active: string; onPick: (d: string) => void }) {
  const counts = DEPARTMENT_ORDER.map((d) => ({ d, n: members.filter((m) => m.departmentId === d).length })).filter((x) => x.n > 0 || x.d === active);
  const chip = "ap-hit inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors";
  const on = "border-(--ap-violet) bg-(--ap-tint) text-(--ap-violet)";
  const off = "border-(--ap-line) text-(--ap-ink-2) hover:bg-(--ap-line-2)";
  return (
    <div role="group" aria-label="Filter by department" className="ap-scrollbar-none mb-3 -mx-[18px] flex flex-nowrap gap-2 overflow-x-auto px-[18px] py-0.5 max-[380px]:-mx-3.5 max-[380px]:px-3.5 min-[768px]:mx-0 min-[768px]:flex-wrap min-[768px]:overflow-visible min-[768px]:px-0">
      <button type="button" aria-pressed={active === ALL} onClick={() => onPick(ALL)} className={`${chip} ${active === ALL ? on : off}`}>
        All <span className="tabular-nums">{members.length}</span>
      </button>
      {counts.map(({ d, n }) => (
        <button key={d} type="button" aria-pressed={active === d} onClick={() => onPick(active === d ? ALL : d)} className={`${chip} ${active === d ? on : off}`}>
          {DEPARTMENT_LABEL[d]} <span className="tabular-nums">{n}</span>
        </button>
      ))}
    </div>
  );
}

type ListProps = { rows: WorkforceMember[]; showOutlet: boolean; outletName: (id: string) => string };

const ASSIGN_TONE = { active: "ok", ended: "mute" } as const;
const ASSIGN_LABEL = { active: "Active", ended: "Ended" } as const;

/** Tablet / desktop: table. The name is the real link; the whole row is also clickable. */
function StaffTable({ rows, showOutlet, outletName }: ListProps) {
  const router = useRouter();
  return (
    <div className="max-[767px]:hidden">
      <table className="w-full border-collapse text-left text-[14px]">
        <caption className="sr-only">Staff placed at your outlets</caption>
        <thead>
          <tr className="text-[12px] font-bold tracking-[.06em] text-(--ap-muted) uppercase">
            <th scope="col" className="pb-2 font-bold">Staff</th>
            <th scope="col" className="pb-2 font-bold">Role</th>
            <th scope="col" className="pb-2 font-bold max-[1100px]:hidden">Department</th>
            {showOutlet ? <th scope="col" className="pb-2 font-bold max-[1240px]:hidden">Outlet</th> : null}
            <th scope="col" className="pb-2 font-bold">Assignment</th>
            <th scope="col" className="w-6 pb-2">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} onClick={() => router.push(staffHref(m.id))} className="cursor-pointer border-t border-(--ap-line-2) hover:bg-(--ap-tint-soft)">
              <td className="py-2.5 pr-3">
                <span className="flex items-center gap-2.5">
                  <PersonPhoto name={m.name} photoUrl={m.photoUrl} size={34} />
                  <span className="min-w-0 leading-tight">
                    <Link href={staffHref(m.id)} onClick={(e) => e.stopPropagation()} className="block font-semibold text-(--ap-ink) hover:text-(--ap-violet)">
                      {m.name}
                    </Link>
                    <span className="block text-[12px] text-(--ap-muted) tabular-nums">{m.staffId}</span>
                  </span>
                </span>
              </td>
              <td className="py-2.5 pr-3 text-(--ap-ink-2)">{m.role}</td>
              <td className="py-2.5 pr-3 whitespace-nowrap text-(--ap-ink-2) max-[1100px]:hidden">{DEPARTMENT_LABEL[m.departmentId]}</td>
              {showOutlet ? <td className="py-2.5 pr-3 whitespace-nowrap text-(--ap-ink-2) max-[1240px]:hidden">{outletName(m.outletId)}</td> : null}
              <td className="py-2.5 pr-3">
                <StatusMark tone={ASSIGN_TONE[m.assignmentStatus]}>{ASSIGN_LABEL[m.assignmentStatus]}</StatusMark>
              </td>
              <td className="py-2.5 text-(--ap-faint)">
                <ChevronRight className="size-4" aria-hidden="true" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Phone: one compact 56px row per person in a single hairline-divided list (never a squeezed table). */
function StaffCards({ rows, showOutlet, outletName }: ListProps) {
  return (
    <ul aria-label="Staff" className="m-0 flex list-none flex-col p-0 min-[768px]:hidden">
      {rows.map((m) => (
        <li key={m.id} className="border-t border-(--ap-line-2) first:border-t-0">
          <Link href={staffHref(m.id)} className="flex min-h-14 items-center gap-3 py-2">
            <PersonPhoto name={m.name} photoUrl={m.photoUrl} size={36} />
            <span className="min-w-0 flex-1 leading-tight">
              <b className="block text-[15px]">{m.name}</b>
              <span className="block text-[13px] text-(--ap-muted)">
                {m.role}
                {showOutlet ? ` · ${outletName(m.outletId)}` : ""}
              </span>
            </span>
            {m.assignmentStatus === "ended" ? <StatusMark tone="mute">Ended</StatusMark> : null}
            <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
