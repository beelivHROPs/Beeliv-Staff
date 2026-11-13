"use client";

/**
 * Level 3 of the Staff record (spec 28.3): the detail sections. Desktop shows one at a time under the tab row;
 * phones open the same panels one at a time from folded rows. Attendance / Schedule / Leave are read-only shells
 * with sample rows. Every list shows 5 rows, then Show more. Restricted values stay masked exactly as the data
 * layer returns them.
 */
import { useState } from "react";
import Link from "next/link";
import { SensitiveNote, SensitiveValue } from "@/components/admin/SensitiveValue";
import { ArrowRight, Check, Clock3, Files, LockKeyhole, Plus } from "@/components/applicant/icons";
import { ShieldAlert } from "@/components/client/icons";
import { EmptyState } from "@/components/applicant/primitives";
import { StatusChip } from "@/components/client/StatusChip";
import { applicantHref } from "@/lib/admin/links";
import { formatDate, formatDateShort } from "@/lib/applicant/time";
import type { StaffDetail } from "@/lib/admin/staff/types";
import type { StaffLeaveHistory } from "@/lib/admin/workforce/types";
import { textInScope } from "@/lib/admin/scope";
import { dayMonth } from "@/lib/client/format";
import { LeaveStatusChip } from "@/components/admin/workforce/parts";
import type { Live } from "@/lib/admin/workforce/hooks";
import { DataTable } from "./DataTable";
import { DocStateChip, documentViewerHref, NeedsConfirmation, reassignHref } from "./parts";
import { DCard, LINK_BTN, Pill, PillRow, Rows, isAwaiting, useFive, type PillTone } from "./detail-kit";

export type TabKey = "overview" | "attendance" | "schedule" | "leave" | "training" | "documents" | "agreements" | "warnings" | "history";

const dash = <span className="text-(--ap-muted)">-</span>;
const ATT_TONE = { Present: "ok", Late: "warn", Absent: "bad", "On leave": "info" } as const;
const ATT_PILL: Record<string, PillTone> = { Present: "ok", Late: "wt", Absent: "bad", "On leave": "info" };

/** Next upcoming shift (or the first one on record). */
export const nextShiftOf = (s: StaffDetail) => {
  const now = Date.now();
  const sorted = [...s.schedule].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.find((x) => new Date(x.date).getTime() >= now - 86_400_000) ?? null;
};

/* ---------- Overview ---------- */

export function OverviewPanel({ s, goTab }: { s: StaffDetail; goTab: (k: TabKey) => void }) {
  const cur = s.assignments.find((a) => a.status === "current");
  const next = nextShiftOf(s);
  const latest = [...s.attendance].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const r = s.recruitment;
  const recent = [...s.activity].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  const awaiting = isAwaiting(s);

  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-6 @min-[760px]:grid-cols-2 @min-[760px]:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <DCard title="Current assignment">
            {cur ? (
              <Rows rows={[{ label: "Client", value: cur.client }, { label: "Outlet", value: cur.outlet }, { label: "Role", value: cur.role }, { label: "Since", value: formatDate(cur.start) }]} />
            ) : (
              <p className="text-[14px] leading-snug text-(--ap-muted)">{awaiting ? "Approved, not placed with a client yet." : "No current assignment."}</p>
            )}
          </DCard>

          <DCard title="Next shift" right={s.schedule.length > 0 ? <button type="button" onClick={() => goTab("schedule")} className={LINK_BTN}>Schedule</button> : null}>
            {next ? (
              <Rows rows={[{ label: "Date", value: formatDate(next.date) }, { label: "Shift", value: next.shift }, { label: "Outlet", value: next.outlet }]} />
            ) : (
              <p className="text-[14px] leading-snug text-(--ap-muted)">No upcoming shift on record.</p>
            )}
          </DCard>

          <DCard title="Latest attendance" right={s.attendance.length > 0 ? <button type="button" onClick={() => goTab("attendance")} className={LINK_BTN}>View all</button> : null}>
            {latest.length === 0 ? (
              <p className="text-[14px] leading-snug text-(--ap-muted)">No attendance on record yet.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col p-0">
                {latest.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-(--ap-line-2) py-2.5 text-[14px] first:border-t-0 first:pt-0 last:pb-0">
                    <span className="min-w-0 flex-1">
                      <b className="font-semibold text-(--ap-ink)">{formatDateShort(a.date)}</b>
                      <span className="ml-2 text-(--ap-muted)">{a.shift}</span>
                    </span>
                    <Pill tone={ATT_PILL[a.state]}>{a.state}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </DCard>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <DCard title="Contact and employment">
            <Rows
              rows={[
                { label: "Email", value: <span className="break-all">{s.email}</span> },
                { label: "Phone", value: s.phone },
                { label: "Employment", value: s.employmentState },
                { label: "Department", value: s.department },
                { label: "Assigned HR", value: s.assignedHr.primary ? `${s.assignedHr.primary.name}${s.assignedHr.additional ? ` and ${s.assignedHr.additional} more authorised` : ""}` : "Unassigned" },
              ]}
            />
          </DCard>

          <DCard title="Restricted details">
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {s.restricted.map((m) => (
                <li key={m.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] bg-(--ap-tint-soft) px-3 py-2.5">
                  <LockKeyhole className="size-4 shrink-0 text-(--ap-muted)" aria-hidden="true" />
                  <span className="text-[14px] font-bold">{m.label}</span>
                  {m.label === "NIN" || m.label === "Bank account" ? (
                    <SensitiveValue label={m.label} masked={m.masked} record={`${m.label}, ${s.name}`} href={`/admin/staff/directory/${s.id}`} subject={{ kind: "staff", inScope: textInScope(s.client) }} />
                  ) : (
                    <span className="font-mono text-[14px] tracking-wider break-all" aria-label={`${m.label} hidden, masked placeholder`}>
                      {m.masked}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <SensitiveNote className="mt-3 text-[13px] leading-snug text-(--ap-muted)">Restricted. Identity and bank values are masked; Reveal asks for a reason and is recorded.</SensitiveNote>
          </DCard>

          <DCard title="Recruitment history">
            {r ? (
              <p className="text-[14px] leading-snug text-(--ap-ink-2)">
                Applied for <b>{r.vacancy}</b> on {formatDate(r.appliedAt)}.{" "}
                <Link href={applicantHref(r.applicantId)} className="inline-flex items-center gap-1 font-bold text-(--ap-violet)">
                  Applicant record <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </p>
            ) : (
              <p className="text-[14px] leading-snug text-(--ap-muted)">Added as existing staff by invitation. No applicant record.</p>
            )}
          </DCard>

          <DCard title="Recent activity" right={s.activity.length > 5 ? <button type="button" onClick={() => goTab("history")} className={LINK_BTN}>View all</button> : null}>
            {recent.length === 0 ? <p className="text-[14px] text-(--ap-muted)">No activity yet.</p> : <Timeline items={recent} />}
          </DCard>
        </div>
      </div>
    </div>
  );
}

function Timeline({ items }: { items: StaffDetail["activity"] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {items.map((a) => (
        <li key={a.id} className="border-l-2 border-(--ap-tint-2) pl-3.5 text-[14px]">
          <b className="block font-semibold break-words">{a.action}</b>
          {a.to ? <span className="block break-words text-(--ap-ink-2)">{a.from ? `${a.from} to ${a.to}` : a.to}</span> : null}
          <span className="text-[13px] text-(--ap-muted)">
            {a.actor} · {formatDate(a.at)}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Attendance / Schedule ---------- */

export function AttendancePanel({ s }: { s: StaffDetail }) {
  const { rows, more } = useFive(s.attendance);
  return (
    <DCard title="Attendance" hideTitleOnPhone>
      {s.attendance.length === 0 ? (
        <EmptyState icon={Clock3} title="No attendance yet" description="Check-ins show here once this person has worked a shift." />
      ) : (
        <>
          <NeedsConfirmation>Read-only sample rows. Late / absent and approval rules need Beeliv confirmation, so nothing here is calculated.</NeedsConfirmation>
          <div className="mt-3">
            <DataTable
              label="Attendance (sample)"
              heads={["Date", "Shift", "In", "Out", "State"]}
              cols="@min-[560px]:grid-cols-[1fr_1.4fr_80px_80px_100px]"
              rows={rows.map((r) => ({ key: r.id, cells: [formatDateShort(r.date), r.shift, r.checkIn ?? dash, r.checkOut ?? dash, <StatusChip key="s" tone={ATT_TONE[r.state]}>{r.state}</StatusChip>] }))}
            />
          </div>
          {more}
        </>
      )}
    </DCard>
  );
}

export function SchedulePanel({ s }: { s: StaffDetail }) {
  const { rows, more } = useFive(s.schedule);
  return (
    <DCard title="Schedule" hideTitleOnPhone>
      {s.schedule.length === 0 ? (
        <EmptyState icon={Files} title="No upcoming shifts" description="Shifts set in Workforce, Scheduling show here." />
      ) : (
        <>
          <NeedsConfirmation>Read-only sample shifts. Scheduling rules need Beeliv confirmation; shifts are set in Workforce, Scheduling.</NeedsConfirmation>
          <div className="mt-3">
            <DataTable label="Upcoming shifts (sample)" heads={["Date", "Shift", "Outlet"]} cols="@min-[560px]:grid-cols-[1fr_1.4fr_1.2fr]" rows={rows.map((r) => ({ key: r.id, cells: [formatDateShort(r.date), r.shift, r.outlet] }))} />
          </div>
          {more}
        </>
      )}
    </DCard>
  );
}

/* ---------- Leave ---------- */

export function LeavePanel({ live }: { live: Live<StaffLeaveHistory> }) {
  const h = live.data;
  const { rows, more } = useFive(h?.requests ?? []);
  return (
    <DCard title="Leave" hideTitleOnPhone>
      {live.status === "loading" ? (
        <p className="text-[14px] text-(--ap-muted)">Loading leave...</p>
      ) : live.status === "error" || live.status === "restricted" ? (
        <p className="text-[14px] text-(--ap-muted)">
          We could not load leave history.{" "}
          <button type="button" onClick={live.retry} className="font-bold text-(--ap-violet)">
            Try again
          </button>
        </p>
      ) : !h || h.requests.length === 0 ? (
        <EmptyState icon={Files} title="No leave on record" description="Leave requests for this person show here once they exist." />
      ) : (
        <>
          <dl className="mb-3 flex flex-wrap gap-x-10 gap-y-2">
            <div>
              <dt className="text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase">Taken this year</dt>
              <dd className="mt-0.5 text-[17px] font-bold">{h.takenThisYear} {h.takenThisYear === 1 ? "day" : "days"}</dd>
            </div>
            {h.balance ? (
              <div>
                <dt className="text-[12px] font-bold tracking-wide text-(--ap-muted) uppercase">Balance</dt>
                <dd className="mt-0.5 text-[17px] font-bold">{h.balance.remaining} {h.balance.unit} left</dd>
              </div>
            ) : null}
          </dl>
          <ul className="m-0 flex list-none flex-col p-0">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-(--ap-line-2) py-2.5 first:border-t-0">
                <span className="min-w-0 flex-1 text-[14px]">
                  <b className="text-(--ap-ink)">{r.type}</b>
                  <span className="ml-2 text-(--ap-muted) tabular-nums">
                    {dayMonth(r.startDate)}{r.endDate !== r.startDate ? ` - ${dayMonth(r.endDate)}` : ""} · {r.days} {r.days === 1 ? "day" : "days"}
                  </span>
                </span>
                <LeaveStatusChip status={r.status} />
              </li>
            ))}
          </ul>
          {more}
          <p className="mt-3 text-[12px] text-(--ap-muted)">Sample data. Leave approval rules need Beeliv confirmation; decisions are made on the Leave page.</p>
        </>
      )}
    </DCard>
  );
}

/* ---------- Training and SOPs ---------- */

type TrainFilter = "all" | "done" | "not-yet";
export function TrainingPanel({ s }: { s: StaffDetail }) {
  const [f, setF] = useState<TrainFilter>("all");
  const done = s.training.filter((t) => t.state !== "Pending");
  const notYet = s.training.filter((t) => t.state === "Pending");
  const list = f === "done" ? done : f === "not-yet" ? notYet : s.training;
  const { rows, more } = useFive(list);
  const pct = s.training.length ? done.length / s.training.length : 0;
  return (
    <DCard title="Training and SOPs" hideTitleOnPhone>
      {s.training.length === 0 ? (
        <EmptyState icon={Files} title="No SOPs or training assigned" description="Assigned SOPs and training show here with their completion." />
      ) : (
        <>
          <div className="mb-4">
            <p className="text-[14px] font-semibold text-(--ap-ink)">
              {done.length} of {s.training.length} completed
            </p>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-(--ap-line-2)" aria-hidden="true">
              <span className={`block h-full rounded-full ${notYet.length ? "bg-[#c98a1b]" : "bg-[#8b2252]"}`} style={{ width: `${Math.round(pct * 100)}%` }} />
            </span>
          </div>
          <PillRow
            label="Show"
            value={f}
            onChange={setF}
            options={[
              { key: "all", label: "All", count: s.training.length },
              { key: "done", label: "Done", count: done.length },
              { key: "not-yet", label: "Not yet", count: notYet.length },
            ]}
          />
          {rows.length === 0 ? (
            <p className="mt-4 text-[14px] text-(--ap-muted)">Nothing here.</p>
          ) : (
            <ul className="m-0 mt-3 flex list-none flex-col p-0">
              {rows.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-(--ap-line-2) py-3 first:border-t-0">
                  <span className="min-w-0 flex-1 text-[14px]">
                    <b className="block font-semibold break-words text-(--ap-ink)">{t.title}</b>
                    <span className="text-[13px] text-(--ap-muted)">{t.kind}</span>
                  </span>
                  {t.state === "Pending" ? (
                    <Pill tone="wt">Not yet</Pill>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#17803d] [html[data-admin-theme=dark]_&]:text-[#7fdcb6]">
                      <Check className="size-4" aria-hidden="true" />
                      {t.at ? formatDateShort(t.at) : t.state}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {more}
        </>
      )}
    </DCard>
  );
}

/* ---------- Documents / Agreements ---------- */

export function DocumentsPanel({ s }: { s: StaffDetail }) {
  const { rows, more } = useFive(s.documents);
  return (
    <DCard title="Documents" hideTitleOnPhone right={<Link href="/admin/staff/documents" className={LINK_BTN}>All staff documents</Link>}>
      {s.documents.length === 0 ? (
        <EmptyState icon={Files} title="No documents yet" description="Documents show here once they are uploaded or requested." />
      ) : (
        <>
          <DataTable
            label="Staff documents"
            heads={["Document", "Status", "Updated", "Reviewer", ""]}
            cols="@min-[560px]:grid-cols-[1.5fr_120px_1fr_1fr_90px]"
            rows={rows.map((d) => ({
              key: d.id,
              cells: [
                <b key="t">{d.type}</b>,
                <DocStateChip key="s" state={d.state} />,
                d.updatedAt ? formatDateShort(d.updatedAt) : dash,
                d.reviewer ?? dash,
                d.state === "missing" ? dash : (
                  <Link key="v" href={documentViewerHref(d.id)} className="inline-flex items-center gap-1 text-[14px] font-bold text-(--ap-violet)">
                    Open <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                ),
              ],
            }))}
          />
          {more}
        </>
      )}
    </DCard>
  );
}

export function AgreementsPanel({ s }: { s: StaffDetail }) {
  const { rows, more } = useFive(s.agreements);
  return (
    <DCard title="Agreements" hideTitleOnPhone>
      {s.agreements.length === 0 ? (
        <EmptyState icon={Files} title="No agreements yet" description="Agreements and consents show here once they are sent." />
      ) : (
        <>
          <DataTable
            label="Agreements and consents"
            heads={["Agreement", "Version", "State", "Accepted"]}
            cols="@min-[560px]:grid-cols-[1.6fr_1fr_110px_1fr]"
            rows={rows.map((a) => ({ key: a.id, cells: [<b key="n">{a.name}</b>, a.version, <StatusChip key="s" tone={a.state === "Accepted" ? "ok" : "warn"}>{a.state}</StatusChip>, a.at ? formatDateShort(a.at) : dash] }))}
          />
          {more}
        </>
      )}
    </DCard>
  );
}

/* ---------- Warnings ---------- */

export function WarningsPanel({ s }: { s: StaffDetail }) {
  const { rows, more } = useFive(s.warnings);
  return (
    <DCard
      title="Warnings"
      hideTitleOnPhone
      right={
        <button type="button" disabled aria-describedby="warn-note" className="ap-btn ap-btn-s ap-btn-sm">
          <Plus className="size-4" aria-hidden="true" /> Issue warning
        </button>
      }
    >
      <div id="warn-note" className="mb-3">
        <NeedsConfirmation>Who may issue a warning needs Beeliv confirmation (the spec does not state it), so issuing is switched off in this prototype.</NeedsConfirmation>
      </div>
      {s.warnings.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No warnings" description="Warnings appear here when one is issued for this person." />
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {rows.map((w) => (
              <li key={w.id} className="rounded-xl border border-(--ap-line) p-4">
                <b className="block text-[15px] break-words">{w.title}</b>
                <span className="block text-[13px] text-(--ap-muted)">
                  {formatDate(w.issuedAt)} · {w.issuedBy}
                </span>
                <p className="mt-1.5 text-[14px] leading-snug text-(--ap-ink-2)">{w.summary}</p>
              </li>
            ))}
          </ul>
          {more}
        </>
      )}
    </DCard>
  );
}

/* ---------- History: assignments, hiring, activity ---------- */

export function HistoryPanel({ s }: { s: StaffDetail }) {
  const assign = useFive(s.assignments);
  const act = useFive(s.activity);
  const r = s.recruitment;
  const awaiting = isAwaiting(s);
  return (
    <div className="flex flex-col gap-6">
      <DCard
        title="Assignments"
        right={
          <Link href={reassignHref(s.id)} className="ap-btn ap-btn-s ap-btn-sm">
            {awaiting ? "Assign" : "Reassign"}
          </Link>
        }
      >
        {s.assignments.length === 0 ? (
          <p className="text-[14px] text-(--ap-muted)">No assignments yet.</p>
        ) : (
          <>
            <DataTable
              label="Assignment history"
              heads={["Client / outlet", "Role", "Dates", "Status", "Reason"]}
              cols="@min-[560px]:grid-cols-[1.3fr_1fr_1.1fr_90px_1.3fr]"
              rows={assign.rows.map((a) => ({
                key: a.id,
                cells: [
                  <span key="c">
                    <b>{a.client}</b>, {a.outlet}
                  </span>,
                  a.role,
                  <span key="d">
                    {formatDateShort(a.start)} - {a.end ? formatDateShort(a.end) : "present"}
                  </span>,
                  <StatusChip key="s" tone={a.status === "current" ? "ok" : "mute"}>
                    {a.status === "current" ? "Current" : "Ended"}
                  </StatusChip>,
                  a.reason ?? dash,
                ],
              }))}
            />
            {assign.more}
          </>
        )}
      </DCard>

      <DCard title="Hiring history">
        {r ? (
          <>
            <p className="mb-3 text-[14px] leading-snug text-(--ap-ink-2)">Same person as the original applicant record. The history is attached, not copied.</p>
            <Rows rows={[{ label: "Applicant reference", value: r.applicantReference }, { label: "Vacancy", value: r.vacancy }, { label: "Applied", value: formatDate(r.appliedAt) }]} />
            <ol className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
              {r.milestones.map((m) => (
                <li key={m.id} className="border-l-2 border-(--ap-tint-2) pl-3.5 text-[14px]">
                  <b className="block font-semibold">{m.label}</b>
                  <span className="text-[13px] text-(--ap-muted)">{formatDate(m.at)}</span>
                </li>
              ))}
            </ol>
            <Link href={applicantHref(r.applicantId)} className="ap-btn ap-btn-s mt-4 h-11">
              Open original applicant record <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </>
        ) : (
          <EmptyState icon={Files} title="No recruitment history on file" description="This person was added as existing staff by invitation, so there is no applicant record. Nothing is made up." />
        )}
      </DCard>

      <DCard title="Activity">
        {s.activity.length === 0 ? (
          <p className="text-[14px] text-(--ap-muted)">No activity yet.</p>
        ) : (
          <>
            <Timeline items={act.rows} />
            {act.more}
          </>
        )}
      </DCard>
    </div>
  );
}
