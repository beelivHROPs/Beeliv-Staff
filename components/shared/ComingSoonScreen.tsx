import { EmptyState, PageHeading } from "@/components/applicant/primitives";
import { Clock3 } from "@/components/applicant/icons";
import type { GlassName } from "@/components/shared/icons/GlassIcon";

/**
 * "Coming soon" for a screen that is not connected to Beeliv records yet (lead rule 2026-11-21: real data or Coming
 * soon, never sample data). Uses the SAME approved title and empty state as the live Admin, Client and Staff pages
 * (components/applicant/primitives), with the approved GLASS picture that matches the page (never a flat icon), in each
 * app's own colours.
 */
const GLASS_BY_TITLE: [RegExp, GlassName][] = [
  [/job|vacanc/i, "jobs"],
  [/leave/i, "leave"],
  [/attendance|schedul|calendar|shift/i, "calendar"],
  [/inbox|request/i, "inbox"],
  [/sop|training/i, "sops"],
  [/announce|notification/i, "notifications"],
  [/warning|compliance|approval/i, "shield"],
  [/record|payroll|document/i, "documents"],
  [/recruit|application|candidate/i, "applications"],
  [/form|test/i, "tests"],
  [/assignment|client/i, "clients"],
  [/report|analytic|activity/i, "activity"],
  [/staff|people|team/i, "people"],
  [/search/i, "search"],
];

export function ComingSoonScreen({ title, description, glass }: { title: string; description?: string; glass?: GlassName }) {
  const g = glass ?? GLASS_BY_TITLE.find(([re]) => re.test(title))?.[1] ?? "help";
  return (
    <div>
      <PageHeading title={title} />
      <div className="ap-card rounded-2xl">
        <EmptyState icon={Clock3} glass={g} title="Coming soon" description={description ?? "This part of Beeliv is being connected. Real records will show here as soon as it is ready."} />
      </div>
    </div>
  );
}
