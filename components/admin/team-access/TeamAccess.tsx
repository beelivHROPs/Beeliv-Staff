"use client";

/**
 * Team & Access (spec 10, 9, 13.4, 28.1): internal users, client users,
 * staff / applicant accounts, invitations and a read-only roles and
 * capabilities view. Every account except Applicant is invitation-only
 * (AUTH-001 / AUTH-004). Who may invite or deactivate is not defined for HR by
 * the spec ("authorized management", "as permitted"), so the screen reflects
 * the session's capabilities from the adapter and flags the rule as needing
 * Beeliv confirmation. The InviteSheet is exported for Clients and Staff.
 *
 * Reused: PageHeading, FilterTabs, Disc, ErrorPanel, SelectMenu, listKit.
 */
import { useState, useSyncExternalStore } from "react";
import { useUrlParams } from "@/components/admin/applicants/url";
import { NeedsConfirmation } from "@/components/admin/offers/parts";
import { Disc } from "@/components/admin/overview/Disc";
import { FilterTabs } from "@/components/applicant/FilterTabs";
import { Check, Exclaim, Plus, X } from "@/components/applicant/icons";
import { PageHeading } from "@/components/applicant/primitives";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { SHOW_PROTOTYPE_CONTROLS } from "@/lib/prototype";
import { getPreviewAccess, setPreviewAccess, subscribePreviewAccess, type PreviewAccess } from "@/lib/admin/team-access/mock";
import { useTeamCapabilities } from "@/lib/admin/team-access/hooks";
import type { InvitationKind, TeamCapabilities, TeamTab } from "@/lib/admin/team-access/types";
import { INVITE_TITLE, InviteSheet } from "./InviteSheets";
import { InvitationsList } from "./InvitationsList";
import { isTeamTab, TAB_LABEL, TAB_ORDER } from "./meta";
import { PeopleList } from "./PeopleList";
import { RolesMatrix } from "./RolesMatrix";
import { Restricted } from "@/components/admin/offers/parts";

const TAB_INVITE: Partial<Record<TeamTab, InvitationKind>> = { internal: "internal", clients: "client", accounts: "staff" };

export function TeamAccess({ initialTab }: { initialTab?: TeamTab }) {
  const url = useUrlParams();
  const raw = url.get("tab");
  const tab: TeamTab = isTeamTab(raw) ? raw : (initialTab ?? "internal");
  const caps = useTeamCapabilities();
  const [inviting, setInviting] = useState<InvitationKind | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const heading = (right?: React.ReactNode) => <PageHeading title="Team & Access" right={right} />;
  if (caps.status === "error") return (<>{heading()}<ErrorPanel title="We could not load Team & Access" retry={caps.retry} /></>);
  if (caps.status === "restricted") return (<>{heading()}<Restricted what="Team & Access" /></>);
  if (!caps.data) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading Team & Access">
        {heading()}
        <div className="ap-shimmer mb-4 h-11 w-96 max-w-full rounded-2xl" />
        <div className="flex flex-col gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="ap-shimmer h-[72px] rounded-2xl" />)}</div>
      </div>
    );
  }
  const c: TeamCapabilities = caps.data;
  const can = (k: InvitationKind) => (k === "internal" ? c.canInviteInternal : k === "client" ? c.canInviteClient : c.canInviteStaff);
  const kinds: InvitationKind[] = tab === "invitations" ? (["internal", "client", "staff"] as const).filter(can) : TAB_INVITE[tab] && can(TAB_INVITE[tab]!) ? [TAB_INVITE[tab]!] : [];

  const buttons =
    kinds.length > 0 ? (
      <div className="flex flex-wrap items-center gap-2.5">
        {kinds.map((k, i) => (
          <button key={k} type="button" onClick={() => setInviting(k)} className={`ap-btn h-12 px-5 text-[15px] font-semibold ${kinds.length === 1 || i === 0 ? "ap-btn-p text-white!" : "ap-btn-s"}`}>
            <Plus className="size-4" aria-hidden="true" /> {INVITE_TITLE[k]}
          </button>
        ))}
      </div>
    ) : undefined;

  return (
    <div>
      {heading(buttons)}

      {!c.canInviteInternal || !c.canChangeState ? (
        <div className="mb-4 flex flex-col gap-2">
          <NeedsConfirmation>
            Your account can {c.canInviteInternal ? "invite internal users" : "view internal users but not invite them"}
            {c.canChangeState ? "" : " and cannot suspend or deactivate accounts"}. Which roles may create HR users and deactivate accounts is not defined for HR; the spec says authorized management.
          </NeedsConfirmation>
        </div>
      ) : null}

      {notice ? (
        <div role={notice.kind === "error" ? "alert" : "status"} className="ap-card mb-4 flex items-center gap-3 rounded-2xl p-3.5">
          <Disc icon={notice.kind === "ok" ? Check : Exclaim} tone={notice.kind === "ok" ? "ok" : "urgent"} />
          <p className="min-w-0 flex-1 text-[15px] font-semibold text-(--ap-ink)">{notice.text}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message" className="ap-hit flex size-10 shrink-0 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2)">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <FilterTabs
        label="Team and access sections"
        className="mb-4"
        options={TAB_ORDER.map((t) => ({ key: t, label: TAB_LABEL[t] }))}
        value={tab}
        onChange={(k: TeamTab) => url.set({ tab: k })}
      />

      {tab === "internal" ? <PeopleList key="internal" list="internal" caps={c} onNotice={setNotice} /> : null}
      {tab === "clients" ? <PeopleList key="clients" list="clients" caps={c} onNotice={setNotice} /> : null}
      {tab === "accounts" ? <PeopleList key="accounts" list="accounts" caps={c} onNotice={setNotice} /> : null}
      {tab === "invitations" ? <InvitationsList caps={c} onNotice={setNotice} /> : null}
      {tab === "roles" ? <RolesMatrix /> : null}

      {inviting ? <InviteSheet kind={inviting} onClose={() => setInviting(null)} onDone={() => setNotice({ kind: "ok", text: "Invitation recorded as pending. Email delivery is connected later." })} /> : null}

      {SHOW_PROTOTYPE_CONTROLS ? <PreviewAccessSwitch /> : null}
    </div>
  );
}

/** DEV ONLY: pretends to be a user who can / cannot manage, to preview both states. Delete with the mock. */
function PreviewAccessSwitch() {
  const value = useSyncExternalStore(subscribePreviewAccess, getPreviewAccess, () => "manage" as PreviewAccess);
  return (
    <div className="mt-6 flex items-center gap-2 text-[12px] text-(--ap-muted)">
      <span className="font-bold">Prototype: previewing as</span>
      <div className="w-[190px]">
        <SelectMenu
          label="Preview access"
          variant="compact"
          value={value}
          onChange={(v) => setPreviewAccess(v === "view" ? "view" : "manage")}
          options={[
            { value: "manage", label: "Can invite and change" },
            { value: "view", label: "View and client/staff invites only" },
          ]}
          className="h-9 w-full text-[13px]"
        />
      </div>
    </div>
  );
}
