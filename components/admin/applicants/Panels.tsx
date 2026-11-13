"use client";

/** Tab panels for Applicant 360 (spec 28.2): Overview, Application, CV & Documents, Screening, Interviews, Assessments, Notes, Activity. */
import { InfoHint } from "@/components/admin/standard";
import { SensitiveNote, SensitiveValue } from "@/components/admin/SensitiveValue";
import { useState, type ReactNode } from "react";
import { ArrowRight, Download, LockKeyhole, Pencil } from "@/components/applicant/icons";
import { Chip, EmptyState, ProgressBar } from "@/components/applicant/primitives";
import { FileText, ScrollText } from "@/components/applicant/icons";
import { formatDate, formatTime } from "@/lib/applicant/time";
import type { ApplicantDetail, DocState } from "@/lib/admin/applicants/types";
import { FoldCard } from "@/components/admin/Fold";
import { AdminFileViewButton } from "@/components/admin/documentation/DemoFile";
import { adminFileKey } from "@/lib/demo-files/keys";
import { AnswersView } from "./Answers";
import { StageChip } from "./parts";

function Card({ title, children, right, closed }: { title: string; children: ReactNode; right?: ReactNode; closed?: boolean }) {
  return (
    <FoldCard title={title} right={right} closed={closed}>
      {children}
    </FoldCard>
  );
}

/** Label / value pairs that reflow from 1 to 2 columns by container width and never clip. */
function Facts({ items }: { items: { label: string; value: ReactNode; /** Already shown in the header on tablet and desktop. */ phoneOnly?: boolean }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3.5 @min-[560px]:grid-cols-2">
      {items.map((f) => (
        <div key={f.label} className={`min-w-0 ${f.phoneOnly ? "min-[768px]:hidden" : ""}`}>
          <dt className="text-[13px] font-bold tracking-wide text-(--ap-muted) uppercase">{f.label}</dt>
          <dd className="mt-0.5 text-[15px] leading-snug break-words text-(--ap-ink)">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const DOC_TONE: Record<DocState, { label: string; tone: "warn" | "ok" | "info" | "mute" }> = {
  missing: { label: "Missing", tone: "warn" },
  uploaded: { label: "Uploaded", tone: "info" },
  "needs-review": { label: "Needs review", tone: "warn" },
  resubmitted: { label: "Resubmitted", tone: "warn" },
  verified: { label: "Verified", tone: "ok" },
  rejected: { label: "Rejected", tone: "mute" },
};

export function OverviewPanel({ a }: { a: ApplicantDetail }) {
  return (
    <div className="flex flex-col gap-4">
      <Card title="About">
        <Facts
          items={[
            { label: "Email", value: a.email, phoneOnly: true },
            { label: "Phone", value: a.phone, phoneOnly: true },
            { label: "Location", value: a.location },
            { label: "Availability", value: a.availability },
            { label: "Preferred locations", value: a.preferredLocations.join(", ") },
            {
              label: "Expected salary",
              value: a.expectedSalary.allowed ? a.expectedSalary.value : <span className="text-(--ap-muted)">Not shown for your access level</span>,
            },
            { label: "Current vacancy", value: `${a.vacancy}, ${a.client} (${a.outlet})`, phoneOnly: true },
            { label: "Assigned recruiter", value: a.recruiter?.name ?? "Unassigned", phoneOnly: true },
          ]}
        />
      </Card>
      <Card title="Experience" closed>
        <p className="mb-4 text-[15px] leading-relaxed text-(--ap-ink-2)">{a.professionalSummary}</p>
        <ul className="flex flex-col gap-3">
          {a.experience.map((e) => (
            <li key={`${e.employer}-${e.period}`} className="min-w-0 border-l-2 border-(--ap-tint-2) pl-3.5">
              <b className="block text-[15px] break-words">{e.role}</b>
              <span className="text-[15px] break-words text-(--ap-muted)">
                {e.employer} · {e.period}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Skills" closed>
        <div className="flex flex-wrap gap-2">
          {a.skills.map((s) => (
            <Chip key={s} tone="violet">
              {s}
            </Chip>
          ))}
        </div>
      </Card>
      <Card title="ID and sensitive details" closed>
        <ul className="flex flex-col gap-2.5">
          {a.sensitive.map((s) => (
            <li key={s.label} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-(--ap-tint-soft) px-4 py-3 max-[767px]:rounded-none max-[767px]:bg-transparent max-[767px]:px-0 max-[767px]:py-1">
              <LockKeyhole className="size-[18px] shrink-0 text-(--ap-muted)" aria-hidden="true" />
              <span className="text-[15px] font-bold">{s.label}</span>
              <SensitiveValue label={s.label} masked={s.masked} record={`${s.label}, ${a.name}`} subject={{ kind: "applicant", inScope: true }} />
            </li>
          ))}
        </ul>
        <SensitiveNote className="mt-3 text-[14px] leading-snug text-(--ap-muted)">
          Only the last digits are shown. Revealing a full value needs a reason and is recorded.
        </SensitiveNote>
      </Card>
    </div>
  );
}

export function ApplicationPanel({ a }: { a: ApplicantDetail }) {
  return (
    <div className="flex flex-col gap-4">
    <Card title="Application details">
      <Facts
        items={[
          { label: "Vacancy", value: a.vacancy },
          { label: "Client / outlet", value: `${a.client}, ${a.outlet}` },
          { label: "Application date", value: formatDate(a.appliedAt) },
          { label: "Stage", value: <StageChip row={a} /> },
          { label: "Application reference", value: a.applicationRef },
          { label: "Applicant reference", value: a.reference },
          { label: "Employment type", value: a.employmentType },
          { label: "Assigned recruiter", value: a.recruiter?.name ?? "Unassigned" },
          { label: "Interview", value: a.interviewState },
          { label: "Assessment", value: a.assessmentState },
          {
            label: "Profile completion",
            value: (
              <span className="flex items-center gap-2.5">
                <span className="w-[120px] max-w-[50%]">
                  <ProgressBar percent={a.profilePercent} label="Profile completion" />
                </span>
                {a.profilePercent}%
              </span>
            ),
          },
          {
            label: "Document completion",
            value: (
              <span className="flex items-center gap-2.5">
                <span className="w-[120px] max-w-[50%]">
                  <ProgressBar percent={a.documentsPercent} label="Document completion" />
                </span>
                {a.documentsPercent}%
              </span>
            ),
          },
        ]}
      />
    </Card>
    <AnswersView submission={a.submission} kinds={["personal", "experience", "education", "skills", "availability", "documents", "declarations"]} title="Submitted application" />
    </div>
  );
}

const DOC_GROUPS = [
  { key: "cv", title: "CV" },
  { key: "checklist", title: "Documentation checklist" },
  { key: "guarantor-reference", title: "Guarantor and references" },
] as const;

export function DocumentsPanel({ a }: { a: ApplicantDetail }) {
  return (
    <div className="flex flex-col gap-4">
      {DOC_GROUPS.map((g) => {
        const docs = a.documents.filter((d) => d.group === g.key);
        return (
          <Card key={g.key} title={g.title} closed={g.key !== DOC_GROUPS[0].key}>
            <ul className="flex flex-col">
              {docs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-(--ap-line-2) py-3 first:pt-0 last:border-b-0 last:pb-0">
                  <div className="flex min-w-0 items-start gap-3">
                    <FileText className="mt-0.5 size-5 shrink-0 text-(--ap-violet)" aria-hidden="true" />
                    <div className="min-w-0">
                      <b className="block text-[15px] break-words">{d.type}</b>
                      <span className="text-[14px] text-(--ap-muted)">
                        {d.uploadedAt ? `Uploaded ${formatDate(d.uploadedAt)}` : "Not uploaded"}
                        {d.reviewer ? ` · Reviewed by ${d.reviewer}` : ""}
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-2.5">
                    <AdminFileViewButton
                      fileKey={adminFileKey(a.id, d.type, !!d.uploadedAt)}
                      title={d.type}
                      ownerName={a.name}
                      sensitiveLabel={d.type === "Identity document" ? "NIN" : undefined}
                      subject={{ kind: "applicant", inScope: true }}
                    />
                    <Chip tone={DOC_TONE[d.state].tone}>{DOC_TONE[d.state].label}</Chip>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
      <div className="flex items-center gap-1 text-[13px] text-(--ap-muted)">
        <Download className="size-4 shrink-0" aria-hidden="true" />
        Opening a document is logged
        <InfoHint label="About opening documents">Opening or downloading a document is a logged, authorised action. File viewing is not available in this prototype.</InfoHint>
      </div>
    </div>
  );
}

export function ScreeningPanel({ a }: { a: ApplicantDetail }) {
  return <AnswersView submission={a.submission} kinds={["screening"]} title="Screening answers" />;
}

const IV_STATE = { scheduled: "Scheduled", completed: "Completed", cancelled: "Cancelled", "not-scheduled": "Not scheduled" } as const;

export function InterviewsPanel({ a, kind }: { a: ApplicantDetail; kind: "interview" | "assessment" }) {
  const rows = a.interviews.filter((i) => i.kind === kind);
  const word = kind === "interview" ? "interviews" : "assessments";
  return (
    <Card title={kind === "interview" ? "Interviews" : "Assessments"} right={<InfoHint label="Who sees scores and notes">Scores and interviewer notes are visible to HR and Operations only.</InfoHint>}>
      {rows.length === 0 ? (
        <EmptyState icon={ScrollText} title={`No ${word} yet`} description={`Scheduled and completed ${word} appear here.`} />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((i) => (
            <li key={i.id} className="rounded-xl bg-(--ap-tint-soft) px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b className="text-[15px]">{i.title}</b>
                <Chip tone={i.state === "completed" ? "ok" : i.state === "scheduled" ? "info" : "mute"}>{IV_STATE[i.state]}</Chip>
              </div>
              <p className="mt-1.5 text-[15px] text-(--ap-ink-2)">
                {i.at ? `${formatDate(i.at)}, ${formatTime(i.at)}` : "No date set"}
                {i.interviewer ? ` · ${i.interviewer}` : ""}
              </p>
              {i.recommendation ? <p className="mt-1 text-[15px]">Recommendation: {i.recommendation}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function NotesPanel({ a, onAdd }: { a: ApplicantDetail; onAdd: (body: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      await onAdd(body);
      setText("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title="Notes" right={<InfoHint label="Who sees these notes">Internal HR notes. Never shown to the applicant or to clients.</InfoHint>}>
      {a.capabilities.canAddNote ? (
        <div className="mb-5">
          <label htmlFor="hr-note" className="sr-only">
            Add an internal note
          </label>
          <textarea id="hr-note" className="ap-input" rows={3} maxLength={1000} placeholder="Add an internal note" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="button" className="ap-btn ap-btn-p ap-btn-sm mt-2.5 h-11 text-white! max-[480px]:w-full" disabled={!text.trim() || busy} onClick={submit}>
            <Pencil className="size-4" aria-hidden="true" /> {busy ? "Saving..." : "Add note"}
          </button>
        </div>
      ) : null}
      <ul className="flex flex-col gap-3">
        {a.notes.map((n) => (
          <li key={n.id} className="min-w-0 rounded-xl border-l-4 border-(--ap-violet) bg-(--ap-tint-soft) px-4 py-3">
            <p className="text-[15px] leading-snug break-words whitespace-pre-wrap">{n.body}</p>
            <p className="mt-1.5 text-[13px] text-(--ap-muted)">
              {n.author} · {formatDate(n.at)}, {formatTime(n.at)}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ActivityPanel({ a }: { a: ApplicantDetail }) {
  return (
    <Card title="History">
      <ol className="flex flex-col">
        {a.activity.map((e) => (
          <li key={e.id} className="group relative flex gap-3 pb-5 last:pb-0">
            <span aria-hidden="true" className="absolute top-3 -bottom-1 left-[4px] w-px bg-(--ap-line) group-last:hidden" />
            <span aria-hidden="true" className="relative mt-1.5 size-[9px] shrink-0 rounded-full bg-(--ap-violet)" />
            <div className="min-w-0">
              <p className="text-[15px] leading-snug break-words">
                <b>{e.actor}</b> · {e.action}
              </p>
              {e.to ? (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[14px] text-(--ap-ink-2)">
                  <span>{e.from ?? "Not started"}</span>
                  <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
                  <b>{e.to}</b>
                </p>
              ) : null}
              <p className="mt-0.5 text-[13px] text-(--ap-muted)">
                {formatDate(e.at)}, {formatTime(e.at)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
