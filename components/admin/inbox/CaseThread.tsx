"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, CircleAlert, FileText, LockKeyhole, Mail, Menu, Pencil, UserRound } from "@/components/applicant/icons";
import { Chip } from "@/components/applicant/primitives";
import { toast } from "@/components/ui/toast";
import { inboxActions } from "@/lib/admin/inbox/hooks";
import type { InboxAssignee, InboxCaseDetail, InboxMessage, InboxNote, InboxPermissions, MessageDelivery } from "@/lib/admin/inbox/types";
import { assignCase, escalateCase } from "./CaseDetails";
import { CantAttendPanel } from "./CantAttendPanel";
import { Paperclip, Send, Tick } from "./Glyphs";
import { CATEGORY_LABEL, clockTime, DELIVERY_DOT, DELIVERY_EXPLAIN, DELIVERY_LABEL, dayKey, dayLabel, initials, NO_EMAIL_NOTE, STATUS_CHIP, STATUS_LABEL } from "./meta";

type Entry = { type: "message"; at: string; m: InboxMessage } | { type: "note"; at: string; n: InboxNote };

function Attachments({ items }: { items: InboxMessage["attachments"] }) {
  if (items.length === 0) return null;
  return (
    <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
      {items.map((a) => (
        <li key={a.id} className="flex max-w-full items-center gap-2 rounded-lg bg-black/5 px-2.5 py-1.5 text-sm">
          <FileText className="size-4 shrink-0 text-(--ap-violet)" aria-hidden="true" />
          <span className="min-w-0 truncate font-semibold">{a.name}</span>
          <span className="shrink-0 text-[12px] text-(--ap-muted)">{a.sizeLabel}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Quiet delivery line under an outbound email reply: a dot and one word, a
 * plain sentence only when something needs attention, and Retry / Check status
 * only where the SERVER says the action is allowed (never for bounced, blocked
 * or unknown outcomes; those are reconciled or fixed at the source, not resent).
 */
function DeliveryLine({ caseId, messageId, d }: { caseId: string; messageId: string; d: MessageDelivery }) {
  const [busy, setBusy] = useState(false);
  const explain = DELIVERY_EXPLAIN[d.state];

  async function retry() {
    setBusy(true);
    try {
      await inboxActions.retryDelivery(caseId, messageId);
      toast.add({ title: "Queued to send again", type: "success" });
    } catch {
      toast.add({ title: "Could not retry", description: "This email can no longer be retried from here.", type: "error" });
    } finally {
      setBusy(false);
    }
  }
  async function check() {
    setBusy(true);
    try {
      const r = await inboxActions.checkDelivery(caseId, messageId);
      toast.add({ title: r === "unknown" ? "Still not confirmed" : "Status updated", description: r === "unknown" ? "Try again in a few minutes. Nothing was resent." : undefined, type: r === "unknown" ? "info" : "success" });
    } catch {
      toast.add({ title: "Could not check the status", description: "Please try again.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  const link = "font-bold text-(--ap-violet) underline underline-offset-2 disabled:opacity-50";
  return (
    <div className="flex max-w-[88%] flex-col items-end pr-1 text-[12px] text-(--ap-muted) @min-[900px]:max-w-[70%]" data-delivery={d.state}>
      <p className="m-0 flex items-center gap-1.5">
        <span className={`size-1.5 shrink-0 rounded-full ${DELIVERY_DOT[d.state]}`} aria-hidden="true" />
        <span className="font-semibold text-(--ap-ink-2)">{DELIVERY_LABEL[d.state]}</span>
        <span className="truncate">to {d.to}</span>
      </p>
      {explain ? <p className="m-0 mt-0.5 text-right leading-snug wrap-anywhere">{explain}</p> : null}
      {d.canRetry || d.canCheckStatus ? (
        <p className="m-0 mt-0.5 flex items-center gap-3">
          {d.canRetry ? (
            <button type="button" className={link} disabled={busy} onClick={() => void retry()}>
              {busy ? "Retrying..." : "Retry"}
            </button>
          ) : null}
          {d.canCheckStatus ? (
            <button type="button" className={link} disabled={busy} onClick={() => void check()}>
              {busy ? "Checking..." : "Check status"}
            </button>
          ) : null}
          {d.supportRef ? <span>Ref {d.supportRef}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

/** Incoming bubbles sit left and light; outgoing sit right in the brand tint. */
function MessageBubble({ m, caseId }: { m: InboxMessage; caseId: string }) {
  const out = m.direction === "outbound";
  return (
    <div className={`flex flex-col gap-0.5 ${out ? "items-end" : "items-start"}`}>
      <article className={`min-w-0 max-w-[88%] rounded-2xl border px-3.5 py-2 shadow-[0_1px_1px_rgba(0,0,0,.04)] @min-[900px]:max-w-[70%] ${out ? "rounded-br-md border-(--ap-tint-2) bg-(--ap-tint)" : "rounded-bl-md border-(--ap-line) bg-white"}`}>
        {out ? <b className="mb-0.5 block text-[13px] text-(--ap-violet)">{m.authorName}</b> : null}
        <p className="m-0 text-[15px] leading-relaxed wrap-anywhere whitespace-pre-wrap">{m.body}</p>
        <Attachments items={m.attachments} />
        <span className="mt-1 flex items-center justify-end gap-1 text-[11px] text-(--ap-muted)">
          {m.viaEmail ? (
            <>
              <Mail className="size-3" aria-hidden="true" />
              <span>Replied by email</span>
              <span aria-hidden="true">-</span>
            </>
          ) : null}
          <time dateTime={m.createdAt}>{clockTime(m.createdAt)}</time>
          {out && !m.delivery ? (
            <>
              <Tick className="size-3.5 text-(--ap-violet)" />
              <span className="sr-only">Sent in the app</span>
            </>
          ) : null}
        </span>
      </article>
      {out && m.delivery ? <DeliveryLine caseId={caseId} messageId={m.id} d={m.delivery} /> : null}
    </div>
  );
}

/** Internal notes keep their own amber dashed look so they can never be mistaken for a sent message. */
function NoteBubble({ n }: { n: InboxNote }) {
  return (
    <div className="flex justify-center">
      <article className="w-full min-w-0 max-w-[92%] rounded-2xl border border-dashed border-(--ap-gold) bg-(--ap-warn-bg)/45 px-3.5 py-2.5 @min-[900px]:max-w-[70%]">
        <span className="mb-1 inline-flex items-center gap-1 text-[12px] font-bold text-(--ap-warn)">
          <LockKeyhole className="size-3.5" aria-hidden="true" />
          Internal, not emailed
        </span>
        <p className="m-0 text-[15px] leading-relaxed wrap-anywhere whitespace-pre-wrap">{n.body}</p>
        <span className="mt-1 flex justify-end gap-1.5 text-[11px] text-(--ap-muted)">
          <b>{n.authorName}</b>
          <time dateTime={n.createdAt}>{clockTime(n.createdAt)}</time>
        </span>
      </article>
    </div>
  );
}

type Mode = "reply" | "note";

function Composer({ detail, permissions }: { detail: InboxCaseDetail; permissions: InboxPermissions }) {
  const route = detail.replyRoute;
  // No case email: the reply mode is switched off and the composer opens on the internal note.
  const canEmail = permissions.canReply && route.mode === "email";
  const [chosen, setMode] = useState<Mode>(canEmail ? "reply" : "note");
  const mode: Mode = canEmail ? chosen : "note";
  const first = detail.sender.name.split(" ")[0];
  const [drafts, setDrafts] = useState<Record<Mode, string>>({ reply: "", note: "" });
  const [busy, setBusy] = useState(false);
  const isNote = mode === "note";
  const allowed = isNote ? permissions.canAddNote : canEmail;
  const text = drafts[mode];

  async function submit() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      if (isNote) await inboxActions.addNote(detail.id, body);
      else await inboxActions.reply(detail.id, body);
      setDrafts((d) => ({ ...d, [mode]: "" }));
      toast.add({ title: isNote ? "Internal note saved" : "Reply queued", description: isNote ? undefined : "It will be emailed shortly.", type: "success" });
    } catch {
      toast.add({ title: isNote ? "Could not save the note" : "Could not send the reply", description: "Your text is still here. Please try again.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  const tab = (m: Mode, label: string, Icon: typeof Mail, onCls: string, disabled = false) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      disabled={disabled}
      onClick={() => setMode(m)}
      className={`inline-flex h-8 max-w-full min-w-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold disabled:opacity-50 ${mode === m ? onCls : "border border-(--ap-line) bg-white text-(--ap-ink-2)"}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className={`shrink-0 border-t px-2.5 pt-2 pb-[calc(8px+env(safe-area-inset-bottom,0px))] @min-[720px]:px-3 @min-[720px]:pt-2.5 @min-[720px]:pb-3 @min-[900px]:px-4 ${isNote ? "border-dashed border-(--ap-gold) bg-(--ap-warn-bg)/45" : "border-(--ap-line) bg-(--ap-line-2)/50"}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Composer" className="flex gap-1.5">
          {tab("reply", `Reply to ${first}`, Mail, "bg-(--ap-violet) text-white", !canEmail)}
          {tab("note", "Internal note", Pencil, "bg-(--ap-warn) text-white")}
        </div>
      </div>
      {isNote ? (
        <p className="m-0 mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-(--ap-warn)">
          <LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" />
          Internal, not emailed. Only the Beeliv team sees this.
        </p>
      ) : route.mode === "email" ? (
        <p className="m-0 mb-2 flex min-w-0 items-center gap-1.5 text-[13px] text-(--ap-muted)">
          <Mail className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">
            Emailed to <b className="font-semibold text-(--ap-ink-2)">{route.to}</b>
          </span>
        </p>
      ) : null}
      {route.mode === "none" && permissions.canReply ? (
        <p data-reply-off className="m-0 mb-2 flex items-start gap-1.5 rounded-xl bg-(--ap-line-2) px-3 py-2 text-[13px] leading-snug text-(--ap-muted)">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {NO_EMAIL_NOTE[route.reason]}
        </p>
      ) : null}

      {allowed ? (
        <div className="flex items-end gap-2">
          <button
            type="button"
            disabled
            title="Attachments arrive with the backend"
            aria-label="Attach a file (not available in the prototype)"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-(--ap-muted) opacity-60"
          >
            <Paperclip className="size-5" />
          </button>
          {/* Separate textarea per mode (keyed) so a note draft can never become a reply. */}
          <textarea
            key={mode}
            value={text}
            rows={1}
            onChange={(e) => setDrafts((d) => ({ ...d, [mode]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void submit();
              }
            }}
            aria-label={isNote ? "Internal note, not emailed" : `Reply to ${detail.sender.name}, emailed`}
            placeholder={isNote ? "Write a note for the Beeliv team" : "Write a reply"}
            className={`ap-input !min-h-11 min-w-0 flex-1 !resize-none !rounded-3xl !py-[10px] [field-sizing:content] max-h-36 ${isNote ? "!border-dashed !border-(--ap-gold)" : ""}`}
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!text.trim() || busy}
            aria-label={isNote ? "Save internal note" : "Send reply by email"}
            className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-45 ${isNote ? "bg-(--ap-warn)" : "bg-(--ap-violet)"}`}
          >
            <Send className="size-5" />
          </button>
        </div>
      ) : (
        <p className="m-0 text-sm text-(--ap-muted)">Your role cannot {isNote ? "add notes to" : "reply to"} this case.</p>
      )}
      {allowed ? (
        <p className="m-0 mt-1.5 pl-12 text-[12px] @max-[719px]:hidden text-(--ap-muted)">
          {isNote ? "Visible to Beeliv staff only." : "Sent from Beeliv Hospitality. Their reply comes back to this case."} Ctrl + Enter to {isNote ? "save" : "send"}.
        </p>
      ) : null}
    </div>
  );
}

const ICON_BTN = "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-(--ap-ink-2) hover:bg-(--ap-line-2) disabled:opacity-40";

/** Assign / reassign: a small list of HR users (Managers only). */
function AssignMenu({ detail, assignees }: { detail: InboxCaseDetail; assignees: InboxAssignee[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div className="relative">
      <button type="button" className={ICON_BTN} aria-haspopup="menu" aria-expanded={open} aria-label={detail.assignedTo ? "Reassign case" : "Assign case"} title={detail.assignedTo ? "Reassign" : "Assign"} onClick={() => setOpen((o) => !o)}>
        <UserRound className="size-5" aria-hidden="true" />
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div role="menu" className="ap-pop-in absolute top-full right-0 z-40 mt-1 w-56 rounded-xl border border-(--ap-line) bg-white p-1.5 shadow-xl">
            {assignees.map((a) => {
              const on = detail.assignedTo?.id === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  onClick={() => {
                    setOpen(false);
                    if (!on) void assignCase(detail.id, a.id);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[15px] hover:bg-(--ap-line-2)"
                >
                  <span className="truncate">{a.name}</span>
                  {on ? <Check className="size-4 text-(--ap-violet)" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function CaseThread({
  detail,
  permissions,
  assignees,
  detailsOpen,
  onBack,
  onToggleDetails,
}: {
  detail: InboxCaseDetail;
  permissions: InboxPermissions;
  assignees: InboxAssignee[];
  detailsOpen: boolean;
  onBack: () => void;
  onToggleDetails: () => void;
}) {
  const entries = useMemo<Entry[]>(
    () =>
      [
        ...detail.messages.map((m): Entry => ({ type: "message", at: m.createdAt, m })),
        ...detail.notes.map((n): Entry => ({ type: "note", at: n.createdAt, n })),
      ].sort((a, b) => a.at.localeCompare(b.at)),
    [detail.messages, detail.notes],
  );

  const endRef = useRef<HTMLDivElement>(null);
  const count = entries.length;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [count, detail.id]);

  const canEscalate = permissions.canEscalate && detail.status !== "escalated" && detail.status !== "resolved";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-1.5 border-b border-(--ap-line) bg-white px-1.5 py-1.5 @min-[720px]:gap-2 @min-[720px]:px-2.5 @min-[720px]:py-2 @min-[900px]:px-3">
        <Link href="/admin/inbox" onClick={onBack} className={`${ICON_BTN} @min-[720px]:hidden`} aria-label="Back to inbox">
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-(--ap-lilac) @min-[720px]:flex text-sm font-bold text-(--ap-violet)" aria-hidden="true">
          {initials(detail.sender.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="m-0 truncate text-[16px] leading-tight font-bold">{detail.sender.name}</h2>
          <p className="m-0 hidden min-w-0 items-center gap-1.5 text-[13px] text-(--ap-muted) @max-[719px]:flex">
            <span className="truncate font-mono">{detail.reference}</span>
            <span className="shrink-0">
              <Chip tone={STATUS_CHIP[detail.status]}>{STATUS_LABEL[detail.status]}</Chip>
            </span>
          </p>
          <p className="m-0 flex @max-[719px]:hidden min-w-0 items-center gap-1.5 text-[13px] text-(--ap-muted)">
            <span className="truncate">
              {CATEGORY_LABEL[detail.category]} - <span className="font-mono">{detail.reference}</span>
            </span>
            <span className="shrink-0">
              <Chip tone={STATUS_CHIP[detail.status]}>{STATUS_LABEL[detail.status]}</Chip>
            </span>
          </p>
        </div>
        {permissions.canAssign ? <div className="@max-[719px]:hidden"><AssignMenu detail={detail} assignees={assignees} /></div> : null}
        {permissions.canEscalate ? (
          <button type="button" className={`${ICON_BTN} @max-[719px]:hidden`} disabled={!canEscalate} onClick={() => void escalateCase(detail)} aria-label="Escalate case" title="Escalate">
            <CircleAlert className="size-5" aria-hidden="true" />
          </button>
        ) : null}
        {/* Below 1200px of workspace width the details open as a drawer; above it they are a permanent column. */}
        <button type="button" className={`${ICON_BTN} @min-[1200px]:hidden ${detailsOpen ? "bg-(--ap-tint) text-(--ap-violet)" : ""}`} onClick={onToggleDetails} aria-label="Case details" aria-haspopup="dialog" aria-pressed={detailsOpen} title="Details">
          <Menu className="size-5 @max-[719px]:hidden" aria-hidden="true" />
          <svg viewBox="0 0 24 24" className="hidden size-5 @max-[719px]:block" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-(--ap-bg) px-2.5 py-3 @min-[900px]:p-5" tabIndex={0} aria-label="Conversation">
        <div className="mx-auto flex max-w-[860px] flex-col gap-2">
          <p className="mx-auto mb-1 max-w-full rounded-full bg-(--ap-line-2) px-3 py-1 text-center text-[13px] font-semibold wrap-anywhere text-(--ap-ink-2)">{detail.subject}</p>
          {entries.map((e, i) => {
            const newDay = i === 0 || dayKey(entries[i - 1].at) !== dayKey(e.at);
            return (
              <Fragment key={e.type === "message" ? e.m.id : e.n.id}>
                {newDay ? (
                  <div className="my-1.5 flex justify-center">
                    <span className="rounded-full border border-(--ap-line) bg-white px-3 py-0.5 text-[12px] font-bold text-(--ap-muted)">{dayLabel(e.at)}</span>
                  </div>
                ) : null}
                {e.type === "message" ? <MessageBubble m={e.m} caseId={detail.id} /> : <NoteBubble n={e.n} />}
              </Fragment>
            );
          })}
          {/* After the messages, so it stays in view when the thread opens scrolled to the latest. */}
          {detail.interviewRequest ? <CantAttendPanel info={detail.interviewRequest} /> : null}
          <div ref={endRef} />
        </div>
      </div>

      <Composer key={detail.id} detail={detail} permissions={permissions} />
    </div>
  );
}
