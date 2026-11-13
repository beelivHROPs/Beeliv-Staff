"use client";

import { useRef, useState, type ReactNode } from "react";
import { Check, RefreshCw, Upload, type LucideIcon } from "@/components/applicant/icons";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { FieldError } from "@/components/applicant/form-feedback";
import { SLOT_LABEL, describeState, noticeText, type ActionKind, type Tone } from "@/lib/applicant/uploads/copy";
import { rejectText, SLOT_POLICY } from "@/lib/applicant/uploads/policy";
import { useUploadSlot } from "@/lib/applicant/uploads/use-upload-slot";
import type { UploadSlot, UploadState } from "@/lib/applicant/uploads/types";
import { LINK_CLS, STROKE } from "./parts";

const TONE_CHIP: Record<Tone, string> = {
  mute: "ap-chip !bg-[#f3f1f5] !text-[#57545f] !font-semibold",
  info: "ap-chip !bg-[#f1e7f6] !text-[#5b087b] !font-semibold",
  ok: "ap-chip !bg-[#dcfce7] !text-[#15803d] !font-semibold",
  warn: "ap-chip !bg-(--ap-warn-bg) !text-(--ap-warn) !font-semibold",
  error: "ap-chip !bg-(--ap-rose-bg) !text-(--ap-rose) !font-semibold",
};

/** A file the prototype store already holds (not from the upload service). */
export interface ExistingFile {
  fileName: string;
  detail: string;
  verified: boolean;
  /** Slot for the View link etc., rendered by the caller. */
  extra?: ReactNode;
}

function fileLine(state: UploadState): string {
  const a = "attempt" in state ? state.attempt : undefined;
  if (a) return `${a.fileName} · ${a.size < 1_000_000 ? `${Math.max(1, Math.round(a.size / 1000))} KB` : `${(a.size / 1_000_000).toFixed(1)} MB`}`;
  if (state.kind === "rejected" || state.kind === "validating") return state.fileName;
  return "";
}

/** The hidden input + a function that opens it. One per slot, accepts only that slot's types. */
function usePicker(slot: UploadSlot, onFile: (f: File) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={ref}
      type="file"
      accept={SLOT_POLICY[slot].accept}
      className="hidden"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (f) onFile(f);
      }}
    />
  );
  return { open: () => ref.current?.click(), input };
}

/** Drop area for a slot with nothing yet. The hint is the slot's own. */
function SlotDropZone({ slot, title, onFile, error }: { slot: UploadSlot; title: string; onFile: (f: File) => void; error?: string }) {
  const [over, setOver] = useState(false);
  return (
    <div data-ap-field>
      <label
        data-ap-invalid={error ? true : undefined}
        className={`ap-drop relative ${over ? "ap-drop-over !border-(--ap-violet) !bg-(--ap-tint)" : ""} focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--ap-violet)`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
      >
        <Upload className="size-6.5 text-(--ap-violet)" strokeWidth={STROKE} aria-hidden="true" />
        <b className="text-[15px]">{title}</b>
        <span className="text-[13px] text-(--ap-muted)">
          Drag a file here or <u>browse</u> · {SLOT_POLICY[slot].hint}
        </span>
        <input
          type="file"
          accept={SLOT_POLICY[slot].accept}
          className="absolute size-px opacity-0"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onFile(f);
          }}
        />
      </label>
      <FieldError>{error}</FieldError>
    </div>
  );
}

type SlotApi = ReturnType<typeof useUploadSlot>;

/** Picker, the replace confirmation and the action switch, shared by the Apply step and the Documents page. */
function useSlotActions(slot: UploadSlot, u: SlotApi, existingVerified: boolean) {
  const state = u.state;
  const picker = usePicker(slot, (f) => void u.pick(f));

  /** Replace: confirm first when a file is already with the server or a reviewed file would be reset. */
  async function chooseFile() {
    const sent = state.kind === "checking" || state.kind === "in-review";
    if (sent || (existingVerified && state.kind === "idle")) {
      const ok = await confirmAction({
        tone: "caution",
        icon: RefreshCw,
        title: `Replace your ${SLOT_LABEL[slot]}?`,
        description: "Choose the new file on the next step.",
        points: ["Your current file stays in place until the new one has been checked.", "Beeliv will need to review the new file."],
        confirmLabel: "Choose new file",
      });
      if (!ok) return;
    }
    picker.open();
  }

  function act(kind: ActionKind) {
    switch (kind) {
      case "cancel":
        return u.cancel();
      case "dismiss":
        return u.dismiss();
      case "choose-file":
        return void chooseFile();
      case "choose-again":
        u.startOver();
        return picker.open();
      case "retry":
        // After a refresh the bytes are gone: the person picks the same file again.
        if ("needsFile" in state && state.needsFile && !u.hasFile()) return picker.open();
        return void u.retry();
    }
  }
  return { picker, chooseFile, act };
}

/**
 * Documents page: the Replace control for a row that is one of the three required slots.
 * `render` gets the button handler, a hidden input to place anywhere, and the status block to place under the row.
 */
export function SlotReplace({
  slot,
  verified,
  render,
}: {
  slot: UploadSlot;
  verified: boolean;
  render: (p: { replace: () => void; busy: boolean; input: ReactNode; status: ReactNode }) => ReactNode;
}) {
  const u = useUploadSlot(slot);
  const { picker, chooseFile, act } = useSlotActions(slot, u, verified);
  const copy = describeState(slot, u.state);
  const shown: UploadState = u.state.kind === "rejected" && u.state.previous ? u.state.previous : u.state;
  const shownCopy = describeState(slot, shown);
  const refusal = u.state.kind === "rejected" && u.state.previous ? copy : null;
  const actions = (refusal ? copy : shownCopy)?.actions.filter((a) => a.kind !== "choose-file" || u.state.kind === "rejected") ?? [];
  const busy = ["validating", "requesting", "uploading", "finishing"].includes(u.state.kind);
  const status =
    u.state.kind === "idle" ? (
      <span className="sr-only" role="status" aria-live="polite" />
    ) : (
      <div className="col-span-full rounded-xl bg-(--ap-tint) px-3.5 py-3">
        <span className="sr-only" role="status" aria-live="polite">
          {copy?.live}
        </span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <b className="text-[14px]">{fileLine(shown) || "New file"}</b>
          {shownCopy ? <span className={TONE_CHIP[shownCopy.tone]}>{shownCopy.chip}</span> : null}
        </div>
        {shownCopy?.progress !== undefined ? <ProgressBar value={shownCopy.progress} label={`Upload progress for your ${SLOT_LABEL[slot]}`} /> : null}
        {refusal ? <p className="mt-1.5 text-[14px] leading-snug text-(--ap-rose)">{refusal.detail}</p> : null}
        {shownCopy ? <p className="mt-1.5 text-[14px] leading-snug text-(--ap-ink-2)">{shownCopy.detail}</p> : null}
        {u.notice ? <p className="mt-1.5 text-[14px] leading-snug text-(--ap-rose)">{noticeText(slot, u.notice)}</p> : null}
        {actions.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((a) => (
              <button key={a.kind + a.label} type="button" onClick={() => act(a.kind)} className={`ap-btn ${a.primary ? "ap-btn-p" : "ap-btn-o"} text-[15px] font-semibold`}>
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  return <>{render({ replace: () => void chooseFile(), busy, input: picker.input, status })}</>;
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="ap-pb" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <i className="motion-reduce:!transition-none" style={{ width: `${pct}%`, transition: "width 200ms linear", animation: "none" }} />
    </div>
  );
}

/**
 * One required document (CV, passport photo or valid ID) for the Apply step and the Documents page.
 *  - idle, nothing yet: drop area with this slot's own hint
 *  - idle, a prototype file exists: the "Already provided" row with Replace
 *  - anything else: a status row for the attempt (uploading, checking, rejected, ...)
 * Status changes are announced politely from a live region that is always in the page.
 */
export function UploadSlotField({
  slot,
  title,
  icon: Icon,
  existing,
  error,
}: {
  slot: UploadSlot;
  title: string;
  icon: LucideIcon;
  existing?: ExistingFile;
  /** After a failed Submit: the line shown when nothing has been provided. */
  error?: string;
}) {
  const u = useUploadSlot(slot);
  const state = u.state;
  const copy = describeState(slot, state);
  const { picker, chooseFile, act } = useSlotActions(slot, u, !!existing?.verified);

  // A refused file while nothing else is held: keep the drop area and say why under it.
  const localRefusal = state.kind === "rejected" && state.local && !state.previous && !existing;
  const base = localRefusal ? rejectText(slot, state.reason) : error;

  const live = copy?.live ?? "";
  const liveRegion = (
    <span className="sr-only" role="status" aria-live="polite">
      {live}
    </span>
  );

  if (state.kind === "idle" && !existing) {
    return (
      <>
        <SlotDropZone slot={slot} title={title} error={base} onFile={(f) => void u.pick(f)} />
        {liveRegion}
      </>
    );
  }
  if (localRefusal) {
    return (
      <>
        <SlotDropZone slot={slot} title={title} error={base} onFile={(f) => void u.pick(f)} />
        {liveRegion}
      </>
    );
  }

  // A refused pick over a prototype file: keep that file's row and say why the new one was refused.
  const refusedOverExisting = state.kind === "rejected" && state.local && !state.previous && !!existing;
  // Idle with a prototype file: the familiar "Already provided" row.
  if ((state.kind === "idle" || refusedOverExisting) && existing) {
    return (
      <Row icon={Icon} title={title} detail={existing.detail}>
        <span className="inline-flex items-center gap-1.5 text-[14px] font-bold whitespace-nowrap text-(--ap-ok)">
          <Check className="size-4" strokeWidth={STROKE} aria-hidden="true" />
          Already provided
        </span>
        {refusedOverExisting && state.kind === "rejected" ? (
          <p className="mt-1.5 text-[14px] leading-snug text-(--ap-rose)" role="status">
            {rejectText(slot, state.reason)}{" "}
            <button type="button" className={`${LINK_CLS} !min-h-0`} onClick={() => u.dismiss()}>
              Dismiss
            </button>
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-0.5">
          {existing.extra}
          <button type="button" className={LINK_CLS} onClick={() => void chooseFile()} aria-label={`Replace ${title}`}>
            Replace
          </button>
        </div>
        {picker.input}
        {liveRegion}
      </Row>
    );
  }

  // A refused replacement falls back to the held file's row, with the refusal above it.
  const shown: UploadState = state.kind === "rejected" && state.previous ? state.previous : state;
  const shownCopy = describeState(slot, shown);
  const refusal = state.kind === "rejected" && state.previous ? copy : null;

  return (
    <Row icon={Icon} title={title} detail={fileLine(shown) || fileLine(state)} chip={shownCopy ? { text: shownCopy.chip, tone: shownCopy.tone } : undefined} progress={shownCopy?.progress} progressLabel={`Upload progress for ${title}`}>
      {refusal ? (
        <p className="mb-2 flex items-start gap-2 rounded-xl bg-(--ap-rose-bg) px-3 py-2 text-[14px] leading-snug text-(--ap-rose)" role="status">
          {refusal.detail}
        </p>
      ) : null}
      {shownCopy ? <p className="text-[14px] leading-snug text-(--ap-ink-2)">{shownCopy.detail}</p> : null}
      {existing && state.kind !== "rejected" && state.kind !== "checking" && state.kind !== "in-review" ? (
        <p className="mt-1 text-[13px] leading-snug text-(--ap-muted)">Your current file stays in place until this one is checked.</p>
      ) : null}
      {u.notice ? (
        <p className="mt-1.5 text-[14px] leading-snug text-(--ap-rose)" role="status">
          {noticeText(slot, u.notice)}
        </p>
      ) : null}
      {(refusal ? copy!.actions : (shownCopy?.actions ?? [])).length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {(refusal ? copy!.actions : shownCopy!.actions).map((a) => (
            <button key={a.kind + a.label} type="button" onClick={() => act(a.kind)} className={`ap-btn ${a.primary ? "ap-btn-p" : "ap-btn-o"} text-[15px] font-semibold`}>
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
      {picker.input}
      {liveRegion}
    </Row>
  );
}

function Row({
  icon: Icon,
  title,
  detail,
  chip,
  progress,
  progressLabel,
  children,
}: {
  icon: LucideIcon;
  title: string;
  detail?: string;
  chip?: { text: string; tone: Tone };
  progress?: number;
  progressLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-t border-(--ap-line-2) py-3.5 first:border-t-0">
      <span className="flex size-10 shrink-0 items-center justify-center text-(--ap-ink-2)">
        <Icon className="size-5" strokeWidth={STROKE} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <b className="text-[14px]">{title}</b>
          {chip ? <span className={TONE_CHIP[chip.tone]}>{chip.text}</span> : null}
        </div>
        {detail ? <span className="ap-sm block truncate">{detail}</span> : null}
        {progress !== undefined ? <ProgressBar value={progress} label={progressLabel ?? "Upload progress"} /> : null}
        <div className="mt-1.5">{children}</div>
      </div>
    </div>
  );
}
