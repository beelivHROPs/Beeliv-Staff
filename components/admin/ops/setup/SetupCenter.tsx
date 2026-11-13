"use client";

/**
 * Setup Center: a calm checklist of what Operations should have in place. Rows
 * are grouped in plain containers (like a settings screen); each shows
 * Done / Needs attention and links onward. One main button: review the next
 * item that needs attention. Values that Beeliv has not confirmed say so in
 * small muted text. States: loading, error, restricted.
 */
import Link from "next/link";
import { GROUP, GROUP_HEAD, MAIN_BTN, MUTED_NOTE, ROW_LINE } from "@/components/admin/ops/assign/kit";
import { OpsOnly } from "@/components/admin/ops/parts";
import { Restricted } from "@/components/admin/vacancies/parts";
import { ChevronRight } from "@/components/applicant/icons";
import { PageHeading } from "@/components/applicant/primitives";
import { ErrorPanel } from "@/components/staff/ErrorPanel";
import { useSetupOverview } from "@/lib/admin/ops/setup-hooks";
import type { SetupSectionSummary } from "@/lib/admin/ops/setup-types";

const GROUPS: { key: SetupSectionSummary["group"]; title: string }[] = [
  { key: "company", title: "Your company" },
  { key: "people", title: "People and access" },
  { key: "work", title: "How work flows" },
];

export function SetupCenter() {
  return (
    <OpsOnly what="Setup" fallback={<Skeleton />}>
      <Inner />
    </OpsOnly>
  );
}

function Inner() {
  const live = useSetupOverview();
  const heading = <PageHeading title="Setup" />;
  if (live.status === "error")
    return (
      <>
        {heading}
        <ErrorPanel title="We could not load Setup" retry={live.retry} />
      </>
    );
  if (live.status === "restricted")
    return (
      <>
        {heading}
        <Restricted what="Setup" />
      </>
    );
  if (!live.data) return <Skeleton />;
  const o = live.data;
  const next = o.sections.find((s) => s.id === o.nextId);
  return (
    <div>
      <PageHeading
        title="Setup"
        right={
          next ? (
            <Link href={next.href} className={MAIN_BTN}>
              Review next: {next.title}
            </Link>
          ) : undefined
        }
      />
      <div className="mb-6 max-w-[760px]">
        <p className="text-[14px] text-(--ap-ink-2)">
          <b className="font-semibold text-(--ap-ink)">
            {o.doneCount} of {o.total}
          </b>{" "}
          done. {o.nextId ? "The rest need a look." : "Everything is in place."}
        </p>
        <div role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={o.total} aria-valuenow={o.doneCount} className="mt-2 h-1 overflow-hidden rounded-full bg-(--ap-line-2)">
          <div className="h-full rounded-full bg-(--ap-violet)" style={{ width: `${(o.doneCount / o.total) * 100}%` }} />
        </div>
      </div>
      <div className="flex max-w-[760px] flex-col gap-6">
        {GROUPS.map((g) => (
          <section key={g.key} aria-label={g.title}>
            <h2 className={GROUP_HEAD}>{g.title}</h2>
            <ul className={`${GROUP} m-0 list-none p-0`}>
              {o.sections
                .filter((s) => s.group === g.key)
                .map((s) => (
                  <li key={s.id} className={ROW_LINE}>
                    <Link href={s.href} className="flex min-h-[60px] items-center gap-3 px-4 py-3 hover:bg-(--ap-tint-soft)">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] leading-tight font-semibold text-(--ap-ink)">{s.title}</span>
                        <span className={`mt-0.5 block ${MUTED_NOTE}`}>{s.note}</span>
                        {s.unconfirmed ? <span className={`block ${MUTED_NOTE} italic`}>needs Beeliv confirmation</span> : null}
                      </span>
                      <span className={`shrink-0 text-[13px] font-semibold ${s.status === "done" ? "text-(--ap-ok)" : "text-(--ap-warn)"}`}>{s.status === "done" ? "Done" : "Needs attention"}</span>
                      <ChevronRight className="size-4 shrink-0 text-(--ap-faint)" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading Setup">
      <PageHeading title="Setup" />
      <div className="flex max-w-[760px] flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="ap-shimmer h-40 rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
