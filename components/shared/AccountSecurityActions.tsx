"use client";

import { SectionCard } from "@/components/applicant/SectionCard";

/** Security actions backed by the caller; never display preview sessions as real devices. */
export function AccountSecurityActions({ onSignOut }: { onSignOut: () => void }) {
  return (
    <SectionCard id="s-security" title="Security">
      <p className="text-[15px] leading-relaxed text-(--ap-ink-2)">Password and device-session management aren&apos;t available on this page yet. To reset your password, use &ldquo;Forgot password&rdquo; on the sign-in page.</p>
      <button type="button" onClick={onSignOut} className="ap-btn ap-btn-s mt-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ap-violet)">Sign out</button>
    </SectionCard>
  );
}
