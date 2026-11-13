"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpLeft, CircleAlert, Clock3, Mail, MessageSquareText, Pencil, ShieldCheck, UserRound, Users } from "@/components/applicant/icons";
import { Chip } from "@/components/applicant/primitives";
import { confirmAction } from "@/components/applicant/ConfirmDialog";
import { RelativeTime } from "@/components/applicant/RelativeTime";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { toast } from "@/components/ui/toast";
import { inboxActions } from "@/lib/admin/inbox/hooks";
import type { ActivityKind, InboxAssignee, InboxCaseDetail, InboxPermissions, InboxStatus } from "@/lib/admin/inbox/types";
import { CATEGORY_LABEL, ESCALATION_TARGET, RELATED_LABEL, SENDER_KIND_LABEL, STATUS_CHIP, STATUS_LABEL, STATUS_ORDER } from "./meta";

const ACTIVITY_ICON: Record<ActivityKind, typeof Clock3> = {
  created: Mail,
  assigned: UserRound,
  status: ShieldCheck,
  reply: MessageSquareText,
  note: Pencil,
  escalated: CircleAlert,
};

function failToast(title: string) {
  toast.add({ title, description: "Please try again.", type: "error" });
}

/** Escalate, after confirming where it goes (spec 31.2 oversight column). */
export async function escalateCase(detail: InboxCaseDetail) {
  const ok = await confirmAction({
    tone: "caution",
    title: "Escalate this case?",
    description: `It will be flagged for ${ESCALATION_TARGET[detail.category]}. The sender is not notified.`,
    confirmLabel: "Escalate",
  });
  if (!ok) return;
  try {
    await inboxActions.escalate(detail.id);
    toast.add({ title: "Case escalated", type: "success" });
  } catch {
    failToast("Could not escalate");
  }
}

export async function changeStatus(id: string, status: InboxStatus) {
  try {
    await inboxActions.setStatus(id, status);
    toast.add({ title: `Status: ${STATUS_LABEL[status]}`, type: "success" });
  } catch {
    failToast("Could not change the status");
  }
}

export async function assignCase(id: string, assigneeId: string | null) {
  try {
    await inboxActions.assign(id, assigneeId);
    toast.add({ title: assigneeId ? "Case assigned" : "Case unassigned", type: "success" });
  } catch {
    failToast("Could not assign the case");
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[13px] font-bold tracking-wide text-(--ap-muted) uppercase">{label}</div>
      <div className="text-[15px] wrap-anywhere">{children}</div>
    </div>
  );
}

export function CaseDetails({
  detail,
  permissions,
  assignees,
}: {
  detail: InboxCaseDetail;
  permissions: InboxPermissions;
  assignees: InboxAssignee[];
}) {
  const { sender, related } = detail;
  const canEscalate = permissions.canEscalate && detail.status !== "escalated" && detail.status !== "resolved";
  return (
    <div className="flex flex-col gap-5 p-4">
      <Field label="Reference">
        <span className="font-mono text-sm font-semibold">{detail.reference}</span>
      </Field>

      <Field label="Sender">
        <b className="block">{sender.name}</b>
        <span className="block text-(--ap-muted)">
          {SENDER_KIND_LABEL[sender.kind]}
          {sender.organisation ? ` - ${sender.organisation}` : ""}
        </span>
        {sender.email ? <span className="block text-(--ap-muted)">{sender.email}</span> : null}
      </Field>

      <Field label="Category">{CATEGORY_LABEL[detail.category]}</Field>

      <Field label="Status">
        {permissions.canChangeStatus ? (
          <SelectMenu
            variant="compact"
            label="Change status"
            value={detail.status}
            onChange={(v) => void changeStatus(detail.id, v as InboxStatus)}
            options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            className="w-full"
          />
        ) : (
          <Chip tone={STATUS_CHIP[detail.status]}>{STATUS_LABEL[detail.status]}</Chip>
        )}
      </Field>

      <Field label="Assigned HR">
        {permissions.canAssign ? (
          <SelectMenu
            variant="compact"
            label={detail.assignedTo ? "Reassign case" : "Assign case"}
            value={detail.assignedTo?.id ?? ""}
            placeholder="Unassigned - choose HR"
            onChange={(v) => void assignCase(detail.id, v || null)}
            options={assignees.map((a) => ({ value: a.id, label: a.name }))}
            className="w-full"
          />
        ) : detail.assignedTo ? (
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4 text-(--ap-muted)" aria-hidden="true" />
            {detail.assignedTo.name}
          </span>
        ) : (
          <span className="text-(--ap-muted)">Unassigned</span>
        )}
        {!permissions.canAssign ? <span className="mt-1 block text-[13px] text-(--ap-muted)">Assignment is handled by an HR Manager.</span> : null}
      </Field>

      <Field label="Related record">
        {related ? (
          related.href ? (
            <Link href={related.href} className="inline-flex items-center gap-1.5 font-bold text-(--ap-violet) hover:underline">
              {RELATED_LABEL[related.kind]}: {related.label}
              <ArrowUpLeft className="size-3.5 rotate-90" aria-hidden="true" />
            </Link>
          ) : (
            <span>
              {RELATED_LABEL[related.kind]}: {related.label}
              <span className="block text-[13px] text-(--ap-muted)">Record page not built yet.</span>
            </span>
          )
        ) : (
          <span className="text-(--ap-muted)">None linked</span>
        )}
      </Field>

      {permissions.canEscalate ? (
        <div>
          <button type="button" disabled={!canEscalate} onClick={() => void escalateCase(detail)} className="ap-btn ap-btn-s w-full disabled:opacity-50">
            <CircleAlert className="size-4" aria-hidden="true" />
            {detail.status === "escalated" ? "Escalated" : "Escalate"}
          </button>
          {canEscalate ? <p className="mt-1.5 text-[13px] text-(--ap-muted)">Goes to: {ESCALATION_TARGET[detail.category]}</p> : null}
        </div>
      ) : null}

      <section aria-labelledby="case-activity">
        <h3 id="case-activity" className="mb-2 text-[13px] font-bold tracking-wide text-(--ap-muted) uppercase">
          Activity history
        </h3>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {[...detail.activity].reverse().map((a) => {
            const Icon = ACTIVITY_ICON[a.kind];
            return (
              <li key={a.id} className="flex gap-2.5">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-(--ap-line-2) text-(--ap-muted)">
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                <span className="min-w-0 text-sm wrap-anywhere">
                  {a.text}
                  <span className="block text-[13px] text-(--ap-muted)">
                    {a.actorName} - <RelativeTime iso={a.createdAt} />
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
