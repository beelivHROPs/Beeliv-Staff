"use client";

/**
 * In-app share sheet: the fallback when the browser has no native share sheet (desktop browsers without the
 * Web Share API, http test addresses). Bottom sheet on phones, popover next to the button on desktop.
 * Shared by the Applicant and the public site, so it carries its own neutral Tailwind styling (no app css import).
 * Open it with shareOrOpenSheet() from lib/share/share-link.ts; mount <ShareSheetHost /> once per page tree.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useDialogFocus } from "@/lib/a11y/useDialogFocus";
import { copyText, shareSheetStore, type SheetState } from "@/lib/share/share-link";
import { buildShareTargets } from "@/lib/share/share-urls";
import { SHARE_ICONS } from "./ShareIcons";

const circle = "grid size-12 place-items-center rounded-full border border-[#eae2f1] bg-[#faf9f7] text-[#11111b] transition-colors group-hover:bg-[#f1ebf6]";
const item = "group flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-center text-[12.5px] font-medium text-[#3b3a47] no-underline outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5b087b]";

/** Hook: the sheet's current state and a close function. */
export function useShareSheet() {
  const state = useSyncExternalStore(shareSheetStore.subscribe, shareSheetStore.get, shareSheetStore.getServer);
  return { state, close: shareSheetStore.close };
}

function Sheet({ state, onClose }: { state: NonNullable<SheetState>; onClose: () => void }) {
  const ref = useDialogFocus<HTMLDivElement>(onClose);
  const [copied, setCopied] = useState<"idle" | "yes" | "failed">("idle");
  const { payload, anchor } = state;
  const targets = buildShareTargets(payload);
  const desktop = typeof window !== "undefined" && window.innerWidth >= 640;
  const W = 340;
  let style: React.CSSProperties | undefined;
  if (desktop) {
    const vw = window.innerWidth;
    const left = anchor ? Math.min(Math.max(12, anchor.right - W), vw - W - 12) : (vw - W) / 2;
    const H = 250; // about the popover's height; flips above the button when there is no room below
    const top = anchor ? (anchor.bottom + H + 16 > window.innerHeight ? Math.max(12, anchor.top - H - 8) : anchor.bottom + 8) : window.innerHeight * 0.2;
    style = { top, left, width: W };
  }

  useEffect(() => {
    if (copied !== "yes") return;
    const t = window.setTimeout(() => setCopied("idle"), 2200);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function copy() {
    setCopied((await copyText(payload.url)) ? "yes" : "failed");
  }

  return createPortal(
    <div className="fixed inset-0 z-[150]" data-share-sheet>
      <div className={`absolute inset-0 ${desktop ? "bg-transparent" : "bg-[rgba(17,17,27,0.4)]"}`} onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Share this job"
        tabIndex={-1}
        style={style}
        className={
          desktop
            ? "absolute rounded-2xl border border-[#eae2f1] bg-white p-4 shadow-[0_12px_40px_rgba(37,0,68,0.16)] outline-none"
            : "absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(37,0,68,0.16)] outline-none"
        }
      >
        {desktop ? null : <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#d9d2e0]" aria-hidden="true" />}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[16px] font-semibold text-[#11111b]">Share this job</p>
            <p className="m-0 mt-0.5 truncate text-[13px] text-[#686672]">{payload.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-[#686672] hover:bg-[#f4eef8]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {targets.map((t) => (
            <a key={t.id} href={t.href} aria-label={t.id === "email" || t.id === "sms" ? `Share by ${t.label}` : `Share on ${t.label}`} {...(t.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} onClick={onClose} className={item}>
              <span className={circle} aria-hidden="true">{SHARE_ICONS[t.id]}</span>
              {t.label}
            </a>
          ))}
          <button type="button" onClick={() => void copy()} className={`${item} cursor-pointer border-0 bg-transparent`}>
            <span className={circle} aria-hidden="true">
              {copied === "yes" ? SHARE_ICONS.check : SHARE_ICONS.copy}
            </span>
            {copied === "yes" ? "Copied" : "Copy link"}
          </button>
        </div>
        <p className="sr-only" role="status" aria-live="polite">{copied === "yes" ? "Link copied" : ""}</p>
        {copied === "failed" ? (
          <input readOnly value={payload.url} onFocus={(e) => e.currentTarget.select()} aria-label="Link to copy" className="mt-3 h-10 w-full rounded-lg border border-[#eae2f1] bg-[#faf9f7] px-3 text-[13px] text-[#11111b]" />
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function ShareSheetHost() {
  const { state, close } = useShareSheet();
  if (!state) return null;
  return <Sheet state={state} onClose={close} />;
}
