"use client";

/**
 * Confirmation modal for delicate decisions (log out, pause/delete account,
 * signing out other devices, removing or replacing saved data, withdrawing,
 * submitting, resetting the prototype). One host is mounted in AppShell; any
 * component calls:
 *
 *   if (await confirmAction({ tone: "danger", title: "…", confirmLabel: "Delete account" })) { … }
 *
 * The look lives in ./dialogs/ConfirmSheet (bottom sheet with a handle on phones,
 * centred 22px card on desktop, icon disc tinted by meaning, stacked buttons on
 * phones). Esc / backdrop / the outline button cancel; focus is trapped inside,
 * starts on the safe action for destructive dialogs, and returns to the opener.
 * Confirm labels are clear verbs ("Withdraw application"), never "OK".
 *
 * `onConfirm` runs synchronously inside the confirm click — use it when the
 * follow-up needs the user's click (e.g. opening a file picker, which browsers
 * block from a later promise callback). If it returns a promise, the button
 * shows a working state until it settles.
 */
import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { type LucideIcon } from "@/components/applicant/icons";
import { ConfirmActions, ConfirmHeader, ConfirmPortal, ConfirmShell, type ConfirmMeaning } from "./dialogs/ConfirmSheet";

export type ConfirmTone = "danger" | "caution" | "neutral";

export type ConfirmOptions = {
  tone?: ConfirmTone;
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  /** "What happens" list, shown in a soft box. */
  points?: string[];
  confirmLabel: string;
  cancelLabel?: string;
  /** Require typing this exact word (e.g. "DELETE") before confirming. */
  typeToConfirm?: string;
  /** Require ticking this acknowledgement before confirming. */
  acknowledge?: string;
  onConfirm?: () => void | Promise<void>;
};

type Request = ConfirmOptions & { resolve: (ok: boolean) => void };

let current: Request | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Opens the confirmation modal; resolves true when confirmed, false when cancelled. */
export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => {
    current = { ...opts, resolve };
    emit();
  });
}

function close(ok: boolean) {
  const r = current;
  current = null;
  emit();
  r?.resolve(ok);
}

const MEANING: Record<ConfirmTone, ConfirmMeaning> = { danger: "danger", caution: "care", neutral: "info" };
const BOX: Record<ConfirmTone, { box: string; dot: string }> = {
  danger: { box: "bg-[#fff1f2] border-[#fecdd3]", dot: "bg-(--ap-rose)" },
  caution: { box: "bg-[#fffbeb] border-[#fde68a]", dot: "bg-[#f59e0b]" },
  neutral: { box: "bg-[#fbf8fd] border-(--ap-line)", dot: "bg-(--ap-violet)" },
};

export function ConfirmHost() {
  const req = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null,
  );
  // The key remounts per request so typed text / checkbox never carry over.
  return <ConfirmPortal>{req ? <Dialog key={req.title + req.confirmLabel} req={req} /> : null}</ConfirmPortal>;
}

function Dialog({ req }: { req: Request }) {
  const tone = req.tone ?? "neutral";
  const [typed, setTyped] = useState("");
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const descId = useId();
  const inputId = useId();

  const ready = (!req.typeToConfirm || typed.trim() === req.typeToConfirm) && (!req.acknowledge || ack) && !busy;

  function confirm() {
    if (!ready) return;
    const out = req.onConfirm?.();
    if (out && typeof (out as Promise<void>).then === "function") {
      setBusy(true);
      (out as Promise<void>).then(
        () => close(true),
        () => setBusy(false),
      );
    } else close(true);
  }

  return (
    <ConfirmShell onClose={() => close(false)} busy={busy} labelledBy={titleId} describedBy={req.description ? descId : undefined}>
      <ConfirmHeader meaning={MEANING[tone]} icon={req.icon} title={req.title} titleId={titleId} body={req.description} bodyId={descId} />

      {req.points?.length ? (
        <ul className={`mt-4 flex flex-col gap-2 rounded-[14px] border px-4 py-3.5 ${BOX[tone].box}`}>
          {req.points.map((p) => (
            <li key={p} className="flex gap-2.5 text-sm leading-[1.5] text-(--ap-ink-2)">
              <span className={`mt-[7px] size-1.5 shrink-0 rounded-full ${BOX[tone].dot}`} aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      ) : null}

      {req.acknowledge ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={ack}
          data-autofocus={req.typeToConfirm ? undefined : ""}
          onClick={() => setAck((v) => !v)}
          className="mt-4 flex min-h-12 w-full items-start gap-3 rounded-xl text-left text-sm leading-[1.5] text-(--ap-ink-2)"
        >
          <span
            className={`mt-px flex size-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors ${
              ack ? "border-(--ap-violet) bg-(--ap-violet) text-white" : "border-[#cfc8d8] bg-white"
            }`}
            aria-hidden="true"
          >
            {ack ? (
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5 9-10" />
              </svg>
            ) : null}
          </span>
          {req.acknowledge}
        </button>
      ) : null}

      {req.typeToConfirm ? (
        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor={inputId} className="text-sm font-semibold text-(--ap-ink-2)">
            Type <b className="font-bold tracking-[.04em] text-(--ap-rose)">{req.typeToConfirm}</b> to confirm
          </label>
          <input
            id={inputId}
            data-autofocus=""
            className="ap-input"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirm()}
          />
        </div>
      ) : null}

      <ConfirmActions
        danger={tone === "danger"}
        primary={{ label: req.confirmLabel, onClick: confirm, disabled: !ready, busy, busyLabel: "Working…" }}
        secondary={{ label: req.cancelLabel ?? "Go back", onClick: () => close(false) }}
      />
    </ConfirmShell>
  );
}
