"use client";

/**
 * Reusable invite sheet for the three invitation-only account kinds (AUTH-001 /
 * AUTH-004: no self sign-up for staff, clients or internal users). Exported so
 * the Clients and Staff screens can open it later:
 *
 *   <InviteSheet kind="client" prefill={{ clientId, outletIds }} onClose={...} onDone={...} />
 *
 * Nothing is actually sent: the invitation is recorded as pending and the copy
 * says "Email delivery is connected later". The first Head of Operations is a
 * bootstrap account created at deployment, not invited here (spec 10).
 *
 * Reused: SheetFrame (Offers), SelectMenu, Disc.
 */
import { playAdminSound } from "@/lib/admin/sound";
import { useId, useState } from "react";
import { NeedsConfirmation } from "@/components/admin/offers/parts";
import { CancelButton, FIELD_LABEL, PrimaryButton, SheetFrame } from "@/components/admin/offers/Sheet";
import { DatePicker } from "@/components/applicant/form-fields";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { inviteUser, useTeamFacets } from "@/lib/admin/team-access/hooks";
import { JOB_TITLE_MAX, type Invitation, type InvitationKind, type InvitePrefill, type TeamFacets } from "@/lib/admin/team-access/types";
import { ClientWizard } from "./ClientInviteWizard";
import { StaffWizard } from "./StaffInviteSheet";
import { Checkbox, InviteLinkResult } from "./InviteParts";

export const INVITE_TITLE: Record<InvitationKind, string> = { internal: "Invite internal user", client: "Invite client user", staff: "Invite staff member" };
const INTRO: Record<InvitationKind, string> = {
  internal: "Internal users are invitation-only. They set their own password from the invitation; role and scope are attached here.",
  client: "Client users are invitation-only and see only the outlets you choose. Beeliv sets the business details; the client user only sets personal items. Existing clients are not imported: they receive a link and onboard themselves.",
  staff: "Staff use the same Talent account as applicants (no separate staff login). Existing staff are not imported: they receive a link and onboard themselves.",
};

export { Checkbox };

export function InviteSheet({ kind, prefill, onClose, onDone }: { kind: InvitationKind; prefill?: InvitePrefill; onClose: () => void; onDone?: (inv: Invitation) => void }) {
  const live = useTeamFacets().data;
  // Keep the last loaded choices: inviteUser() makes the live data reload, and dropping to
  // undefined would unmount the wizard and lose its "sent" (invitation link) screen.
  const [kept, setKept] = useState<TeamFacets | undefined>(live ?? undefined);
  if (live && live !== kept) setKept(live);
  const facets = live ?? kept;
  if (kind === "client" && !prefill?.clientId && facets) return <ClientWizard facets={facets} onClose={onClose} onDone={onDone} />;
  if (kind === "staff" && facets) return <StaffWizard facets={facets} prefill={prefill} onClose={onClose} onDone={onDone} />;
  return (
    <SheetFrame
      title={INVITE_TITLE[kind]}
      description={INTRO[kind]}
      onClose={onClose}
      width={560}
      footer={
        facets ? null : (
          <CancelButton onClick={onClose} />
        )
      }
    >
      {facets ? <InviteForm key={kind} kind={kind} prefill={prefill} facets={facets} onClose={onClose} onDone={onDone} /> : <div role="status" aria-busy="true" aria-label="Loading" className="ap-shimmer mt-4 h-40 rounded-xl" />}
    </SheetFrame>
  );
}

/** The form renders its own footer buttons inside the sheet body so state stays in one place. */
function InviteForm({ kind, prefill, facets, onClose, onDone }: { kind: InvitationKind; prefill?: InvitePrefill; facets: TeamFacets; onClose: () => void; onDone?: (inv: Invitation) => void }) {
  const uid = useId();
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [roleId, setRoleId] = useState(prefill?.roleId ?? "");
  const [jobTitle, setJobTitle] = useState("");
  const [levelId, setLevelId] = useState("");
  const [clientId, setClientId] = useState(prefill?.clientId ?? "");
  const [outletIds, setOutletIds] = useState<string[]>(prefill?.outletIds ?? []);
  const [allClients, setAllClients] = useState(false);
  const [scopeClients, setScopeClients] = useState<string[]>([]);
  const [days, setDays] = useState(String(facets.expiryOptions[1]?.days ?? facets.expiryOptions[0]?.days ?? 7));
  const [staffRole, setStaffRole] = useState("");
  const [startDate, setStartDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Invitation | null>(null);

  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());
  const outlets = facets.outlets.filter((o) => o.clientId === clientId);
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const scopeOk = kind === "internal" ? allClients || scopeClients.length > 0 : kind === "client" ? !!clientId && outletIds.length > 0 : !!clientId;
  const ready = !!name.trim() && emailOk && scopeOk && (kind === "internal" ? !!roleId : kind === "client" ? !!levelId : !!staffRole && !!startDate) && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const inv = await inviteUser({
        kind, name, email, roleId: roleId || undefined, jobTitle: kind === "internal" ? jobTitle.trim() || undefined : undefined, accessLevelId: levelId || undefined, clientId: clientId || undefined, outletIds, allClients, scopeClientIds: scopeClients, personId: prefill?.personId, expiresInDays: Number(days), staffRole: staffRole || undefined, startDate: startDate || undefined,
      });
      setSent(inv);
      playAdminSound("saved"); // invitation created (the confirmation screen is already showing)
      onDone?.(inv);
    } catch (e) {
      setError(e instanceof Error && e.message === "duplicate" ? "That email already has an account or a pending invitation. Resend or revoke the existing invitation instead." : "We could not record the invitation. Nothing was changed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) return <InviteLinkResult inv={sent} onClose={onClose} />;

  return (
    <div>
      <label htmlFor={`${uid}-n`} className={FIELD_LABEL}>
        Full name
      </label>
      <input id={`${uid}-n`} className="ap-input mt-1.5" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      <label htmlFor={`${uid}-e`} className={FIELD_LABEL}>
        Email address
      </label>
      <input id={`${uid}-e`} type="email" className="ap-input mt-1.5" value={email} maxLength={120} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!email && !emailOk} />
      {email && !emailOk ? <p className="mt-1 text-[13px] font-semibold text-(--ap-rose)">Enter a valid email address.</p> : null}

      {kind === "internal" ? (
        <>
          <span className={FIELD_LABEL}>Role</span>
          <SelectMenu label="Role" value={roleId} placeholder="Choose a role" onChange={setRoleId} options={facets.roles.filter((r) => !facets.invitableRoleIds || facets.invitableRoleIds.includes(r.id)).map((r) => ({ value: r.id, label: r.name }))} className="mt-1.5" />
          <label htmlFor={`${uid}-jt`} className={FIELD_LABEL}>
            Job title (optional)
          </label>
          <input id={`${uid}-jt`} className="ap-input mt-1.5" value={jobTitle} maxLength={JOB_TITLE_MAX} placeholder="e.g. Senior Recruiter" aria-describedby={`${uid}-jt-h`} onChange={(e) => setJobTitle(e.target.value)} />
          <p id={`${uid}-jt-h`} className="mt-1 text-[13px] text-(--ap-muted)">Shown on the team list only. It does not change what the person can do; the role above does.</p>
          <span className={FIELD_LABEL}>Client and outlet scope</span>
          <div className="mt-1.5 flex flex-col gap-2">
            <Checkbox id={`${uid}-all`} checked={allClients} onChange={setAllClients}>
              All clients and outlets (Beeliv-wide)
            </Checkbox>
            {!allClients
              ? facets.clients.map((c) => (
                  <Checkbox key={c.id} id={`${uid}-c-${c.id}`} checked={scopeClients.includes(c.id)} onChange={() => setScopeClients(toggle(scopeClients, c.id))}>
                    {c.name}
                  </Checkbox>
                ))
              : null}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <p className="rounded-lg bg-(--ap-tint-soft) px-3 py-2 text-[13px] leading-snug text-(--ap-ink-2)">The first Head of Operations account is a bootstrap account created at deployment after management verification. It is not invited here.</p>
          </div>
        </>
      ) : (
        <>
          {kind === "staff" ? (
            <>
              <span className={FIELD_LABEL}>Role</span>
              <SelectMenu label="Role" value={staffRole} placeholder="Choose a role" onChange={setStaffRole} options={facets.staffRoles} className="mt-1.5" />
            </>
          ) : null}
          <span className={FIELD_LABEL}>Client</span>
          <SelectMenu
            label="Client"
            value={clientId}
            placeholder="Choose a client"
            onChange={(v) => {
              setClientId(v);
              setOutletIds([]);
            }}
            options={facets.clients.map((c) => ({ value: c.id, label: c.name }))}
            className="mt-1.5"
          />
          <span className={FIELD_LABEL}>{kind === "client" ? "Outlets this user can see" : "Outlet (optional)"}</span>
          <div className="mt-1.5 flex flex-col gap-2">
            {!clientId ? <p className="text-[13px] text-(--ap-muted)">Choose a client first.</p> : null}
            {outlets.map((o) => (
              <Checkbox key={o.id} id={`${uid}-o-${o.id}`} checked={outletIds.includes(o.id)} onChange={() => setOutletIds(kind === "staff" ? (outletIds.includes(o.id) ? [] : [o.id]) : toggle(outletIds, o.id))}>
                {o.name}
              </Checkbox>
            ))}
          </div>
          {kind === "staff" ? (
            <>
              <label htmlFor={`${uid}-sd`} className={FIELD_LABEL}>
                Start date
              </label>
              <div className="mt-1.5">
                <DatePicker id={`${uid}-sd`} title="Start date" value={startDate} onChange={setStartDate} placeholder="Choose a date" />
              </div>
            </>
          ) : null}
          {kind === "client" ? (
            <>
              <span className={FIELD_LABEL}>Access level</span>
              <SelectMenu label="Access level" value={levelId} placeholder="Choose an access level" onChange={setLevelId} options={facets.accessLevels.map((l) => ({ value: l.id, label: l.name }))} className="mt-1.5" />
              <div className="mt-3">
                <NeedsConfirmation>What each client access level may do.</NeedsConfirmation>
              </div>
            </>
          ) : null}
        </>
      )}

      <span className={FIELD_LABEL}>Invitation expires after</span>
      <SelectMenu label="Invitation expiry" value={days} onChange={setDays} options={facets.expiryOptions.map((o) => ({ value: String(o.days), label: o.label }))} className="mt-1.5" />
      <p className="mt-3 text-[13px] text-(--ap-muted)">Email delivery is connected later. The invitation is recorded as pending, with resend and revoke.</p>

      {error ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-(--ap-rose)">
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col-reverse gap-2.5 min-[768px]:flex-row min-[768px]:justify-end">
        <CancelButton onClick={onClose} disabled={busy} />
        <PrimaryButton disabled={!ready} onClick={submit}>
          {busy ? "Working..." : "Record invitation"}
        </PrimaryButton>
      </div>
    </div>
  );
}

/** Named entry components for other screens (sidebar, Clients, Staff). Each loads its own choices. */
export function InviteClientWizard(props: { prefill?: InvitePrefill; onClose: () => void; onDone?: (inv: Invitation) => void }) {
  return <InviteSheet kind="client" {...props} />;
}
export function InviteStaffSheet(props: { prefill?: InvitePrefill; onClose: () => void; onDone?: (inv: Invitation) => void }) {
  return <InviteSheet kind="staff" {...props} />;
}
