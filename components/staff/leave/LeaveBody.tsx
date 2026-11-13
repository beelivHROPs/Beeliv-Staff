"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";
import { dayMonth, longDate, timeAgo } from "@/lib/staff/format";
import { useLeaveRequests } from "@/lib/staff/hooks";
import { cancelLeaveRequest } from "@/lib/staff/service";
import type { LeaveRequest } from "@/lib/staff/types";
import { ActionPill, Facts, confirmAction } from "../kit";
import { LeaveStatusChip, rangeLabel } from "./leave-meta";
import { LeavePhone, LeavePhoneSkeleton } from "./LeavePhone";
import { LeaveDesktop } from "./LeaveDesktop";
import { RequestForm } from "./RequestForm";
import { Sheet } from "./Sheet";

export function LeaveSkeleton() {
  return <LeavePhoneSkeleton />;
}

/**
 * Leave: balance (only when the backend supplies one), the one "Request leave" action, and the
 * request history. One layout at every width (LeavePhone); the request form and a request's
 * detail open in a sheet (bottom on phones, side panel on desktop) with Cancel for pending ones.
 */
export function LeaveBody() {
  const { data, status, retry } = useLeaveRequests();
  const [formOpen, setFormOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  if (status === "loading") return <LeaveSkeleton />;

  const requests = [...(data ?? [])].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const selected = requests.find((r) => r.id === openId) ?? null;

  return (
    <>
      <div className="min-[1000px]:hidden">
        <LeavePhone requests={requests} status={status} retry={retry} onOpen={setOpenId} onRequest={() => setFormOpen(true)} />
      </div>
      <div className="max-[999px]:hidden">
        <LeaveDesktop requests={requests} status={status} retry={retry} onOpen={setOpenId} onRequest={() => setFormOpen(true)} />
      </div>
      <Sheet open={selected !== null} title="Leave request" onClose={() => setOpenId(null)}>
        {selected ? <Detail req={selected} /> : null}
      </Sheet>
      <Sheet open={formOpen} title="Request leave" onClose={() => setFormOpen(false)}>
        <RequestForm onDone={() => setFormOpen(false)} />
      </Sheet>
    </>
  );
}

function Detail({ req }: { req: LeaveRequest }) {
  const [busy, setBusy] = useState(false);
  const rows: [string, string][] = [
    ["Leave type", req.type],
    ["Dates", req.startDate === req.endDate ? longDate(req.startDate) : `${longDate(req.startDate)} to ${longDate(req.endDate)}`],
    ["Sent", `${dayMonth(req.submittedAt.slice(0, 10))} (${timeAgo(req.submittedAt)})`],
    ["Reason", req.reason ?? "No reason given"],
    ["Attachment", req.attachmentName ?? "None"],
  ];

  async function cancel() {
    const ok = await confirmAction({
      tone: "danger",
      title: "Cancel this leave request?",
      description: `${req.type}, ${rangeLabel(req)}. Beeliv will see that you cancelled it.`,
      confirmLabel: "Cancel request",
      cancelLabel: "Keep request",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await cancelLeaveRequest(req.id);
      toast.add({ title: "Leave request cancelled", type: "success" });
    } catch {
      toast.add({ title: "We couldn't cancel that request", description: "Please try again.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      <div>
        <LeaveStatusChip status={req.status} />
      </div>
      <Facts rows={rows} />
      {req.decisionNote ? (
        <div className="rounded-[22px] bg-(--ap-tint) p-4">
          <div className="text-[14px] text-(--ap-muted)">Note from Beeliv</div>
          <p className="mt-1 text-[16px] text-(--ap-ink-2)">{req.decisionNote}</p>
        </div>
      ) : null}
      {req.status === "pending" && req.canCancel ? (
        <ActionPill variant="outline" loading={busy} onClick={cancel} arrow={false} fit className="max-[767px]:w-full">
          {busy ? "Cancelling..." : "Cancel request"}
        </ActionPill>
      ) : req.status === "pending" ? (
        <p className="text-[15px] text-(--ap-muted)">This request can&apos;t be cancelled here. Contact Beeliv if you need to change it.</p>
      ) : null}
    </div>
  );
}
