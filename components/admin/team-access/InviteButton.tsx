"use client";

/**
 * Header action that opens the reusable invite entry (client wizard or staff
 * sheet). Used by Clients ("Invite client") and the Staff directory ("Invite
 * staff"). The page also opens it automatically for ?invite=1, so the sidebar
 * can link to /admin/clients?invite=1 and /admin/staff/directory?invite=1.
 * Creating a record never sends the invitation: sending is explicit.
 */
import { useCan } from "@/lib/admin/role-access";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Plus } from "@/components/applicant/icons";
import type { InvitationKind, InvitePrefill } from "@/lib/admin/team-access/types";
import { InviteSheet } from "./InviteSheets";

const LABEL: Record<InvitationKind, string> = { client: "Invite client", staff: "Invite staff", internal: "Invite team member" };

/** autoOpen=false for embedded copies, so ?invite=1 opens one sheet only (the hub owns it). */
export function InviteButton({ kind, prefill, autoOpen = true }: { kind: InvitationKind; prefill?: InvitePrefill; autoOpen?: boolean }) {
  const sp = useSearchParams();
  const allowed = useCan("invitations.manage");
  const [open, setOpen] = useState(() => autoOpen && sp.get("invite") === "1");
  const close = () => {
    setOpen(false);
    const next = new URLSearchParams(window.location.search);
    if (next.has("invite")) {
      next.delete("invite");
      const qs = next.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }
  };
  if (!allowed) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white! max-[767px]:h-11 max-[767px]:px-4 max-[767px]:text-[14px]">
        <Plus className="size-4" aria-hidden="true" /> {LABEL[kind]}
      </button>
      {open ? <InviteSheet kind={kind} prefill={prefill} onClose={close} /> : null}
    </>
  );
}
