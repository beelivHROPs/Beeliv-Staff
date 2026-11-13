"use client";

/**
 * Job templates (Lists & Rules): list, create, edit, duplicate, delete (= archive).
 * Operations and the HR Manager only (capability journeyTemplates.manage). A new
 * vacancy COPIES a template, so nothing here changes a vacancy that exists.
 * Calm list: one card, hairline rows, quiet buttons.
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { BackHeader, BackLink, Banner, MUTED_NOTE } from "@/components/admin/ops/assign/kit";
import { Restricted } from "@/components/admin/vacancies/parts";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { Layers, Plus, Repeat, Trash2 } from "@/components/applicant/icons";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { StatusChip } from "@/components/client/StatusChip";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { archiveJourneyTemplate, duplicateJourneyTemplate, useJourneyTemplates } from "@/lib/admin/journey-templates/hooks";
import type { JourneyTemplate } from "@/lib/admin/journey-templates/types";
import { roleCan, useAccessRole } from "@/lib/admin/role-access";
import { timeAgo } from "@/lib/client/format";
import { journeySummary } from "@/lib/journeys/types";

export const TEMPLATES_HREF = "/admin/lists/job-templates";
const SMALL = "inline-flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-(--ap-line) px-3 text-[13px] font-semibold text-(--ap-ink-2) hover:bg-(--ap-line-2) disabled:opacity-40";

export function TemplatesList() {
  const role = useAccessRole();
  const live = useJourneyTemplates();
  const sp = useSearchParams();
  const saved = sp.get("saved");
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(
    saved ? { tone: "ok", text: saved === "created" ? "Template created. Jobs that use it later get their own copy." : "Template saved. Jobs that already used it keep their own copy." } : null,
  );
  const [busy, setBusy] = useState<string | null>(null);

  const head = (
    <>
      <BackHeader href="/admin/lists" label="Lists & Rules" title="Job templates" />
      <BackLink href="/admin/lists" label="Lists & Rules" />
    </>
  );
  const heading = (
    <div className="max-[767px]:hidden">
      <PageHeading title="Job templates" right={role && roleCan(role, "journeyTemplates.manage") ? <NewButton /> : undefined} />
    </div>
  );

  if (role === null) return <div className="ap-shimmer h-[240px] rounded-2xl" role="status" aria-busy="true" aria-label="Loading" />;
  if (!roleCan(role, "journeyTemplates.manage") || live.status === "restricted") {
    return (
      <div>
        {head}
        {heading}
        <Restricted what="Job templates" />
      </div>
    );
  }
  if (live.status === "error") {
    return (
      <div>
        {head}
        {heading}
        <ErrorPanel title="We could not load the job templates" retry={live.retry} />
      </div>
    );
  }

  const all = live.data ?? [];
  const active = all.filter((t) => !t.archived);
  const archived = all.filter((t) => t.archived);

  async function run(t: JourneyTemplate, what: "duplicate" | "archive" | "restore") {
    if (what === "archive") {
      const ok = await confirmAction({
        tone: "caution",
        title: `Delete ${t.name}?`,
        description: "It can no longer be picked for new jobs. Jobs that already used it keep their own copy, and you can restore it from the deleted list.",
        confirmLabel: "Delete template",
        cancelLabel: "Keep it",
      });
      if (!ok) return;
    }
    setBusy(t.id);
    try {
      if (what === "duplicate") await duplicateJourneyTemplate(t.id);
      else await archiveJourneyTemplate(t.id, what === "archive");
      setNotice({ tone: "ok", text: what === "duplicate" ? `${t.name} was duplicated.` : what === "archive" ? `${t.name} was deleted. You can restore it below.` : `${t.name} was restored.` });
    } catch {
      setNotice({ tone: "bad", text: "We could not do that. Nothing was changed. Please try again." });
    }
    setBusy(null);
  }

  return (
    <div>
      {head}
      {heading}
      <p className="mb-5 max-w-[64ch] text-[14px] text-(--ap-muted)">
        A template is a starting point for a new job: its journey, documents and screening questions. A job gets its own copy, so changing a template later never changes jobs that already exist.
      </p>
      {notice ? (
        <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </Banner>
      ) : null}

      {live.status === "loading" ? (
        <div className="ap-shimmer h-[240px] rounded-[20px]" role="status" aria-busy="true" aria-label="Loading job templates" />
      ) : active.length === 0 && archived.length === 0 ? (
        <section className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={Layers} title="No job templates yet" description="Create one for a kind of job you hire for often, such as front of house or kitchen." action={<NewButton />} />
        </section>
      ) : (
        <>
          <section aria-label="Job templates" className="ap-card rounded-[20px] px-4.5 py-1.5 min-[768px]:px-5">
            {active.length === 0 ? <p className="py-4 text-[14px] text-(--ap-muted)">No active templates. Restore one below or create a new one.</p> : null}
            <ul className="m-0 list-none p-0">
              {active.map((t, i) => (
                <Row key={t.id} t={t} first={i === 0} busy={busy === t.id} onRun={run} />
              ))}
            </ul>
          </section>
          {archived.length > 0 ? (
            <section aria-label="Deleted job templates" className="mt-6">
              <h2 className="mb-2 px-1 text-[12px] font-semibold tracking-[.08em] text-(--ap-muted) uppercase">Deleted</h2>
              <div className="ap-card rounded-[20px] px-4.5 py-1.5 min-[768px]:px-5">
                <ul className="m-0 list-none p-0">
                  {archived.map((t, i) => (
                    <Row key={t.id} t={t} first={i === 0} busy={busy === t.id} onRun={run} />
                  ))}
                </ul>
              </div>
            </section>
          ) : null}
        </>
      )}
      <p className={`mt-4 ${MUTED_NOTE}`}>Who may manage templates (Operations and the HR Manager) needs Beeliv confirmation.</p>
    </div>
  );
}

function NewButton() {
  return (
    <Link href={`${TEMPLATES_HREF}/new`} className="ap-btn ap-btn-p h-11 shrink-0 px-5 text-[15px] font-semibold text-white!">
      <Plus className="size-4" aria-hidden="true" /> New template
    </Link>
  );
}

function Row({ t, first, busy, onRun }: { t: JourneyTemplate; first: boolean; busy: boolean; onRun: (t: JourneyTemplate, what: "duplicate" | "archive" | "restore") => void }) {
  return (
    <li className={`flex flex-col gap-3 py-4 min-[768px]:flex-row min-[768px]:items-center min-[768px]:justify-between ${first ? "" : "border-t border-(--ap-line-2)"} ${t.archived ? "opacity-70" : ""}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {t.archived ? (
            <span className="text-[15px] font-semibold text-(--ap-ink)">{t.name}</span>
          ) : (
            <Link href={`${TEMPLATES_HREF}/${t.id}`} className="text-[15px] font-semibold text-(--ap-ink) hover:underline">
              {t.name}
            </Link>
          )}
          {t.sample ? <StatusChip tone="mute">Sample</StatusChip> : null}
          {t.archived ? <StatusChip tone="mute">Deleted</StatusChip> : null}
        </div>
        <p className="mt-0.5 text-[13px] text-(--ap-muted)">
          {journeySummary(t.journey)}. {t.updatedBy === "Sample data" ? "Sample data." : `Updated ${timeAgo(t.updatedAt)} by ${t.updatedBy}.`}
        </p>
        {t.description ? <p className="mt-1 max-w-[70ch] text-[13px] leading-snug text-(--ap-ink-2)">{t.description}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {t.archived ? (
          <button type="button" disabled={busy} onClick={() => onRun(t, "restore")} className={SMALL}>
            <Repeat className="size-3.5" aria-hidden="true" /> Restore
          </button>
        ) : (
          <>
            <Link href={`${TEMPLATES_HREF}/${t.id}`} className={SMALL}>
              Edit
            </Link>
            <button type="button" disabled={busy} onClick={() => onRun(t, "duplicate")} className={SMALL}>
              Duplicate
            </button>
            <button type="button" disabled={busy} onClick={() => onRun(t, "archive")} className={SMALL} aria-label={`Delete ${t.name}`}>
              <Trash2 className="size-3.5" aria-hidden="true" /> Delete
            </button>
          </>
        )}
      </div>
    </li>
  );
}
