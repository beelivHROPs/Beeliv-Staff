"use client";

/**
 * Status and gate pages (job unavailable, staff access not on the account yet, ...) show NO app navigation
 * (project lead, 2026-10-24): while one is on screen the sidebar, desktop top bar and phone bottom nav are
 * hidden by the `[data-ap-status]` rule in applicant-buttons.css, and this slim bar stands in: logo, Help and
 * Log out only. Render it as the first child of the status page.
 */
import Image from "next/image";
import Link from "next/link";
import { CircleHelp, LogOut } from "@/components/applicant/icons";
import { useLogout } from "./AppShell";

export function StatusChrome() {
  const logout = useLogout();
  return (
    <div data-ap-status="" className="mb-6 flex items-center justify-between gap-3 border-b border-(--ap-line) pb-3 max-[767px]:mb-4">
      <Link href="/applicant" aria-label="Beeliv Hospitality, back to your dashboard" className="ap-hit inline-flex items-center">
        <Image src="/images/beeliv-logo-full-colour.png" alt="Beeliv Hospitality" width={197} height={207} className="h-11 w-auto" priority />
      </Link>
      <div className="flex items-center gap-1">
        <Link href="/applicant/help" className="ap-hit inline-flex h-11 items-center gap-2 rounded-full px-3.5 text-[14px] font-semibold text-(--ap-ink-2) hover:bg-(--ap-line-2)">
          <CircleHelp className="size-[18px]" aria-hidden="true" />
          Help
        </Link>
        <button type="button" onClick={logout} className="inline-flex h-11 items-center gap-2 rounded-full px-3.5 text-[14px] font-semibold text-(--ap-ink-2) hover:bg-(--ap-line-2)">
          <LogOut className="size-[18px]" aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>
  );
}
