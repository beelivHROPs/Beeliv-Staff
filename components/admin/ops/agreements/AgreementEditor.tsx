"use client";

/**
 * Agreement editor (Head of Operations only): plain-text draft, "Preview as staff sees
 * it", Publish (confirm step, re-accept choice, short change note) and the version
 * history. Published versions are read only; a change is always a new version.
 * Saved/Published appear only after the adapter confirms. Validation keeps what was
 * typed; a conflict reloads and says so. No wording is supplied by this screen.
 */
import Link from "next/link";
import { useId, useState } from "react";
import { ADMIN_THEME } from "@/components/admin/AdminShell";
import { BackHeader, BackLink, Banner, GROUP, GROUP_HEAD, MAIN_BTN, MUTED_NOTE, QUIET_BTN, ROW_LINE, Sheet, Toggle } from "@/components/admin/ops/assign/kit";
import { OpsOnly } from "@/components/admin/ops/parts";
import { Restricted } from "@/components/admin/vacancies/parts";
import { PageHeading } from "@/components/applicant/primitives";
import { StatusChip } from "@/components/client/StatusChip";
import { AgreementReader } from "@/components/shared/agreements/AgreementReader";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { AgreementValidationError, ConflictError, publishAgreement, saveAgreementDraft, useAgreementDocument } from "@/lib/admin/agreements/hooks";
import type { AgreementDetail, AgreementDocId, AgreementFieldErrors, AgreementVersion, ChangeSize } from "@/lib/admin/agreements/types";
import { nextVersion } from "@/lib/admin/agreements/version";
import { formatDate, formatTime } from "@/lib/applicant/time";
import { timeAgo } from "@/lib/client/format";
import { AGREEMENTS_HREF, DocStatusChip } from "./AgreementsList";

export function AgreementEditor({ id }: { id: AgreementDocId }) {
  return (
    <OpsOnly what="Agreements and policies" fallback={<div className="ap-shimmer h-[320px] rounded-2xl" />}>
      <Loader id={id} />
    </OpsOnly>
  );
}

function Loader({ id }: { id: AgreementDocId }) {
  const live = useAgreementDocument(id);
  const [notice, setNotice] = useState<string | null>(null);
  if (live.status === "error")
    return (
      <div>
        <BackLink href={AGREEMENTS_HREF} label="Agreements and policies" />
        <ErrorPanel title="We could not load this document" retry={live.retry} />
      </div>
    );
  if (live.status === "restricted")
    return (
      <div>
        <BackLink href={AGREEMENTS_HREF} label="Agreements and policies" />
        <Restricted what="Agreements and policies" />
      </div>
    );
  if (!live.data)
    return (
      <div role="status" aria-busy="true" aria-label="Loading" className="flex max-w-[760px] flex-col gap-3">
        <div className="ap-shimmer h-10 w-1/2 rounded-lg" />
        <div className="ap-shimmer h-72 rounded-[14px]" />
      </div>
    );
  return (
    <>
      {notice ? (
        <Banner tone="warn" onDismiss={() => setNotice(null)}>
          {notice}
        </Banner>
      ) : null}
      <Editor
        key={`${live.data.summary.id}-${live.data.draft.revision}-${live.data.versions.length}`}
        initial={live.data}
        onConflict={() => {
          setNotice("Someone else changed this document first. We loaded the latest. Check it, then save or publish again if you still need to.");
          live.retry();
        }}
      />
    </>
  );
}

function Editor({ initial, onConflict }: { initial: AgreementDetail; onConflict: () => void }) {
  const [detail, setDetail] = useState(initial);
  const [text, setText] = useState(initial.draft.body);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reading, setReading] = useState<AgreementVersion | null>(null);
  const textId = useId();

  const s = detail.summary;
  const dirty = text !== detail.draft.body;
  const isPublic = s.group === "public";
  const current = detail.versions[0] ?? null;
  const nothingToPublish = !text.trim() || (current !== null && text === current.body);

  async function save() {
    setBusy(true);
    setFailed(false);
    setSaved(null);
    try {
      const next = await saveAgreementDraft(s.id, text, detail.draft.revision);
      setDetail(next);
      setText(next.draft.body);
      setSaved("Draft saved. It is not published, and nobody else can see it.");
    } catch (e) {
      if (e instanceof ConflictError) onConflict();
      else setFailed(true);
    }
    setBusy(false);
  }

  return (
    <div className="max-w-[760px]">
      <BackHeader href={AGREEMENTS_HREF} label="Agreements and policies" title={s.title} />
      <BackLink href={AGREEMENTS_HREF} label="Agreements and policies" />
      <div className="max-[767px]:hidden">
        <PageHeading title={s.title} />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <DocStatusChip d={s} />
        <span className={MUTED_NOTE}>
          {s.code ? `${s.code} · ` : ""}
          {s.currentVersion && s.publishedAt ? `Current ${s.currentVersion}, published ${formatDate(s.publishedAt)}` : "No version published"}
          {s.acceptanceCount !== null && s.currentVersion ? ` · ${s.acceptanceCount} accepted (sample number)` : ""}
        </span>
      </div>

      {!s.currentVersion ? (
        <Banner tone="warn">
          Wording pending from Beeliv. Nothing is published, so {isPublic ? "the public page keeps its placeholder" : "people cannot finish setup that needs this document"}. Type the text Beeliv gives you below, or paste it in. This screen never writes wording for you.
        </Banner>
      ) : null}
      {saved ? (
        <Banner tone="ok" onDismiss={() => setSaved(null)}>
          {saved}
        </Banner>
      ) : null}
      {failed ? <Banner tone="bad">We could not save this. Nothing was changed and what you typed is still here. Please try again.</Banner> : null}

      <h2 className={GROUP_HEAD}>Draft</h2>
      <div className={`${GROUP} p-4`}>
        <label htmlFor={textId} className="mb-1.5 block text-[13px] font-semibold text-(--ap-ink-2)">
          Text (plain text only)
        </label>
        <textarea id={textId} className="ap-input min-h-[320px] w-full resize-y leading-[1.6]" value={text} onChange={(e) => { setText(e.target.value); setSaved(null); }} spellCheck />
        <p className={`mt-1.5 ${MUTED_NOTE}`}>No formatting, links or images. Line breaks are kept. Only the Head of Operations can see a draft.</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" disabled={!dirty || busy} onClick={() => void save()} className={`${QUIET_BTN} disabled:opacity-50`}>
          {busy ? "Saving..." : "Save draft"}
        </button>
        <button type="button" disabled={!text.trim()} onClick={() => setPreview(true)} className={`${QUIET_BTN} disabled:opacity-50`}>
          Preview as staff sees it
        </button>
        <button type="button" disabled={dirty || nothingToPublish || busy} onClick={() => setPublishing(true)} className={`${MAIN_BTN} disabled:opacity-50`}>
          Publish
        </button>
      </div>
      <p className={`mt-2 ${MUTED_NOTE}`}>
        {dirty ? "Save the draft before you publish." : current && text === current.body ? "The draft matches the published version, so there is nothing new to publish." : detail.draft.updatedAt && detail.draft.updatedBy ? `Draft saved ${timeAgo(detail.draft.updatedAt)} by ${detail.draft.updatedBy}.` : "Draft not saved yet."}
      </p>

      <h2 className={`${GROUP_HEAD} mt-8`}>Version history</h2>
      {detail.versions.length === 0 ? (
        <p className={`${GROUP} px-4 py-4 text-[14px] text-(--ap-muted)`}>No version has been published yet.</p>
      ) : (
        <ul className={`${GROUP} m-0 list-none p-0`}>
          {detail.versions.map((v, i) => (
            <li key={v.version} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${ROW_LINE}`}>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-(--ap-ink)">
                  {v.version} {i === 0 ? <StatusChip tone="ok">Current</StatusChip> : null}
                </span>
                <span className={`block ${MUTED_NOTE}`}>
                  Published {formatDate(v.publishedAt)} at {formatTime(v.publishedAt)} by {v.publishedBy}
                  {isPublic ? "" : v.reaccept ? " · people had to accept again" : " · no new acceptance asked"}
                </span>
                {v.changeNote ? <span className="block text-[13.5px] text-(--ap-ink-2)">{v.changeNote}</span> : null}
              </span>
              <button type="button" onClick={() => setReading(v)} className="ap-btn ap-btn-s h-10 rounded-full px-4 text-[14px] font-semibold">
                Read
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className={`mt-3 ${MUTED_NOTE}`}>
        Read only. A published version never changes.{" "}
        <Link href="/admin/ops/activity" className="font-semibold text-(--ap-violet)">
          Publishing is recorded in Activity.
        </Link>
      </p>

      {preview ? (
        <AgreementReader
          title={s.title}
          version="Draft"
          body={text}
          themeClass={ADMIN_THEME}
          banner="Draft, not published. Only you can see this, signed in. It is not a link you can share."
          meta="What staff will read"
          onClose={() => setPreview(false)}
        />
      ) : null}
      {reading ? <AgreementReader title={s.title} version={reading.version} body={reading.body} themeClass={ADMIN_THEME} meta={`Published ${formatDate(reading.publishedAt)} · fingerprint ${reading.bodyHash.slice(0, 12)}`} onClose={() => setReading(null)} /> : null}
      {publishing ? (
        <PublishSheet
          detail={detail}
          onClose={() => setPublishing(false)}
          onConflict={() => {
            setPublishing(false);
            onConflict();
          }}
          onDone={(next) => {
            setPublishing(false);
            setDetail(next);
            setText(next.draft.body);
            setSaved(`Published ${next.versions[0]?.version}. It is now the current version${isPublic ? "" : next.versions[0]?.reaccept ? ", and people will be asked to accept it" : ""}. Recorded in Activity.`);
          }}
        />
      ) : null}
    </div>
  );
}

function PublishSheet({ detail, onClose, onConflict, onDone }: { detail: AgreementDetail; onClose: () => void; onConflict: () => void; onDone: (d: AgreementDetail) => void }) {
  const s = detail.summary;
  const first = detail.versions.length === 0;
  const isPublic = s.group === "public";
  const [size, setSize] = useState<ChangeSize>("minor");
  const [reaccept, setReaccept] = useState(false);
  const [touchedReaccept, setTouched] = useState(false);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<AgreementFieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const noteId = useId();
  const label = nextVersion(s.currentVersion, size);
  // Project-lead decision 2026-10-18: for required documents the default is ON (people are notified and must accept before continuing); switching it off is only for typo-level corrections.
  const askAgain = first ? true : touchedReaccept ? reaccept : true;

  async function publish() {
    setBusy(true);
    setFailed(false);
    setErrors({});
    try {
      onDone(await publishAgreement(s.id, { expectedRevision: detail.draft.revision, size, reaccept: askAgain, changeNote: note }));
      return;
    } catch (e) {
      if (e instanceof AgreementValidationError) setErrors(e.fields);
      else if (e instanceof ConflictError) {
        onConflict();
        return;
      } else setFailed(true);
    }
    setBusy(false);
  }

  return (
    <Sheet
      title={`Publish ${label}`}
      subtitle={s.title}
      onClose={onClose}
      busy={busy}
      footer={
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onClose} disabled={busy} className={QUIET_BTN}>
            Cancel
          </button>
          <button type="button" onClick={() => void publish()} disabled={busy} className={`${MAIN_BTN} disabled:opacity-50`}>
            {busy ? "Publishing..." : `Publish ${label}`}
          </button>
        </div>
      }
    >
      <p className="mb-4 text-[14px] leading-[1.6] text-(--ap-ink-2)">Once published, this version cannot be changed or deleted. A later change becomes a new version, and this one stays in the history.</p>
      {failed ? <Banner tone="bad">We could not publish this. Nothing was changed. Please try again.</Banner> : null}

      {!first ? (
        <fieldset className="mb-4">
          <legend className="mb-1.5 text-[13px] font-semibold text-(--ap-ink-2)">How big is the change?</legend>
          {(
            [
              ["minor", "Small correction", "Spelling, a clearer sentence. Becomes " + nextVersion(s.currentVersion, "minor") + "."],
              ["major", "Major change", "Something people should know about. Becomes " + nextVersion(s.currentVersion, "major") + "."],
            ] as const
          ).map(([v, t, d]) => (
            <label key={v} className="mb-1.5 flex cursor-pointer items-start gap-3 rounded-[10px] border border-(--ap-line) px-3 py-2.5">
              <input type="radio" name="size" className="mt-1 accent-(--ap-violet)" checked={size === v} onChange={() => setSize(v)} />
              <span>
                <span className="block text-[14.5px] font-semibold text-(--ap-ink)">{t}</span>
                <span className={MUTED_NOTE}>{d}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {isPublic ? (
        <p className={`mb-4 ${MUTED_NOTE}`}>This is a public page. Visitors see it straight away; nobody is asked to accept it.</p>
      ) : first ? (
        <p className={`mb-4 ${MUTED_NOTE}`}>This is the first version, so everyone who needs it will be asked to accept it.</p>
      ) : (
        <div className="mb-4 flex min-h-12 items-center gap-3 rounded-[10px] border border-(--ap-line) px-3 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] text-(--ap-ink)">People must accept again</span>
            <span className={`block ${MUTED_NOTE}`}>{askAgain ? "Everyone who accepted an earlier version is told and must accept this one before they continue." : "People who accepted an earlier version are not asked again."}</span>
            <span className={`block ${MUTED_NOTE}`}>Switch this off only for typo-level corrections.</span>
            <span className={`block ${MUTED_NOTE} italic`}>Needs Beeliv confirmation</span>
          </span>
          <Toggle on={askAgain} label="People must accept again" onChange={(v) => { setTouched(true); setReaccept(v); }} />
        </div>
      )}

      <label htmlFor={noteId} className="mb-1.5 block text-[13px] font-semibold text-(--ap-ink-2)">
        What changed? (short note)
      </label>
      <input id={noteId} className="ap-input w-full" maxLength={200} value={note} aria-invalid={!!errors.changeNote} onChange={(e) => { setNote(e.target.value); setErrors((x) => ({ ...x, changeNote: "" })); }} />
      {errors.changeNote ? (
        <p role="alert" className="mt-1.5 text-[13px] font-semibold text-(--ap-rose)">
          {errors.changeNote}
        </p>
      ) : (
        <p className={`mt-1.5 ${MUTED_NOTE}`}>{first ? "For example: first version." : "Shown in the version history."}</p>
      )}
      {errors.body ? (
        <p role="alert" className="mt-2 text-[13px] font-semibold text-(--ap-rose)">
          {errors.body}
        </p>
      ) : null}
    </Sheet>
  );
}
