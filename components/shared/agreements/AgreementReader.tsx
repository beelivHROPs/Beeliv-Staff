"use client";

/**
 * Full-text reader for an agreement or policy. Plain text only (never HTML), shown
 * as typed, keeping line breaks. Used by Admin setup, Client setup, the Talent staff
 * agreement list, the Operations "Preview as staff sees it" and the HR read-only list.
 * Reading is NOT acceptance: accepting stays its own explicit action, and the server
 * records it against the exact version and hash.
 *
 * `body === null` shows "Wording pending from Beeliv" (nothing is invented).
 * Phones: bottom sheet. Tablet/desktop: centred card. Esc, backdrop and Close dismiss;
 * focus moves in, stays inside and returns to the opener.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FileText, X } from "@/components/applicant/icons";
import { useIsClient } from "@/components/applicant/motion";

const FOCUSABLE = "a[href],button:not([disabled]),[tabindex]:not([tabindex='-1'])";

export function AgreementReader({
  title,
  version,
  body,
  onClose,
  banner,
  meta,
  themeClass = "applicant-shell",
  closeLabel = "Close",
}: {
  title: string;
  version?: string | null;
  body: string | null;
  onClose: () => void;
  /** Top banner, e.g. "Draft, not published". */
  banner?: ReactNode;
  /** One muted line under the title (publish date, hash). */
  meta?: ReactNode;
  /** The app's theme classes so the portal keeps its look (Admin passes ADMIN_THEME). */
  themeClass?: string;
  closeLabel?: string;
}) {
  const isClient = useIsClient();
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isClient) return;
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, [isClient]);

  if (!isClient) return null;
  return createPortal(
    <div
      className={`${themeClass} fixed inset-0 z-[140] flex items-end justify-center min-[768px]:items-center min-[768px]:p-6`}
      style={{ background: "rgba(17,17,27,.5)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
          return;
        }
        if (e.key !== "Tab" || !panel.current) return;
        const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
    >
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} tabIndex={-1} className="flex max-h-[92dvh] w-full flex-col rounded-t-[20px] bg-white text-(--ap-ink) outline-none min-[768px]:max-h-[86dvh] min-[768px]:w-[720px] min-[768px]:rounded-[20px]">
        <div className="flex items-start gap-3 border-b border-(--ap-line-2) px-5 pt-4 pb-3 min-[768px]:px-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-(--ap-tint) text-(--ap-violet)">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-t`} className="text-[18px] leading-tight font-semibold">
              {title}
            </h2>
            <p className="mt-0.5 text-[13px] text-(--ap-muted)">
              {version ? <b className="font-semibold text-(--ap-ink-2)">{version}</b> : null}
              {version && meta ? " · " : null}
              {meta}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="ap-hit -mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-(--ap-muted) hover:bg-(--ap-line-2)">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {banner ? <div className="border-b border-(--ap-line-2) bg-(--ap-warn-bg) px-5 py-2.5 text-[13.5px] font-semibold text-(--ap-ink) min-[768px]:px-6">{banner}</div> : null}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 min-[768px]:px-6">
          {body === null || body.trim() === "" ? (
            <p className="rounded-xl bg-(--ap-tint-soft) px-3.5 py-3 text-[15px] text-(--ap-muted)">Wording pending from Beeliv. There is nothing to read yet.</p>
          ) : (
            <div className="text-[15.5px] leading-[1.7] whitespace-pre-wrap text-(--ap-ink-2)">{body}</div>
          )}
        </div>
        <div className="flex justify-end border-t border-(--ap-line-2) px-5 pt-3 pb-[calc(14px+env(safe-area-inset-bottom))] min-[768px]:px-6">
          <button type="button" onClick={onClose} className="ap-btn ap-btn-p h-11 rounded-full px-6 text-[14px] font-semibold text-white!">
            {closeLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * "Read the full text" button for acceptance screens. `onRead` fires once the reader
 * has been opened and closed; the caller keeps the accept control disabled until then
 * (or while already accepted). Renders nothing when there is no wording to read.
 */
export function ReadButton({ title, version, body, onRead, themeClass, className = "" }: { title: string; version?: string | null; body: string | null; onRead: () => void; themeClass?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  if (body === null) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`ap-btn ap-btn-s h-10 rounded-full px-4 text-[14px] font-semibold ${className}`}>
        Read the full text
      </button>
      {open ? (
        <AgreementReader
          title={title}
          version={version}
          body={body}
          themeClass={themeClass}
          closeLabel="Done reading"
          onClose={() => {
            setOpen(false);
            onRead();
          }}
        />
      ) : null}
    </>
  );
}
