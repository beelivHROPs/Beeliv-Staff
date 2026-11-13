"use client";

/**
 * Change-password sheet (preview). Phones: bottom sheet. Tablet and up:
 * centred card. Esc / backdrop / Cancel close. There is no Admin sign-in yet,
 * so the fixture never changes a password and the toast says so.
 * The minimum length below is a PLACEHOLDER: the password policy needs Beeliv confirmation.
 */
import { useEffect, useId, useRef, useState } from "react";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { createPortal } from "react-dom";
import { ADMIN_THEME } from "@/components/admin/AdminShell";
import { Field, INPUT_CLS } from "@/components/applicant/apply/parts";
import { useFlagInvalid } from "@/components/applicant/form-feedback";
import { useIsClient } from "@/components/applicant/motion";
import { toast } from "@/components/ui/toast";
import { changePassword } from "@/lib/admin/settings/hooks";

const MIN = 8;

export function PasswordSheet({ onClose }: { onClose: () => void }) {
  const isClient = useIsClient();
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  const formRef = useRef<HTMLFormElement>(null);
  const flag = useFlagInvalid(formRef);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const err = tried
    ? {
        cur: cur ? undefined : "Enter your current password.",
        next: next.length >= MIN ? undefined : `Use at least ${MIN} characters.`,
        again: again === next && again ? undefined : "The two passwords don't match.",
      }
    : {};

  async function submit() {
    if (!cur || next.length < MIN || again !== next) {
      setTried(true);
      flag();
      return;
    }
    setBusy(true);
    try {
      await changePassword({ current: cur, next });
      toast.add({ title: "Changing your password isn't connected yet", description: "Available once Admin sign-in is connected. No account changes were made." });
      onClose();
    } catch {
      toast.add({ title: "We couldn't change that", description: "Please try again.", type: "error" });
      setBusy(false);
    }
  }

  if (!isClient) return null;
  return createPortal(
    <div
      className={`${ADMIN_THEME} fixed inset-0 z-[130] flex items-end justify-center min-[768px]:items-center min-[768px]:p-6`}
      style={{ background: "rgba(17,17,27,.5)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className="outline-none max-h-[92dvh] w-full overflow-y-auto rounded-t-[22px] bg-(--ap-surface) px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] text-(--ap-ink) min-[768px]:w-[500px] min-[768px]:rounded-[22px] min-[768px]:p-7">
        <h2 id={titleId} className="ap-serif text-[18px] leading-[1.15] text-(--ap-ink)">
          Change password
        </h2>
        <p className="ap-sm mt-2">Password changes are unavailable here. Your current password will not change.</p>
        <form
          ref={formRef}
          noValidate
          className="mt-4 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <Field label="Current password" htmlFor="pw-cur" error={err.cur}>
            <input id="pw-cur" type="password" autoFocus autoComplete="current-password" className={INPUT_CLS} value={cur} onChange={(e) => setCur(e.target.value)} aria-invalid={err.cur ? true : undefined} aria-describedby={err.cur ? "pw-cur-err" : undefined} />
          </Field>
          <Field label="New password" htmlFor="pw-new" error={err.next}>
            <input id="pw-new" type="password" autoComplete="new-password" className={INPUT_CLS} value={next} onChange={(e) => setNext(e.target.value)} aria-invalid={err.next ? true : undefined} aria-describedby={err.next ? "pw-new-err" : undefined} />
          </Field>
          <Field label="Confirm new password" htmlFor="pw-again" error={err.again}>
            <input id="pw-again" type="password" autoComplete="new-password" className={INPUT_CLS} value={again} onChange={(e) => setAgain(e.target.value)} aria-invalid={err.again ? true : undefined} aria-describedby={err.again ? "pw-again-err" : undefined} />
          </Field>
          <div className="mt-2 flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
            <button type="button" onClick={onClose} className="ap-btn ap-btn-s h-12 w-full text-[15px] font-semibold min-[768px]:h-11 min-[768px]:w-auto">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="ap-btn ap-btn-p h-12 w-full text-[15px] font-semibold text-white! disabled:cursor-not-allowed disabled:opacity-50 min-[768px]:h-11 min-[768px]:w-auto">
              {busy ? "Saving..." : "Change password"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
