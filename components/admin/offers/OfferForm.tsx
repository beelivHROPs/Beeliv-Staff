"use client";

/**
 * Create / edit a DRAFT offer (spec 6.5, 23.4). Structured fields only; the
 * letter template slot is a placeholder because Beeliv has not supplied the
 * wording, signatory or format. Pay terms carry a Public / Internal visibility
 * per line (spec 15 pattern). A live "what the applicant sees" preview sits
 * beside the form. Saving creates a Draft; submitting for approval happens on
 * the detail page. HR can never approve.
 *
 * Reused: SelectMenu, DatePicker, PageHeading, ErrorPanel, Restricted, Disc.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useUrlParams } from "@/components/admin/applicants/url";
import { Disc } from "@/components/admin/overview/Disc";
import { ChevronLeft, Exclaim, Plus, Trash2 } from "@/components/applicant/icons";
import { DatePicker } from "@/components/applicant/form-fields";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { SelectMenu } from "@/components/applicant/SelectMenu";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { createOffer, updateOfferDraft, useOffer, useOfferFacets } from "@/lib/admin/offers/hooks";
import type { OfferDetail, OfferFacets, OfferInput, PayLine } from "@/lib/admin/offers/types";
import { ApplicantPreview } from "./ApplicantPreview";
import { offerHref, OFFERS_HREF } from "./meta";
import { FoldSection as Section, PhoneFormBody, PhoneFormHead } from "@/components/admin/PhoneForm";
import { NeedsConfirmation, Restricted } from "./parts";
import { FIELD_LABEL } from "./Sheet";

const blankPay = (): PayLine[] => [{ key: "p1", label: "Basic pay", value: "", visibility: "public" }];

function initialFrom(facets: OfferFacets, existing: OfferDetail | null, applicantId: string): OfferInput {
  if (existing) {
    return {
      applicantId: existing.applicant.id,
      vacancyId: existing.vacancyId,
      clientId: existing.clientId,
      outletId: existing.outletId,
      role: existing.role,
      startDate: existing.startDate,
      employmentType: existing.employmentType,
      location: existing.location,
      reportingTo: existing.reportingTo,
      expiresAt: existing.expiresAt ?? "",
      pay: existing.pay.map((p) => ({ ...p })),
    };
  }
  const app = facets.applicants.find((a) => a.id === applicantId);
  const vac = facets.vacancies.find((v) => v.id === app?.vacancyId);
  const outlet = facets.outlets.find((o) => o.id === vac?.outletId);
  const client = facets.clients.find((c) => c.id === vac?.clientId);
  return {
    applicantId: app?.id ?? "",
    vacancyId: vac?.id ?? "",
    clientId: vac?.clientId ?? "",
    outletId: vac?.outletId ?? "",
    role: vac?.role ?? "",
    startDate: "",
    employmentType: facets.employmentTypes[0] ?? "",
    location: outlet && client ? `${outlet.name}, ${client.name}` : "",
    reportingTo: "",
    expiresAt: "",
    pay: blankPay(),
  };
}

export function OfferForm({ offerId }: { offerId?: string }) {
  const url = useUrlParams();
  const facets = useOfferFacets();
  const existing = useOffer(offerId ?? "__none");
  const editing = !!offerId;
  const back = <Back href={editing ? offerHref(offerId!) : OFFERS_HREF} label={editing ? "Offer" : "Offers"} />;
  const title = editing ? "Edit draft offer" : "New offer";

  const failed = facets.status === "error" || (editing && existing.status === "error");
  if (failed) {
    return (
      <>
        {back}
        <PageHeading title={title} />
        <ErrorPanel title="We could not load the offer form" retry={() => (facets.status === "error" ? facets.retry() : existing.retry())} />
      </>
    );
  }
  if (facets.status === "restricted" || (editing && existing.status === "restricted")) {
    return (
      <>
        {back}
        <PageHeading title={title} />
        <Restricted what="Offers" />
      </>
    );
  }
  if (editing && existing.status === "empty") {
    return (
      <>
        {back}
        <PageHeading title={title} />
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={Exclaim} title="Offer not found" description="This offer does not exist or is outside your assigned clients and outlets." />
        </div>
      </>
    );
  }
  if (!facets.data || (editing && !existing.data)) {
    return (
      <div role="status" aria-busy="true" aria-label="Loading the offer form">
        {back}
        <PageHeading title={title} />
        <div className="ap-shimmer h-[420px] rounded-2xl" />
      </div>
    );
  }
  if (editing && existing.data && existing.data.status !== "draft") {
    return (
      <>
        {back}
        <PageHeading title={title} />
        <div className="ap-card rounded-[20px] p-6 min-[768px]:p-8">
          <EmptyState icon={Exclaim} title="Only a draft can be edited" description="Once an offer is submitted it can only be withdrawn or, if sent, resent." />
        </div>
      </>
    );
  }
  return (
    <div>
      <PhoneFormHead backHref={editing ? offerHref(offerId!) : OFFERS_HREF} backLabel={editing ? "the offer" : "offers"} title={title} />
      <div className="max-[767px]:hidden">
        {back}
        <PageHeading title={title} />
      </div>
      <FormBody key={existing.data?.id ?? "new"} facets={facets.data} existing={existing.data} initialApplicantId={url.get("applicantId")} />
    </div>
  );
}

function Back({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="ap-hit mb-1 inline-flex items-center gap-1.5 text-[14px] font-bold text-(--ap-violet) hover:text-(--ap-plum)">
      <ChevronLeft className="size-4" aria-hidden="true" /> {label}
    </Link>
  );
}

function FormBody({ facets, existing, initialApplicantId }: { facets: OfferFacets; existing: OfferDetail | null; initialApplicantId: string }) {
  const router = useRouter();
  const uid = useId();
  const [f, setF] = useState<OfferInput>(() => initialFrom(facets, existing, initialApplicantId));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof OfferInput>(k: K, v: OfferInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const locked = !!existing;
  const prefilled = !existing && !!initialApplicantId && facets.applicants.some((a) => a.id === initialApplicantId);

  function pickApplicant(id: string) {
    const next = initialFrom(facets, null, id);
    setF((p) => ({ ...next, startDate: p.startDate, expiresAt: p.expiresAt, reportingTo: p.reportingTo, pay: p.pay, employmentType: p.employmentType }));
  }
  function pickVacancy(id: string) {
    const v = facets.vacancies.find((x) => x.id === id);
    if (!v) return;
    const o = facets.outlets.find((x) => x.id === v.outletId);
    const c = facets.clients.find((x) => x.id === v.clientId);
    setF((p) => ({ ...p, vacancyId: id, clientId: v.clientId, outletId: v.outletId, role: v.role, location: o && c ? `${o.name}, ${c.name}` : p.location }));
  }

  const missing: string[] = [];
  if (!f.applicantId) missing.push("applicant");
  if (!f.vacancyId) missing.push("vacancy");
  if (!f.outletId) missing.push("outlet");
  if (!f.role) missing.push("role");
  if (!f.startDate) missing.push("start date");
  if (!f.pay.some((p) => p.label.trim() && p.value.trim())) missing.push("at least one pay line");

  async function save() {
    setTouched(true);
    if (missing.length) return;
    setBusy(true);
    setError(null);
    try {
      const clean = { ...f, pay: f.pay.filter((p) => p.label.trim() && p.value.trim()) };
      const saved = existing ? await updateOfferDraft(existing.id, clean) : await createOffer(clean);
      router.push(`${offerHref(saved.id)}?saved=${existing ? "updated" : "draft"}`);
    } catch {
      setError("We could not save the offer. Nothing was changed. Please try again.");
      setBusy(false);
    }
  }

  const client = facets.clients.find((c) => c.id === f.clientId)?.name ?? "";
  const outlet = facets.outlets.find((o) => o.id === f.outletId)?.name ?? "";
  const err = (cond: boolean) => (touched && cond ? "mt-1 text-[13px] font-semibold text-(--ap-rose)" : "hidden");

  return (
    <PhoneFormBody className="grid grid-cols-1 items-start gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-4">
        <Section title="Who and where" forceOpen={touched && (!f.applicantId || !f.vacancyId || !f.outletId)} summary={[facets.applicants.find((a) => a.id === f.applicantId)?.name, outlet].filter(Boolean).join(" · ") || "Applicant, vacancy and outlet"}>
          <span className="mt-0 block text-[13px] font-bold text-(--ap-ink-2)">Applicant</span>
          <SelectMenu
            label="Applicant"
            value={f.applicantId}
            placeholder="Choose an applicant"
            onChange={pickApplicant}
            options={facets.applicants.map((a) => ({ value: a.id, label: a.name }))}
            className={`mt-1.5 ${locked || prefilled ? "pointer-events-none opacity-70" : ""}`}
          />
          <p className={err(!f.applicantId)}>Choose the applicant.</p>
          <p className="mt-1.5 text-[13px] text-(--ap-muted)">{locked || prefilled ? "The applicant is fixed for this offer." : "Offers are normally created from the applicant's record."}</p>

          <span className={FIELD_LABEL}>Vacancy</span>
          <SelectMenu label="Vacancy" value={f.vacancyId} placeholder="Choose a vacancy" onChange={pickVacancy} options={facets.vacancies.map((v) => ({ value: v.id, label: v.name }))} className="mt-1.5" />
          <p className={err(!f.vacancyId)}>Choose the vacancy.</p>

          <div className="grid grid-cols-1 gap-x-4 min-[560px]:grid-cols-2">
            <div>
              <span className={FIELD_LABEL}>Client</span>
              <SelectMenu
                label="Client"
                value={f.clientId}
                placeholder="Choose a client"
                onChange={(v) => setF((p) => ({ ...p, clientId: v, outletId: "" }))}
                options={facets.clients.map((c) => ({ value: c.id, label: c.name }))}
                className="mt-1.5"
              />
            </div>
            <div>
              <span className={FIELD_LABEL}>Outlet</span>
              <SelectMenu
                label="Outlet"
                value={f.outletId}
                placeholder={f.clientId ? "Choose an outlet" : "Choose a client first"}
                onChange={(v) => set("outletId", v)}
                options={facets.outlets.filter((o) => o.clientId === f.clientId).map((o) => ({ value: o.id, label: o.name }))}
                className="mt-1.5"
              />
              <p className={err(!f.outletId)}>Choose the outlet.</p>
            </div>
          </div>
        </Section>

        <Section title="Role and terms" forceOpen={touched && (!f.role || !f.startDate)} summary={[f.role, f.employmentType].filter(Boolean).join(" · ") || "Role, type and start date"}>
          <div className="grid grid-cols-1 gap-x-4 min-[560px]:grid-cols-2">
            <div>
              <span className="block text-[13px] font-bold text-(--ap-ink-2)">Role</span>
              <SelectMenu label="Role" value={f.role} placeholder="Choose a role" onChange={(v) => set("role", v)} options={facets.roles} className="mt-1.5" />
              <p className={err(!f.role)}>Choose the role.</p>
            </div>
            <div>
              <span className="block text-[13px] font-bold text-(--ap-ink-2)">Employment type</span>
              <SelectMenu label="Employment type" value={f.employmentType} onChange={(v) => set("employmentType", v)} options={facets.employmentTypes} className="mt-1.5" />
            </div>
            <div>
              <label htmlFor={`${uid}-start`} className={FIELD_LABEL}>Start date</label>
              <div className="mt-1.5">
                <DatePicker id={`${uid}-start`} title="Start date" value={f.startDate} onChange={(v) => set("startDate", v)} placeholder="Choose a date" />
              </div>
              <p className={err(!f.startDate)}>Choose the start date.</p>
            </div>
            <div>
              <label htmlFor={`${uid}-exp`} className={FIELD_LABEL}>Respond by (offer expiry)</label>
              <div className="mt-1.5">
                <DatePicker id={`${uid}-exp`} title="Respond by" value={f.expiresAt} onChange={(v) => set("expiresAt", v)} placeholder="Optional" />
              </div>
            </div>
            <div>
              <label htmlFor={`${uid}-loc`} className={FIELD_LABEL}>Location</label>
              <input id={`${uid}-loc`} className="ap-input mt-1.5" value={f.location} maxLength={120} onChange={(e) => set("location", e.target.value)} />
            </div>
            <div>
              <label htmlFor={`${uid}-rep`} className={FIELD_LABEL}>Reporting to</label>
              <input id={`${uid}-rep`} className="ap-input mt-1.5" value={f.reportingTo} maxLength={120} onChange={(e) => set("reportingTo", e.target.value)} />
            </div>
          </div>
          <div className="mt-3">
            <NeedsConfirmation>How long an offer stays open before it expires.</NeedsConfirmation>
          </div>
        </Section>

        <Section title="Pay terms" forceOpen={touched && !f.pay.some((p) => p.label.trim() && p.value.trim())} summary={`${f.pay.filter((p) => p.label.trim() && p.value.trim()).length} pay line(s)`} right={<span className="text-[13px] text-(--ap-muted)">Public lines are shown to the applicant. Internal lines are not.</span>}>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {f.pay.map((p, i) => (
              <li key={p.key} className="grid grid-cols-1 gap-2 rounded-xl border border-(--ap-line) p-3 min-[640px]:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_140px_40px] min-[640px]:items-center">
                <input aria-label={`Pay line ${i + 1} label`} placeholder="Label, e.g. Basic pay" className="ap-input" value={p.label} maxLength={60} onChange={(e) => set("pay", f.pay.map((x) => (x.key === p.key ? { ...x, label: e.target.value } : x)))} />
                <input aria-label={`Pay line ${i + 1} value`} placeholder="e.g. NGN 150,000 per month" className="ap-input" value={p.value} maxLength={80} onChange={(e) => set("pay", f.pay.map((x) => (x.key === p.key ? { ...x, value: e.target.value } : x)))} />
                <SelectMenu
                  label={`Pay line ${i + 1} visibility`}
                  variant="compact"
                  value={p.visibility}
                  onChange={(v) => set("pay", f.pay.map((x) => (x.key === p.key ? { ...x, visibility: v === "internal" ? "internal" : "public" } : x)))}
                  options={[
                    { value: "public", label: "Public" },
                    { value: "internal", label: "Internal only" },
                  ]}
                  className="w-full"
                />
                <button type="button" aria-label={`Remove pay line ${i + 1}`} disabled={f.pay.length <= 1} onClick={() => set("pay", f.pay.filter((x) => x.key !== p.key))} className="ap-hit flex size-10 items-center justify-center rounded-lg text-(--ap-muted) hover:bg-(--ap-line-2) disabled:opacity-40">
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <p className={err(!f.pay.some((p) => p.label.trim() && p.value.trim()))}>Add at least one pay line with a label and a value.</p>
          <button type="button" onClick={() => set("pay", [...f.pay, { key: `p${Date.now()}`, label: "", value: "", visibility: "public" }])} className="ap-btn ap-btn-s ap-btn-sm mt-3">
            <Plus className="size-4" aria-hidden="true" /> Add a pay line
          </button>
        </Section>

        <Section title="Offer letter">
          <p className="text-[14px] leading-snug text-(--ap-ink-2)">The letter is generated from a template once Beeliv supplies it. Until then the offer carries a placeholder file name and no letter text.</p>
          <div className="mt-3">
            <NeedsConfirmation>Template wording, signatory and format.</NeedsConfirmation>
          </div>
        </Section>

        {touched && missing.length ? (
          <p role="alert" className="flex items-center gap-3 rounded-2xl bg-(--ap-rose-bg) p-3.5 text-[14px] font-semibold text-(--ap-ink)">
            <Disc icon={Exclaim} tone="urgent" /> Still needed: {missing.join(", ")}.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="flex items-center gap-3 rounded-2xl bg-(--ap-rose-bg) p-3.5 text-[14px] font-semibold text-(--ap-ink)">
            <Disc icon={Exclaim} tone="urgent" /> {error}
          </p>
        ) : null}
        <div className="pf-bar flex flex-col-reverse gap-2.5 min-[600px]:flex-row min-[600px]:justify-end">
          <Link href={existing ? offerHref(existing.id) : OFFERS_HREF} data-pf-cancel="" className="ap-btn ap-btn-s h-12 px-5 text-[15px] font-semibold">
            Cancel
          </Link>
          <button type="button" disabled={busy} onClick={save} className="ap-btn ap-btn-p h-12 px-5 text-[15px] font-semibold text-white!">
            {busy ? "Saving..." : existing ? "Save changes" : "Save as draft"}
          </button>
        </div>
      </div>

      <aside className="@container min-w-0 min-[1100px]:sticky min-[1100px]:top-4" aria-label="What the applicant sees">
        <Section title="What the applicant sees" startClosed noNumber summary="Preview">
          <ApplicantPreview
            status="sent"
            data={{ role: f.role, outlet, client, location: f.location, employmentType: f.employmentType, startDate: f.startDate, reportingTo: f.reportingTo, expiresAt: f.expiresAt || null, letterFileName: "Employment-offer-letter-PLACEHOLDER.pdf", pay: f.pay }}
          />
          <p className="mt-2.5 text-[13px] text-(--ap-muted)">Preview as it will look once the offer is sent.</p>
        </Section>
      </aside>
    </PhoneFormBody>
  );
}
