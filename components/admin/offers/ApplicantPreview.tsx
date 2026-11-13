"use client";

/**
 * "What the applicant sees": a read-only mirror of the facts on the Applicant
 * app's Offer page (components/applicant/OfferBody.tsx): position, outlet,
 * location, employment, resumption date, reporting to, respond-by, the offer
 * letter. Only PUBLIC pay lines appear; internal ones are never shown here.
 * The letter's wording, signatory and format need Beeliv confirmation, so only
 * the file slot is previewed.
 */
import { FileText } from "@/components/applicant/icons";
import { StatusChip } from "@/components/client/StatusChip";
import type { OfferStatus, PayLine } from "@/lib/admin/offers/types";
import { applicantView, formatYmd } from "./meta";
import { NeedsConfirmation } from "./parts";

export interface PreviewData {
  role: string;
  outlet: string;
  client: string;
  location: string;
  employmentType: string;
  startDate: string;
  reportingTo: string;
  expiresAt: string | null;
  letterFileName: string;
  pay: PayLine[];
}

export function ApplicantPreview({ data, status }: { data: PreviewData; status: OfferStatus }) {
  const view = applicantView(status);
  const facts: [string, string][] = [
    ["Position", data.role],
    ["Outlet", data.outlet ? `${data.outlet}${data.client ? `, ${data.client}` : ""}` : ""],
    ["Location", data.location],
    ["Employment", data.employmentType],
    ["Resumption date", data.startDate ? formatYmd(data.startDate) : ""],
    ["Reporting to", data.reportingTo],
  ];
  const publicPay = data.pay.filter((p) => p.visibility === "public" && (p.label.trim() || p.value.trim()));
  return (
    <div className="rounded-2xl border border-(--ap-line) bg-(--ap-tint-soft) p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b className="text-[14px]">Employment offer</b>
        <StatusChip tone={view.tone}>{view.label}</StatusChip>
      </div>
      <h3 className="ap-serif mt-2 text-[18px] leading-tight break-words">
        {data.role || "Position"} at {data.outlet || "Outlet"}
      </h3>
      {data.expiresAt && (status === "sent" || status === "viewed") ? <p className="mt-1 text-[13px] font-bold text-(--ap-warn)">Please respond by {formatYmd(data.expiresAt)}</p> : null}
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 @min-[420px]:grid-cols-2">
        {facts.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[12px] font-bold text-(--ap-muted)">{k}</dt>
            <dd className="text-[14px] break-words text-(--ap-ink)">{v || <span className="text-(--ap-muted)">Not set</span>}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 border-t border-(--ap-line) pt-3">
        <b className="text-[13px]">Pay terms shown to the applicant</b>
        {publicPay.length === 0 ? (
          <p className="mt-1 text-[13px] text-(--ap-muted)">No public pay lines. The Applicant app&apos;s Offer page does not show pay yet.</p>
        ) : (
          <ul className="m-0 mt-1.5 flex list-none flex-col gap-1 p-0">
            {publicPay.map((p) => (
              <li key={p.key} className="flex justify-between gap-3 text-[14px]">
                <span className="text-(--ap-muted)">{p.label}</span>
                <span className="text-right font-semibold break-words">{p.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-xl bg-(--ap-surface) p-3">
        <FileText className="size-5 shrink-0 text-(--ap-violet)" aria-hidden="true" />
        <div className="min-w-0">
          <b className="block text-[14px]">Offer letter</b>
          <span className="block truncate text-[13px] text-(--ap-muted)">{data.letterFileName}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <NeedsConfirmation>The offer letter template, wording, signatory and file format.</NeedsConfirmation>
        {view.needsConfirmation ? <NeedsConfirmation>What the applicant sees once an offer is expired or withdrawn.</NeedsConfirmation> : null}
      </div>
    </div>
  );
}
