"use client";

/**
 * "Can't make this time? Message HR". The candidate RECEIVES the interview time
 * and does not confirm it (docs/contracts/interviews-and-application-journeys.md
 * section 1.2). This short message only tells HR; it NEVER changes the time. HR
 * decides whether to send a new one. Mock send: nothing leaves the browser.
 *
 * Built from the shared confirmation set (components/applicant/dialogs/ConfirmSheet):
 * bottom sheet on phones, centred card from 768px. z 150 so it also sits above
 * any other dialog or sheet.
 */
import { useEffect, useId, useState } from "react";
import { MessageSquareText } from "@/components/applicant/icons";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { ConfirmActions, ConfirmHeader, ConfirmPortal, ConfirmShell } from "@/components/applicant/dialogs/ConfirmSheet";
import { ServiceError } from "@/components/shared/states/ServiceError";
import type { SendCantMakeItResult } from "@/lib/applicant/service";
import { sentStamp } from "@/components/applicant/interviews/format";

export const MESSAGE_HR_REASONS = [
  "I have a clash with work or another commitment",
  "I am unwell",
  "Travel or transport is a problem",
  "Something else",
];

type Send = (reason: string, note: string) => SendCantMakeItResult;

export function MessageHrSheet({ open, title, onClose, onSend }: { open: boolean; title: string; onClose: () => void; onSend: Send }) {
  return <ConfirmPortal>{open ? <Panel key="panel" title={title} onClose={onClose} onSend={onSend} /> : null}</ConfirmPortal>;
}

function Panel({ title, onClose, onSend }: { title: string; onClose: () => void; onSend: Send }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState<SendCantMakeItResult | "offline" | null>(null);
  const titleId = useId();
  const descId = useId();
  const noteId = useId();

  // After the form turns into the "sent" or "can't send" message, move focus to its single button.
  useEffect(() => {
    if (sent || (problem && problem !== "offline")) document.getElementById(titleId)?.closest("[role=dialog]")?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [sent, problem, titleId]);

  async function send() {
    setTried(true);
    if (!reason) return;
    setProblem(null);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setProblem("offline"); // nothing is cleared: the reason and note stay as typed
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 450)); // mock send
    setBusy(false);
    const result = onSend(reason, note);
    if (result.ok) setSent(true);
    else setProblem(result);
  }

  return (
    <ConfirmShell role="dialog" z={150} width={480} busy={busy} onClose={onClose} labelledBy={titleId} describedBy={sent || (problem && problem !== "offline") ? descId : undefined}>
      {sent ? (
        <div role="status">
          <ConfirmHeader meaning="success" title="Your request was sent" titleId={titleId} bodyId={descId} body="HR has your message and will send you a new time here. Your interview now shows as waiting for a new time." />
          <ConfirmActions primary={{ label: "Done", onClick: onClose }} />
        </div>
      ) : problem && problem !== "offline" && !problem.ok ? (
        <div>
          <ConfirmHeader
            meaning="care"
            title={problem.reason === "duplicate" ? "You already asked for a new time" : problem.reason === "passed" ? "This time has already passed" : "This request can't be sent"}
            titleId={titleId}
            bodyId={descId}
            body={
              problem.reason === "duplicate"
                ? "HR already has your message about this interview. To change what you told them, withdraw the request on the interview card and send a new one."
                : problem.reason === "passed"
                  ? "A new-time request can't be sent from here. If you missed it, please contact the Beeliv team."
                  : "This interview has no time to ask about."
            }
          />
          {problem.reason === "duplicate" ? (
            <div className="mt-4 rounded-xl bg-(--ap-tint) px-4 py-3 text-[14px] text-(--ap-ink-2)">
              <b className="block">Your message</b>
              <span className="block wrap-anywhere">{problem.message}</span>
              {problem.note ? <span className="mt-1 block wrap-anywhere whitespace-pre-wrap">{problem.note}</span> : null}
              <span className="mt-1 block text-[13px] text-(--ap-muted)">Sent {sentStamp(problem.requestedAt)}</span>
            </div>
          ) : null}
          <ConfirmActions primary={{ label: "Done", onClick: onClose }} />
        </div>
      ) : (
        <>
          <ConfirmHeader
            meaning="info"
            icon={MessageSquareText}
            title="Can't make this time?"
            titleId={titleId}
            body={`Tell HR about ${title}. This does not change your interview time. HR will contact you if a new time is possible.`}
          />
          <div className="mt-5">
            <span className="mb-1.5 block text-[14px] font-semibold text-(--ap-ink-2)">What is the reason?</span>
            <SelectMenu label="Reason" placeholder="Choose a reason" value={reason} onChange={setReason} options={MESSAGE_HR_REASONS} invalid={tried && !reason} />
            {tried && !reason ? <p role="alert" className="mt-1.5 text-[13px] font-semibold text-(--ap-rose)">Choose a reason so HR knows how to help.</p> : null}
          </div>
          <div className="mt-4">
            <label htmlFor={noteId} className="mb-1.5 block text-[14px] font-semibold text-(--ap-ink-2)">
              Anything else HR should know? <span className="font-normal text-(--ap-muted)">(optional)</span>
            </label>
            <textarea id={noteId} className="ap-input" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example, the days or times that would work for you." />
          </div>
          {problem === "offline" ? (
            <ServiceError
              className="mt-4"
              title="Your request was not sent"
              error={{ message: "You appear to be offline. Your reason and note are still here. Check your connection and try again." }}
              onRetry={() => void send()}
              retrying={busy}
              focusOnMount
            />
          ) : null}
          <ConfirmActions focusFirstField primary={{ label: "Message HR", onClick: () => void send(), busy, busyLabel: "Sending…" }} secondary={{ label: "Go back", onClick: onClose }} />
        </>
      )}
    </ConfirmShell>
  );
}
