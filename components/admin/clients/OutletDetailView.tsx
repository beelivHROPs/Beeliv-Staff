"use client";

/**
 * Outlet page /admin/clients/[id]/outlets/[outletId]: Overview / Staff /
 * Vacancies / Schedule / Activity. Staff is in page (no jump to the Staff
 * Directory). "Edit details" changes only non-sensitive fields and writes a
 * history entry. The cover picture is demo-only (kept for this visit).
 */
import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { Disc } from "@/components/admin/overview/Disc";
import { AdminState, Card, Facts, NeedsConfirmation, useUrlParams } from "@/components/admin/staff/parts";
import { ChevronLeft, Pencil } from "@/components/applicant/icons";
import { EmptyState, DETAIL_TITLE } from "@/components/applicant/primitives";
import { CARD } from "@/components/applicant/SectionCard";
import { Store } from "@/components/client/icons";
import { saveOutlet, useOutlet } from "@/lib/admin/clients/hooks";
import type { OutletDetail, OutletEdit } from "@/lib/admin/clients/types";
import { OutletAdminMenu } from "@/components/admin/org-records/OrgActions";
import { orgErrorMessage } from "@/lib/admin/org-records/transport";
import { ActivityPanel, AssignedHrCard, OrgStaffPanel, PageTabs, VacanciesPanel } from "./OrgPanels";
import { OutletEditSheet } from "./OutletEditSheet";
import { clientHref, NoHrChip, OrgStatusChip, OrgStatusPill, outletSchedulingHref } from "./parts";
import { PD_CTA, PhoneAction, PhoneDetailHead, PhoneFacts, PhoneMore, PhoneStickyAction } from "@/components/admin/PhoneDetail";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "staff", label: "Staff" },
  { key: "vacancies", label: "Vacancies" },
  { key: "schedule", label: "Schedule" },
  { key: "activity", label: "Activity" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function OutletDetailView({ clientId, outletId }: { clientId: string; outletId: string }) {
  const live = useOutlet(clientId, outletId);
  const url = useUrlParams();
  const tabId = useId();
  const raw = url.get("tab");
  const tab: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : "overview";
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(edit: OutletEdit): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await saveOutlet(clientId, outletId, edit);
      return true;
    } catch (e) {
      setError(orgErrorMessage(e, "That could not be saved. Nothing was changed."));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const d = live.data;
  return (
    <AdminState status={live.status === "empty" ? "ready" : live.status} title="Outlet" what="this outlet" retry={live.retry}>
      <Link href={d ? clientHref(clientId) : "/admin/clients"} className="ap-hit mb-3 inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum) max-[767px]:hidden">
        <ChevronLeft className="size-4" aria-hidden="true" /> {d ? d.client.name : "Clients"}
      </Link>
      {live.status === "empty" || !d ? (
        <div className={`${CARD} p-6 min-[768px]:p-8`}>
          <EmptyState icon={Store} title="Outlet not found" description="This outlet does not exist or its client is not assigned to you." />
        </div>
      ) : (
        <div>
          {/* Phones: cover, one status, Client, a short counted list, ONE sticky primary action (Edit details). */}
          <PhoneDetailHead
            backHref={clientHref(clientId)}
            backLabel={d.client.name}
            visual={{ kind: "icon", icon: <Store aria-hidden="true" /> }}
            title={d.outlet.name}
            status={<OrgStatusPill status={d.outlet.status} />}
            line={`${d.client.name} · ${d.outlet.city}`}
            actions={<PhoneAction href={clientHref(clientId)} label="Client" />}
          />
          <PhoneFacts
            title="Outlet"
            rows={[
              { label: "Active staff", value: String(d.outlet.activeStaff) },
              { label: "Open vacancies", value: String(d.outlet.openVacancies) },
              { label: "Assigned HR", value: d.outlet.assignedHr.primary?.name ?? "Not assigned" },
              { label: "Address", value: d.outlet.address },
            ]}
          />
          <PhoneStickyAction>
            <button type="button" onClick={() => { setError(null); setEditing(true); }} className={PD_CTA}>
              Edit details
            </button>
          </PhoneStickyAction>
          <header className={`${CARD} mb-4 max-[767px]:hidden`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <Disc icon={Store} className="size-14" />
                <div className="min-w-0">
                  <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{d.outlet.name}</h1>
                  <p className="mt-1 text-[13px] break-words text-(--ap-muted)">
                    <Link href={clientHref(clientId)} className="font-bold text-(--ap-violet)">
                      {d.client.name}
                    </Link>{" "}
                    · {d.outlet.reference}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-(--ap-ink-2)">
                    <OrgStatusChip status={d.outlet.status} />
                    <span>{d.outlet.activeStaff} active staff</span>
                    <span>{d.outlet.openVacancies} open {d.outlet.openVacancies === 1 ? "vacancy" : "vacancies"}</span>
                    {!d.outlet.assignedHr.primary ? <NoHrChip /> : null}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button type="button" onClick={() => { setError(null); setEditing(true); }} className="ap-btn ap-btn-s h-11 px-5 text-[15px] font-semibold">
                  <Pencil className="size-4" aria-hidden="true" /> Edit details
                </button>
                <OutletAdminMenu clientId={clientId} outlet={d.outlet} />
              </div>
            </div>
          </header>
          <PhoneMore title="More details">
            <PageTabs label="Outlet sections" tabs={[...TABS]} value={tab} onChange={(k) => url.set({ tab: k === "overview" ? undefined : k })} idBase={tabId} />
            <div id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${tab}`}>
              {tab === "overview" ? <Overview d={d} onCover={(cover) => void save({ cover })} /> : null}
              {tab === "staff" ? <OrgStaffPanel staff={d.staff} /> : null}
              {tab === "vacancies" ? <VacanciesPanel clientId={clientId} outlet={{ id: d.outlet.id, name: d.outlet.name }} /> : null}
              {tab === "schedule" ? <Schedule d={d} /> : null}
              {tab === "activity" ? <ActivityPanel activity={d.activity} /> : null}
            </div>
          </PhoneMore>
          {editing ? (
            <OutletEditSheet
              initial={{ address: d.outlet.address, city: d.outlet.city, phone: d.phone, notes: d.notes }}
              busy={busy}
              error={error}
              onCancel={() => setEditing(false)}
              onSave={async (edit) => {
                if (await save(edit)) setEditing(false);
              }}
            />
          ) : null}
        </div>
      )}
    </AdminState>
  );
}

function Overview({ d, onCover }: { d: OutletDetail; onCover: (url: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setProblem("Please choose a picture (JPG, PNG or WebP).");
    if (file.size > 8 * 1024 * 1024) return setProblem("That picture is larger than 8 MB. Please choose a smaller one.");
    setProblem(null);
    onCover(URL.createObjectURL(file));
  }
  const none = <span className="text-(--ap-muted)">Not recorded</span>;
  return (
    <div className="@container flex flex-col gap-4">
      <Card title="Cover picture">
        <div className="relative flex h-[150px] items-center justify-center overflow-hidden rounded-2xl bg-(--ap-tint-soft)">
          {d.cover ? <Image src={d.cover} alt="" fill unoptimized sizes="100vw" className="object-cover" /> : <span className="text-[14px] text-(--ap-muted)">No cover picture yet</span>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" onClick={() => input.current?.click()} className="ap-btn ap-btn-s ap-btn-sm">
            {d.cover ? "Change cover" : "Add cover"}
          </button>
          {d.cover ? (
            <button type="button" onClick={() => onCover(null)} className="ap-hit text-[13px] font-bold text-(--ap-violet)">
              Remove
            </button>
          ) : null}
          <span className="text-[12px] text-(--ap-muted)">Demo only: kept for this visit.</span>
        </div>
        {problem ? <p role="alert" className="mt-2 text-[13px] font-semibold text-[#C8102E]">{problem}</p> : null}
      </Card>
      <Card title="Details">
        <Facts
          items={[
            { label: "Address", value: d.outlet.address },
            { label: "City", value: d.outlet.city },
            { label: "Phone", value: d.phone || none },
            { label: "Manager / contact", value: d.manager || none },
            { label: "Status", value: <OrgStatusChip status={d.outlet.status} /> },
            { label: "Reference", value: d.outlet.reference },
            { label: "Opening notes", value: d.notes || <span className="text-(--ap-muted)">None</span> },
          ]}
        />
      </Card>
      <AssignedHrCard hrUsers={d.hrUsers} history={d.hrHistory} what="outlet" />
    </div>
  );
}

function Schedule({ d }: { d: OutletDetail }) {
  return (
    <Card title="Schedule">
      <p className="mb-4 text-[14px] leading-snug text-(--ap-ink-2)">This week&apos;s shifts and coverage for {d.outlet.name} are in Scheduling, filtered to this outlet.</p>
      <Link href={outletSchedulingHref(d.outlet.id)} className="ap-btn ap-btn-p h-11 px-5 text-[15px] font-semibold text-white!">
        Open scheduling for this outlet
      </Link>
      <div className="mt-4">
        <NeedsConfirmation>What counts as full coverage needs Beeliv confirmation, so no coverage figure is shown here.</NeedsConfirmation>
      </div>
    </Card>
  );
}
