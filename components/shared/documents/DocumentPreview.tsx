"use client";

/**
 * Shared document viewer (DEMO: reads the browser-only store in lib/demo-files).
 * `DocumentPreviewPanel` is the toolbar + preview and can sit inline on a page;
 * `DocumentPreviewDialog` wraps it in a full-screen sheet (phones) or a large
 * dialog (desktop), Esc closes. PDF/JPG/PNG only; there is deliberately NO print
 * button. At go-live the file URL comes from getDocumentAccess (a short-lived
 * signed link after a permission check and audit); this component then only
 * changes where `url` comes from.
 *
 * Opens above any other dialog (z-[150]).
 */
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Clock3, CircleAlert, Download, ExternalLink, FileText, RefreshCw, ShieldCheck, X } from "@/components/applicant/icons";
import { useIsClient } from "@/components/applicant/motion";
import { toast } from "@/components/ui/toast";
import { useDemoFileMeta } from "@/lib/demo-files/hooks";
import { DEMO_MAX_BYTES, KIND_LABEL, demoProblemText, downloadName, formatBytes, getObjectUrl, revokeDemoUrl, saveDemoFile, type DemoFileMeta } from "@/lib/demo-files/store";

/** How long a link stays valid before "This link expired. Try again". Stands in for the signed link's expiry. */
const LINK_MS = 10 * 60 * 1000;

type Link =
  | { phase: "loading" }
  | { phase: "ready"; url: string }
  | { phase: "expired" }
  | { phase: "failed" };

/** One short-lived object URL for the file; revoked on close, on expiry and on unmount. */
export function useDocumentLink(fileKey: string, enabled = true) {
  const meta = useDemoFileMeta(enabled ? fileKey : null);
  const [link, setLink] = useState<Link>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);
  const savedAt = meta?.savedAt;

  useEffect(() => {
    if (!enabled || !savedAt) return;
    let url: string | null = null;
    let timer: number | undefined;
    let live = true;
    void getObjectUrl(fileKey).then((u) => {
      if (!live) return revokeDemoUrl(u);
      if (!u) return setLink({ phase: "failed" });
      url = u;
      setLink({ phase: "ready", url: u });
      timer = window.setTimeout(() => {
        revokeDemoUrl(url);
        url = null;
        setLink({ phase: "expired" });
      }, LINK_MS);
    });
    return () => {
      live = false;
      window.clearTimeout(timer);
      revokeDemoUrl(url);
    };
  }, [fileKey, enabled, savedAt, attempt]);

  const retry = useCallback(() => {
    setLink({ phase: "loading" });
    setAttempt((n) => n + 1);
  }, []);
  return { meta, link, retry };
}

export interface PreviewProps {
  /** Key in the demo store (lib/demo-files/keys.ts). */
  fileKey: string;
  /** Owners can replace their own file. Called after the new file is stored. */
  canReplace?: boolean;
  onReplaced?: (meta: DemoFileMeta) => void;
  /** Used when a Replace stores a new file (download name "<Person>, <document>.pdf"). */
  ownerName?: string;
  label?: string;
  /** Label only: shows "Waiting for a security check" instead of the file. */
  securityCheck?: boolean;
  /** Inline pages give the stage a fixed height; dialogs fill the sheet. */
  fill?: boolean;
  className?: string;
}

const BTN = "ap-btn ap-btn-s ap-btn-sm";

export function DocumentPreviewPanel({ fileKey, canReplace, onReplaced, ownerName = "", label = "", securityCheck, fill, className = "" }: PreviewProps) {
  const { meta, link, retry } = useDocumentLink(fileKey, !securityCheck);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function replace(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    const res = await saveDemoFile(fileKey, file, { ownerName: ownerName || meta?.ownerName || "", label: label || meta?.label || "" });
    setBusy(false);
    if (!res.ok) return void toast.add({ title: demoProblemText(res.problem), type: "error" });
    onReplaced?.(res.meta);
  }

  if (!meta) return <Notice icon={FileText} title="This document isn't available" detail="It may have been removed." />;

  const url = link.phase === "ready" ? link.url : null;
  const name = downloadName(meta);
  const tooLarge = meta.size > DEMO_MAX_BYTES;
  const unsupported = !(meta.kind in KIND_LABEL);

  return (
    <div className={`flex min-h-0 flex-col ${fill ? "h-full" : ""} ${className}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-(--ap-line-2) pb-3">
        <div className="min-w-0 flex-1 basis-56">
          <b className="block truncate text-[15px] text-(--ap-ink)" title={meta.name}>
            {meta.name}
          </b>
          <span className="block text-[13px] text-(--ap-muted)">
            {meta.sample ? <b className="mr-1.5 rounded-full bg-(--ap-tint) px-2 py-0.5 text-[12px] font-bold text-(--ap-violet)">Sample preview</b> : null}
            {KIND_LABEL[meta.kind]} · {formatBytes(meta.size)}
            {meta.sample ? " · not this person's file" : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 max-[480px]:gap-1.5">
          {url ? (
            <>
              <a href={url} target="_blank" rel="noopener noreferrer" className={BTN}>
                <ExternalLink className="size-4" aria-hidden="true" />
                <span className="max-[480px]:sr-only">Open in new tab</span>
              </a>
              <a href={url} download={name} className={BTN}>
                <Download className="size-4" aria-hidden="true" />
                <span className="max-[480px]:sr-only">Download</span>
              </a>
            </>
          ) : null}
          {canReplace ? (
            <>
              <button type="button" disabled={busy} onClick={() => input.current?.click()} className={BTN}>
                <RefreshCw className="size-4" aria-hidden="true" />
                <span className="max-[480px]:sr-only">{busy ? "Saving..." : "Replace"}</span>
              </button>
              <input
                ref={input}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  void replace(f);
                }}
              />
            </>
          ) : null}
        </div>
      </div>

      <div className={`mt-3 min-h-0 overflow-auto rounded-2xl border border-(--ap-line) bg-(--ap-tint-soft) ${fill ? "flex-1" : "h-[min(72vh,820px)] min-h-[360px]"}`}>
        {securityCheck ? (
          <Notice icon={ShieldCheck} title="Waiting for a security check" detail="The file shows here once the check is done." />
        ) : tooLarge ? (
          <Notice icon={CircleAlert} title="This file is over 5 MB" detail="It can't be previewed. Choose a smaller file." />
        ) : unsupported ? (
          <Notice icon={FileText} title="This file type can't be previewed" detail="Only PDF, JPG and PNG files open here." />
        ) : link.phase === "loading" ? (
          <div role="status" aria-label="Loading the document" className="ap-shimmer m-4 h-[calc(100%-2rem)] min-h-[240px] rounded-xl" />
        ) : link.phase === "expired" ? (
          <Notice icon={Clock3} title="This link expired. Try again" action={<button type="button" onClick={retry} className="ap-btn ap-btn-p ap-btn-sm">Try again</button>} />
        ) : link.phase === "failed" || !url ? (
          <Notice icon={CircleAlert} title="We couldn't open this document" detail="Please try again in a moment." action={<button type="button" onClick={retry} className="ap-btn ap-btn-p ap-btn-sm">Try again</button>} />
        ) : meta.kind === "pdf" ? (
          <PdfView url={url} title={meta.name} />
        ) : (
          <ImageView url={url} alt={meta.label || meta.name} />
        )}
      </div>
    </div>
  );
}

function PdfView({ url, title }: { url: string; title: string }) {
  // Browsers that cannot show PDFs inline get a plain link instead of a blank frame.
  const canEmbed = typeof navigator === "undefined" || (navigator as Navigator & { pdfViewerEnabled?: boolean }).pdfViewerEnabled !== false;
  if (!canEmbed) {
    return (
      <Notice
        icon={FileText}
        title="This browser can't show PDFs here"
        action={
          <a href={url} target="_blank" rel="noopener noreferrer" className="ap-btn ap-btn-p ap-btn-sm">
            Open in a new tab
          </a>
        }
      />
    );
  }
  return <iframe title={title} src={`${url}#toolbar=0&navpanes=0&view=FitH`} className="block h-full min-h-[360px] w-full border-0 bg-white" />;
}

function ImageView({ url, alt }: { url: string; alt: string }) {
  const [zoom, setZoom] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setZoom((z) => !z)}
      aria-label={zoom ? "Zoom out to fit the page" : "Zoom in to full size"}
      className={`block min-h-full w-full p-3 ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a blob URL cannot go through next/image */}
      <img src={url} alt={alt} className={zoom ? "mx-auto block h-auto max-w-none rounded-lg" : "mx-auto block h-auto w-full rounded-lg"} />
    </button>
  );
}

function Notice({ icon: Icon, title, detail, action }: { icon: typeof FileText; title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-white text-(--ap-violet)">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <p className="text-[15px] font-semibold text-(--ap-ink)">{title}</p>
      {detail ? <p className="max-w-[40ch] text-[13px] text-(--ap-muted)">{detail}</p> : null}
      {action}
    </div>
  );
}

/* ---------------- dialog ---------------- */

export function DocumentPreviewDialog({ title, onClose, ...panel }: PreviewProps & { title: string; onClose: () => void }) {
  const isClient = useIsClient();
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab" && box.current) {
        const f = [...box.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"]),iframe')];
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/close only
  }, []);

  if (!isClient) return null;
  // Carry the page's theme (Admin / Staff / Client / Applicant) onto the portal.
  const theme = (document.querySelector(".applicant-shell")?.className ?? "applicant-shell").replace("ap-screen-zoom", "");
  return createPortal(
    <div
      className={`${theme} fixed inset-0 z-[150] flex items-stretch justify-center min-[768px]:items-center min-[768px]:p-6`}
      style={{ background: "rgba(17,17,27,.5)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-full w-full flex-col bg-(--ap-surface) px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] text-(--ap-ink) min-[768px]:h-[min(92dvh,900px)] min-[768px]:max-w-[880px] min-[768px]:rounded-[22px] min-[768px]:px-6 min-[768px]:pt-4 min-[768px]:pb-6"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={titleId} className="ap-serif min-w-0 truncate text-[18px] leading-[1.15]">
            {title}
          </h2>
          <button ref={closeBtn} type="button" onClick={onClose} aria-label="Close preview" className="flex size-11 shrink-0 items-center justify-center rounded-xl text-(--ap-ink-2) hover:bg-(--ap-line-2) focus-visible:outline-2 focus-visible:outline-(--ap-violet)">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <DocumentPreviewPanel {...panel} fill className="min-h-0 flex-1" />
      </div>
    </div>,
    document.body,
  );
}
