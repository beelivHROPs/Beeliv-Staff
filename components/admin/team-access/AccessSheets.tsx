"use client";

/** Sheets for Team & Access: change client outlets / access level, change staff / applicant entitlements, and view history. */
import { useEffect, useId, useState } from "react";
import { NeedsConfirmation } from "@/components/admin/offers/parts";
import { CancelButton, FIELD_LABEL, PrimaryButton, SheetFrame } from "@/components/admin/offers/Sheet";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { formatDate } from "@/lib/applicant/time";
import { getHistory, useTeamFacets } from "@/lib/admin/team-access/hooks";
import type { AccessPatch, AccessRow, HistoryEntry } from "@/lib/admin/team-access/types";
import { Checkbox } from "./InviteSheets";

export function AccessSheet({ row, busy, error, onCancel, onSubmit }: { row: AccessRow; busy: boolean; error: string | null; onCancel: () => void; onSubmit: (patch: AccessPatch) => void }) {
  const uid = useId();
  const facets = useTeamFacets().data;
  const isClient = row.kind === "client";
  const [outletIds, setOutletIds] = useState<string[]>(row.outletIds ?? []);
  const [level, setLevel] = useState(row.accessLevelId ?? "");
  const [applicant, setApplicant] = useState(row.entitlements?.applicant ?? false);
  const [staff, setStaff] = useState(row.entitlements?.staff ?? false);
  const [reason, setReason] = useState("");
  const outlets = (facets?.outlets ?? []).filter((o) => o.clientId === row.clientId);
  const valid = isClient ? outletIds.length > 0 && !!level : applicant || staff;
  const ready = valid && reason.trim().length > 0 && !busy;
  return (
    <SheetFrame
      title={isClient ? `Change access for ${row.name}` : `Change entitlements for ${row.name}`}
      description={isClient ? "Choose which outlets this client user can see and their access level." : "Entitlements are on the same person. Applicant and Staff can both be on at once; no second account is created."}
      busy={busy}
      onClose={onCancel}
      footer={
        <>
          <CancelButton onClick={onCancel} disabled={busy} />
          <PrimaryButton disabled={!ready} onClick={() => onSubmit(isClient ? { outletIds, accessLevelId: level, reason: reason.trim() } : { entitlements: { applicant, staff }, reason: reason.trim() })}>
            {busy ? "Working..." : "Save changes"}
          </PrimaryButton>
        </>
      }
    >
      {isClient ? (
        <>
          <span className={FIELD_LABEL}>Outlets</span>
          <div className="mt-1.5 flex flex-col gap-2">
            {outlets.map((o) => (
              <Checkbox key={o.id} id={`${uid}-${o.id}`} checked={outletIds.includes(o.id)} onChange={() => setOutletIds(outletIds.includes(o.id) ? outletIds.filter((x) => x !== o.id) : [...outletIds, o.id])}>
                {o.name}
              </Checkbox>
            ))}
          </div>
          <span className={FIELD_LABEL}>Access level</span>
          <SelectMenu label="Access level" value={level} onChange={setLevel} options={(facets?.accessLevels ?? []).map((l) => ({ value: l.id, label: l.name }))} className="mt-1.5" />
          <div className="mt-3">
            <NeedsConfirmation>What each client access level may do.</NeedsConfirmation>
          </div>
        </>
      ) : (
        <>
          <span className={FIELD_LABEL}>Entitlements</span>
          <div className="mt-1.5 flex flex-col gap-2">
            <Checkbox id={`${uid}-a`} checked={applicant} onChange={setApplicant}>
              Applicant (recruitment history and applications)
            </Checkbox>
            <Checkbox id={`${uid}-s`} checked={staff} onChange={setStaff}>
              Staff (Staff Hub access)
            </Checkbox>
          </div>
          {!valid ? <p className="mt-1.5 text-[13px] font-semibold text-(--ap-rose)">At least one entitlement is needed. To close an account, deactivate it instead.</p> : null}
          <div className="mt-3">
            <NeedsConfirmation>Which lifecycle point switches Staff access on. Normally it is added through Offers, Convert to staff.</NeedsConfirmation>
          </div>
        </>
      )}
      <label htmlFor={`${uid}-r`} className={FIELD_LABEL}>
        Reason (required)
      </label>
      <textarea id={`${uid}-r`} className="ap-input mt-1.5" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
      <p className="mt-1.5 text-[13px] text-(--ap-muted)">Recorded in the history with your name and the time.</p>
      {error ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-(--ap-rose)">
          {error}
        </p>
      ) : null}
    </SheetFrame>
  );
}

export function HistorySheet({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const [items, setItems] = useState<HistoryEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let off = false;
    getHistory(id).then(
      (h) => !off && setItems(h),
      () => !off && setFailed(true),
    );
    return () => {
      off = true;
    };
  }, [id]);
  return (
    <SheetFrame title={`History: ${name}`} onClose={onClose} footer={<CancelButton onClick={onClose} label="Close" />}>
      <div className="mt-4">
        {failed ? (
          <p role="alert" className="text-[14px] font-semibold text-(--ap-rose)">We could not load the history.</p>
        ) : !items ? (
          <div role="status" aria-busy="true" aria-label="Loading history" className="ap-shimmer h-24 rounded-xl" />
        ) : (
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {items.map((h) => (
              <li key={h.id} className="text-[14px] leading-snug">
                <p className="break-words">
                  <b>{h.actor}</b> · {h.action}
                </p>
                {h.reason ? <p className="text-(--ap-ink-2)">Reason: {h.reason}</p> : null}
                <p className="text-[12px] text-(--ap-muted)">{formatDate(h.at)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </SheetFrame>
  );
}
