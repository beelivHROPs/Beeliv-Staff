"use client";

/**
 * Copy-link delivery sheet. The link is held in component state only (never storage, URL, logs or
 * analytics) and disappears when the sheet closes: the server will not show it again.
 */
import { useRef, useState } from "react";
import { CancelButton, PrimaryButton, SheetFrame } from "@/components/admin/offers/Sheet";
import { formatDate } from "@/lib/applicant/time";
import type { AccessLink } from "@/lib/admin/team-access/types";

export function AccessLinkSheet({ name, link, onClose }: { name: string; link: AccessLink; onClose: () => void }) {
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Clearing is best effort: browsers may refuse it, and it only runs while this document is focused.
  // It runs even after the sheet closes, so the timer is deliberately not cancelled on unmount.
  async function copy() {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied("yes");
      if (clearTimer.current) clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => {
        void (async () => {
          try {
            if (document.hasFocus()) await navigator.clipboard.writeText("");
          } catch {
            /* best effort only */
          }
        })();
      }, 60_000);
    } catch {
      setCopied("failed");
    }
  }
  return (
    <SheetFrame
      title={`Access link for ${name}`}
      description="This link is shown once. Anyone with it can set up this account, so share it only with the person. Copying puts the link on this device's clipboard. Clear it after sharing."
      onClose={onClose}
      footer={
        <>
          <CancelButton onClick={onClose} label="Done" />
          <PrimaryButton onClick={() => void copy()}>{copied === "yes" ? "Copied" : "Copy link"}</PrimaryButton>
        </>
      }
    >
      <label htmlFor="access-link" className="text-[13px] font-bold text-(--ap-ink-2)">
        Link
      </label>
      <input id="access-link" readOnly className="ap-input mt-1.5 w-full font-mono text-[13px]" value={link.url} onFocus={(e) => e.currentTarget.select()} autoComplete="off" spellCheck={false} />
      <p className="mt-3 text-[14px] text-(--ap-muted)">Expires {formatDate(link.expiresAt)}.</p>
      <p role="status" className="mt-2 min-h-5 text-[13px] font-semibold text-(--ap-muted)">
        {copied === "yes" ? "Link copied." : copied === "failed" ? "Could not copy automatically. Select the link and copy it." : ""}
      </p>
    </SheetFrame>
  );
}
