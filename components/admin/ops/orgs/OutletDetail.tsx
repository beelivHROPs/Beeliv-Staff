"use client";

/**
 * Outlet page for Operations: outlet details, contact, the client's HR officer,
 * the staff on this outlet and its open vacancies. Read-only. States: loading,
 * not found, error, restricted.
 */
import Link from "next/link";
import { BackHeader, BackLink, GROUP, MUTED_NOTE } from "@/components/admin/ops/assign/kit";
import { HrAvatar, NoHrChip } from "@/components/admin/ops/assign/parts";
import { OpsOnly } from "@/components/admin/ops/parts";
import { Restricted } from "@/components/admin/vacancies/parts";
import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { Store } from "@/components/client/icons";
import { StatusChip } from "@/components/client/StatusChip";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useOpsOutlet } from "@/lib/admin/ops/opsclients-hooks";
import { plural } from "@/lib/client/format";
import { Block, EmptyLine, Line, opsClientHref, PageSkeleton, SiteStaffList } from "./parts";

export function OutletDetail({ clientId, outletId }: { clientId: string; outletId: string }) {
  return (
    <OpsOnly what="This outlet" fallback={<PageSkeleton label="Loading outlet" />}>
      <Inner clientId={clientId} outletId={outletId} />
    </OpsOnly>
  );
}

function Inner({ clientId, outletId }: { clientId: string; outletId: string }) {
  const live = useOpsOutlet(clientId, outletId);
  const d = live.data;
  const back = opsClientHref(clientId);
  const top = (title: string, label = "Client") => (
    <>
      <BackHeader href={back} label={label} title={title} />
      <BackLink href={back} label={label} />
    </>
  );

  if (live.status === "error")
    return (
      <>
        {top("Outlet")}
        <ErrorPanel title="We could not load this outlet" retry={live.retry} />
      </>
    );
  if (live.status === "restricted")
    return (
      <>
        {top("Outlet")}
        <Restricted what="This outlet" />
      </>
    );
  if (live.status === "loading" && !d) return <PageSkeleton label="Loading outlet" />;
  if (!d)
    return (
      <>
        {top("Outlet")}
        <div className={`${GROUP} p-6`}>
          <EmptyState icon={Store} title="Outlet not found" description="This outlet does not exist." />
        </div>
      </>
    );

  const o = d.outlet;
  return (
    <div>
      {top(o.name, d.client.name)}
      <div className="max-[767px]:hidden">
        <PageHeading title={o.name} right={<StatusChip tone={o.statusTone}>{o.statusLabel}</StatusChip>} />
      </div>
      <p className="mb-4 text-[14px] text-(--ap-muted) max-[767px]:hidden">
        at{" "}
        <Link href={back} className="font-semibold text-(--ap-violet)">
          {d.client.name}
        </Link>
      </p>
      <div className="flex max-w-[760px] flex-col gap-6">
        <Block title="Outlet details">
          <dl className="m-0">
            <Line label="Address">{o.address}</Line>
            <Line label="City">{o.city}</Line>
            <Line label="Staff deployed">{o.deployedStaff}</Line>
            <Line label="Open vacancies">{o.openVacancies}</Line>
          </dl>
        </Block>

        <Block title="Contacts" note="Contact fields shown to Operations need Beeliv confirmation.">
          <dl className="m-0">
            <Line label="Person in charge">{d.manager || <span className="text-(--ap-muted)">Not recorded</span>}</Line>
            <Line label="Phone">{d.phone || <span className="text-(--ap-muted)">Not recorded</span>}</Line>
            <Line label="HR officer">
              {d.client.hr ? (
                <span className="inline-flex items-center gap-2">
                  <HrAvatar hr={d.client.hr} size={24} />
                  {d.client.hr.name}
                </span>
              ) : (
                <NoHrChip />
              )}
            </Line>
          </dl>
        </Block>

        <Block title={`Staff on this outlet (${d.staff.length})`}>
          {d.staff.length === 0 ? <EmptyLine>No staff deployed here yet.</EmptyLine> : <SiteStaffList staff={d.staff} />}
        </Block>

        <Block title="Open vacancies">
          {d.vacancies.length === 0 ? (
            <EmptyLine>No open vacancies at this outlet.</EmptyLine>
          ) : (
            <ul className="m-0 list-none p-0">
              {d.vacancies.map((v) => (
                <li key={v.id} className="flex min-h-14 items-center justify-between gap-3 border-t border-(--ap-line-2) px-4 py-2 first:border-t-0">
                  <span className="text-[15px] font-semibold text-(--ap-ink)">{v.title}</span>
                  <span className="text-[14px] text-(--ap-ink-2) tabular-nums">{plural(v.openings, "opening")}</span>
                </li>
              ))}
            </ul>
          )}
        </Block>
        <p className={MUTED_NOTE}>Opening and editing the outlet record is done by HR.</p>
      </div>
    </div>
  );
}
