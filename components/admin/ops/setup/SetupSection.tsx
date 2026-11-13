"use client";

/**
 * One Setup section page (company profile, invitation policy, approval rules,
 * notification defaults, and the read-only roles summary). Forms save through
 * the adapter; "Saved" is shown only after the adapter confirms; a validation
 * problem is shown next to the field and keeps what was typed; a conflict
 * reloads the latest and says so. Values Beeliv has not confirmed carry a small
 * muted "needs Beeliv confirmation".
 */
import { PhoneInput } from "@/components/applicant/form-fields";
import { useId, useState, type ReactNode } from "react";
import { BackHeader, BackLink, Banner, GROUP, GROUP_HEAD, MAIN_BTN, MUTED_NOTE, ROW_LINE, Toggle } from "@/components/admin/ops/assign/kit";
import { OpsOnly } from "@/components/admin/ops/parts";
import { Restricted } from "@/components/admin/vacancies/parts";
import { PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { ConflictError, saveSetupSection, SetupValidationError, useSetupRoles, useSetupSection } from "@/lib/admin/ops/setup-hooks";
import type { FieldErrors, RoleSummary, SetupFormId, SetupRecord, SetupValues } from "@/lib/admin/ops/setup-types";
import { timeAgo } from "@/lib/client/format";
import { SETUP_HREF, type SetupSlug } from "./meta";


const TITLES: Record<SetupSlug, string> = { company: "Company profile", invitations: "Invitation policy", approvals: "Approval rules", notifications: "Notification defaults", roles: "Roles and who can do what" };
const INTRO: Record<SetupSlug, string> = {
  company: "How Beeliv appears and how people reach you.",
  invitations: "How many days an invitation stays open before it expires. The days below are proposals.",
  approvals: "Operations decides selections and offers. These two rules are proposals.",
  notifications: "What Operations is told about by default.",
  roles: "A plain summary of the access design. You cannot change it here.",
};

export function SetupSection({ slug }: { slug: SetupSlug }) {
  return (
    <OpsOnly what="Setup" fallback={<div className="ap-shimmer h-[320px] rounded-2xl" />}>
      <div>
        <BackHeader href={SETUP_HREF} label="Setup" title={TITLES[slug]} />
        <BackLink href={SETUP_HREF} label="Setup" />
        <div className="max-[767px]:hidden">
          <PageHeading title={TITLES[slug]} />
        </div>
        <p className="mb-5 max-w-[60ch] text-[14px] text-(--ap-muted)">{INTRO[slug]}</p>
        {slug === "roles" ? <Roles /> : <FormLoader id={slug} />}
      </div>
    </OpsOnly>
  );
}

function FormLoader({ id }: { id: SetupFormId }) {
  const live = useSetupSection(id);
  const [notice, setNotice] = useState<string | null>(null);
  if (live.status === "error") return <ErrorPanel title="We could not load this section" retry={live.retry} />;
  if (live.status === "restricted") return <Restricted what="Setup" />;
  if (!live.data)
    return (
      <div role="status" aria-busy="true" aria-label="Loading" className="flex max-w-[640px] flex-col gap-3">
        <div className="ap-shimmer h-56 rounded-[14px]" />
      </div>
    );
  return (
    <>
      {notice ? (
        <Banner tone="warn" onDismiss={() => setNotice(null)}>
          {notice}
        </Banner>
      ) : null}
      <Form
        key={live.data.revision}
        rec={live.data}
        onConflict={() => {
          setNotice("Someone else saved this section first. We loaded their version. Check it, then save again if you still need your change.");
          live.retry();
        }}
      />
    </>
  );
}

/* ---------- form plumbing ---------- */

type Draft = Record<string, string | boolean>;

function toDraft(id: SetupFormId, v: SetupValues[SetupFormId]): Draft {
  if (id === "approvals") {
    const a = v as SetupValues["approvals"];
    return { reminderDays: a.reminderDays === null ? "" : String(a.reminderDays), secondApprover: a.secondApprover };
  }
  if (id === "invitations") {
    const i = v as SetupValues["invitations"];
    return { clientsDays: String(i.clientsDays), staffDays: String(i.staffDays), adminsDays: String(i.adminsDays) };
  }
  return { ...(v as unknown as Draft) };
}

function fromDraft<K extends SetupFormId>(id: K, d: Draft): SetupValues[K] {
  const n = (x: string | boolean) => (typeof x === "string" && x.trim() !== "" ? Number(x) : NaN);
  if (id === "approvals") return { reminderDays: String(d.reminderDays).trim() === "" ? null : n(d.reminderDays), secondApprover: !!d.secondApprover } as SetupValues[K];
  if (id === "invitations") return { clientsDays: n(d.clientsDays), staffDays: n(d.staffDays), adminsDays: n(d.adminsDays) } as SetupValues[K];
  return { ...d } as unknown as SetupValues[K];
}

function Form<K extends SetupFormId>({ rec: initial, onConflict }: { rec: SetupRecord<K>; onConflict: () => void }) {
  const [rec, setRec] = useState(initial);
  const [draft, setDraft] = useState<Draft>(() => toDraft(rec.id, rec.values));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(rec.id, rec.values));
  const set = (k: string, v: string | boolean) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setSaved(false);
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  async function save() {
    setBusy(true);
    setFailed(false);
    setSaved(false);
    try {
      const next = await saveSetupSection(rec.id, fromDraft(rec.id, draft), rec.revision);
      setRec(next);
      setDraft(toDraft(next.id, next.values));
      setErrors({});
      setSaved(true);
    } catch (e) {
      if (e instanceof SetupValidationError) setErrors(e.fields);
      else if (e instanceof ConflictError) onConflict();
      else setFailed(true);
    }
    setBusy(false);
  }

  const unc = (k: string) => rec.unconfirmedFields.includes(k);
  const ctx: FieldCtx = { draft, errors, set, unc };
  let fields: ReactNode;
  if (rec.id === "company")
    fields = (
      <>
        <Text ctx={ctx} k="name" label="Company name" autoComplete="organization" />
        <Text ctx={ctx} k="city" label="City" />
        <Text ctx={ctx} k="contactEmail" label="Contact email" type="email" help="Shown to clients and applicants who need to reach Beeliv." />
        <Text ctx={ctx} k="phone" label="Phone number" type="tel" />
      </>
    );
  else if (rec.id === "invitations")
    fields = (
      <>
        <Days ctx={ctx} k="clientsDays" label="Client invitations" />
        <Days ctx={ctx} k="staffDays" label="Staff invitations" />
        <Days ctx={ctx} k="adminsDays" label="HR and Operations invitations" />
        <p className={`${MUTED_NOTE} px-4 py-3`}>An expired invitation can be sent again. The sign-in link in the email has its own, shorter life.</p>
      </>
    );
  else if (rec.id === "approvals")
    fields = (
      <>
        <div className={`flex min-h-14 items-center justify-between gap-3 px-4 py-3 ${ROW_LINE}`}>
          <span className="text-[14.5px] text-(--ap-ink)">Who approves</span>
          <span className="text-[14px] font-semibold text-(--ap-ink-2)">Head of Operations</span>
        </div>
        <Days ctx={ctx} k="reminderDays" label="Remind me when a request has waited" optional />
        <Switch ctx={ctx} k="secondApprover" label="Require a second approver" help="Off means one decision is enough." />
      </>
    );
  else
    fields = (
      <>
        <Switch ctx={ctx} k="approvalWaiting" label="A selection or offer is waiting for me" />
        <Switch ctx={ctx} k="clientWithoutHr" label="A client has no HR officer" />
        <Switch ctx={ctx} k="requestWaiting" label="A client request has waited too long" />
        <Switch ctx={ctx} k="weeklySummary" label="A weekly summary of activity" />
        <p className={`${MUTED_NOTE} px-4 py-3`}>These are email defaults. In-app notifications are always on.</p>
      </>
    );

  return (
    <form
      noValidate
      className="max-w-[640px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty && !busy) save();
      }}
    >
      {saved ? (
        <Banner tone="ok" onDismiss={() => setSaved(false)}>
          Saved. {rec.updatedBy ? `Recorded for ${rec.updatedBy}.` : ""} No notifications were sent.
        </Banner>
      ) : null}
      {failed ? <Banner tone="bad">We could not save this. Nothing was changed and what you typed is still here. Please try again.</Banner> : null}
      <div className={GROUP}>{fields}</div>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={!dirty || busy} className={`${MAIN_BTN} disabled:opacity-50`}>
          {busy ? "Saving..." : "Save changes"}
        </button>
        {rec.updatedAt && rec.updatedBy ? <span className={MUTED_NOTE}>Last saved {timeAgo(rec.updatedAt)} by {rec.updatedBy}</span> : <span className={MUTED_NOTE}>Not saved yet</span>}
      </div>
    </form>
  );
}

interface FieldCtx {
  draft: Draft;
  errors: FieldErrors;
  set: (k: string, v: string | boolean) => void;
  unc: (k: string) => boolean;
}

const Unconfirmed = () => <span className={`${MUTED_NOTE} italic`}> needs Beeliv confirmation</span>;

function Text({ ctx, k, label, type = "text", help, autoComplete }: { ctx: FieldCtx; k: string; label: string; type?: string; help?: string; autoComplete?: string }) {
  const id = useId();
  const err = ctx.errors[k];
  return (
    <div className={`px-4 py-3 ${ROW_LINE}`}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-(--ap-ink-2)">
        {label}
        {ctx.unc(k) ? <Unconfirmed /> : null}
      </label>
      {type === "tel" ? (
        <PhoneInput quiet id={id} value={String(ctx.draft[k] ?? "")} invalid={!!err} describedBy={err ? `${id}-e` : help ? `${id}-h` : undefined} onChange={(v) => ctx.set(k, v)} />
      ) : (
        <input id={id} type={type} autoComplete={autoComplete} className="ap-input" value={String(ctx.draft[k] ?? "")} aria-invalid={!!err} aria-describedby={err ? `${id}-e` : help ? `${id}-h` : undefined} onChange={(e) => ctx.set(k, e.target.value)} />
      )}
      {err ? (
        <p id={`${id}-e`} role="alert" className="mt-1.5 text-[13px] font-semibold text-(--ap-rose)">
          {err}
        </p>
      ) : help ? (
        <p id={`${id}-h`} className={`mt-1.5 ${MUTED_NOTE}`}>
          {help}
        </p>
      ) : null}
    </div>
  );
}

function Days({ ctx, k, label, optional }: { ctx: FieldCtx; k: string; label: string; optional?: boolean }) {
  const id = useId();
  const err = ctx.errors[k];
  return (
    <div className={`px-4 py-3 ${ROW_LINE}`}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-(--ap-ink-2)">
        {label}
        {ctx.unc(k) ? <Unconfirmed /> : null}
      </label>
      <div className="flex items-center gap-2.5">
        <input id={id} inputMode="numeric" className="ap-input w-24" value={String(ctx.draft[k] ?? "")} aria-invalid={!!err} aria-describedby={err ? `${id}-e` : undefined} onChange={(e) => ctx.set(k, e.target.value.replace(/[^0-9]/g, ""))} />
        <span className="text-[14px] text-(--ap-muted)">days{optional ? ", empty means no reminder" : ""}</span>
      </div>
      {err ? (
        <p id={`${id}-e`} role="alert" className="mt-1.5 text-[13px] font-semibold text-(--ap-rose)">
          {err}
        </p>
      ) : null}
    </div>
  );
}

function Switch({ ctx, k, label, help }: { ctx: FieldCtx; k: string; label: string; help?: string }) {
  return (
    <div className={`flex min-h-14 items-center gap-3 px-4 py-3 ${ROW_LINE}`}>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] leading-snug text-(--ap-ink)">
          {label}
          {ctx.unc(k) ? <Unconfirmed /> : null}
        </span>
        {help ? <span className={`block ${MUTED_NOTE}`}>{help}</span> : null}
      </span>
      <Toggle on={!!ctx.draft[k]} label={label} onChange={(v) => ctx.set(k, v)} />
    </div>
  );
}

/* ---------- roles (read only) ---------- */

function Roles() {
  const live = useSetupRoles();
  if (live.status === "error") return <ErrorPanel title="We could not load the roles" retry={live.retry} />;
  if (live.status === "restricted") return <Restricted what="Setup" />;
  if (!live.data) return <div role="status" aria-busy="true" aria-label="Loading roles" className="ap-shimmer h-72 max-w-[760px] rounded-[14px]" />;
  return (
    <div className="max-w-[760px]">
      <ul className={`${GROUP} m-0 list-none p-0`}>
        {live.data.map((r) => (
          <RoleRow key={r.id} r={r} />
        ))}
      </ul>
      <p className={`mt-3 ${MUTED_NOTE}`}>Taken from the access design. Anything listed as still open needs Beeliv confirmation before it is built.</p>
    </div>
  );
}

function RoleRow({ r }: { r: RoleSummary }) {
  return (
    <li className={`px-4 py-4 ${ROW_LINE}`}>
      <h2 className="text-[15.5px] font-semibold text-(--ap-ink)">{r.name}</h2>
      <p className="text-[13px] text-(--ap-muted)">{r.scope}</p>
      <p className={`${GROUP_HEAD} mt-3 mb-1 px-0`}>Can</p>
      <ul className="m-0 list-disc pl-5 text-[14px] leading-[1.6] text-(--ap-ink-2)">
        {r.can.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      {r.cannot.length ? (
        <>
          <p className={`${GROUP_HEAD} mt-3 mb-1 px-0`}>Cannot</p>
          <ul className="m-0 list-disc pl-5 text-[14px] leading-[1.6] text-(--ap-ink-2)">
            {r.cannot.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      ) : null}
      {r.open.length ? (
        <p className={`mt-3 ${MUTED_NOTE} italic`}>Still open, needs Beeliv confirmation: {r.open.join("; ")}.</p>
      ) : null}
    </li>
  );
}
