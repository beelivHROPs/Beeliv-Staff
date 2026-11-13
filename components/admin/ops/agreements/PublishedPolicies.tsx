"use client";

/**
 * Read-only list of the published agreements and policies, for every HR role. Shows the
 * current published version only: no drafts, no draft flag, no older versions. The Head
 * of Operations also gets a link to the editor (hidden for everyone else). Presentation
 * only: the server returns published text only to HR (docs/contracts/ops-agreements.md).
 */
import Link from "next/link";
import { useState } from "react";
import { ADMIN_THEME } from "@/components/admin/AdminShell";
import { Can } from "@/components/admin/Can";
import { GROUP, GROUP_HEAD, MUTED_NOTE, ROW_LINE } from "@/components/admin/ops/assign/kit";
import { AGREEMENTS_HREF } from "@/components/admin/ops/agreements/AgreementsList";
import { PageHeading } from "@/components/applicant/primitives";
import { StatusChip } from "@/components/client/StatusChip";
import { AgreementReader } from "@/components/shared/agreements/AgreementReader";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { Restricted } from "@/components/admin/vacancies/parts";
import { usePublishedAgreements } from "@/lib/admin/agreements/hooks";
import type { PublishedAgreement } from "@/lib/admin/agreements/types";
import { formatDate } from "@/lib/applicant/time";

const GROUPS: { key: PublishedAgreement["summary"]["group"]; title: string }[] = [
  { key: "accept", title: "People must accept" },
  { key: "public", title: "Public pages" },
];

export function PublishedPolicies() {
  const live = usePublishedAgreements();
  const [open, setOpen] = useState<PublishedAgreement | null>(null);
  const heading = (
    <PageHeading
      title="Agreements and policies"
      right={
        <Can cap="agreements.publish">
          <Link href={AGREEMENTS_HREF} className="ap-btn ap-btn-p h-11 rounded-full px-5 text-[14px] font-semibold text-white!">
            Edit and publish
          </Link>
        </Can>
      }
    />
  );
  if (live.status === "error")
    return (
      <div>
        {heading}
        <ErrorPanel title="We could not load the documents" retry={live.retry} />
      </div>
    );
  if (live.status === "restricted")
    return (
      <div>
        {heading}
        <Restricted what="Agreements and policies" />
      </div>
    );
  if (!live.data)
    return (
      <div role="status" aria-busy="true" aria-label="Loading documents">
        {heading}
        <div className="ap-shimmer h-48 max-w-[760px] rounded-[14px]" />
      </div>
    );
  return (
    <div>
      {heading}
      <p className="mb-5 max-w-[60ch] text-[14px] text-(--ap-muted)">The wording currently in force. Only Operations can change it.</p>
      <div className="flex max-w-[760px] flex-col gap-6">
        {GROUPS.map((g) => (
          <section key={g.key} aria-label={g.title}>
            <h2 className={GROUP_HEAD}>{g.title}</h2>
            <ul className={`${GROUP} m-0 list-none p-0`}>
              {live.data!
                .filter((p) => p.summary.group === g.key)
                .map((p) => (
                  <li key={p.summary.id} className={`flex min-h-[60px] items-center gap-3 px-4 py-3 ${ROW_LINE}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-tight font-semibold text-(--ap-ink)">{p.summary.title}</span>
                      <span className={`mt-0.5 block ${MUTED_NOTE}`}>{p.current ? `${p.current.version}, published ${formatDate(p.current.publishedAt)}` : "Wording pending from Beeliv"}</span>
                    </span>
                    {p.current ? (
                      <button type="button" onClick={() => setOpen(p)} className="ap-btn ap-btn-s h-10 rounded-full px-4 text-[14px] font-semibold">
                        Read
                      </button>
                    ) : (
                      <StatusChip tone="warn">Not published yet</StatusChip>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      {open?.current ? <AgreementReader title={open.summary.title} version={open.current.version} body={open.current.body} themeClass={ADMIN_THEME} meta={`Published ${formatDate(open.current.publishedAt)}`} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
