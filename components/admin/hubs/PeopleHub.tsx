"use client";

/**
 * People hub: one place for applicants, the talent pool and staff.
 * Chips choose the view (Applicants / Talent pool / Staff / All). Each chip shows
 * the EXISTING list screen unchanged (imported, not copied); only its own page title
 * is hidden here because this page already has one. "All" is a small search across
 * the three existing services. Rows link to the existing profile pages.
 * Applicants arrive by self-registration, so the only action is Invite staff: it is the header's one primary button on the Staff view
 * and sits in the "..." menu on the other views (HR officers do not have it at all).
 */
import Link from "next/link";
import { useRef, useState } from "react";
import { ApplicantsList } from "@/components/admin/applicants/ApplicantsList";
import { InitialsAvatar } from "@/components/admin/applicants/parts";
import { useUrlParams } from "@/components/admin/applicants/url";
import { DeskScopeProvider, ListCard, ListTabs, PhoneScopeProvider, PhoneScopeSlot, useDeskScope } from "@/components/admin/listKit";
import { StaffDirectory } from "@/components/admin/staff/StaffDirectory";
import { staffHref } from "@/components/admin/staff/parts";
import { TalentPoolList } from "@/components/admin/talent-pool/TalentPoolList";
import { InviteButton } from "@/components/admin/team-access/InviteButton";
import { ChevronRight, Search } from "@/components/applicant/icons";
import { UserPlus } from "@/components/client/icons";
import { EmptyState } from "@/components/applicant/primitives";
import { AdminPageHeader, DeskPills, MoreMenu } from "@/components/admin/standard";
import { InviteSheet } from "@/components/admin/team-access/InviteSheets";
import { useCan } from "@/lib/admin/role-access";
import { ScopeGate, ScopeNote } from "@/components/admin/ScopeNote";
import { SearchBar } from "@/components/shared/search/SearchCard";
import { applicantHref } from "@/lib/admin/links";
import { useApplicantsList } from "@/lib/admin/applicants/hooks";
import { useStaffList } from "@/lib/admin/staff/hooks";
import { useTalentPool } from "@/lib/admin/talent-pool/hooks";

type View = "all" | "applicants" | "pool" | "staff";
const VIEWS: { key: View; label: string }[] = [
  { key: "all", label: "All" },
  { key: "applicants", label: "Applicants" },
  { key: "pool", label: "Talent pool" },
  { key: "staff", label: "Staff" },
];

/** Hides the embedded list's own page title (this hub supplies the title). */
const HIDE_INNER_TITLE = "[&_div:has(>div>h1.ap-pagehead-title)]:hidden";

export function PeopleHub() {
  const url = useUrlParams();
  const raw = url.get("view");
  const view: View = VIEWS.some((v) => v.key === raw) ? (raw as View) : "applicants";

  function choose(k: View) {
    // Each list keeps its own filters in the URL, so switching starts clean.
    window.history.replaceState(null, "", `${window.location.pathname}?view=${k}`);
  }

  const canInvite = useCan("invitations.manage");
  const [inviting, setInviting] = useState(false);

  // Phones: one tab row with the count INSIDE each tab, shown under the search card (see PhoneScopeSlot).
  const nA = useApplicantsList({ search: "", tab: "all", stage: "", vacancyId: "", clientId: "", recruiterId: "", sort: "newest", page: 1, pageSize: 1 }).data?.total;
  const nP = useTalentPool({ search: "", tab: "all", skill: "", department: "", location: "", lastContact: "", sort: "newest", page: 1, pageSize: 1 }).data?.total;
  const nS = useStaffList({ search: "", clientId: "", outletId: "", department: "", role: "", status: "", sort: "name", page: 1, pageSize: 1 }).data?.total;
  const phoneTabs = <ListTabs label="Choose who to show" tabs={VIEWS.map((v) => ({ ...v, count: v.key === "applicants" ? nA : v.key === "pool" ? nP : v.key === "staff" ? nS : nA !== undefined && nP !== undefined && nS !== undefined ? nA + nP + nS : undefined }))} value={view} onChange={choose} />;

  const allCount = nA !== undefined && nP !== undefined && nS !== undefined ? nA + nP + nS : undefined;
  const deskPills = (
    <DeskPills
      label="Choose who to show"
      pills={VIEWS.map((v) => ({ key: v.key, label: v.label, count: v.key === "applicants" ? nA : v.key === "pool" ? nP : v.key === "staff" ? nS : allCount, active: view === v.key, onClick: () => choose(v.key) }))}
    />
  );

  return (
    <div>
      <AdminPageHeader
        title="People"
        summary={<ScopeNote className="" />}
        primary={view === "staff" ? <InviteButton kind="staff" /> : undefined}
        more={view !== "staff" && canInvite ? <MoreMenu label="More: people actions" sections={[{ items: [{ key: "invite-staff", label: "Invite staff", icon: UserPlus, onSelect: () => setInviting(true) }] }]} /> : undefined}
      />
      {inviting ? <InviteSheet kind="staff" onClose={() => setInviting(false)} /> : null}
      <ScopeGate>
        <PhoneScopeProvider value={phoneTabs}>
          {/* Desktop and tablet: the search comes first, then ONE pill row (All first, counts inside) which each list shows under its search field. */}
          <DeskScopeProvider value={deskPills}>
            {view === "all" ? (
              <AllPeople onSee={choose} />
            ) : (
              <div className={HIDE_INNER_TITLE}>
                {view === "applicants" ? <ApplicantsList /> : view === "pool" ? <TalentPoolList /> : <StaffDirectory />}
              </div>
            )}
          </DeskScopeProvider>
        </PhoneScopeProvider>
      </ScopeGate>
    </div>
  );
}

const PEEK = 5;

function AllPeople({ onSee }: { onSee: (v: View) => void }) {
  const deskScope = useDeskScope();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearch = (v: string) => {
    setText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setQ(v.trim()), 250);
  };

  const applicants = useApplicantsList({ search: q, tab: "all", stage: "", vacancyId: "", clientId: "", recruiterId: "", sort: "newest", page: 1, pageSize: PEEK });
  const pool = useTalentPool({ search: q, tab: "all", skill: "", department: "", location: "", lastContact: "", sort: "newest", page: 1, pageSize: PEEK });
  const staff = useStaffList({ search: q, clientId: "", outletId: "", department: "", role: "", status: "", sort: "name", page: 1, pageSize: PEEK });

  const loading = [applicants, pool, staff].some((l) => !l.data && l.status === "loading");
  const a = applicants.data;
  const p = pool.data;
  const s = staff.data;
  const none = !loading && !(a?.total || p?.total || s?.total);

  return (
    <div className="flex flex-col gap-4">
      <div className="ap-card rounded-[20px] p-4.5 min-[768px]:rounded-none min-[768px]:border-0 min-[768px]:bg-transparent min-[768px]:p-0 min-[768px]:shadow-none">
        <SearchBar className="" search={{ value: text, onChange: onSearch, label: "Search people", placeholder: "Search by name, role or client" }} />
        <PhoneScopeSlot />
        {deskScope}
      </div>
      {loading ? <div className="ap-shimmer h-[240px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading people" /> : null}
      {none ? (
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={Search} title={q ? "No one matches your search" : "No people yet"} description={q ? "Check the spelling, or try a role or client name." : "Applicants appear here after they register. Staff appear once they are invited and assigned."} />
        </div>
      ) : null}
      {a && a.total > 0 ? (
        <Group title="Applicants" total={a.total} onSee={() => onSee("applicants")}>
          {a.rows.map((r) => (
            <Row key={r.id} href={applicantHref(r.id)} name={r.name} line={`${r.vacancy}${r.client ? ` · ${r.client}` : ""}`} />
          ))}
        </Group>
      ) : null}
      {p && p.total > 0 ? (
        <Group title="Talent pool" total={p.total} onSee={() => onSee("pool")}>
          {p.rows.map((r) => (
            <Row key={r.id} href={applicantHref(r.applicantId)} name={r.name} line={[r.department, r.location].filter(Boolean).join(" · ")} />
          ))}
        </Group>
      ) : null}
      {s && s.total > 0 ? (
        <Group title="Staff" total={s.total} onSee={() => onSee("staff")}>
          {s.rows.map((r) => (
            <Row key={r.id} href={staffHref(r.id)} name={r.name} line={`${r.role} · ${r.client}`} />
          ))}
        </Group>
      ) : null}
    </div>
  );
}

function Group({ title, total, onSee, children }: { title: string; total: number; onSee: () => void; children: React.ReactNode }) {
  return (
    <ListCard showTitle title={title} summary={`${total} ${total === 1 ? "person" : "people"}`}>
      <ul className="m-0 flex list-none flex-col p-0">{children}</ul>
      {total > PEEK ? (
        <button type="button" onClick={onSee} className="ap-btn ap-btn-s mt-3 h-11 w-full">
          See all {total}
        </button>
      ) : null}
    </ListCard>
  );
}

function Row({ href, name, line }: { href: string; name: string; line: string }) {
  return (
    <li className="border-t border-(--ap-line-2) first:border-t-0">
      <Link href={href} className="flex min-h-[56px] items-center gap-3 py-2 hover:bg-(--ap-tint-soft)">
        <InitialsAvatar name={name} size={40} />
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block truncate text-[15px] text-(--ap-ink)">{name}</b>
          <span className="block truncate text-[13px] text-(--ap-muted)">{line}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-(--ap-muted)" aria-hidden="true" />
      </Link>
    </li>
  );
}
