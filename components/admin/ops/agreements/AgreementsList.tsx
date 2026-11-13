"use client";

/**
 * Setup > Agreements and policies (Head of Operations only). Two groups: documents
 * people must accept, and public pages. Each row: current version, published date,
 * acceptance count (mock) and a status chip. No wording lives here: until Beeliv
 * supplies it, every row says "Wording pending".
 */
import Link from "next/link";
import { BackHeader, BackLink, Banner, GROUP, GROUP_HEAD, MUTED_NOTE, ROW_LINE } from "@/components/admin/ops/assign/kit";
import { OpsOnly } from "@/components/admin/ops/parts";
import { Restricted } from "@/components/admin/vacancies/parts";
import { ChevronRight } from "@/components/applicant/icons";
import { PageHeading } from "@/components/applicant/primitives";
import { StatusChip } from "@/components/client/StatusChip";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useAgreementDocuments } from "@/lib/admin/agreements/hooks";
import type { AgreementDocSummary } from "@/lib/admin/agreements/types";
import { formatDate } from "@/lib/applicant/time";

export const AGREEMENTS_HREF = "/admin/ops/setup/agreements";
const SETUP = "/admin/ops/setup";

export function DocStatusChip({ d }: { d: AgreementDocSummary }) {
  if (!d.currentVersion) return d.hasDraft ? <StatusChip tone="info">Draft, not published</StatusChip> : <StatusChip tone="warn">Wording pending</StatusChip>;
  return <StatusChip tone="ok">Published</StatusChip>;
}

const GROUPS: { key: AgreementDocSummary["group"]; title: string }[] = [
  { key: "accept", title: "People must accept" },
  { key: "public", title: "Public pages" },
];

export function AgreementsList() {
  return (
    <OpsOnly what="Agreements and policies" fallback={<Skeleton />}>
      <Inner />
    </OpsOnly>
  );
}

function Inner() {
  const live = useAgreementDocuments();
  const top = (
    <>
      <BackHeader href={SETUP} label="Setup" title="Agreements and policies" />
      <BackLink href={SETUP} label="Setup" />
      <div className="max-[767px]:hidden">
        <PageHeading title="Agreements and policies" />
      </div>
    </>
  );
  if (live.status === "error")
    return (
      <div>
        {top}
        <ErrorPanel title="We could not load the documents" retry={live.retry} />
      </div>
    );
  if (live.status === "restricted")
    return (
      <div>
        {top}
        <Restricted what="Agreements and policies" />
      </div>
    );
  if (!live.data) return <Skeleton />;
  const docs = live.data;
  const pending = docs.filter((d) => !d.currentVersion).length;
  return (
    <div>
      {top}
      <p className="mb-5 max-w-[60ch] text-[14px] text-(--ap-muted)">Write, preview and publish the wording people read and accept. A published version never changes: a change is a new version.</p>
      {pending ? (
        <Banner tone="warn">
          Wording pending from Beeliv for {pending} of {docs.length} documents. Until a document is published, people cannot finish setup that needs it, and a public page keeps its placeholder.
        </Banner>
      ) : null}
      <div className="flex max-w-[760px] flex-col gap-6">
        {GROUPS.map((g) => (
          <section key={g.key} aria-label={g.title}>
            <h2 className={GROUP_HEAD}>{g.title}</h2>
            <ul className={`${GROUP} m-0 list-none p-0`}>
              {docs
                .filter((d) => d.group === g.key)
                .map((d) => (
                  <li key={d.id} className={ROW_LINE}>
                    <Link href={`${AGREEMENTS_HREF}/${d.id}`} className="flex min-h-[64px] items-center gap-3 px-4 py-3 hover:bg-(--ap-tint-soft)">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] leading-tight font-semibold text-(--ap-ink)">{d.title}</span>
                        <span className={`mt-0.5 block ${MUTED_NOTE}`}>
                          {d.code ? `${d.code} · ` : ""}
                          {d.currentVersion && d.publishedAt ? `${d.currentVersion}, published ${formatDate(d.publishedAt)}` : "No version published"}
                          {d.acceptanceCount !== null && d.currentVersion ? ` · ${d.acceptanceCount} accepted` : ""}
                          {d.audience ? ` · ${d.audience}` : ""}
                        </span>
                        {d.currentVersion && d.hasDraft ? <span className={`block ${MUTED_NOTE} italic`}>A draft change is waiting to be published</span> : null}
                      </span>
                      <DocStatusChip d={d} />
                      <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
      <p className={`mt-4 max-w-[60ch] ${MUTED_NOTE} italic`}>The wording and the rule for asking people to accept a new version both need Beeliv confirmation. Acceptance counts are sample numbers in this preview.</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading documents">
      <PageHeading title="Agreements and policies" />
      <div className="flex max-w-[760px] flex-col gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="ap-shimmer h-40 rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
