"use client";

/**
 * Interview detail + scorecard (spec 6.4, 14, 16). Criteria come from the
 * adapter (configurable). Ratings are 1-5; the total is a guide and the human
 * recommendation is chosen separately. Saving is in-memory in the mock and
 * appends a history entry. This screen never approves or selects anyone: final
 * approval belongs to Operations (HR only submits from the applicant record).
 * Reused: Card/CARD, StatusChip (Client), RowMenu-free buttons, Disc, Initials,
 * NoticeBanner, ErrorPanel, EmptyState, RelativeTime.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionsMenu } from "@/components/admin/applicants/ActionsMenu";
import { useState } from "react";
import { Calendar, Check, ChevronLeft, MapPin, Users, Video } from "@/components/applicant/icons";
import { DETAIL_TITLE, EmptyState } from "@/components/applicant/primitives";
import { CARD } from "@/components/applicant/SectionCard";
import { RelativeTime } from "@/components/applicant/RelativeTime";
import { Disc } from "@/components/admin/overview/Disc";
import { Initials } from "@/components/admin/overview/Sections";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { applicantHref } from "@/lib/admin/links";
import { saveInterviewScorecard, useInterview } from "@/lib/admin/interviews/hooks";
import { useCan } from "@/lib/admin/role-access";
import { SCORER_LABEL } from "@/lib/journeys/types";
import { METHOD_LABEL, RECOMMENDATION_LABEL, type InterviewDetail, type InterviewRecommendation } from "@/lib/admin/interviews/types";
import { StatusChip } from "@/components/client/StatusChip";
import { StarRating } from "@/components/shared/StarRating";
import { COVER_ROUND, PD_CTA, PhoneAction, PhoneDetailHead, PhoneFacts, PhoneMore, PhoneStickyAction, initialsOf } from "@/components/admin/PhoneDetail";
import { InterviewDialogs, type Intent } from "./InterviewDialogs";
import { InterviewStatusChip, InterviewStatusPill, NoticeBanner, RestrictedPanel, type Notice } from "./ui";

const RECS = Object.keys(RECOMMENDATION_LABEL) as InterviewRecommendation[];
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const H2 = "ap-serif mb-3 text-[18px] leading-tight";

function Back() {
  return (
    <Link href="/admin/recruitment/interviews" className="ap-hit mb-3 inline-flex items-center gap-1.5 text-[15px] font-bold text-(--ap-violet) hover:text-(--ap-plum) max-[767px]:hidden">
      <ChevronLeft className="size-4" aria-hidden="true" /> Interviews
    </Link>
  );
}

export function InterviewDetailView({ id }: { id: string }) {
  const live = useInterview(id);
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const mayScoreCap = useCan("interviews.score");

  if (live.status === "restricted") return <RestrictedPanel title="Interview" what="This interview" />;
  if (live.status === "error") {
    return (
      <>
        <Back />
        <ErrorPanel title="We could not load this interview" retry={live.retry} />
      </>
    );
  }
  if (live.status === "empty") {
    return (
      <>
        <Back />
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={Users} title="Interview not found" description="This interview does not exist or is outside your assigned clients and outlets." />
        </div>
      </>
    );
  }
  const d = live.data;
  if (!d) return <DetailSkeleton />;
  const c = d.capabilities;
  // Scoring controls are hidden (never greyed) for roles that may not score this stage.
  const canScore = c.canScore && mayScoreCap;
  // Phones: Reschedule (or Join) is an outline action and the scorecard / Schedule is the sticky button; the rest sits in the cover's More menu.
  const phoneMenu = [
    ...(c.canSchedule && canScore ? [{ label: "Schedule interview", onSelect: () => setIntent({ kind: "schedule", row: d }) }] : []),
    ...(c.canCancel ? [{ label: "Cancel interview", tone: "danger" as const, onSelect: () => setIntent({ kind: "cancel", row: d }) }] : []),
  ];

  return (
    <div>
      <Back />
      {/* Phones: cover, one status, Applicant / Reschedule, a short counted list, ONE sticky primary action. The scorecard stays in view; history and pathway are folded. */}
      <PhoneDetailHead
        backHref="/admin/recruitment/interviews"
        backLabel="Interviews"
        visual={{ kind: "initials", text: initialsOf(d.candidateName) }}
        title={d.candidateName}
        status={<InterviewStatusPill status={d.status} />}
        line={`${d.stageName} · ${d.vacancy}, ${d.client}`}
        actions={
          <>
            <PhoneAction href={applicantHref(d.applicantId)} label="Applicant" />
            {c.canReschedule ? <PhoneAction label="Reschedule" onClick={() => setIntent({ kind: "reschedule", row: d })} /> : d.link ? <PhoneAction href={d.link} label="Join" /> : null}
          </>
        }
        menu={
          phoneMenu.length > 0 ? <ActionsMenu quiet alignEnd label="More actions" triggerClassName={COVER_ROUND} items={phoneMenu} /> : null
        }
      />
      <PhoneFacts
        title="Interview"
        rows={[
          { label: "When", value: d.at ? `${new Date(d.at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}, ${d.durationMins} min` : "Not scheduled yet" },
          { label: "Interviewer", value: d.interviewer?.name ?? null },
          { label: "Method", value: d.method ? METHOD_LABEL[d.method] : null },
          { label: "Where", value: d.location || null },
        ]}
      />
      {canScore || c.canSchedule ? (
        <PhoneStickyAction>
          {canScore ? (
            <button type="button" onClick={() => document.getElementById("sc-h")?.scrollIntoView({ behavior: "smooth", block: "start" })} className={PD_CTA}>
              {d.scorecard.submittedAt ? "Update scorecard" : "Fill in scorecard"}
            </button>
          ) : (
            <button type="button" onClick={() => setIntent({ kind: "schedule", row: d })} className={PD_CTA}>
              Schedule interview
            </button>
          )}
        </PhoneStickyAction>
      ) : null}
      <NoticeBanner notice={notice} onClose={() => setNotice(null)} />
      <header className={`${CARD} mb-4 max-[767px]:hidden`}>
        <div className="flex flex-col gap-5 min-[1100px]:flex-row min-[1100px]:items-start min-[1100px]:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Initials name={d.candidateName} size="size-16" />
            <div className="min-w-0">
              <h1 className={`${DETAIL_TITLE} leading-tight break-words`}>{d.candidateName}</h1>
              <p className="mt-1 text-[14px] break-all text-(--ap-muted)">{d.applicantReference}</p>
              <p className="mt-2 text-[15px] leading-snug break-words">
                <b>{d.stageName}</b> for {d.vacancy}, {d.client}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-(--ap-ink-2)">
                <InterviewStatusChip status={d.status} />
                {d.at ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-4 shrink-0" aria-hidden="true" /> {when(d.at)}, {d.durationMins} min
                  </span>
                ) : (
                  <span className="text-(--ap-muted)">Not scheduled yet</span>
                )}
                {d.interviewer ? <span>Interviewer: {d.interviewer.name}</span> : null}
              </div>
              {d.method ? (
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-(--ap-muted)">
                  <span className="inline-flex items-center gap-1.5">
                    {d.method === "video" ? <Video className="size-4" aria-hidden="true" /> : <MapPin className="size-4" aria-hidden="true" />}
                    {METHOD_LABEL[d.method]}
                  </span>
                  {d.location ? <span>{d.location}</span> : null}
                  {d.link ? (
                    <span className="break-all">
                      Meeting link:{" "}
                      <a href={d.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-(--ap-violet) underline">
                        {d.link}
                      </a>
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
          </div>
          <div className={`flex flex-wrap gap-2.5 max-[600px]:flex-col min-[1100px]:max-w-[420px] min-[1100px]:justify-end`}>
            <span data-admin-detail="" hidden />
            {canScore ? (
              <button
                type="button"
                onClick={() => document.getElementById("sc-h")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="ap-btn ap-btn-p h-12 px-5 text-white!"
              >
                {d.scorecard.submittedAt ? "Update scorecard" : "Fill in scorecard"}
              </button>
            ) : c.canSchedule ? (
              <button type="button" onClick={() => setIntent({ kind: "schedule", row: d })} className="ap-btn ap-btn-p h-12 px-5 text-white!">
                Schedule interview
              </button>
            ) : null}
            <ActionsMenu
              items={[
                ...(c.canSchedule && canScore ? [{ label: "Schedule interview", onSelect: () => setIntent({ kind: "schedule", row: d }) }] : []),
                ...(c.canReschedule ? [{ label: "Reschedule", onSelect: () => setIntent({ kind: "reschedule", row: d }) }] : []),
                { label: "View applicant", onSelect: () => router.push(applicantHref(d.applicantId)) },
                ...(c.canCancel ? [{ label: "Cancel interview", tone: "danger" as const, onSelect: () => setIntent({ kind: "cancel", row: d }) }] : []),
              ]}
            />
          </div>
        </div>
      </header>

      <div className="@container">
        <div className="grid grid-cols-1 gap-4 @min-[1000px]:grid-cols-[minmax(0,1fr)_320px] @min-[1000px]:items-start @min-[1000px]:gap-5">
          <div className="flex min-w-0 flex-col gap-4 @min-[1000px]:order-1">
            <Scorecard key={`${d.id}-${d.scorecard.submittedAt ?? "new"}-${canScore}`} d={d} editable={canScore} onSaved={(next) => { live.setData(next); setNotice({ kind: "ok", text: "Scorecard saved. It is in the interview history." }); }} onFailed={() => setNotice({ kind: "error", text: "We could not save the scorecard. Nothing was changed. Please try again." })} />
            <PhoneMore title="History">
              <History d={d} />
            </PhoneMore>
          </div>
          <aside className="flex flex-col gap-4 @min-[1000px]:order-2 @min-[1000px]:sticky @min-[1000px]:top-24">
            <PhoneMore title="Pathway">
              <Pathway d={d} />
            </PhoneMore>
          </aside>
        </div>
      </div>

      {intent ? (
        <InterviewDialogs
          key={`${intent.kind}-${intent.row?.id}`}
          intent={intent}
          interviewers={d.interviewerOptions}
          schedulable={[]}
          onClose={() => setIntent(null)}
          onSaved={(next, text, sound) => {
            setIntent(null);
            live.setData(next);
            setNotice({ kind: "ok", text, sound });
          }}
          onFailed={(text) => {
            setIntent(null);
            setNotice({ kind: "error", text });
          }}
        />
      ) : null}
    </div>
  );
}

/* ---------- scorecard ---------- */

function Scorecard({ d, editable, onSaved, onFailed }: { d: InterviewDetail; editable: boolean; onSaved: (d: InterviewDetail) => void; onFailed: () => void }) {
  const [ratings, setRatings] = useState<Record<string, number>>(d.scorecard.ratings);
  const [notes, setNotes] = useState(d.scorecard.notes);
  const [rec, setRec] = useState<InterviewRecommendation | null>(d.scorecard.recommendation);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);

  const rated = d.criteria.filter((c) => ratings[c.id]).length;
  // Guide total only: rating x weight over the stage's criteria. It decides nothing.
  const total = d.criteria.reduce((a, c) => a + (ratings[c.id] ?? 0) * c.weight, 0);
  const maxTotal = d.criteria.reduce((a, c) => a + c.scale * c.weight, 0);
  const missing = rated < d.criteria.length || !rec;

  async function save() {
    setTried(true);
    if (missing || !rec) return;
    setBusy(true);
    try {
      onSaved(await saveInterviewScorecard(d.id, { ratings, notes: notes.trim(), recommendation: rec }));
    } catch {
      onFailed();
    } finally {
      setBusy(false);
    }
  }

  if (!editable) {
    return (
      <section className={CARD} aria-labelledby="sc-h">
        <h2 id="sc-h" className={H2}>
          Scorecard
        </h2>
        <p className="text-[15px] leading-snug text-(--ap-muted)">
          {d.status === "cancelled"
            ? "This interview was cancelled, so there is nothing to score."
            : d.status === "to-schedule"
              ? "The scorecard opens once the interview is scheduled."
              : `Scoring for this stage is done by ${d.whoMayScore.map((r) => SCORER_LABEL[r]).join(", ") || "no one"}.`}
        </p>
      </section>
    );
  }

  return (
    <section className={CARD} aria-labelledby="sc-h">
      <h2 id="sc-h" className={H2}>
        Scorecard
      </h2>
      <p className="mb-4 text-[14px] leading-snug text-(--ap-muted)">Tap the stars to rate each criterion, from 1 (weak) up to 5 (excellent). The total is a guide only. Your recommendation is your own judgment.</p>
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {d.criteria.map((c) => (
          <li key={c.id} className="border-b border-(--ap-line-2) pb-4 last:border-b-0 last:pb-0">
            <div className="flex flex-col gap-2 min-[640px]:flex-row min-[640px]:items-center min-[640px]:justify-between">
              <div className="min-w-0">
                <p id={`lbl-${c.id}`} className="text-[15px] font-bold">
                  {c.label}
                </p>
                {c.hint ? <p className="text-[13px] text-(--ap-muted)">{c.hint}</p> : null}
                {tried && !ratings[c.id] ? <p className="mt-1 text-[13px] font-semibold text-(--ap-rose)">Choose a rating.</p> : null}
              </div>
              <StarRating
                label={c.label}
                scale={c.scale}
                value={ratings[c.id] ?? null}
                onChange={(n) =>
                  setRatings((r) => {
                    const next = { ...r };
                    if (n === null) delete next[c.id];
                    else next[c.id] = n;
                    return next;
                  })
                }
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[15px] font-semibold tabular-nums" aria-live="polite">
        Total (guide only): {total} of {maxTotal} <span className="font-normal text-(--ap-muted)">({rated} of {d.criteria.length} rated)</span>
      </p>

      <label htmlFor="sc-notes" className="mt-5 block text-[14px] font-semibold text-(--ap-ink-2)">
        Interviewer notes
      </label>
      <textarea id="sc-notes" className="ap-input mt-1.5" rows={4} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />

      <p id="sc-rec" className="mt-5 text-[14px] font-semibold text-(--ap-ink-2)">
        Recommendation
      </p>
      <div role="radiogroup" aria-labelledby="sc-rec" className="mt-1.5 grid grid-cols-1 gap-2 min-[560px]:grid-cols-2">
        {RECS.map((r) => {
          const on = rec === r;
          return (
            <button key={r} type="button" role="radio" aria-checked={on} onClick={() => setRec(r)} className={`flex h-12 items-center gap-2.5 rounded-xl border px-3.5 text-left text-[15px] font-bold transition-colors ${on ? "border-(--ap-violet) bg-(--ap-tint) text-(--ap-violet)" : "border-(--ap-line) text-(--ap-ink-2) hover:bg-(--ap-tint-soft)"}`}>
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${on ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-(--ap-faint)"}`}>{on ? <Check className="size-3.5" aria-hidden="true" /> : null}</span>
              {RECOMMENDATION_LABEL[r]}
            </button>
          );
        })}
      </div>
      {tried && !rec ? <p className="mt-1 text-[13px] font-semibold text-(--ap-rose)">Choose a recommendation.</p> : null}
      <p className="mt-3 text-[13px] leading-snug text-(--ap-muted)">A recommendation to proceed does not select the candidate. Final approval belongs to Operations; HR submits for approval from the applicant record.</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} onClick={() => void save()} className="ap-btn ap-btn-p h-12 px-6 text-white! max-[600px]:w-full">
          {busy ? "Saving..." : d.scorecard.submittedAt ? "Update scorecard" : "Save scorecard"}
        </button>
        {d.scorecard.submittedAt && d.scorecard.submittedBy ? (
          <span className="text-[13px] text-(--ap-muted)">
            Last saved by {d.scorecard.submittedBy} <RelativeTime iso={d.scorecard.submittedAt} />
          </span>
        ) : null}
      </div>
    </section>
  );
}

/* ---------- history and pathway ---------- */

function History({ d }: { d: InterviewDetail }) {
  return (
    <section className={CARD} aria-labelledby="hist-h">
      <h2 id="hist-h" className={H2}>
        History
      </h2>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {d.history.map((h) => (
          <li key={h.id} className="flex gap-3">
            <Disc icon={Check} tone="brand" className="size-8" />
            <div className="min-w-0 text-[14px] leading-snug">
              <p className="font-bold break-words">
                {h.action}
                {h.from || h.to ? <span className="font-normal text-(--ap-muted)"> ({h.from ? `${h.from} to ` : ""}{h.to})</span> : null}
              </p>
              {h.note ? <p className="break-words text-(--ap-ink-2)">{h.note}</p> : null}
              <p className="text-[13px] text-(--ap-muted)">
                {h.actor}, <RelativeTime iso={h.at} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Pathway({ d }: { d: InterviewDetail }) {
  return (
    <section className={CARD} aria-labelledby="path-h">
      <h2 id="path-h" className={H2}>
        Interview stages
      </h2>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {d.pathway.map((p) => (
          <li key={p.stageId} className="flex items-center justify-between gap-3 text-[14px]">
            <span className={`min-w-0 break-words ${p.stageId === d.stageId ? "font-bold text-(--ap-violet)" : "text-(--ap-ink-2)"}`}>{p.stageName}</span>
            {p.state === "not-required" ? <StatusChip tone="mute">Not set up</StatusChip> : <InterviewStatusChip status={p.state} />}
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[13px] leading-snug text-(--ap-muted)">Stages are configurable and some apply only where required. The set shown here needs Beeliv confirmation.</p>
    </section>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading interview">
      <div className="ap-shimmer mb-3 h-5 w-28 rounded-lg" />
      <div className="ap-shimmer mb-4 h-[170px] rounded-2xl" />
      <div className="ap-shimmer h-[360px] rounded-2xl" />
    </div>
  );
}
