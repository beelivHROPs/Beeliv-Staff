"use client";

/**
 * Documentation review (step 7) — same `.rv` / `.kv2` layout as the Apply
 * flow's StepReview, with an Edit link per section. NIN and account number
 * are masked here; nothing sensitive is shown in full.
 */
import { maskId } from "@/lib/shared/mask";
import { Check, CircleAlert } from "@/components/applicant/icons";
import { LINK_CLS, STROKE } from "@/components/applicant/apply/parts";
import {
  formatIsoLabel,
  nextOfKinValues,
  type DocumentationDraft,
  type DocumentationSectionKey,
  type ProfileFacts,
  type ProfileJob,
  type SectionProgress,
  type SensitiveDetails,
} from "@/lib/applicant/documentation";

type Row = [string, string];

export function ReviewStep({
  draft,
  sensitive,
  facts,
  jobs,
  emergency,
  progress,
  photoLabel,
  ninCopyLabel,
  onEdit,
}: {
  draft: DocumentationDraft;
  sensitive: SensitiveDetails;
  facts: ProfileFacts;
  jobs: { current: ProfileJob | null; previous: ProfileJob | null };
  emergency: { name: string; relationship: string; phone: string };
  progress: Record<DocumentationSectionKey, SectionProgress>;
  photoLabel: string;
  ninCopyLabel: string;
  onEdit: (step: number) => void;
}) {
  const dash = (v: string) => (v && v.trim() ? v : "Not added yet");
  const p = draft.personal;
  const k = nextOfKinValues(draft.nextOfKin, emergency);
  const physical =
    sensitive.physicallyChallenged === "Yes"
      ? sensitive.physicalDetail.trim()
        ? `Yes · ${sensitive.physicalDetail.trim()}`
        : "Yes"
      : dash(sensitive.physicallyChallenged);

  const employerRows = (job: ProfileJob | null, d: DocumentationDraft["current"] | DocumentationDraft["previous"], offLabel: string, off: boolean): Row[] =>
    job
      ? [
          ["Organisation", job.organisation],
          ["Position · dates", `${job.role} · ${job.period}`],
          ["Location", dash(d.location)],
          ["Website / email / handle", dash(d.contact)],
          ["Reporting manager", dash(d.manager)],
          ["Job description", dash(d.description)],
        ]
      : [["Status", off ? offLabel : "Not confirmed yet"]];

  const sections: { key: DocumentationSectionKey; title: string; step: number; rows: Row[] }[] = [
    {
      key: "personal",
      title: "Personal & identity",
      step: 0,
      rows: [
        ["Email", dash(facts.email)],
        ["Phone", dash(facts.phone)],
        ["Birthday", dash(formatIsoLabel(facts.birthday))],
        ["Gender", dash(facts.sex)],
        ["Nationality", dash(facts.nationality)],
        ["State of origin", dash(facts.stateOfOrigin)],
        ["LGA, province / tribe", dash(facts.lgaTribe)],
        ["Home address", dash(facts.homeAddress)],
        ["Educational qualification", dash(p.education)],
        ["Relationship status", dash(p.relationshipStatus)],
        ["Physically challenged", physical],
        ["Passport photograph", photoLabel],
      ],
    },
    { key: "current", title: "Current employment", step: 1, rows: employerRows(jobs.current, draft.current, "Not currently employed", draft.current.notEmployed) },
    { key: "previous", title: "Previous employment", step: 2, rows: employerRows(jobs.previous, draft.previous, "No previous employment", draft.previous.none) },
    {
      key: "nextOfKin",
      title: "Next of kin",
      step: 3,
      rows: [
        ["Name", dash(k.name)],
        ["Relationship", dash(k.relationship)],
        ["Phone", dash(k.phone)],
        ["Contact address", dash(k.address)],
      ],
    },
    {
      key: "sensitive",
      title: "NIN & bank details",
      step: 4,
      rows: [
        ["NIN", sensitive.nin ? maskId(sensitive.nin) : "Not added yet"],
        ["Name on account", dash(sensitive.bankAccountName)],
        ["Account number", sensitive.bankAccountNumber ? maskId(sensitive.bankAccountNumber) : "Not added yet"],
        ["Bank", dash(sensitive.bankName)],
        ["Is this your own account?", sensitive.bankOwnAccount ? "Yes, you confirmed it" : "Not confirmed yet"],
      ],
    },
    {
      key: "documents",
      title: "Documents",
      step: 5,
      rows: [
        ["Copy of NIN", ninCopyLabel],
        ["Passport photograph", photoLabel],
      ],
    },
  ];

  return (
    <div>
      {sections.map((s) => {
        const pr = progress[s.key];
        return (
          <section key={s.key} className="rounded-[14px] border border-(--ap-line) px-4.5 py-4 [&+&]:mt-3" aria-label={s.title}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <b className="flex min-w-0 items-center gap-2 text-[16px]">
                {pr.complete ? (
                  <Check className="size-5 shrink-0 text-(--ap-ok)" strokeWidth={STROKE} aria-hidden="true" />
                ) : (
                  <CircleAlert className="size-5 shrink-0 text-(--ap-warn)" strokeWidth={STROKE} aria-hidden="true" />
                )}
                <span className="min-w-0">
                  {s.title}
                  {pr.complete ? null : (
                    <span className="ml-2 text-[13px] font-semibold whitespace-nowrap text-(--ap-warn)">
                      {pr.total - pr.done} left
                    </span>
                  )}
                </span>
              </b>
              <button type="button" onClick={() => onEdit(s.step)} className={LINK_CLS} aria-label={`Edit ${s.title}`}>
                Edit
              </button>
            </div>
            <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4 max-[640px]:grid-cols-1">
              {s.rows.map(([label, value]) => (
                <div key={label} className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-[14px] font-semibold text-(--ap-muted)">{label}</dt>
                  <dd className={`m-0 text-[16px] font-semibold wrap-anywhere ${value === "Not added yet" ? "text-(--ap-faint)" : ""}`}>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
